import React, { useState, useEffect, useCallback } from "react";
import {
  Play, BookOpen, FileText, Mic, GraduationCap, Wrench, Link2,
  ExternalLink, Bookmark, Share2, Repeat2, Pin, Trash2, Globe, Lock, Plus, Sparkles, X,
} from "lucide-react";
import { C, F } from "./theme.js";
import { Card, GhostCard, IconTile, Label, Btn, Chip, firstNameOf } from "./ui.jsx";
import { shareResourceLink } from "./lib/share.js";
import {
  fetchResources, promoteResource, repromoteResource,
  openResource, saveResource, unsaveResource, updateResource, deleteResource,
} from "./lib/auth-client.js";

/* ----------------- PROMOTE TO RYZN -----------------

   A mentor's shelf: the things they didn't make but will vouch for. A post is
   what a mentor wrote; this is what they read, watched and still think about,
   and until now there was nowhere on a profile to say so, which pushed mentors
   into re-uploading other people's work or saying nothing at all.

   Every card leaves for the original platform. Ryzn stores the endorsement, not
   the content: the note, the name behind it, and, when it's been passed on -
   who it came through. See lib/resources.js for why that boundary is the whole
   feature rather than an implementation detail.
*/

export const RESOURCE_META = {
  video:   { icon: Play,          c: C.purple, bg: C.purpleTint, label: "Video" },
  book:    { icon: BookOpen,      c: C.amber,  bg: C.amberTint,  label: "Book" },
  article: { icon: FileText,      c: C.teal,   bg: C.tealTint,   label: "Article" },
  podcast: { icon: Mic,           c: C.coral,  bg: C.coralTint,  label: "Podcast" },
  course:  { icon: GraduationCap, c: C.deep,   bg: C.purpleTint, label: "Course" },
  tool:    { icon: Wrench,        c: C.gray,   bg: C.surface,    label: "Tool" },
  link:    { icon: Link2,         c: C.gray,   bg: C.surface,    label: "Link" },
};

const metaFor = (kind) => RESOURCE_META[kind] || RESOURCE_META.link;

/** Cosmetic only, the server is what actually classifies a link. This just
    lets the composer show where a pasted URL points before it's submitted. */
const hostOf = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/**
 * One shelf, loaded and kept in sync.
 *
 * Three screens render a shelf, the mentor's own Studio, a mentee's Orbit, and
 * a profile someone is looking at, and each of them needs the same four things:
 * the rows, whether they've landed, a way to reload, and a way to patch one row
 * in place after a tap. Written once here rather than three times there, which
 * is the same reason ContentTabs is shared between the Orbit and the preview.
 */
