import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Crown, UserPlus, UserCheck, Users } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Btn, Label, Avatar, HeaderRow, firstNameOf } from "./ui.jsx";
import { MentorDetailSheet, AffinityTag, TagRow, EmptyRoster } from "./chatmatch.jsx";
import { PostCard } from "./feed.jsx";
import { NetworkShelf } from "./resources.jsx";
import {
  fetchMentorPeers, followMentor, unfollowMentor, fetchNetworkFeed,
  amplifyPost, unamplifyPost, postAction,
} from "./lib/auth-client.js";

/* ----------------- THE MENTOR NETWORK -----------------

   Everything else in the app runs across the mentor/mentee line: the decks, the
   roster, the Orbit, Direct Connect. This screen is the one place a mentor
   meets the other mentors, and it does exactly two things.

   Follow      one-sided, no handshake, no seat. Unlike a match it commits
               nobody, it only decides whose posts show up in Feed below.

   Add to Orbit  a mentor putting a peer's public post in front of their own
               cohort. The post is never copied: the byline, the counters and
               the delete button stay with whoever wrote it, and a mentee sees
               the real author with a line saying who relayed it. That's the
               difference between amplifying someone and taking credit.
*/

/** Follow / Following, as one button that always states the current state. */
const FollowButton = ({ following, busy, onToggle, small }) => (
  <button
    type="button"
    disabled={busy}
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    style={{
      display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0,
      border: `1px solid ${following ? C.purple : "#CFCDC7"}`,
      background: following ? C.purpleTint : C.white,
      color: following ? C.purple : C.ink,
      cursor: busy ? "default" : "pointer", borderRadius: 999,
      padding: small ? "6px 11px" : "8px 14px",
      fontFamily: F.sans, fontWeight: 600, fontSize: small ? 12 : 13,
      opacity: busy ? 0.6 : 1, whiteSpace: "nowrap",
    }}>
    {following ? <UserCheck size={13} /> : <UserPlus size={13} />}
    {busy ? "…" : following ? "Following" : "Follow"}
  </button>
);

function PeerRow({ p, busy, onOpen, onToggleFollow }) {
  const sub = [p.headline, p.industry].filter(Boolean).join(" · ");
  return (
    <Card onClick={() => onOpen(p)}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar src={p.avatarUrl} name={p.name} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, color: C.deep, letterSpacing: 0.8, flexShrink: 0 }}>
              <Crown size={10} />{(p.tier || "Scout").toUpperCase()}
            </span>
          </div>
          {sub && <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
        </div>
        <FollowButton small following={p.following} busy={busy} onToggle={() => onToggleFollow(p)} />
      </div>
      {p.expertise?.length > 0 && <div style={{ marginTop: 10 }}><TagRow items={p.expertise} limit={4} /></div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <AffinityTag affinity={p.affinity} />
        {/* Reciprocity is worth saying out loud, it's the nudge that turns a
            one-sided follow into two mentors actually reading each other. */}
        {p.followsYou && <Label color={C.teal}>FOLLOWS YOU</Label>}
        {p.followers > 0 && <Label>{p.followers} FOLLOWER{p.followers === 1 ? "" : "S"}</Label>}
      </div>
    </Card>
  );
}

/**
 * The Roster, the mentor guild.
 *
 * It **lives above orbits**, and that is the design rather than an accident of
 * where it was built: a mentor belongs to the guild, not to whichever space they
 * happen to be standing in, so the worldwide and chapter counts are identical
 * wherever they open it. Only the third stat adapts.
 *
 * This is the mentor-retention moat. A mentee's product is their cohort; a
 * mentor whose cohort is quiet needs a reason to open the app anyway, and two
 * hundred people doing the same difficult work is that reason.
 */
