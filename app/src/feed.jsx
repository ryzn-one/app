import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Check, Lock, Crown, Plus, Image as ImageIcon, MessageCircle, Play, FileText,
  Upload, Heart, Eye, Send, Pin, Sparkles, Share2, Globe, Repeat2,
  ArrowRight, UserPlus, Video,
} from "lucide-react";
import { C, F, S } from "./theme.js";
import { StudioStats, ProfileStrength, PostOverflow, StudioSeg, StudioEmpty } from "./studio.jsx";
import { Card, Label, Btn, Chip, Seg, Monogram, Avatar, HeaderRow, Bar, ProgramTimeline, VideoCaptureModal, firstNameOf } from "./ui.jsx";
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

/* ----------------- ORBIT FEED -----------------
   One post model, two screens: the mentor writes it (MentorFeed), the cohort
   reads it (OrbitScreen). Kept to four post kinds on purpose, a mentor who has
   to think about formatting stops posting.
*/

export const KIND_META = {
  status:   { icon: MessageCircle, c: C.teal,   bg: C.tealTint,   label: "Status" },
  photo:    { icon: ImageIcon,     c: C.coral,  bg: C.coralTint,  label: "Photo" },
  video:    { icon: Play,          c: C.purple, bg: C.purpleTint, label: "Video" },
  resource: { icon: FileText,      c: C.amber,  bg: C.amberTint,  label: "Resource" },
};

/** "3h" / "2d" / "Mar 4". The server returns an ISO timestamp, computing this
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
 * opening a file, before real media existed the only way to register a view
 * was the "WATCH · +5 XP" button, and now that the video plays inline most
 * people will never press it.
 */
const MediaBlock = ({ post, height = 168, onEngage }) => {
  if (post.kind === "status") return null;

  /* A file with no preview: the reference's teal slab, which says "there is
     something here to open" in one glance where a grey bordered row did not. */
  if (post.kind === "resource") {
    const inner = (
      <>
        <FileText size={15} color={C.teal} style={{ flexShrink: 0 }} />
        <span style={{ ...S.sb(12.5, "#085041"), flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.title}</span>
        <Chip c={C.teal} bg={C.white}>{(post.fileKind || "FILE").toUpperCase()}</Chip>
      </>
    );
    const style = {
      display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: C.tealTint,
      borderRadius: 12, padding: "12px 14px", textDecoration: "none", color: C.ink,
    };
    // A real file gets a real link. Without media this is still the right tile -
    // posts published before uploads existed have none.
    return post.media?.url
      ? <a href={post.media.url} target="_blank" rel="noopener noreferrer" onClick={e => { e.stopPropagation(); onEngage?.(); }} style={style}>{inner}</a>
      : <div style={style}>{inner}</div>;
  }

  const fallback = { backgroundImage: art(post.id, post.kind), backgroundSize: "cover", backgroundPosition: "center" };

  if (post.kind === "video" && post.media?.url) return (
    // The poster is the frame grabbed at upload time, the same image a shared
    // link unfurls with, so the card and the preview show the same thing.
    <video src={post.media.url} poster={post.media.posterUrl || undefined} controls preload="metadata" playsInline
      onClick={e => e.stopPropagation()} onPlay={() => onEngage?.()}
      style={{ marginBottom: 8, width: "100%", height, borderRadius: 12, background: C.ink, objectFit: "cover", display: "block" }} />
  );

  if (post.kind === "photo" && post.media?.url) return (
    // The generated tile sits behind the image so there's no white flash while
    // it loads.
    <div style={{ marginBottom: 8, height, borderRadius: 12, overflow: "hidden", ...fallback }}>
      <img src={post.media.url} alt={post.title || ""} loading="lazy"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );

  /* A video with no file yet is a titled ink slab, not a blank gradient box:
     the title is the only thing that makes it worth tapping. */
  if (post.kind === "video") return (
    <div style={{ background: C.ink, borderRadius: 12, padding: "22px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
      <span style={{ ...S.sb(13, C.white), minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{post.title || "Video"}</span>
      {post.mins && <Chip c={C.lilac} bg="#2A2A2A">{post.mins}</Chip>}
    </div>
  );

  return <div style={{ marginBottom: 8, height, borderRadius: 12, overflow: "hidden", ...fallback }} />;
};

/* ----------------- the Brief -----------------
   The feed is finite, counted, and ends on purpose. These three pieces are what
   make that legible, and they are shared by the mentee's Brief and the mentor's
   so the two cannot drift: the count and the pips at the top, and the card that
   closes the list and points at the next real thing to do. */

/** Header: "n OF m REVIEWED", the title, and one pip per item. */
export const BriefHeader = ({ title, total, done, sub }) => (
  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, padding: "2px 2px 0" }}>
    <div style={{ minWidth: 0 }}>
      <div style={S.mono(7.5, C.mute)}>{done} OF {total} REVIEWED</div>
      <div style={S.h(19)}>{title}</div>
      {sub && <div style={{ ...S.b(12, C.gray), marginTop: 2 }}>{sub}</div>}
    </div>
    <div style={{ display: "flex", gap: 3, paddingBottom: 4, flexShrink: 0 }}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} style={{
          width: i < done ? 6 : 14, height: 6, borderRadius: 3,
          background: i < done ? "#D8D6D0" : C.purple, transition: "all .25s",
        }} />
      ))}
    </div>
  </div>
);