export function useShelf({ mentorId, scope, enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(!!enabled);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!enabled) { setItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { resources } = await fetchResources({ mentorId, scope });
      setItems(resources || []);
      setError(null);
    } catch (err) {
      setItems([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [mentorId, scope, enabled]);

  useEffect(() => { reload(); }, [reload]);

  /** Merge a partial update into one row, by id. Every optimistic tap below
      goes through this so no screen reaches into the array itself. */
  const patch = useCallback((id, next) => {
    setItems((rows) => rows.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }, []);

  const drop = useCallback((id) => {
    setItems((rows) => rows.filter((r) => r.id !== id));
  }, []);

  return { items, loading, error, reload, patch, drop, setItems };
}

/* ----------------- the composer ----------------- */

const KIND_ORDER = ["video", "book", "article", "podcast", "course", "tool", "link"];

const input = {
  width: "100%", border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 12px",
  fontFamily: F.sans, fontSize: 13.5, background: C.surface, outline: "none", boxSizing: "border-box",
  color: C.ink,
};

/**
 * Paste a link, say why. That's the whole form.
 *
 * `kind` is a row of chips rather than a required choice because the server
 * already reads it off the host, a mentor who has to classify a TikTok before
 * they can recommend it is a mentor who closes the sheet. The chips are there
 * for the cases the host can't answer: a PDF of a book, a lecture on a personal
 * site.
 */
export const PromoteComposer = ({ onPromote, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState(null);
  const [visibility, setVisibility] = useState("public");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const host = hostOf(url);
  const ready = !busy && !!host && !!title.trim();

  const reset = () => {
    setUrl(""); setTitle(""); setCreator(""); setNote("");
    setKind(null); setVisibility("public"); setErr(null);
  };

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    setErr(null);
    try {
      await onPromote({
        url: url.trim(),
        title: title.trim(),
        creator: creator.trim(),
        note: note.trim(),
        ...(kind ? { kind } : {}),
        visibility,
      });
      reset();
      setOpen(false);
    } catch (e) {
      setErr(e?.message || "Couldn’t promote that.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return (
    <Card onClick={() => setOpen(true)} style={{ border: "1px solid transparent", background: C.purpleTint }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <IconTile size={36} radius={10} bg={C.purple}><Plus size={16} color={C.white} /></IconTile>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, color: C.purple }}>Promote to Ryzn</div>
          <div style={{ fontSize: 11.5, color: C.gray, marginTop: 2, lineHeight: 1.4 }}>
            A TikTok, a short, a book, a paper, anything you’d tell a mentee to go and read.
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Card style={{ border: `1px solid ${C.purple}`, background: C.purpleTint }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Label color={C.purple}>Promote to Ryzn · +5 Impact</Label>
        <button type="button" onClick={() => { reset(); setOpen(false); }}
          aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0 }}>
          <X size={16} color={C.gray} />
        </button>
      </div>

      <input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" autoFocus
        placeholder="Paste the link, tiktok.com/…, a YouTube short, a book page"
        style={{ ...input, marginTop: 12 }} />
      {host && (
        <div style={{ marginTop: 8 }}>
          <Chip c={C.teal} bg={C.tealTint}><Globe size={10} /> {host}</Chip>
        </div>
      )}

      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160}
        placeholder="Title, what is it called?" style={{ ...input, marginTop: 8 }} />
      <input value={creator} onChange={(e) => setCreator(e.target.value)} maxLength={120}
        placeholder="Who made it? (optional)" style={{ ...input, marginTop: 8 }} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={400}
        placeholder="Why you’re putting your name on it. This is the part mentees actually read."
        style={{ ...input, marginTop: 8, resize: "none", minHeight: 58 }} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {KIND_ORDER.map((id) => {
          const m = RESOURCE_META[id], Icon = m.icon, on = kind === id;
          return (
            <button key={id} type="button" onClick={() => setKind(on ? null : id)} style={{
              display: "inline-flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer",
              borderRadius: 10, padding: "6px 9px", fontFamily: F.sans, fontWeight: 600, fontSize: 12,
              background: on ? m.bg : "transparent", color: on ? m.c : C.gray,
            }}><Icon size={12} />{m.label}</button>
          );
        })}
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 6, letterSpacing: 0.5 }}>
        LEAVE BLANK AND WE’LL READ IT OFF THE LINK
      </div>

      <div style={{ display: "flex", background: C.ghost, borderRadius: 10, padding: 3, marginTop: 12, maxWidth: 300 }}>
        {[["public", "Everyone"], ["cohort", "My cohort"]].map(([id, l]) => (
          <button key={id} type="button" onClick={() => setVisibility(id)} style={{
            flex: 1, border: "none", cursor: "pointer", borderRadius: 8, padding: "7px 0",
            fontFamily: F.sans, fontWeight: 600, fontSize: 12.5,
            background: visibility === id ? C.white : "transparent",
            color: visibility === id ? (id === "public" ? C.teal : C.ink) : C.gray,
          }}>{l}</button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.gray, marginTop: 6, lineHeight: 1.4 }}>
        {visibility === "public"
          ? "Your mentees, your followers, and anyone reading your profile. Other mentors can pass it on."
          : "Only the mentees you’re working with. It stays off your public profile."}
      </div>

      {err && <div style={{ marginTop: 10, fontSize: 12.5, color: C.coral, lineHeight: 1.45 }}>{err}</div>}

      <Btn style={{ marginTop: 12 }} disabled={!ready} onClick={submit}>
        <Sparkles size={15} /> {busy ? "Promoting…" : "Promote it"}
      </Btn>
    </Card>
  );
};

/* ----------------- one card ----------------- */

const iconTile = (kind, size) => {
  const m = metaFor(kind), Icon = m.icon;
  return (
    <div style={{ width: size, height: size, background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon size={Math.round(size * 0.42)} color={m.c} />
    </div>
  );
};

const actionBtn = (extra = {}) => ({
  display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none",
  cursor: "pointer", padding: "6px 9px", borderRadius: 10,
  fontFamily: F.mono, fontSize: 10.5, fontWeight: 700, color: C.gray, whiteSpace: "nowrap", ...extra,
});

/**
 * `mine` is the owner's view: pin, take down, flip who it's for.
 * `onRepromote` appears only where a caller wired it, the same convention
 * PostCard's `onAmplify` follows, and it means the same thing: a mentor is
 * looking at a peer's public pick.
 */
export const ResourceCard = ({
  resource, by, mine, onOpen, onSave, onRepromote, onPin, onDelete, onVisibility, toast,
}) => {
  const m = metaFor(resource.kind);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [relaying, setRelaying] = useState(false);

  /* The window is opened synchronously, before anything is awaited. A popup
     blocker only trusts a window.open that happens inside the click, so
     recording the open first would cost the mentee the tap they made. */
  const open = () => {
    window.open(resource.url, "_blank", "noopener,noreferrer");
    onOpen?.(resource);
  };

  const toggleSave = async () => {
    if (saving || !onSave) return;
    setSaving(true);
    try { await onSave(resource, !resource.saved); }
    catch (e) { toast?.(e.message || "Couldn’t save that."); }
    finally { setSaving(false); }
  };

  const share = async () => {
    try {
      const how = await shareResourceLink(resource, { by });
      toast?.(how === "copied" ? "Copied, the link goes straight to the source" : "Shared");
    } catch (e) {
      toast?.(e.message || "Couldn’t share that.");
    }
  };

  const relay = async () => {
    if (relaying) return;
    setRelaying(true);
    try { await onRepromote(resource); }
    catch (e) { toast?.(e.message || "Couldn’t promote that on."); }
    finally { setRelaying(false); }
  };

  const flip = async (to) => {
    if (busy) return;
    setBusy(true);
    try { await onVisibility(resource, to); } finally { setBusy(false); }
  };

  return (
    <Card style={{ padding: 14 }}>
      {/* Who it came through, above everything else. A relayed pick is two
          mentors' credibility and dropping the first name would turn a relay
          into a claim. */}
      {resource.via && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontFamily: F.mono, fontSize: 9, letterSpacing: 0.6, color: C.purple }}>
          <Repeat2 size={12} color={C.purple} />
          {resource.via.name ? `FOUND VIA ${resource.via.name.toUpperCase()}` : "PASSED ON FROM ANOTHER MENTOR"}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {resource.thumbnailUrl ? (
          <div style={{ width: 88, height: 62, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: m.bg }}>
            <img src={resource.thumbnailUrl} alt="" loading="lazy"
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        ) : iconTile(resource.kind, 48)}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, lineHeight: 1.35 }}>{resource.title}</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 4, letterSpacing: 0.5 }}>
            {(resource.platform || resource.domain || "LINK").toUpperCase()} · {m.label.toUpperCase()}
            {resource.creator ? ` · ${resource.creator.toUpperCase()}` : ""}
          </div>
        </div>
        {resource.pinned && <Pin size={13} color={C.purple} style={{ flexShrink: 0, marginTop: 2 }} />}
      </div>

      {resource.note && (
        <div style={{ fontSize: 13, lineHeight: 1.55, color: C.ink, marginTop: 11, fontStyle: "italic" }}>
          “{resource.note}”
          {by && !mine && <span style={{ fontStyle: "normal", color: C.gray }}>, {firstNameOf(by)}</span>}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={open} style={{
          display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
          padding: "7px 11px", borderRadius: 10, fontFamily: F.mono, fontSize: 10, fontWeight: 700,
          background: resource.opened ? C.tealTint : m.bg, color: resource.opened ? C.teal : m.c, whiteSpace: "nowrap",
        }}>
          <ExternalLink size={12} />
          {mine ? "OPEN" : resource.opened ? "✓ OPENED" : "OPEN · +3 XP"}
        </button>

        {onSave && !mine && (
          <button type="button" onClick={toggleSave} disabled={saving}
            title={resource.saved ? "Saved to your list" : "Save for later"}
            style={actionBtn({ color: resource.saved ? C.purple : C.gray })}>
            <Bookmark size={14} color={resource.saved ? C.purple : "#A5A39D"} fill={resource.saved ? C.purple : "none"} />
            {resource.saved ? "Saved" : "Save"}
          </button>
        )}

        <button type="button" onClick={share} style={actionBtn()}>
          <Share2 size={14} color="#A5A39D" /> Share
        </button>

        <span style={actionBtn({ marginLeft: "auto", cursor: "default", color: "#A5A39D" })}>
          {resource.clicks} OPEN{resource.clicks === 1 ? "" : "S"}
        </span>
      </div>

      {/* The re-promote control, on its own row for the same reason PostCard
          gives amplification one: putting a peer's pick in front of your cohort
          is a decision about other people, not a toggle beside a like button. */}
      {onRepromote && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "9px 11px",
          borderRadius: 10, background: resource.onMyShelf ? C.purpleTint : C.ghost,
        }}>
          <Repeat2 size={14} color={resource.onMyShelf ? C.purple : C.gray} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: resource.onMyShelf ? C.purple : C.ink }}>
              {resource.onMyShelf ? "On your shelf" : "Not on your shelf"}
            </div>
            <div style={{ fontSize: 11.5, color: C.gray, marginTop: 1, lineHeight: 1.35 }}>
              {resource.onMyShelf
                ? `Your mentees see it, credited to ${by ? firstNameOf(by) : "them"}.`
                : `Pass it on and your cohort reads it, ${by ? firstNameOf(by) : "they"} keeps the credit.`}
            </div>
          </div>
          {!resource.onMyShelf && (
            <button type="button" disabled={relaying} onClick={relay} style={{
              flexShrink: 0, border: "1px solid #D5D3CE", background: C.white,
              cursor: relaying ? "default" : "pointer", borderRadius: 999, padding: "6px 11px",
              fontFamily: F.sans, fontWeight: 600, fontSize: 12, color: C.ink,
              opacity: relaying ? 0.6 : 1, whiteSpace: "nowrap",
            }}>{relaying ? "Adding…" : "Promote on"}</button>
          )}
        </div>
      )}

      {/* Owner controls. Who it's for reads as a sentence, the same way a post's
          visibility does, a mentor deciding between "my cohort" and "everyone"
          is deciding who they're vouching to. */}
      {mine && (onVisibility || onPin || onDelete) && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.line}` }}>
          {onVisibility && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: resource.visibility === "public" ? C.tealTint : C.ghost }}>
              {resource.visibility === "public" ? <Globe size={13} color={C.teal} /> : <Lock size={13} color={C.gray} />}
              <div style={{ flex: 1, minWidth: 0, fontSize: 12, color: resource.visibility === "public" ? C.teal : C.gray, lineHeight: 1.35 }}>
                {resource.visibility === "public" ? "On your public profile" : "Cohort only"}
              </div>
              <button type="button" disabled={busy}
                onClick={() => flip(resource.visibility === "public" ? "cohort" : "public")}
                style={{
                  flexShrink: 0, border: `1px solid ${resource.visibility === "public" ? C.teal : "#D5D3CE"}`,
                  background: C.white, cursor: busy ? "default" : "pointer", borderRadius: 999,
                  padding: "5px 10px", fontFamily: F.sans, fontWeight: 600, fontSize: 11.5,
                  color: resource.visibility === "public" ? C.teal : C.ink, opacity: busy ? 0.6 : 1,
                }}>
                {busy ? "…" : resource.visibility === "public" ? "Cohort only" : "Make public"}
              </button>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            {onPin && (
              <Btn small kind={resource.pinned ? "primary" : "ghost"}
                style={{ flex: 1, ...(resource.pinned ? null : { borderColor: C.line, color: C.gray }) }}
                onClick={() => onPin(resource, !resource.pinned)}>
                <Pin size={13} /> {resource.pinned ? "Pinned" : "Pin"}
              </Btn>
            )}
            {onDelete && (
              <Btn small kind="ghost" style={{ flex: 1, borderColor: C.coralTint, color: C.coral }}
                onClick={() => { if (window.confirm(`Take “${resource.title}” off your shelf?`)) onDelete(resource); }}>
                <Trash2 size={13} /> Remove
              </Btn>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

/* ----------------- the shelf ----------------- */

/**
 * A list of promoted resources, with the section header that names whose they
 * are. Rendered on the mentor's own Studio, inside the Resources tab of an
 * Orbit, and on the profile sheet a mentee or a peer opens, one component, so
 * the mentor's preview of their shelf is the shelf.
 */
export const ResourceShelf = ({
  resources = [], loading, by, mine, emptyText, heading = true, ...handlers
}) => {
  if (loading) return (
    <Card><div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, letterSpacing: 0.6 }}>LOADING SHELF…</div></Card>
  );

  if (!resources.length) {
    if (!emptyText) return null;
    return (
      <Card style={{ textAlign: "center", padding: 22 }}>
        <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.5 }}>{emptyText}</div>
      </Card>
    );
  }

  return (
    <>
      {heading && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 2px" }}>
          <Label color={C.purple}>
            {mine ? "Promoted by you" : by ? `${firstNameOf(by)} recommends` : "Promoted"} · {resources.length}
          </Label>
          <Label>FROM OUTSIDE RYZN</Label>
        </div>
      )}
      {resources.map((r) => (
        <ResourceCard key={r.id} resource={r} by={mine ? null : (r.mentorName || by)} mine={mine} {...handlers} />
      ))}
    </>
  );
};

/* ----------------- the wired shelves ----------------- */

/**
 * The read-only shelf a mentee or a peer sees on somebody's profile.
 *
 * It owns its own fetch and its own optimistic updates rather than taking them
 * as props, because all three of the screens that show a shelf were otherwise
 * going to grow the same twenty lines of state, and the version of that which
 * drifts is the one where a save works in the Orbit and silently doesn't on the
 * profile sheet.
 */
export const MentorShelf = ({ mentorId, mentorName, toast, canRepromote, onRepromoted, emptyText, heading = true }) => {
  const shelf = useShelf({ mentorId, enabled: !!mentorId });

  const recordOpen = async (r) => {
    if (r.opened) return;
    shelf.patch(r.id, { opened: true, clicks: (r.clicks ?? 0) + 1 });
    try {
      const { xp } = await openResource(r.id);
      if (xp) toast?.(`+${xp} XP`);
    } catch {
      /* The link is already open in the other tab, the person got what they
         tapped for. Rolling the count back would be the only visible effect of
         telling them about it. */
      shelf.patch(r.id, { opened: false, clicks: r.clicks ?? 0 });
    }
  };

  const toggleSave = async (r, next) => {
    shelf.patch(r.id, { saved: next, saves: Math.max(0, (r.saves ?? 0) + (next ? 1 : -1)) });
    try {
      await (next ? saveResource(r.id) : unsaveResource(r.id));
      toast?.(next ? "Saved to your list" : "Removed from your list");
    } catch (e) {
      shelf.patch(r.id, { saved: !next, saves: r.saves ?? 0 });
      throw e;
    }
  };

  const relay = async (r) => {
    await repromoteResource(r.id);
    shelf.patch(r.id, { onMyShelf: true });
    toast?.(`Added to your shelf · +5 Impact${mentorName ? ` · ${firstNameOf(mentorName)} keeps the credit` : ""}`);
    onRepromoted?.(r);
  };

  return (
    <ResourceShelf
      resources={shelf.items}
      loading={shelf.loading}
      by={mentorName}
      heading={heading}
      emptyText={emptyText}
      toast={toast}
      onOpen={recordOpen}
      onSave={toggleSave}
      onRepromote={canRepromote ? relay : undefined}
    />
  );
};

/**
 * What the mentors you follow are putting their name behind.
 *
 * The discovery half of the loop, and the reason the follow graph is worth
 * anything to a mentor who doesn't post much: curation is a contribution even
 * on a week when you wrote nothing. Every card here can be taken onto your own
 * shelf in one tap, with the credit staying where it started.
 */
export const NetworkShelf = ({ toast, onRepromoted }) => {
  const shelf = useShelf({ scope: "network" });

  const recordOpen = async (r) => {
    if (r.opened) return;
    shelf.patch(r.id, { opened: true, clicks: (r.clicks ?? 0) + 1 });
    try { await openResource(r.id); } catch { shelf.patch(r.id, { opened: false, clicks: r.clicks ?? 0 }); }
  };

  const relay = async (r) => {
    await repromoteResource(r.id);
    shelf.patch(r.id, { onMyShelf: true });
    toast?.(`Added to your shelf · +5 Impact · ${firstNameOf(r.mentorName || "they")} keeps the credit`);
    onRepromoted?.(r);
  };

  if (shelf.loading) return (
    <Card><div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, letterSpacing: 0.6 }}>LOADING PICKS…</div></Card>
  );

  if (!shelf.items.length) return (
    <GhostCard style={{ textAlign: "center", padding: 24 }}>
      <Bookmark size={18} color={C.purple} />
      <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, marginTop: 8 }}>No picks yet</div>
      <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>
        Follow a few mentors and whatever they promote to Ryzn lands here. Anything worth passing on
        goes onto your own shelf in a tap, and they keep the credit for finding it.
      </div>
    </GhostCard>
  );

  return shelf.items.map((r) => (
    <ResourceCard key={r.id} resource={r} by={r.mentorName} toast={toast}
      onOpen={recordOpen} onRepromote={relay} />
  ));
};

/**
 * The reading list, everything this person kept off other people's shelves.
 *
 * The half of the feature that faces a mentee. A curated shelf is only worth
 * scrolling if the things on it can be kept, and a Save button with nowhere to
 * read the list back is a button that teaches people their taps don't matter.
 *
 * Re-checked server-side on every read, so a pick a mentor took down or made
 * private drops out rather than sitting here as a dead link.
 */
export const SavedShelf = ({ toast, emptyText }) => {
  const shelf = useShelf({ scope: "saved" });

  const recordOpen = async (r) => {
    if (r.opened) return;
    shelf.patch(r.id, { opened: true, clicks: (r.clicks ?? 0) + 1 });
    try {
      const { xp } = await openResource(r.id);
      if (xp) toast?.(`+${xp} XP`);
    } catch {
      shelf.patch(r.id, { opened: false, clicks: r.clicks ?? 0 });
    }
  };

  const unsave = async (r) => {
    shelf.drop(r.id);
    try { await unsaveResource(r.id); toast?.("Removed from your list"); }
    catch (e) { await shelf.reload(); toast?.(e.message || "Couldn’t remove that."); }
  };

  if (shelf.loading) return (
    <Card><div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, letterSpacing: 0.6 }}>LOADING YOUR LIST…</div></Card>
  );

  if (!shelf.items.length) return (
    <Card style={{ textAlign: "center", padding: 22 }}>
      <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.5 }}>
        {emptyText || "Nothing saved yet. Anything your mentors promote can be kept here with one tap."}
      </div>
    </Card>
  );

  return shelf.items.map((r) => (
    <ResourceCard key={r.id} resource={r} by={r.mentorName} toast={toast}
      onOpen={recordOpen} onSave={(row) => unsave(row)} />
  ));
};

/**
 * The mentor's own shelf, with the composer above it.
 *
 * `onChange` lets the profile screen keep its own count in step without this
 * component having to know what a profile-strength checklist is.
 */
export const MyShelf = ({ toast, onChange, showComposer = true }) => {
  const shelf = useShelf({});

  useEffect(() => { onChange?.(shelf.items.length); }, [shelf.items.length, onChange]);

  const promote = async (body) => {
    const { resource, impact } = await promoteResource(body);
    shelf.setItems((rows) => [resource, ...rows]);
    toast?.(`Promoted · +${impact} Impact`);
  };

  const recordOpen = (r) => { openResource(r.id).catch(() => {}); };

  const pin = async (r, pinned) => {
    shelf.patch(r.id, { pinned });
    try { await updateResource(r.id, { pinned }); await shelf.reload(); }
    catch (e) { shelf.patch(r.id, { pinned: !pinned }); toast?.(e.message || "Couldn’t pin that."); }
  };

  const visibility = async (r, to) => {
    shelf.patch(r.id, { visibility: to });
    try { await updateResource(r.id, { visibility: to }); }
    catch (e) { shelf.patch(r.id, { visibility: r.visibility }); toast?.(e.message || "Couldn’t change that."); }
  };

  const remove = async (r) => {
    shelf.drop(r.id);
    try { await deleteResource(r.id); }
    catch (e) { await shelf.reload(); toast?.(e.message || "Couldn’t remove that."); }
  };

  return (
    <>
      {showComposer && <PromoteComposer onPromote={promote} />}
      <ResourceShelf
        resources={shelf.items}
        loading={shelf.loading}
        mine
        toast={toast}
        emptyText="Nothing on your shelf yet. The first thing you promote shows up here and in every mentee’s Orbit."
        onOpen={recordOpen}
        onPin={pin}
        onVisibility={visibility}
        onDelete={remove}
      />
    </>
  );
};