export const NetworkScreen = ({ back, toast, cohortSize = 0, onAmplifyChange, orbitId }) => {
  const [view, setView] = useState("feed");
  const [guild, setGuild] = useState(null);

  const [peers, setPeers] = useState([]);
  const [peersLoading, setPeersLoading] = useState(true);
  const [peersError, setPeersError] = useState(null);
  const [q, setQ] = useState("");

  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState(null);
  const [reacted, setReacted] = useState({});

  const [detail, setDetail] = useState(null);
  const [busyId, setBusyId] = useState(null);

  /* Debounced so typing doesn't fire a query per keystroke, the directory can
     outgrow what's loaded, so search stays server-side. */
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { people, guild: g } = await fetchMentorPeers({ q: q.trim() || undefined, orbitId });
        if (!cancelled) { setPeers(Array.isArray(people) ? people : []); setGuild(g || null); setPeersError(null); }
      } catch (e) {
        if (!cancelled) setPeersError(e?.message || "Couldn’t load the mentor roster.");
      } finally {
        if (!cancelled) setPeersLoading(false);
      }
    }, q ? 280 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, orbitId]);

  const loadFeed = useCallback(async () => {
    try {
      const { posts, viewerState } = await fetchNetworkFeed();
      setFeed(Array.isArray(posts) ? posts : []);
      setReacted(Object.fromEntries((viewerState?.reacted || []).map((id) => [id, true])));
      setFeedError(null);
    } catch (e) {
      setFeedError(e?.message || "Couldn’t load the network feed.");
    } finally {
      setFeedLoading(false);
    }
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const toggleFollow = async (p) => {
    if (busyId) return;
    setBusyId(p.id);
    const next = !p.following;
    // Optimistic: the row is a toggle and the write is a single document.
    setPeers((rows) => rows.map((r) => (r.id === p.id ? { ...r, following: next } : r)));
    setDetail((d) => (d && d.id === p.id ? { ...d, following: next } : d));
    try {
      await (next ? followMentor(p.id) : unfollowMentor(p.id));
      toast?.(next ? `Following ${firstNameOf(p.name)}` : `Unfollowed ${firstNameOf(p.name)}`);
      // The feed *is* the list of people followed, so it has to be re-read.
      await loadFeed();
    } catch (e) {
      setPeers((rows) => rows.map((r) => (r.id === p.id ? { ...r, following: !next } : r)));
      setDetail((d) => (d && d.id === p.id ? { ...d, following: !next } : d));
      toast?.(e?.message || "Couldn’t save that.");
    } finally {
      setBusyId(null);
    }
  };

  /* PostCard owns the optimistic state and puts the button back if this
     throws, so failures are re-thrown rather than swallowed here. */
  const amplify = async (post, next) => {
    await (next ? amplifyPost(post.id) : unamplifyPost(post.id));
    setFeed((rows) => rows.map((r) => (r.id === post.id ? { ...r, amplified: next } : r)));
    toast?.(next
      ? (cohortSize
        ? `Added to your Orbit · ${cohortSize} mentee${cohortSize === 1 ? "" : "s"} will see it`
        : "Added to your Orbit")
      : "Removed from your Orbit");
    onAmplifyChange?.();
  };

  const react = async (id) => {
    if (reacted[id]) return { already: true };
    setReacted((r) => ({ ...r, [id]: true }));
    try {
      const res = await postAction(id, "react");
      if (res?.self) { setReacted((r) => { const n = { ...r }; delete n[id]; return n; }); return res; }
      setFeed((rows) => rows.map((p) => (p.id === id ? { ...p, reactions: (p.reactions ?? 0) + 1 } : p)));
      return res;
    } catch (e) {
      setReacted((r) => { const n = { ...r }; delete n[id]; return n; });
      throw e;
    }
  };

  const followingCount = peers.filter((p) => p.following).length;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <HeaderRow title="Mentor network" onBack={back}
        right={followingCount > 0 ? <Label color={C.purple}>FOLLOWING {followingCount}</Label> : null} />

      <div style={{ padding: "0 14px 10px" }}>
        {/* Two numbers that are the same everywhere, and one that isn't. */}
        {guild && (
          <div style={{ display: "grid", gridTemplateColumns: guild.here != null ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              [Number(guild.worldwide).toLocaleString(), "mentors worldwide", C.purple],
              [String(guild.chapters), "chapters", C.teal],
              ...(guild.here != null ? [[String(guild.here), `in ${guild.hereLabel || "this orbit"}`, C.coral]] : []),
            ].map(([n, l, c]) => (
              <div key={l} style={{ background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontFamily: F.sans, fontSize: 18, fontWeight: 700, color: c }}>{n}</div>
                <div style={{ fontFamily: F.mono, fontSize: 7.5, color: C.gray, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</div>
              </div>
            ))}
          </div>
        )}
        {/* Three, not two. What a mentor wrote and what a mentor rates are
            different signals, and folding the second into the first would bury
            it under whoever posted most this week. */}
        <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4 }}>
          {[["feed", "Their posts"], ["picks", "Their picks"], ["mentors", "Mentors"]].map(([id, l]) => (
            <button key={id} onClick={() => setView(id)} style={{
              flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0",
              fontFamily: F.sans, fontWeight: 600, fontSize: 12.5,
              background: view === id ? C.white : "transparent", color: view === id ? C.ink : C.gray,
            }}>{l}</button>
          ))}
        </div>

        {view === "mentors" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "0 12px", marginTop: 10 }}>
              <Search size={15} color={C.gray} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role, or expertise"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "12px 0", fontFamily: F.sans, fontSize: 14.5, color: C.ink, minWidth: 0 }} />
              {q && <button onClick={() => setQ("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} color={C.gray} /></button>}
            </div>
            <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 8, letterSpacing: 0.5 }}>
              {peersLoading ? "LOADING MENTORS…" : `${peers.length} MENTOR${peers.length === 1 ? "" : "S"}${q ? ` MATCHING “${q.toUpperCase()}”` : " ON THE ROSTER"}`}
            </div>
          </>
        )}
      </div>

      <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {view === "picks" ? (
          <NetworkShelf toast={toast} />
        ) : view === "mentors" ? (<>
          {peersError && <Card style={{ background: C.coralTint, border: "none" }}><div style={{ fontSize: 13.5, color: C.coral }}>{peersError}</div></Card>}
          {!peersLoading && !peersError && peers.length === 0 && (
            <div style={{ height: 320 }}>
              <EmptyRoster
                title={q ? "Nobody matches that." : "No other mentors yet."}
                body={q ? "Try a different name, role, or skill." : "You’re early. Other mentors appear here as they join the founding roster."}
                action={q ? <Btn kind="ghost" style={{ marginTop: 16 }} onClick={() => setQ("")}>Clear search</Btn> : null}
              />
            </div>
          )}
          {peers.map((p) => (
            <PeerRow key={p.id} p={p} busy={busyId === p.id} onOpen={setDetail} onToggleFollow={toggleFollow} />
          ))}
        </>) : (<>
          {feedError && <Card style={{ background: C.coralTint, border: "none" }}><div style={{ fontSize: 13.5, color: C.coral }}>{feedError}</div></Card>}
          {feedLoading && <Card><div style={{ fontFamily: F.mono, fontSize: 10, color: C.gray, letterSpacing: 0.6 }}>LOADING…</div></Card>}
          {!feedLoading && !feedError && feed.length === 0 && (
            <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA", textAlign: "center", padding: 22 }}>
              <Users size={18} color={C.purple} />
              <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 14, marginTop: 8 }}>Nothing here yet</div>
              <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>
                Follow a few mentors and their public posts land here. Anything worth passing on, add to your Orbit and your whole cohort reads it.
              </div>
              <Btn kind="ghost" style={{ marginTop: 14 }} onClick={() => setView("mentors")}>Find mentors</Btn>
            </Card>
          )}
          {feed.map((p) => (
            <PostCard key={p.id} post={p} author={p.authorName} authorId={p.authorId} tier
              reacted={!!reacted[p.id]} onReact={react}
              onAmplify={amplify} amplified={p.amplified}
              toast={toast}
              onAuthor={() => {
                const row = peers.find((r) => r.id === p.authorId);
                setDetail(row || { id: p.authorId, name: p.authorName });
              }} />
          ))}
        </>)}
      </div>

      {detail && (
        <MentorDetailSheet
          m={detail}
          toast={toast}
          close={() => setDetail(null)}
          onAmplify={async (post, next) => {
            await (next ? amplifyPost(post.id) : unamplifyPost(post.id));
            setFeed((rows) => rows.map((r) => (r.id === post.id ? { ...r, amplified: next } : r)));
            toast?.(next ? "Added to your Orbit" : "Removed from your Orbit");
            onAmplifyChange?.();
          }}
          footer={
            <Btn
              kind={detail.following ? "ghost" : "primary"}
              disabled={busyId === detail.id}
              style={detail.following ? { borderColor: C.purple, color: C.purple } : undefined}
              onClick={() => toggleFollow(detail)}>
              {detail.following
                ? <><UserCheck size={15} /> Following {firstNameOf(detail.name)}</>
                : <><UserPlus size={15} /> Follow {firstNameOf(detail.name)}</>}
            </Btn>
          }
        />
      )}
    </div>
  );
};
