import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Check, Lock, Crown, Plus, Image as ImageIcon, MessageCircle, Play, FileText,
  Upload, Heart, Eye, Send, Pin, Sparkles, Share2, Globe, Repeat2,
} from "lucide-react";
import { C, F } from "./theme.js";
import { StudioStats, ProfileStrength, PostOverflow, StudioSeg, StudioEmpty } from "./studio.jsx";
import { Card, Label, Btn, Monogram, Avatar, HeaderRow, Bar, ProgramTimeline, VideoCaptureModal, firstNameOf } from "./ui.jsx";
import { MentorShelf } from "./resources.jsx";
import { uploadMedia, ACCEPT } from "./lib/upload.js";
import { fetchComments, addComment, reactToComment } from "./lib/auth-client.js";
import { sharePostLink, isPublicPost } from "./lib/share.js";

/** Turn a VideoCaptureModal result into a real File for uploadMedia. */
const captureToFile = (captured) => {
  if (!captured?.blob) return null;
  if (captured.blob instanceof File) return captured.blob;
  return new File([captured.blob], captured.name || "recording.webm", {
    type: captured.blob.type || "video/webm",
  });
};

/* ————————————————— ORBIT FEED —————————————————
   One post model, two screens: the mentor writes it (MentorFeed), the cohort
   reads it (OrbitScreen). Kept to four post kinds on purpose — a mentor who has
   to think about formatting stops posting.
*/

export const KIND_META = {
  status:   { icon: MessageCircle, c: C.teal,   bg: C.tealTint,   label: "Status" },
  photo:    { icon: ImageIcon,     c: C.coral,  bg: C.coralTint,  label: "Photo" },
  video:    { icon: Play,          c: C.purple, bg: C.purpleTint, label: "Video" },
  resource: { icon: FileText,      c: C.amber,  bg: C.amberTint,  label: "Resource" },
};

/** "3h" / "2d" / "Mar 4". The server returns an ISO timestamp — computing this
    there would be wrong for anyone in another timezone and uncacheable. */
export const relTime = (iso) => {
  if (!iso) return "now";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "now";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  if (mins < 10080) return `${Math.floor(mins / 1440)}d`;
  return new Date(then).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

/** The fallback tile behind media that hasn't loaded, and the whole visual for
    a post with no file attached. Deterministic, so a post always looks the same. */
const art = (seed, kind) => {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const palettes = [["#5B4FCF", "#2D2580"], ["#0F6E56", "#1A5F6E"], ["#D85A30", "#BA7517"], ["#2D2580", "#5B4FCF"]];
  const [a, b] = palettes[h % palettes.length];
  const r = (n) => ((h >>> n) & 63) / 63;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="320" height="200" fill="url(#g)"/>
    <g fill="#FFFFFF" opacity=".14">
      <rect x="${18 + r(2) * 150}" y="${10 + r(5) * 60}" width="${60 + r(8) * 90}" height="${60 + r(11) * 70}"/>
      <circle cx="${40 + r(14) * 240}" cy="${40 + r(17) * 120}" r="${22 + r(20) * 46}"/>
    </g>
    <g fill="#FFFFFF" opacity=".2">
      <rect x="0" y="${150 + r(23) * 30}" width="320" height="2"/>
      <rect x="${r(26) * 300}" y="0" width="2" height="200"/>
    </g>
    ${kind === "video" ? '<circle cx="160" cy="100" r="26" fill="#FFFFFF" opacity=".9"/><polygon points="153,88 153,112 175,100" fill="#1A1A1A"/>' : ""}
  </svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

/**
 * `onEngage` records the view. It fires on the first play of a video or on
 * opening a file — before real media existed the only way to register a view
 * was the "WATCH · +5 XP" button, and now that the video plays inline most
 * people will never press it.
 */
const MediaBlock = ({ post, height = 168, onEngage }) => {
  if (post.kind === "status") return null;
  if (post.kind === "resource") {
    const inner = (
      <>
        <div style={{ width: 40, height: 46, background: C.amberTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileText size={18} color={C.amber} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis" }}>{post.title}</div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, marginTop: 3 }}>
            {(post.fileKind || "FILE").toUpperCase()}{post.media ? " · TAP TO OPEN" : ""}
          </div>
        </div>
      </>
    );
    const style = { display: "flex", alignItems: "center", gap: 12, marginTop: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12, textDecoration: "none", color: C.ink };
    // A real file gets a real link. Without media this is still the right tile —
    // posts published before uploads existed have none.
    return post.media?.url
      ? <a href={post.media.url} target="_blank" rel="noopener noreferrer" onClick={e => { e.stopPropagation(); onEngage?.(); }} style={style}>{inner}</a>
      : <div style={style}>{inner}</div>;
  }

  const fallback = { backgroundImage: art(post.id, post.kind), backgroundSize: "cover", backgroundPosition: "center" };

  if (post.kind === "video" && post.media?.url) return (
    // The poster is the frame grabbed at upload time — the same image a shared
    // link unfurls with, so the card and the preview show the same thing.
    <video src={post.media.url} poster={post.media.posterUrl || undefined} controls preload="metadata" playsInline
      onClick={e => e.stopPropagation()} onPlay={() => onEngage?.()}
      style={{ marginTop: 10, width: "100%", height, borderRadius: 12, background: C.ink, objectFit: "cover", display: "block" }} />
  );

  if (post.kind === "photo" && post.media?.url) return (
    // The generated tile sits behind the image so there's no white flash while
    // it loads.
    <div style={{ marginTop: 10, height, borderRadius: 12, overflow: "hidden", ...fallback }}>
      <img src={post.media.url} alt={post.title || ""} loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );

  return (
    <div style={{ marginTop: 10, height, borderRadius: 12, overflow: "hidden", position: "relative", ...fallback }}>
      {post.kind === "video" && post.mins && (
        <span style={{ position: "absolute", bottom: 8, right: 10, fontFamily: F.mono, fontSize: 10, color: C.white, background: "rgba(0,0,0,.45)", padding: "3px 7px", borderRadius: 6 }}>{post.mins}</span>
      )}
    </div>
  );
};

/**
 * Who this post is for, on the author's own copy of it.
 *
 * This used to be an 8px badge wedged into the like/comment/share row, which
 * read as a status label rather than the switch it is. It gets its own row and
 * says what tapping does, because "make this public" is the whole reason a
 * mentor opens their feed after posting.
 *
 * Rendered only where `onVisibility` is wired, which is the same thing as "this
 * is the author looking at their own post" — `mine` also carries "don't award
 * XP for this", which is true on other people's profiles too.
 */
const VisibilityRow = ({ isPublic, onChange, busy }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "9px 11px",
    borderRadius: 10, background: isPublic ? C.tealTint : "#EFEEEA",
  }}>
    {isPublic ? <Globe size={14} color={C.teal} /> : <Lock size={14} color={C.gray} />}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: isPublic ? C.teal : C.ink }}>
        {isPublic ? "Public" : "Private"}
      </div>
      <div style={{ fontSize: 11.5, color: C.gray, marginTop: 1, lineHeight: 1.35 }}>
        {isPublic
          ? "Anyone with the link can open this, and it shows on your profile."
          : "Only your cohort, inside Ryzn. The share link won’t open for anyone else."}
      </div>
    </div>
    <button type="button" disabled={busy} onClick={() => onChange(isPublic ? "cohort" : "public")}
      style={{
        flexShrink: 0, border: `1px solid ${isPublic ? C.teal : "#CFCDC7"}`, background: C.white,
        cursor: busy ? "default" : "pointer", borderRadius: 999, padding: "6px 11px",
        fontFamily: F.sans, fontWeight: 600, fontSize: 12, color: isPublic ? C.teal : C.ink,
        opacity: busy ? 0.6 : 1, whiteSpace: "nowrap",
      }}>
      {busy ? "Saving…" : isPublic ? "Make private" : "Make public"}
    </button>
  </div>
);

