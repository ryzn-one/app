import { promises as dns } from "node:dns";
import { randomBytes } from "node:crypto";
import { collections } from "./db.js";
import { kindOf, resolvePolicy } from "./orbits.js";

/**
 * Email-domain joining: how a company orbit fills itself.
 *
 * The problem this solves is the cold start. A company orbit opened on Monday
 * has one person in it, and every other employee arrives only if someone
 * remembers to mint them a code. That is the wall LinkedIn was supposed to
 * knock down by importing everyone's contacts — it can't, its API returns a
 * name, a photo and an email address and nothing else — so the graph gets built
 * from the one thing we *do* hold that says where somebody works: their email.
 *
 * Somebody signing in as `dana@northbound.com`, on an address Northbound proved
 * it controls, is Northbound's employee. That is the whole idea.
 *
 * **Three gates, and all three have to hold, or this is a data breach with a
 * friendly name.** Each one is checked in a different place, so they're written
 * out here once:
 *
 *   1. The address is verified.   `user.emailVerified`. Password signup leaves
 *                                 this false (requireEmailVerification is off),
 *                                 so anyone can *type* ceo@northbound.com; only
 *                                 someone who opened the mail gets seated.
 *   2. The domain is verified.    A DNS TXT record only the domain's real
 *                                 operator can publish, see `checkDomainTxt`.
 *                                 Without this an org could claim `google.com`
 *                                 and absorb every Google employee who signs up.
 *   3. The org asked for it.      `policy.domainJoin`, off | suggest | auto.
 *
 * What it deliberately does *not* do is touch the platform role. A code from
 * api/invites/redeem.js is still the only thing that makes somebody a mentor;
 * this seats a person in an orbit at whatever role they already hold. Joining
 * your employer's space and being handed the Roster are different events and
 * the second one stays invitation-only.
 */

/**
 * Addresses that say nothing about where someone works.
 *
 * None of these are claimable in practice — nobody but Google publishes DNS for
 * gmail.com — but failing at the claim with a sentence that explains why beats
 * failing at a DNS lookup ten minutes later with a timeout. It is also the
 * check that stops a well-meaning admin from claiming the domain half their
 * contractors use and quietly seating strangers.
 */
export const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "hotmail.co.uk",
  "live.com", "msn.com", "yahoo.com", "yahoo.co.uk", "ymail.com", "aol.com",
  "icloud.com", "me.com", "mac.com", "proton.me", "protonmail.com", "pm.me",
  "gmx.com", "gmx.de", "web.de", "mail.com", "zoho.com", "yandex.com",
  "fastmail.com", "hey.com", "tutanota.com", "tuta.com", "duck.com",
  "qq.com", "163.com", "126.com", "naver.com", "hanmail.net", "daum.net",
  // Disposable-address services. A throwaway inbox clears gate 1 and tells you
  // nothing, which is the exact combination this feature must not honour.
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "yopmail.com",
  "sharklasers.com", "trashmail.com", "temp-mail.org", "getnada.com",
]);

/** A hostname label: letters, digits, hyphens, not starting or ending in one. */
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * A typed-in domain, normalised, or null if it isn't one we'll accept.
 *
 * Takes what an admin actually pastes: `@northbound.com`, `Northbound.com`,
 * `https://www.northbound.com/careers`, `northbound.com.`. All of it lands on
 * one lowercase punycode hostname, because two rows differing only by case are
 * two rows the moment an email address is matched against them.
 *
 * `www.` is stripped: someone pasting their website means the domain their mail
 * is on. A deeper subdomain is kept, `eu.northbound.com` is a real mail domain
 * and is claimed separately — see `orgForEmail` on why matching is exact.
 */