/** The end of the list. Never an infinite scroll, always a next action. */
export const CaughtUp = ({ line, cta, onCta }) => (
  <Card style={{ textAlign: "center", padding: 24, border: "1.5px dashed #C9C6C0", background: "transparent" }}>
    <Sparkles size={17} color={C.purple} />
    <div style={{ ...S.h(15), marginTop: 8 }}>You’re caught up.</div>
    <div style={{ ...S.b(12, C.gray), marginTop: 3 }}>{line}</div>
    {cta && <Btn kind="purple" small style={{ marginTop: 12 }} onClick={onCta}>{cta} <ArrowRight size={14} /></Btn>}
  </Card>
);

/** The footer line that says why the list stopped. */
export const BriefFooter = ({ children }) => (
  <div style={{ ...S.b(11, C.mute), textAlign: "center", padding: "0 22px 4px" }}>{children}</div>
);

/**
 * Who this post is for, on the author's own copy of it.
 *
 * This used to be an 8px badge wedged into the like/comment/share row, which
 * read as a status label rather than the switch it is. It gets its own row and
 * says what tapping does, because "make this public" is the whole reason a
 * mentor opens their feed after posting.
 *
 * Rendered only where `onVisibility` is wired, which is the same thing as "this
 * is the author looking at their own post", `mine` also carries "don't award
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
  avatarUrl, followers, following, onFollow,
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
  // Local reaction count so an optimistic like bumps the number once, without
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
        else if (isPublic) toast?.("Public link copied, anyone can open it");
        else if (mine) toast?.("Link copied, set this post to Public for a link anyone can open");
        else toast?.("Link copied, your Orbit can open it in Ryzn");
      }
    } catch (e) {
      toast?.(e.message || "Couldn’t share that.");
    } finally {
      setSharing(false);
    }
  };

  const openAuthor = () => onAuthor?.({ id: authorId || post.authorId, name: author });

  /* Optimistic, then corrected by the server's answer, the write is
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

      {/* Byline. Who wrote it, how many people follow them, and what kind of
          thing this is — one line of mono under the name, the way the reference
          does it, rather than a coloured kind-icon parked in the corner. The
          Follow button takes that corner instead, because on a feed the only
          thing worth a tap up here is "more of this person". */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
        <button type="button" onClick={openAuthor} disabled={!onAuthor}
          style={{ border: "none", background: "none", padding: 0, cursor: onAuthor ? "pointer" : "default", flexShrink: 0, lineHeight: 0 }}>
          <Avatar src={avatarUrl} name={author} size={34} radius={11} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
            {onAuthor ? (
              <button type="button" onClick={openAuthor} style={{
                border: "none", background: "none", padding: 0, cursor: "pointer", textAlign: "left",
                ...S.sb(12.5), minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{author}</button>
            ) : (
              <span style={{ ...S.sb(12.5), minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{author}</span>
            )}
            {mine && <span style={S.b(12, C.gray)}>· you</span>}
            {tier && <Crown size={11} color={C.amber} style={{ flexShrink: 0 }} />}
            {post.pinned && <Chip style={{ flexShrink: 0 }}><Pin size={8} /> PINNED</Chip>}
          </div>
          <div style={S.mono(6.5, C.mute)}>
            {typeof followers === "number" ? `${Number(followers).toLocaleString()} FOLLOWERS · ` : ""}
            {relTime(post.createdAt).toUpperCase()} · {meta.label.toUpperCase()}
          </div>
        </div>
        {onFollow ? (
          <Btn small kind={following ? "ghost" : "tint"} onClick={onFollow}>
            {following ? <><Check size={12} /> Following</> : <><UserPlus size={12} /> Follow</>}
          </Btn>
        ) : (
          <div style={{ width: 28, height: 28, borderRadius: 9, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={13} color={meta.c} />
          </div>
        )}
      </div>

      {/* Media above the words for anything with a picture in it, text-first
          only for a status — which is the order the reference reads in. */}
      <MediaBlock post={post} onEngage={mine ? undefined : () => !done && onOpen?.(post)} />
      {post.title && post.kind !== "resource" && post.kind !== "video" && <div style={{ ...S.h(15), marginBottom: 4 }}>{post.title}</div>}
      {post.text && <div style={{ ...S.b(13.5, C.ink), marginBottom: 8 }}>{post.text}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button type="button" onClick={likePost}
          title={mine ? "You can’t like your own post" : (liked ? "Liked" : "Like")}
          disabled={liking}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5, border: "none",
            background: liked ? C.coralTint : "#F1F0EC", color: liked ? C.coral : C.gray,
            cursor: mine || liked ? "default" : "pointer", padding: "5px 11px", borderRadius: 999,
            fontFamily: F.mono, fontSize: 9, fontWeight: 700,
          }}>
          <Heart size={11} color={liked ? C.coral : C.gray} fill={liked ? C.coral : "none"} />
          {reactionCount}
        </button>
        <button type="button" onClick={toggleComments} style={{
          display: "inline-flex", alignItems: "center", gap: 5, border: "none",
          background: commentsOpen ? C.purpleTint : "#F1F0EC", color: commentsOpen ? C.deep : C.gray,
          cursor: "pointer", padding: "5px 11px", borderRadius: 999,
          fontFamily: F.mono, fontSize: 9, fontWeight: 700,
        }}>
          <MessageCircle size={11} /> {commentCount}
        </button>
        <button type="button" onClick={share} disabled={sharing} style={{
          display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "#F1F0EC",
          cursor: sharing ? "default" : "pointer", padding: "5px 11px", borderRadius: 999,
          fontFamily: F.mono, fontSize: 9, fontWeight: 700, color: C.gray,
        }}>
          <Share2 size={11} />
        </button>
        <Chip c={C.gray} bg="#F1F0EC" style={{ fontSize: 9 }}
          title={mine && post.publicViews ? `${post.publicViews} of these came from the public link` : undefined}>
          <Eye size={9} /> {post.views + (mine ? (post.publicViews || 0) : 0)}
        </Chip>
        <span style={{ flex: 1 }} />
        {!mine && (openable || onOpen) && (
          <Btn small kind={done ? "ghost" : "purple"} onClick={() => !done && onOpen?.(post)} disabled={done}>
            {done ? <><Check size={12} /> Reviewed</> : <>{post.kind === "video" ? "Watch" : post.kind === "resource" ? "Open" : "Read"} · +{post.xp ?? 10} XP</>}
          </Btn>
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
                : "Add it and every mentee in your cohort reads it, the post stays theirs."}
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
            <div style={{ fontSize: 12.5, color: C.gray, marginBottom: 10 }}>No comments yet, start the thread.</div>
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
export const Composer = ({ onPublish, name, userId, avatarUrl, seed }) => {
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

  /* The weekly prompt in the Brief writes its opening line straight into the
     composer. `seed` carries a nonce so tapping the same prompt twice still
     reloads it; a bare string would compare equal and do nothing. */
  useEffect(() => { if (seed?.text) setText(seed.text); }, [seed?.nonce]);

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
    <>
    <Card style={{ padding: 12 }}>
      {/* One line, not a text box. The reference's composer is deliberately the
          size of a thought: avatar, a sentence, send. Everything the kind needs
          (a title, a file, who can see it) unfolds underneath only once a kind
          that needs it is picked. */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar src={avatarUrl} name={name} size={34} radius={11} />
        <textarea value={text} onChange={e => setText(e.target.value)} rows={1} placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: F.sans, fontSize: 12.5, lineHeight: 1.5, color: C.ink, paddingTop: 9, minWidth: 0, minHeight: 34 }} />
        <Btn small kind="purple" disabled={!ready} onClick={go} style={{ marginTop: 1 }}>
          <Send size={12} />
        </Btn>
      </div>

      {needsTitle && (
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={kind === "video" ? "Video title, e.g. “How to ask for an intro”" : "Resource title, e.g. “Cover letter template”"}
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

      <div style={{ display: "flex", background: "#EFEEE9", borderRadius: 10, padding: 3, marginTop: 12, maxWidth: 220 }}>
        {[["cohort", "Private"], ["public", "Public"]].map(([id, l]) => (
          <button key={id} type="button" disabled={uploading} onClick={() => setVisibility(id)} style={{
            flex: 1, border: "none", cursor: uploading ? "default" : "pointer", borderRadius: 8, padding: "5px 0",
            fontFamily: F.sans, fontWeight: 600, fontSize: 11,
            background: visibility === id ? C.white : "transparent",
            color: visibility === id ? (id === "public" ? C.teal : C.ink) : C.gray,
            boxShadow: visibility === id ? "0 1px 3px rgba(0,0,0,.08)" : "none",
          }}>{l}</button>
        ))}
      </div>
      <div style={{ ...S.b(11, C.mute), marginTop: 6 }}>
        {visibility === "public"
          ? "Anyone with the link can open this, including people outside Ryzn."
          : "Only your cohort can see this inside Ryzn. You can flip it to Public later."}
      </div>
    </Card>

    {/* The four kinds, as flat pills directly under the composer — the
        reference's row, and the reason a mentor never has to think about
        formatting before they think about what to say. */}
    <div style={{ display: "flex", gap: 6, marginTop: -5, flexWrap: "wrap" }}>
      {Object.entries(KIND_META).map(([id, m]) => {
        const on = kind === id;
        return (
          <button key={id} disabled={uploading} onClick={() => { setKind(id); setMedia(null); setFileName(""); setErr(null); setCaptureOpen(false); }} style={{
            border: "none", borderRadius: 999, padding: "5px 11px", cursor: uploading ? "default" : "pointer",
            background: on ? C.tealTint : "#EBEAE6", color: on ? "#085041" : C.gray,
            fontFamily: F.sans, fontWeight: 600, fontSize: 10.5, opacity: uploading && !on ? 0.5 : 1,
          }}>{m.label}</button>
        );
      })}
      {(busy || uploading) && (
        <span style={{ ...S.mono(8, C.mute), alignSelf: "center", marginLeft: 4 }}>{busy ? "POSTING…" : "UPLOADING…"}</span>
      )}
    </div>
    </>
  );
};

/**
 * The greeting video, the first thing a new mentee sees, so it's pinned and
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

/* ----------------- MENTOR: your Brief -----------------

   The Feed tab is where a mentor *writes*, and it is a Brief: a short, finite,
   counted list of the few things worth their attention today, ending on a card
   that sends them off to mentor rather than on more scroll.

   What used to live here — profile strength, the stats strip, the greeting
   checklist, the pin/delete list of everything they had ever posted — was the
   same management surface the Profile tab already carries, rendered twice. Feed
   is where you write, Studio (Profile) is where you curate. */

const PROMPTS = [
  { q: "What is one thing you unlearned this year?", seed: "One thing I unlearned this year: " },
  { q: "What did you get wrong early that cost you time?", seed: "Something I got wrong early: " },
  { q: "What do you wish someone had told you at their stage?", seed: "What I wish someone had told me: " },
  { q: "Which habit actually moved the needle for you?", seed: "The habit that actually moved the needle: " },
];
/* Stable for the week, so the prompt doesn't change under a mentor mid-thought
   and doesn't reshuffle on every render. */
const promptOfWeek = () => PROMPTS[Math.floor(Date.now() / 6048e5) % PROMPTS.length];

export const MentorFeed = ({
  u, name, userId, feed, amplified = [], publish, greetingUp, uploadGreeting,
  toast, onAuthor, onVisibility, onAmplify, openNetwork, highlightPostId,
  followers = 0, onPin, onDelete, go,
}) => {
  const [cleared, setCleared] = useState([]);
  const [seed, setSeed] = useState(null);
  const views = feed.reduce((a, p) => a + p.views, 0);
  const reactions = feed.reduce((a, p) => a + p.reactions, 0);
  const prompt = useMemo(promptOfWeek, []);

  /* The Brief, in the reference's order: the receipt for what you already put
     out, then what your peers published, then one prompt if you have nothing
     of your own to say. Everything in it is real — the receipt counts your own
     posts, the peer items are the posts other mentors actually published. */
  const brief = [
    {
      id: "receipt",
      kind: "receipt",
      t: views > 0 ? `Your content reached ${views} view${views === 1 ? "" : "s"}` : "Your Orbit is waiting on you",
      d: views > 0
        ? `${reactions} reaction${reactions === 1 ? "" : "s"} across ${feed.length} post${feed.length === 1 ? "" : "s"}. Every mentee in your orbit sees what you publish.`
        : "Publish once and every mentee in your orbit sees it. No message required.",
    },
    ...(!greetingUp ? [{ id: "greeting", kind: "greeting" }] : []),
    ...amplified.slice(0, 3).map((p) => ({ id: `peer-${p.id}`, kind: "peer", post: p })),
    { id: "prompt", kind: "prompt", t: "This week’s prompt", d: `${prompt.q} Prompt answers rank highest with mentees.` },
  ];
  const left = brief.filter((b) => !cleared.includes(b.id));
  const clear = (id, msg) => { setCleared((c) => [...c, id]); if (msg) toast?.(msg); };

  return (
    <div>
      <div style={{ padding: "14px 14px 14px", display: "flex", flexDirection: "column", gap: 11 }}>
        <BriefHeader
          title="Your Brief"
          total={brief.length}
          done={brief.length - left.length}
          sub={left.length > 0
            ? `${left.length} item${left.length > 1 ? "s" : ""} picked for your mentees. Then go mentor.`
            : "Done for today."}
        />

        <div data-tour="mentor-feed-compose">
          <Composer name={name} userId={userId} avatarUrl={u?.avatarUrl} onPublish={publish} seed={seed} />
        </div>

        {left.map((b) => {
          if (b.kind === "receipt") return (
            <Card key={b.id} style={{ background: C.ink, border: "none" }}>
              <div style={S.mono(7.5, C.lilac)}>IMPACT RECEIPT</div>
              <div style={{ ...S.h(15, C.white), margin: "6px 0 3px" }}>{b.t}</div>
              <div style={S.b(12, "#B5B3AE")}>{b.d}</div>
              <Btn small kind="tint" style={{ marginTop: 11 }} onClick={() => clear(b.id, "Receipt cleared")}>Got it</Btn>
            </Card>
          );

          /* The greeting is a Brief item, not a permanent card: it is a thing to
             do once, and once it is done it should leave the screen for good. */
          if (b.kind === "greeting") return (
            <GreetingCard key={b.id} userId={userId}
              onDone={async (media) => { await uploadGreeting(media); setCleared((c) => [...c, b.id]); }} />
          );

          if (b.kind === "peer") return (
            <div key={b.id}>
              <div style={{ ...S.mono(7.5, C.teal), marginBottom: 6, paddingLeft: 2 }}>MENTOR NETWORK</div>
              <PostCard post={{ ...b.post, amplifiedBy: null }} author={b.post.authorName} authorId={b.post.authorId}
                avatarUrl={b.post.authorAvatarUrl} tier toast={toast} onAuthor={onAuthor}
                onAmplify={onAmplify} amplified={b.post.amplified} />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => clear(b.id, "Cleared from your Brief")}>Not now</Btn>
              </div>
            </div>
          );

          return (
            <Card key={b.id} style={{ border: `1.5px dashed ${C.purple}` }}>
              <div style={S.mono(7.5, C.purple)}>PROMPT · RYZN</div>
              <div style={{ ...S.h(15), margin: "6px 0 3px" }}>{b.t}</div>
              <div style={S.b(12.5, C.gray)}>{b.d}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                <Btn small kind="ghost" style={{ flex: 1 }} onClick={() => clear(b.id, "Skipped. Next prompt Friday.")}>Skip</Btn>
                <Btn small kind="purple" style={{ flex: 1.3 }}
                  onClick={() => { setSeed({ text: prompt.seed, nonce: Date.now() }); clear(b.id, "Prompt loaded into the composer above"); }}>
                  Use prompt
                </Btn>
              </div>
            </Card>
          );
        })}

        {left.length === 0 && (
          <CaughtUp
            line="The Brief ends on purpose. The next one lands tomorrow."
            cta="Go mentor"
            onCta={() => go("cohort")}
          />
        )}

        {/* Everything you have already published lives in Studio, one tap away,
            rather than being re-listed under the thing you are writing now. */}
        <Card onClick={() => go("impact")} style={{ display: "flex", alignItems: "center", gap: 11, padding: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: C.purpleTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={14} color={C.purple} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={S.sb(12.5)}>Your posts · {feed.length}</div>
            <div style={S.b(11, C.gray)}>Pin, edit visibility and see what each one earned, in Studio.</div>
          </div>
          <Chip c={C.deep}>+10 IMPACT EACH</Chip>
        </Card>
        {openNetwork && (
          <Card onClick={openNetwork} style={{ display: "flex", alignItems: "center", gap: 11, padding: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 10, background: C.tealTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Repeat2 size={14} color={C.teal} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={S.sb(12.5)}>Mentor network</div>
              <div style={S.b(11, C.gray)}>
                {amplified.length
                  ? `${amplified.length} post${amplified.length === 1 ? "" : "s"} from other mentors in your Orbit`
                  : "Follow other mentors and add their posts to your Orbit"}
              </div>
            </div>
          </Card>
        )}

        <BriefFooter>No infinite scroll. Items are ranked by your mentees’ goals, not engagement.</BriefFooter>
      </div>
    </div>
  );
};

/* ----------------- MENTEE: Discover -----------------

   Three segments over one screen, the way the reference lays it out: the Brief
   (everything your mentors published, finite and counted), Match (the deck),
   and My mentor (the seats you hold). Discover used to open straight onto the
   Explore map, so a mentee who already had mentors had no surface at all for
   what those mentors were posting — it was buried one tap inside an Orbit that
   only opened from a tile on Home. */

export const MenteeDiscover = ({
  view = "feed", setView, mentors = [], feeds = {}, watched = {}, reacted = {},
  onWatch, onReact, onAuthor, toast, go, openOrbit, openDm, chatLocked,
  seats = 3, renderMatch,
}) => {
  /* One list across every mentor, newest first, each post carrying its author
     so a three-mentor Brief still reads as three different people. */
  const posts = useMemo(() => {
    const out = [];
    for (const m of mentors) {
      for (const p of (feeds[m.id] || [])) {
        out.push({ ...p, __author: m });
      }
    }
    return out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [mentors, feeds]);

  const done = posts.filter((p) => watched[p.id]).length;
  const left = posts.filter((p) => !watched[p.id]);

  return (
    <div>
      <div style={{ padding: "12px 14px 8px", background: C.surface }}>
        <Seg options={[["feed", "Feed"], ["match", "Match"], ["mine", "My mentor"]]} value={view} onChange={setView} />
      </div>

      {view === "match" ? (
        /* The deck lays itself out as a full-height flex column, so it needs a
           *definite* height to resolve against. A `height: 100%` here would
           resolve to `auto` inside the page scroller and collapse the whole
           card stack to nothing — the same bug that once made Discover's map
           invisible inside a modal. */
        <div style={{ height: "min(74vh, 640px)", minHeight: 440 }}>{renderMatch?.()}</div>
      ) : view === "mine" ? (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 11 }}>
          {mentors.length === 0 && (
            <Card style={{ textAlign: "center", padding: 24 }}>
              <div style={S.sb(13)}>No mentor yet.</div>
              <div style={{ ...S.b(12, C.gray), marginTop: 4 }}>Head to Match. Adding one takes a minute.</div>
              <Btn small kind="purple" style={{ marginTop: 12 }} onClick={() => setView("match")}>Find a mentor <ArrowRight size={13} /></Btn>
            </Card>
          )}
          {mentors.map((m, i) => (
            <Card key={m.id}>
              <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
                <Avatar src={m.avatarUrl} name={m.name} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={S.sb(13.5)}>{m.name}</div>
                  {m.headline && <div style={{ ...S.b(11.5, C.gray), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.headline}</div>}
                </div>
                <Chip c={C.purple}>{(feeds[m.id] || []).length} POSTS</Chip>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                <Btn small kind="tint" style={{ flex: 1 }} onClick={() => openOrbit?.(m.id)}>Open Orbit</Btn>
                <Btn small kind={chatLocked ? "ghost" : "purple"} style={{ flex: 1 }}
                  onClick={() => chatLocked ? toast?.("Finish Stage 1 to unlock chat") : openDm?.(m)}>
                  {chatLocked ? <><Lock size={12} /> Locked</> : "Message"}
                </Btn>
              </div>
            </Card>
          ))}
          {mentors.length > 0 && (
            <div style={{ ...S.b(11.5, C.mute), textAlign: "center" }}>
              {mentors.length}/{seats} seats used · each mentor is their own Orbit.
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 11 }}>
          <BriefHeader title="Your Brief" total={posts.length} done={done} />

          {posts.length === 0 && (
            <Card style={{ textAlign: "center", padding: 24 }}>
              <div style={S.sb(13)}>Nothing here yet.</div>
              <div style={{ ...S.b(12, C.gray), marginTop: 4 }}>
                {mentors.length
                  ? "Everything your mentors publish lands here first."
                  : "Add a mentor and everything they publish lands here."}
              </div>
              {mentors.length === 0 && (
                <Btn small kind="purple" style={{ marginTop: 12 }} onClick={() => setView("match")}>Find a mentor <ArrowRight size={13} /></Btn>
              )}
            </Card>
          )}

          {left.map((p) => (
            <PostCard key={p.id} post={p}
              author={p.authorName || p.__author?.name} authorId={p.authorId || p.__author?.id}
              avatarUrl={p.__author?.avatarUrl} tier
              reacted={!!reacted[p.id]} onReact={onReact}
              onOpen={() => onWatch?.(p.id, p.xp)} done={!!watched[p.id]}
              toast={toast} onAuthor={onAuthor} />
          ))}

          {posts.length > 0 && left.length === 0 && (
            <CaughtUp
              line="The Brief ends on purpose. Today’s rep is waiting."
              cta="Do today’s rep"
              onCta={() => go?.("grow")}
            />
          )}

          <BriefFooter>
            No infinite scroll. Ranked by your goals, not engagement. Everything your mentors post lands here first.
          </BriefFooter>
        </div>
      )}
    </div>
  );
};

/* ----------------- MENTEE: the Orbit ----------------- */

/**
 * The posts-and-resources body, shared by the mentee's Orbit and the mentor's
 * own "Public view".
 *
 * Shared on purpose: the mentor's public view used to be a separate mock that
 * showed a post *count* and nothing else, so "preview" was previewing something
 * no mentee would ever see. Rendering the same component in both places is what
 * makes the preview true.
 *
 * `readOnly` drops the XP buttons and reactions, a mentor looking at their own
 * profile can't collect XP for their own content.
 *
 * `authorName` / `authorId` are the whose-feed-is-this fallback. A post that
 * carries its own author, anything a mentor relayed from a peer, keeps it,
 * because attributing someone else's post to the mentor showing it would be a
 * lie the amplification feature exists to avoid.
 */
export const ContentTabs = ({
  feed = [], authorName, authorId, view, watched = {}, onWatch, reacted = {}, onReact,
  emptyText, readOnly, toast, onAuthor, onAmplify, highlightPostId,
}) => {
  const FEED_LIMIT = 5;
  const [shown, setShown] = useState(FEED_LIMIT);
  const resources = feed.filter(p => p.kind === "video" || p.kind === "resource");
  const list = view === "feed" ? feed : resources;
  const visibleList = list.slice(0, shown);
  const hasMore = list.length > shown;

  if (list.length === 0) return (
    <Card style={{ textAlign: "center", padding: 26 }}>
      <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.5 }}>
        {view === "feed" ? emptyText : "No videos or files yet."}
      </div>
    </Card>
  );

  return (
    <>
      {view === "feed" ? visibleList.map(p => (
        <PostCard key={p.id} post={p} author={p.authorName || authorName} authorId={p.authorId || authorId}
          tier mine={readOnly && !p.authorName}
          reacted={!!reacted[p.id]} onReact={onReact}
          onOpen={() => onWatch?.(p.id, p.xp)} done={!!watched[p.id]}
          toast={toast} onAuthor={onAuthor}
          onAmplify={onAmplify} amplified={p.amplified}
          highlight={highlightPostId === p.id} />
      )) : visibleList.map(p => {
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
      })}
      {hasMore && (
        <button onClick={() => setShown(s => s + FEED_LIMIT)} style={{
          width: "100%", padding: "12px 0", border: "none", background: "transparent",
          cursor: "pointer", fontFamily: F.sans, fontWeight: 600, fontSize: 13.5,
          color: C.purple, textDecoration: "none",
        }}>
          Load more · {shown} of {list.length}
        </button>
      )}
    </>
  );
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
 *, the mentee holds up to three and each renders this same screen with a
 * different mentor, feed and program. Nothing here is the mentee's own
 * progress; that lives on Home and does not change when they switch Orbits.
 */
export const OrbitScreen = ({ mentor, stage1, feed = [], program, watched, onWatch, reacted, onReact, openDm, back, go, toast, onAuthor, highlightPostId }) => {
  const [view, setView] = useState("feed");
  const resources = useMemo(() => feed.filter(p => p.kind === "video" || p.kind === "resource"), [feed]);
  if (!mentor) return (
    <div>
      <HeaderRow title="Orbit" onBack={back} />
      <div style={{ padding: "0 14px 14px" }}>
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
      <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
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
              mentee's real mentor is, the mentor's own numbers attributed
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
                <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2, lineHeight: 1.45 }}>The Orbit is open to you now, everything {first} posts, plus every resource. Finish Stage 1 and messaging unlocks too.</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><Bar pct={0} /></div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 5 }}>STAGE 1 · 0 OF 1 EXERCISES DONE</div>
            <Btn kind="dark" style={{ marginTop: 12 }} onClick={go}>Do today’s exercise · 6 min</Btn>
          </Card>
        )}

        {/* This mentor's program, not "the" program, each mentor writes their
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