/**
 * A post another mentor pulled into this Orbit.
 *
 * Sits above the byline rather than replacing it, because the byline is still
 * true: the post has one author, and relaying it does not make it somebody
 * else's. This line says who put it in front of you and nothing more.
 */
const RelayRow = ({ by }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, fontFamily: F.mono, fontSize: 9, letterSpacing: 0.6, color: C.purple }}>
    <Repeat2 size={12} color={C.purple} />
    {(by?.name ? `${by.name.split(" ")[0].toUpperCase()} ADDED THIS TO YOUR ORBIT` : "ADDED TO YOUR ORBIT")}
  </div>
);

/**
 * One post. `mine` renders the mentor's own view (stats; self-likes stay blocked).
 *
 * `onAmplify(post, next)` is the mentor-network control: it appears only where
 * a caller wired it, which is the same thing as "the viewer is a mentor looking
 * at a peer's public post". `amplified` is the current state of that toggle.
 */
export const PostCard = ({
  post, author, authorId, tier, mine, reacted, onReact, onOpen, done,
  onAuthor, onShare, onVisibility, onAmplify, amplified, toast, highlight,
}) => {
  const meta = KIND_META[post.kind] || KIND_META.status;
  const Icon = meta.icon;
  const openable = post.kind === "video" || post.kind === "resource";
  const [commentsOpen, setCommentsOpen] = useState(!!highlight);
  const [thread, setThread] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments ?? 0);
  const [sharing, setSharing] = useState(false);
  // Local reaction count so an optimistic like bumps the number once — without
  // the old `reactions + (reacted ? 1 : 0)` double-count after a refresh.
  const [reactionCount, setReactionCount] = useState(post.reactions ?? 0);
  const [liked, setLiked] = useState(!!reacted);
  const [liking, setLiking] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [relayed, setRelayed] = useState(!!amplified);
  const [relaying, setRelaying] = useState(false);

  useEffect(() => { setCommentCount(post.comments ?? 0); }, [post.comments]);
  useEffect(() => { setReactionCount(post.reactions ?? 0); }, [post.reactions]);
  useEffect(() => { setLiked(!!reacted); }, [reacted]);
  useEffect(() => { setRelayed(!!amplified); }, [amplified]);

  const loadThread = async () => {
    setLoadingComments(true);
    try {
      const { comments } = await fetchComments(post.id);
      setThread(comments || []);
    } catch (e) {
      toast?.(e.message || "Couldn’t load comments.");
      setThread([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next && thread === null) loadThread();
  };

  const submitComment = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const { comment, comments } = await addComment(post.id, text);
      setThread((t) => [...(t || []), comment]);
      setCommentCount(comments ?? (commentCount + 1));
      setDraft("");
    } catch (e) {
      toast?.(e.message || "Couldn’t post that comment.");
    } finally {
      setBusy(false);
    }
  };

  const likePost = async () => {
    if (liking || liked) return;
    if (mine) {
      toast?.("You can’t like your own post");
      return;
    }
    if (!onReact) return;
    setLiking(true);
    setLiked(true);
    setReactionCount((n) => n + 1);
    try {
      const res = await onReact(post.id);
      if (res?.self) {
        setLiked(false);
        setReactionCount((n) => Math.max(0, n - 1));
        toast?.("You can’t like your own post");
      }
    } catch (e) {
      setLiked(false);
      setReactionCount((n) => Math.max(0, n - 1));
      toast?.(e.message || "Couldn’t like that.");
    } finally {
      setLiking(false);
    }
  };

  const likeComment = async (commentId) => {
    const row = thread?.find((c) => c.id === commentId);
    if (!row || row.reacted) return;
    setThread((rows) => (rows || []).map((c) => (
      c.id === commentId
        ? { ...c, reacted: true, reactions: (c.reactions ?? 0) + 1 }
        : c
    )));
    try {
      const res = await reactToComment(post.id, commentId);
      if (typeof res?.reactions === "number") {
        setThread((rows) => (rows || []).map((c) => (
          c.id === commentId ? { ...c, reactions: res.reactions, reacted: true } : c
        )));
      }
    } catch (e) {
      setThread((rows) => (rows || []).map((c) => (
        c.id === commentId
          ? { ...c, reacted: false, reactions: Math.max(0, (c.reactions ?? 1) - 1) }
          : c
      )));
      toast?.(e.message || "Couldn’t like that comment.");
    }
  };

  const isPublic = isPublicPost(post);

  const flipVisibility = async (to) => {
    if (flipping) return;
    setFlipping(true);
    try { await onVisibility(post.id, to); } finally { setFlipping(false); }
  };

  const share = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      if (onShare) await onShare(post);
      else {
        const how = await sharePostLink(post, {
          title: post.title || `${author} on Ryzn`,
          text: post.text || `${author} on Ryzn`,
        });
        if (how !== "copied") toast?.("Shared");
        // A cohort link still needs a sign-in at the other end. Saying so here
        // is the difference between a link that works and one that dead-ends.
        else if (isPublic) toast?.("Public link copied — anyone can open it");
        else if (mine) toast?.("Link copied — set this post to Public for a link anyone can open");
        else toast?.("Link copied — your Orbit can open it in Ryzn");
      }
    } catch (e) {
      toast?.(e.message || "Couldn’t share that.");
    } finally {
      setSharing(false);
    }
  };

  const openAuthor = () => onAuthor?.({ id: authorId || post.authorId, name: author });

  /* Optimistic, then corrected by the server's answer — the write is
     idempotent, so a double tap costs nothing and a failure just puts the
     button back. */
  const toggleRelay = async () => {
    if (relaying) return;
    const next = !relayed;
    setRelaying(true);
    setRelayed(next);
    try {
      await onAmplify(post, next);
    } catch (e) {
      setRelayed(!next);
      toast?.(e.message || "Couldn’t change that.");
    } finally {
      setRelaying(false);
    }
  };

  return (
    <Card style={{
      padding: 14,
      ...(highlight ? { boxShadow: `0 0 0 2px ${C.purple}` } : null),
    }}>
      {post.amplifiedBy && <RelayRow by={post.amplifiedBy} />}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={openAuthor} disabled={!onAuthor}
          style={{ border: "none", background: "none", padding: 0, cursor: onAuthor ? "pointer" : "default", flexShrink: 0 }}>
          <Monogram name={author} size={38} bg={C.purple} color={C.white} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {onAuthor ? (
              <button type="button" onClick={openAuthor} style={{
                border: "none", background: "none", padding: 0, cursor: "pointer",
                fontWeight: 700, fontSize: 14, color: C.ink, fontFamily: F.sans, textAlign: "left",
              }}>{author}</button>
            ) : (
              <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>{author}</span>
            )}
            {mine && <span style={{ fontSize: 13, color: C.gray, fontWeight: 600 }}>· you</span>}
            {tier && <Crown size={11} color={C.purple} />}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
            {post.pinned && <><Pin size={9} color={C.purple} /> </>}{relTime(post.createdAt).toUpperCase()} · {meta.label.toUpperCase()}
          </div>
        </div>
        <div style={{ width: 28, height: 28, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={13} color={meta.c} />
        </div>
      </div>

      {post.title && post.kind !== "resource" && <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15, marginTop: 11 }}>{post.title}</div>}
      {post.text && <div style={{ fontSize: 13.5, lineHeight: 1.55, color: post.title && post.kind !== "resource" ? C.gray : C.ink, marginTop: post.title && post.kind !== "resource" ? 4 : 11 }}>{post.text}</div>}
      {/* Not for the author: a mentor playing back their own video shouldn't
          count as a view of it. */}
      <MediaBlock post={post} onEngage={mine ? undefined : () => !done && onOpen?.(post)} />

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
        <button type="button" onClick={likePost}
          title={mine ? "You can’t like your own post" : (liked ? "Liked" : "Like")}
          disabled={liking}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none",
            cursor: mine || liked ? "default" : "pointer", padding: "6px 10px", borderRadius: 10,
            fontFamily: F.mono, fontSize: 11, fontWeight: 700,
            color: liked ? C.coral : C.gray,
          }}>
          <Heart size={15} color={liked ? C.coral : "#A5A39D"} fill={liked ? C.coral : "none"} />
          {reactionCount}
        </button>
        <button type="button" onClick={toggleComments} style={{
          display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: commentsOpen ? C.purpleTint : "none",
          cursor: "pointer", padding: "6px 10px", borderRadius: 10,
          fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: commentsOpen ? C.purple : C.gray,
        }}>
          <MessageCircle size={15} color={commentsOpen ? C.purple : "#A5A39D"} /> {commentCount}
        </button>
        <button type="button" onClick={share} disabled={sharing} style={{
          display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none",
          cursor: sharing ? "default" : "pointer", padding: "6px 10px", borderRadius: 10,
          fontFamily: F.mono, fontSize: 11, fontWeight: 700, color: C.gray,
        }}>
          <Share2 size={15} color="#A5A39D" /> Share
        </button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: "auto", fontFamily: F.mono, fontSize: 11, color: C.gray, padding: "6px 4px" }}
          title={mine && post.publicViews ? `${post.publicViews} of these came from the public link` : undefined}>
          <Eye size={14} color="#A5A39D" /> {post.views + (mine ? (post.publicViews || 0) : 0)}
        </span>
        {!mine && openable && (
          <button type="button" onClick={() => onOpen(post)} style={{
            fontFamily: F.mono, fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer",
            padding: "7px 11px", borderRadius: 10, background: done ? C.tealTint : meta.bg, color: done ? C.teal : meta.c, whiteSpace: "nowrap",
          }}>{done ? "✓ DONE" : `${post.kind === "video" ? "WATCH" : "OPEN"} · +${post.xp} XP`}</button>
        )}
      </div>

      {/* Who the link works for. A shareable link is exactly what "public"
          means now, so the author reads it as a sentence and flips it here
          rather than decoding a badge. */}
      {mine && onVisibility && <VisibilityRow isPublic={post.visibility === "public"} busy={flipping} onChange={flipVisibility} />}

      {/* The mentor-network control. Given its own row for the same reason
          VisibilityRow has one: "my cohort will read this" is a decision about
          other people, not a toggle to squeeze in beside the like button. */}
      {onAmplify && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: "9px 11px",
          borderRadius: 10, background: relayed ? C.purpleTint : "#EFEEEA",
        }}>
          <Repeat2 size={14} color={relayed ? C.purple : C.gray} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: relayed ? C.purple : C.ink }}>
              {relayed ? "In your Orbit" : "Not in your Orbit"}
            </div>
            <div style={{ fontSize: 11.5, color: C.gray, marginTop: 1, lineHeight: 1.35 }}>
              {relayed
                ? `Your mentees see this alongside your own posts, credited to ${firstNameOf(author)}.`
                : "Add it and every mentee in your cohort reads it — the post stays theirs."}
            </div>
          </div>
          <button type="button" disabled={relaying} onClick={toggleRelay}
            style={{
              flexShrink: 0, border: `1px solid ${relayed ? C.purple : "#CFCDC7"}`, background: C.white,
              cursor: relaying ? "default" : "pointer", borderRadius: 999, padding: "6px 11px",
              fontFamily: F.sans, fontWeight: 600, fontSize: 12, color: relayed ? C.purple : C.ink,
              opacity: relaying ? 0.6 : 1, whiteSpace: "nowrap",
            }}>
            {relaying ? "Saving…" : relayed ? "Remove" : "Add to Orbit"}
          </button>
        </div>
      )}

      {commentsOpen && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          {loadingComments && (
            <div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, letterSpacing: 0.6 }}>LOADING…</div>
          )}
          {!loadingComments && thread && thread.length === 0 && (
            <div style={{ fontSize: 12.5, color: C.gray, marginBottom: 10 }}>No comments yet — start the thread.</div>
          )}
          {!loadingComments && thread?.map((c) => (
            <div key={c.id} style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <Monogram name={c.authorName} size={28} bg={C.surface} color={C.ink} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 13 }}>{c.authorName}</span>
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D" }}>{relTime(c.createdAt)}</span>
                </div>
                <div style={{ fontSize: 13.5, lineHeight: 1.45, marginTop: 2, color: C.ink }}>{c.text}</div>
                <button type="button" onClick={() => likeComment(c.id)}
                  title={c.reacted ? "Liked" : "Like comment"}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "none",
                    cursor: c.reacted ? "default" : "pointer", padding: "4px 0", marginTop: 4,
                    fontFamily: F.mono, fontSize: 10, fontWeight: 700,
                    color: c.reacted ? C.coral : C.gray,
                  }}>
                  <Heart size={12} color={c.reacted ? C.coral : "#A5A39D"} fill={c.reacted ? C.coral : "none"} />
                  {c.reactions ?? 0}
                </button>
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
              maxLength={500}
              placeholder="Write a comment…"
              style={{
                flex: 1, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px",
                fontFamily: F.sans, fontSize: 13.5, background: C.surface, outline: "none", color: C.ink,
              }}
            />
            <Btn small disabled={!draft.trim() || busy} onClick={submitComment}>
              <Send size={13} /> {busy ? "…" : "Post"}
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
};

