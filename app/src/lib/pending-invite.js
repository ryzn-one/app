/**
 * An invitation code that has to survive a page load.
 *
 * A code arrives in the URL hash (/app/#/join?code=…) and is spent by an
 * authenticated call to /api/invites/redeem. Between those two points sits
 * "Continue with Google", which leaves the app entirely and returns to /app/
 * with no hash, so a code held only in component state is gone by the time
 * there is a session to claim it with. The invitation is then silently
 * dropped: the account lands with the default `mentee` role, the code stays
 * open for anyone else holding the link, and a company invite never seats
 * them in the org that sent it.
 *
 * sessionStorage rather than localStorage: an invitation belongs to the tab
 * that opened it, and a forgotten code must not follow someone into a later
 * session on a shared machine.
 */

import { redeemInvite } from "./auth-client.js";

const KEY = "ryzn.pendingInvite";

/** Storage throws in private mode on some browsers; a lost code is recoverable
    (the link still works), a crashed sign-up screen is not. */
const quiet = (fn, fallback = null) => { try { return fn(); } catch { return fallback; } };

export function stashPendingInvite(code) {
  const value = String(code || "").trim().toUpperCase();
  if (!value) return;
  quiet(() => sessionStorage.setItem(KEY, value));
}

export function readPendingInvite() {
  return quiet(() => sessionStorage.getItem(KEY) || null);
}

export function clearPendingInvite() {
  quiet(() => sessionStorage.removeItem(KEY));
}

/**
 * Spend the stashed code, clearing it whichever way the answer goes.
 *
 * Never throws: by the time this runs the account already exists, and a failed
 * claim must not strand anyone on a dead screen. It clears on failure too -
 * `already_used`, `revoked` and `expired` do not become valid by being asked
 * again on every boot.
 */
export async function claimPendingInvite(code = readPendingInvite()) {
  const value = String(code || "").trim().toUpperCase();
  clearPendingInvite();
  if (!value) return null;
  try {
    return await redeemInvite(value);
  } catch (err) {
    console.error("[ryzn] invite claim failed:", err);
    return null;
  }
}