export function cleanDomain(value) {
  let raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;

  // A URL, or something with a path stuck to it.
  if (raw.includes("/") || raw.includes(":")) {
    try { raw = new URL(/^[a-z]+:\/\//.test(raw) ? raw : `https://${raw}`).hostname; }
    catch { return null; }
  }
  raw = raw.replace(/^@/, "").replace(/\.+$/, "");
  if (raw.startsWith("www.")) raw = raw.slice(4);
  if (!raw || raw.length > 253) return null;

  /* Through URL once more for IDN: `münchen.de` and `xn--mnchen-3ya.de` are the
     same domain, and only one of them can be the one we store and compare. */
  let host;
  try { host = new URL(`https://${raw}`).hostname; } catch { return null; }
  if (host.startsWith("[")) return null;                    // an IP literal, not a domain

  const labels = host.split(".");
  if (labels.length < 2) return null;                       // a bare TLD owns nobody
  if (!labels.every((l) => LABEL.test(l))) return null;
  if (/^\d+$/.test(labels[labels.length - 1])) return null;  // dotted-quad IP

  return host;
}

/** The domain half of an address, normalised the same way a claim is. */
export function domainOf(email) {
  const at = String(email ?? "").lastIndexOf("@");
  return at === -1 ? null : cleanDomain(String(email).slice(at + 1));
}

export const isPublicDomain = (domain) => PUBLIC_EMAIL_DOMAINS.has(String(domain ?? ""));

/* ----------------- proving the domain -----------------
 *
 * The same handshake Google Workspace, Slack and Vercel use, and for the same
 * reason: publishing a record under a domain is something only whoever runs the
 * domain can do. We mint a random token, the admin puts it in DNS, and we go and
 * read it back. Nothing about the claim is trusted until that read succeeds.
 */

/** Where the record goes. A dedicated name, never the apex TXT record, which is
    already carrying SPF and DMARC and is not ours to crowd. */
export const verifyHost = (domain) => `_ryzn-verify.${domain}`;

export const newVerifyToken = () => `ryzn-verify=${randomBytes(16).toString("hex")}`;

/** DNS is a network call in the middle of an admin clicking a button, and
    `resolveTxt` has no timeout of its own — an unreachable nameserver would
    otherwise hold the request open until the platform kills it. */
const DNS_TIMEOUT_MS = 5000;

/**
 * Is `token` published at `_ryzn-verify.<domain>` right now?
 *
 * Returns a reason rather than throwing, because every failure here is
 * something the admin has to go and fix, and "no such record" and "wrong value"
 * need different sentences in front of them.
 */
export async function checkDomainTxt(domain, token) {
  const host = verifyHost(domain);
  let records;
  try {
    /* The loser of this race still settles. Without its own catch, a resolver
       that fails *after* the timeout has already been reported takes the
       process down as an unhandled rejection, in a serverless container shared
       with every other request in flight. */
    const lookup = dns.resolveTxt(host);
    lookup.catch(() => {});
    let timer;
    records = await Promise.race([
      lookup,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), DNS_TIMEOUT_MS);
      }),
    ]).finally(() => clearTimeout(timer));
  } catch (err) {
    const code = err?.code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return { ok: false, reason: "no_record", host };
    }
    // ETIMEOUT is the race above; ETIMEDOUT and ESERVFAIL come from the resolver.
    if (code === "ETIMEOUT" || code === "ETIMEDOUT" || code === "ESERVFAIL") {
      return { ok: false, reason: "dns_timeout", host };
    }
    return { ok: false, reason: "dns_error", host, detail: String(err?.message || err).slice(0, 200) };
  }

  /* A TXT record longer than 255 bytes arrives split into chunks, and the
     resolver hands back one array per record. Joined, not indexed at [0]. */
  const values = (records || []).map((chunks) => chunks.join("").trim());
  return values.includes(token)
    ? { ok: true, host }
    : { ok: false, reason: values.length ? "wrong_value" : "no_record", host };
}

/* ----------------- the join itself ----------------- */

/** Domains an org has actually proved, as the lookup and the console read them. */
export const verifiedDomains = (org) =>
  (org?.domains || []).filter((d) => d?.verifiedAt).map((d) => d.domain);

/**
 * The org that has proved it owns this address's domain, or null.
 *
 * Matching is **exact**. `northbound.com` does not carry `eu.northbound.com`,
 * and it must not: the alternative is walking up the label list, which on
 * `dana@user.github.io` walks straight into a public suffix and hands one
 * tenant every other tenant's people. An org with several mail domains claims
 * each one, which is a minute of admin work and no ambiguity at all.
 */
export async function orgForEmail(db, email) {
  const domain = domainOf(email);
  if (!domain || isPublicDomain(domain)) return null;

  const org = await db.collection(collections.orgs).findOne({
    domains: { $elemMatch: { domain, verifiedAt: { $ne: null } } },
  });
  /* A circle can't claim a domain — the console never offers it and
     `cleanPolicy` clamps `domainJoin` to "off" outside a private orbit — but
     the read is cheap and the consequence of being wrong is seating a stranger
     in a space, so it is checked rather than assumed. */
  return org && kindOf(org) === "private" ? org : null;
}

/**
 * What, if anything, should happen for this person on this boot.
 *
 * Answers `null` far more often than not, and every early return below is one
 * of the three gates in this file's header. `null` is the overwhelmingly common
 * path and costs at most one indexed read.
 *
 * `already` short-circuits the lookup for anyone who is already in a company
 * orbit: /api/me has that answer in hand before it calls here, and re-deriving
 * it would be a second read on the hot path of every single boot.
 */
export async function resolveDomainJoin(db, user, { already = false } = {}) {
  if (already) return null;
  // Gate 1. Somebody who merely typed the address is not somebody who has it.
  if (!user?.emailVerified) return null;

  const org = await orgForEmail(db, user.email);      // gate 2, verified domains only
  if (!org) return null;

  const mode = resolvePolicy(org).domainJoin;          // gate 3
  if (mode === "off") return null;

  /* `already` covers company orbits; this covers the case where they were
     seated in *this* org by a code and `already` was computed before it. Cheap,
     indexed, and it is what makes the whole path idempotent. */
  const seat = await db
    .collection(collections.orbitMembers)
    .findOne({ orgId: String(org._id), userId: String(user.id) }, { projection: { _id: 1 } });
  if (seat) return null;

  return { org, mode, domain: domainOf(user.email) };
}

/**
 * Seat somebody in the orbit their address belongs to.
 *
 * Always `member`, always `$setOnInsert`. The insert-only write is what makes a
 * double boot, a retry and a race all land on one row with one `joinedAt`, and
 * it is what stops this path from overwriting a division or a level an admin
 * set by hand on somebody who had already been invited properly.
 *
 * `via: "domain"` is recorded because an admin looking at a roster is entitled
 * to know which of these people they invited and which walked in off a verified
 * MX record.
 */
export async function seatByDomain(db, org, user, domain) {
  const orgId = String(org._id);
  const res = await db.collection(collections.orbitMembers).updateOne(
    { orgId, userId: String(user.id) },
    {
      $setOnInsert: {
        orgId,
        userId: String(user.id),
        orgRole: "member",
        division: null,
        level: null,
        joinedAt: new Date(),
        invitedBy: null,
        via: "domain",
        viaDomain: domain,
      },
    },
    { upsert: true }
  );
  return { seated: !!res.upsertedCount };
}