/** Compose box. One text field, four kinds, visibility, one button. */
export const Composer = ({ onPublish, name, userId }) => {
  const [kind, setKind] = useState("status");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [media, setMedia] = useState(null);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(null);
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [visibility, setVisibility] = useState("cohort");
  const fileRef = useRef(null);

  const needsFile = kind === "photo" || kind === "video" || kind === "resource";
  const needsTitle = kind === "video" || kind === "resource";
  const uploading = progress !== null;
  const ready = !uploading && !busy && (
    kind === "photo" ? !!media : needsTitle ? title.trim() && media : text.trim()
  );

  const reset = () => {
    setText(""); setTitle(""); setMedia(null); setFileName(""); setProgress(null);
    setErr(null); setKind("status"); setVisibility("cohort");
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setErr(null); setFileName(file.name); setProgress(0);
    try {
      setMedia(await uploadMedia(file, kind === "video" ? "video" : kind, setProgress, userId));
    } catch (e2) {
      setErr(e2?.message || "That upload didn’t finish.");
      setFileName("");
    } finally { setProgress(null); }
  };

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    await uploadFile(file);
  };

  const go = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await onPublish({ kind, text: text.trim(), title: title.trim(), media, visibility });
      reset();
    } catch (e2) {
      setErr(e2?.message || "Couldn’t publish that.");
    } finally { setBusy(false); }
  };

  const placeholder = {
    status: "Say the thing. Your whole Orbit reads it.",
    photo: "Add a line about this photo…",
    video: "Optional note for your cohort…",
    resource: "Why they should open it…",
  }[kind];

  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Monogram name={name} size={38} bg={C.purple} color={C.white} />
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: F.sans, fontSize: 14, lineHeight: 1.5, color: C.ink, paddingTop: 8, minWidth: 0 }} />
      </div>

      {needsTitle && (
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={kind === "video" ? "Video title — e.g. “How to ask for an intro”" : "Resource title — e.g. “Cover letter template”"}
          style={{ width: "100%", marginTop: 8, border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 12px", fontFamily: F.sans, fontSize: 13.5, background: C.surface, outline: "none", boxSizing: "border-box" }} />
      )}

      {needsFile && (
        <>
          <input ref={fileRef} type="file" accept={ACCEPT[kind]} onChange={pick} style={{ display: "none" }} />
          {uploading ? (
            <div style={{ marginTop: 8, background: C.surface, borderRadius: 12, padding: "11px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.gray }}>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
                <span style={{ fontFamily: F.mono, flexShrink: 0, paddingLeft: 8 }}>{Math.round(progress)}%</span>
              </div>
              <div style={{ marginTop: 8 }}><Bar pct={progress / 100} /></div>
            </div>
          ) : media ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, background: C.tealTint, borderRadius: 12, padding: "10px 12px" }}>
              <Check size={14} color={C.teal} strokeWidth={3} />
              <span style={{ fontSize: 12.5, color: C.teal, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</span>
              <button onClick={() => { setMedia(null); setFileName(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.mono, fontSize: 9.5, color: C.teal, fontWeight: 700, flexShrink: 0 }}>REMOVE</button>
            </div>
          ) : (
            kind === "video" ? (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => setCaptureOpen(true)} style={{
                  flex: 1, border: `1.5px dashed ${C.purple}`, borderRadius: 12, padding: "12px 0", cursor: "pointer",
                  background: C.purpleTint, fontFamily: F.sans, fontWeight: 600, fontSize: 13, color: C.purple,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}><Play size={14} /> Record or upload</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{
                width: "100%", marginTop: 8, border: `1.5px dashed ${C.line}`, borderRadius: 12, padding: "12px 0", cursor: "pointer",
                background: C.surface, fontFamily: F.sans, fontWeight: 600, fontSize: 13, color: C.gray,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}><Upload size={14} /> {kind === "photo" ? "Add a photo" : "Attach a file"}</button>
            )
          )}
        </>
      )}

      {captureOpen && (
        <VideoCaptureModal
          title="Add a video to your post"
          hint="Record with your camera, or upload a clip from your device."
          onClose={() => setCaptureOpen(false)}
          onDone={async (captured) => {
            setCaptureOpen(false);
            await uploadFile(captureToFile(captured));
          }}
        />
      )}

      {err && <div style={{ marginTop: 8, fontSize: 12.5, color: C.coral, lineHeight: 1.45 }}>{err}</div>}

      <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 10, padding: 3, marginTop: 12, maxWidth: 260 }}>
        {[["cohort", "Private"], ["public", "Public"]].map(([id, l]) => (
          <button key={id} type="button" disabled={uploading} onClick={() => setVisibility(id)} style={{
            flex: 1, border: "none", cursor: uploading ? "default" : "pointer", borderRadius: 8, padding: "7px 0",
            fontFamily: F.sans, fontWeight: 600, fontSize: 12.5,
            background: visibility === id ? C.white : "transparent",
            color: visibility === id ? (id === "public" ? C.teal : C.ink) : C.gray,
          }}>{l}</button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: C.gray, marginTop: 6, lineHeight: 1.4 }}>
        {visibility === "public"
          ? "Anyone with the link can open this — including people outside Ryzn."
          : "Only your cohort can see this inside Ryzn. You can flip it to Public later."}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {Object.entries(KIND_META).map(([id, m]) => {
          const on = kind === id, Icon = m.icon;
          return (
            <button key={id} disabled={uploading} onClick={() => { setKind(id); setMedia(null); setFileName(""); setErr(null); setCaptureOpen(false); }} style={{
              display: "inline-flex", alignItems: "center", gap: 5, border: "none", cursor: uploading ? "default" : "pointer", borderRadius: 10,
              padding: "7px 10px", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5,
              background: on ? m.bg : "transparent", color: on ? m.c : C.gray, opacity: uploading && !on ? 0.5 : 1,
            }}><Icon size={13} />{m.label}</button>
          );
        })}
        <Btn small style={{ marginLeft: "auto" }} disabled={!ready} onClick={go}>
          <Send size={13} /> {busy ? "Posting…" : uploading ? "Uploading…" : "Post"}
        </Btn>
      </div>
    </Card>
  );
};

/**
 * The greeting video — the first thing a new mentee sees, so it's pinned and
 * kept separate from the composer.
 *
 * `onDone(media)` publishes it as a pinned `greeting` post. This used to be a
 * button that set a boolean to true: the checklist ticked, +15 Impact toasted,
 * and no video existed anywhere.
 */
function GreetingCard({ onDone, userId }) {
  const [progress, setProgress] = useState(null);
  const [err, setErr] = useState(null);
  const [captureOpen, setCaptureOpen] = useState(false);

  const uploadGreetingFile = async (file) => {
    if (!file) return;
    setErr(null); setProgress(0);
    try {
      const media = await uploadMedia(file, "video", setProgress, userId);
      await onDone(media);
    } catch (e2) {
      setErr(e2?.message || "That upload didn’t finish.");
    } finally { setProgress(null); }
  };

  return (
    <Card style={{ border: `1.5px dashed ${C.purple}` }}>
      <Label color={C.purple}>Greeting video · pinned to the top of your Orbit</Label>
      <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>60–90 seconds. Who you are, who you help, one honest reason you’re here. Mentees who watch a greeting are twice as likely to finish Stage 1.</div>
      {progress !== null ? (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.gray }}>
            <span>Uploading…</span><span style={{ fontFamily: F.mono }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ marginTop: 8 }}><Bar pct={progress / 100} /></div>
        </div>
      ) : (
        <Btn style={{ marginTop: 12 }} onClick={() => setCaptureOpen(true)}><Play size={15} /> Record or upload greeting · +25 Impact</Btn>
      )}
      {err && <div style={{ marginTop: 8, fontSize: 12.5, color: C.coral, lineHeight: 1.45 }}>{err}</div>}
      {captureOpen && (
        <VideoCaptureModal
          title="Record your greeting"
          hint="60–90 seconds. Who you are, who you help, one honest reason you're here."
          onClose={() => setCaptureOpen(false)}
          onDone={async (captured) => {
            setCaptureOpen(false);
            await uploadGreetingFile(captureToFile(captured));
          }}
        />
      )}
    </Card>
  );
}

/* ————————————————— MENTOR: your feed ————————————————— */

export const MentorFeed = ({
  u, name, userId, feed, amplified = [], publish, greetingUp, uploadGreeting,
  toast, onAuthor, onVisibility, onAmplify, openNetwork, highlightPostId,
  followers = 0, onPin, onDelete, go,
}) => {
  const views = feed.reduce((a, p) => a + p.views, 0);
  const reactions = feed.reduce((a, p) => a + p.reactions, 0);
  const reach = u.cohort ? u.cohort.length : 0;
  /* Studio and Public view are two segments of one screen, not two screens: a
     mentor who cannot see their profile the way a stranger does keeps writing
     for an audience they are imagining. */
  const [seg, setSeg] = useState("Studio");

  if (seg === "Public view") {
    return (
      <div>
        <HeaderRow title="Your feed" right={<Label color={C.purple}>AS OTHERS SEE IT</Label>} />
        <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <StudioSeg value={seg} onChange={setSeg} />
          <Card style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar src={u.avatarUrl} name={name} size={46} radius={14} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 16 }}>{name}</div>
              {u.headline && <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2 }}>{u.headline}</div>}
              <div style={{ fontFamily: F.mono, fontSize: 9, color: C.purple, marginTop: 4, letterSpacing: 0.6 }}>
                {Number(followers).toLocaleString()} FOLLOWER{followers === 1 ? "" : "S"}
              </div>
            </div>
          </Card>
          {u.why && (
            <Card>
              <Label color={C.purple}>Why I mentor</Label>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, marginTop: 7 }}>{u.why}</div>
            </Card>
          )}
          {/* The same post components, read-only. That is what makes this a
              preview rather than a mock of one. */}
          {feed.length === 0
            ? <StudioEmpty />
            : feed.map(p => (
                <PostCard key={p.id} post={p} author={name} authorId={userId} tier readOnly toast={toast} />
              ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeaderRow title="Your feed" right={<Label color={C.purple}>+10 IMPACT PER POST</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <StudioSeg value={seg} onChange={setSeg} />
        <StudioStats inOrbit={reach} followers={followers} views={views} reactions={reactions} />

        <ProfileStrength u={u} hasGreeting={greetingUp} postCount={feed.length} onGo={go} />

        {!greetingUp && <GreetingCard onDone={uploadGreeting} userId={userId} />}

        <div data-tour="mentor-feed-compose">
          <Composer name={name} userId={userId} onPublish={publish} />
        </div>

        {/* The other half of the feed: what other mentors wrote and you chose
            to put in front of your cohort. Kept in its own section rather than
            mixed into your posts — your mentees see one Orbit, but you should
            always be able to tell what you wrote from what you relayed. */}
        {openNetwork && (
          <Card onClick={openNetwork} style={{ padding: 13, cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 34, height: 34, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Repeat2 size={15} color={C.purple} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 13.5 }}>Mentor network</div>
                <div style={{ fontSize: 11.5, color: C.gray, marginTop: 2 }}>
                  {amplified.length
                    ? `${amplified.length} post${amplified.length === 1 ? "" : "s"} from other mentors in your Orbit`
                    : "Follow other mentors and add their posts to your Orbit"}
                </div>
              </div>
            </div>
          </Card>
        )}

        {amplified.length > 0 && (
          <>
            <Label color={C.purple}>From mentors you follow · {amplified.length}</Label>
            {amplified.map(p => (
              <PostCard key={p.id} post={{ ...p, amplifiedBy: null }} author={p.authorName} authorId={p.authorId}
                tier toast={toast} onAuthor={onAuthor} onAmplify={onAmplify} amplified />
            ))}
            <Label>Your own posts · {feed.length}</Label>
          </>
        )}

        {feed.length === 0 ? <StudioEmpty /> : (
          feed.map(p => (
            <div key={p.id} style={{ position: "relative" }}>
              {/* Pin and Delete behind the overflow, never beside Publish. */}
              {(onPin || onDelete) && (
                <div style={{ position: "absolute", top: 12, right: 12, zIndex: 5 }}>
                  <PostOverflow post={p} onPin={onPin} onDelete={onDelete} />
                </div>
              )}
              <PostCard post={p} author={name} authorId={userId} tier mine
                toast={toast} onAuthor={onAuthor} onVisibility={onVisibility} highlight={highlightPostId === p.id} />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ————————————————— MENTEE: the Orbit ————————————————— */

/**
 * The posts-and-resources body, shared by the mentee's Orbit and the mentor's
 * own "Public view".
 *
 * Shared on purpose: the mentor's public view used to be a separate mock that
 * showed a post *count* and nothing else, so "preview" was previewing something
 * no mentee would ever see. Rendering the same component in both places is what
 * makes the preview true.
 *
 * `readOnly` drops the XP buttons and reactions — a mentor looking at their own
 * profile can't collect XP for their own content.
 *
 * `authorName` / `authorId` are the whose-feed-is-this fallback. A post that
 * carries its own author — anything a mentor relayed from a peer — keeps it,
 * because attributing someone else's post to the mentor showing it would be a
 * lie the amplification feature exists to avoid.
 */
export const ContentTabs = ({
  feed = [], authorName, authorId, view, watched = {}, onWatch, reacted = {}, onReact,
  emptyText, readOnly, toast, onAuthor, onAmplify, highlightPostId,
}) => {
  const resources = feed.filter(p => p.kind === "video" || p.kind === "resource");
  const list = view === "feed" ? feed : resources;

  if (list.length === 0) return (
    <Card style={{ textAlign: "center", padding: 26 }}>
      <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.5 }}>
        {view === "feed" ? emptyText : "No videos or files yet."}
      </div>
    </Card>
  );

  if (view === "feed") return list.map(p => (
    <PostCard key={p.id} post={p} author={p.authorName || authorName} authorId={p.authorId || authorId}
      tier mine={readOnly && !p.authorName}
      reacted={!!reacted[p.id]} onReact={onReact}
      onOpen={() => onWatch?.(p.id, p.xp)} done={!!watched[p.id]}
      toast={toast} onAuthor={onAuthor}
      onAmplify={onAmplify} amplified={p.amplified}
      highlight={highlightPostId === p.id} />
  ));

  return list.map(p => {
    const meta = KIND_META[p.kind], Icon = meta.icon, done = watched[p.id];
    const open = () => (p.media?.url ? window.open(p.media.url, "_blank", "noopener") : onWatch?.(p.id, p.xp));
    return (
      <Card key={p.id}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 40, height: 40, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={16} color={meta.c} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>{p.title}</div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 3 }}>{(p.mins || p.fileKind || "FILE").toUpperCase()} · {p.views} VIEWS</div>
          </div>
          {readOnly ? (
            <span style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D" }}>+{p.xp} XP</span>
          ) : (
            <button onClick={() => { onWatch?.(p.id, p.xp); open(); }} style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", padding: "7px 10px", borderRadius: 10, background: done ? C.tealTint : meta.bg, color: done ? C.teal : meta.c, whiteSpace: "nowrap" }}>{done ? "✓ DONE" : `+${p.xp} XP`}</button>
          )}
        </div>
      </Card>
    );
  });
};

/** Segmented Feed | Resources control, so both screens label them identically. */
export const ContentTabBar = ({ view, setView, count }) => (
  <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4 }}>
    {[["feed", "Feed"], ["resources", `Resources · ${count}`]].map(([id, l]) => (
      <button key={id} onClick={() => setView(id)} style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: view === id ? C.white : "transparent", color: view === id ? C.ink : C.gray }}>{l}</button>
    ))}
  </div>
);

/**
 * One mentor's Orbit: their posts, their program, the way into their thread.
 *
 * It takes the mentor as a prop rather than reading `u.mentorId` off the
 * signed-in user, which is what makes a second and third Orbit possible at all
 * — the mentee holds up to three and each renders this same screen with a
 * different mentor, feed and program. Nothing here is the mentee's own
 * progress; that lives on Home and does not change when they switch Orbits.
 */
export const OrbitScreen = ({ mentor, stage1, feed = [], program, watched, onWatch, reacted, onReact, openDm, back, go, toast, onAuthor, highlightPostId }) => {
  const [view, setView] = useState("feed");
  const resources = useMemo(() => feed.filter(p => p.kind === "video" || p.kind === "resource"), [feed]);
  if (!mentor) return (
    <div>
      <HeaderRow title="Orbit" onBack={back} />
      <div style={{ padding: "0 20px 20px" }}>
        <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>No mentor yet</div>
          <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>Once you’re matched, everything your mentor posts lands here.</div>
        </Card>
      </div>
    </div>
  );
  const first = mentor.name.split(" ")[0];
  const reviewed = resources.filter(p => watched[p.id]).length;
  const phases = program?.phases || [];
  const completedIds = program?.completedPhaseIds || [];

  const openMentorProfile = () => onAuthor?.({
    id: mentor.id,
    name: mentor.name,
    headline: mentor.headline,
    avatarUrl: mentor.avatarUrl,
    tier: mentor.tier,
    matchState: "accepted",
  });

  return (
    <div>
      <HeaderRow title={`${first}’s Orbit`} onBack={back} right={<Label color={C.teal}>{reviewed}/{resources.length} REVIEWED</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Card style={{ background: C.ink, border: "none", color: C.white, padding: 20, cursor: onAuthor ? "pointer" : "default" }} onClick={openMentorProfile}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar src={mentor.avatarUrl} name={mentor.name} size={54} bg={C.purple} color={C.white} radius={0} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700 }}>{mentor.name}</div>
              {mentor.headline && <div style={{ fontSize: 12.5, color: "#B5B3AE" }}>{mentor.headline}</div>}
              {mentor.tier && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.purple, padding: "4px 9px", marginTop: 7, fontFamily: F.mono, fontSize: 9, letterSpacing: 1 }}><Crown size={11} /> {mentor.tier.toUpperCase()} MENTOR</div>}
            </div>
          </div>
          {/* Was a hard-coded "847 IMPACT · 11 GRADUATED" beside whoever the
              mentee's real mentor is — the mentor's own numbers attributed
              wrongly. Only the post count is knowable here. */}
          <div style={{ display: "flex", gap: 26, marginTop: 16 }}>
            <div><div style={{ fontFamily: F.sans, fontSize: 20, fontWeight: 700, color: "#B7AFF2" }}>{feed.length}</div><div style={{ fontFamily: F.mono, fontSize: 8, color: "#8B8985", letterSpacing: 1 }}>POSTS</div></div>
          </div>
        </Card>

        {stage1 ? (
          <Card style={{ background: C.tealTint, border: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MessageCircle size={16} color={C.white} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, color: C.teal }}>Direct Connect · earned</div>
              <div style={{ fontSize: 12, color: C.teal, opacity: 0.85 }}>{first} replies within a day.</div>
            </div>
            <Btn small style={{ background: C.teal }} onClick={openDm}><MessageCircle size={13} /> Message</Btn>
          </Card>
        ) : (
          <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Lock size={16} color={C.gray} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14 }}>Direct Connect is earned, not given</div>
                <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2, lineHeight: 1.45 }}>The Orbit is open to you now — everything {first} posts, plus every resource. Finish Stage 1 and messaging unlocks too.</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><Bar pct={0} /></div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 5 }}>STAGE 1 · 0 OF 1 EXERCISES DONE</div>
            <Btn kind="dark" style={{ marginTop: 12 }} onClick={go}>Do today’s exercise · 6 min</Btn>
          </Card>
        )}

        {/* This mentor's program, not "the" program — each mentor writes their
            own, so it belongs beside their posts rather than on a Profile that
            has no way to say whose phases these are. */}
        {phases.length > 0 && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label>{first}’s program</Label>
              <Label color={C.teal}>{completedIds.length} OF {phases.length} DONE</Label>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgramTimeline phases={phases} completedIds={completedIds} />
            </div>
          </Card>
        )}

        {/* What this mentor rates but didn't make. Its own section above the
            tabs, not folded into Resources: a mentor's uploaded worksheet and a
            book they swear by are both "resources", but only one of them is a
            recommendation, and a mentee scanning an Orbit is looking for that
            one. Renders nothing at all until there's something on the shelf. */}
        <MentorShelf mentorId={mentor.id} mentorName={mentor.name} toast={toast} />

        <ContentTabBar view={view} setView={setView} count={resources.length} />

        <ContentTabs feed={feed} authorName={mentor.name} authorId={mentor.id} view={view}
          watched={watched} onWatch={onWatch} reacted={reacted} onReact={onReact}
          toast={toast} onAuthor={onAuthor} highlightPostId={highlightPostId}
          emptyText={`${first} hasn’t posted yet. Everything they share lands here first.`} />
      </div>
    </div>
  );
};
