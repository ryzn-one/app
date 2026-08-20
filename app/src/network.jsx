import React, { useState, useEffect, useCallback } from "react";
import { Search, X, UserPlus, UserCheck, Users } from "lucide-react";
import { C, F, S, SP, TIER_COLOR } from "./theme.js";
import { Card, GhostCard, Btn, Chip, Label, Avatar, HeaderRow, firstNameOf } from "./ui.jsx";
import { MentorDetailSheet } from "./chatmatch.jsx";
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

/** Section eyebrow. The Roster is one scroll of stacked sections rather than a
    tab strip, so each section has to name itself where it starts. */
const Eyebrow = ({ children, color = C.purple, style }) => (
  <div style={{ ...S.mono(8, color), ...style }}>{children}</div>
);

/**
 * One line of the Roster.
 *
 * A row, not a card. Following, expertise, affinity and their posts all live in
 * the profile sheet a tap away; putting them back on the row is what turned a
 * directory of two hundred people into two hundred cards nobody scrolled to the
 * bottom of. What stays is what tells two mentors apart at a glance: who they
 * are, the cohort they're actually carrying, and their tier.
 */
function PeerRow({ p, first, onOpen }) {
  const load = p.mentees > 0 ? `${p.mentees} mentee${p.mentees === 1 ? "" : "s"}` : null;
  const sub = [p.headline || p.industry, load].filter(Boolean).join(" · ");
  const tier = p.tier || "Scout";
  const clip = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  return (
    <div role="button" tabIndex={0}
      onClick={() => onOpen(p)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(p); } }}
      style={{
        display: "flex", alignItems: "center", gap: 11, padding: "9px 0", cursor: "pointer",
        borderTop: first ? "none" : `1px solid ${C.line}`,
      }}>
      <Avatar src={p.avatarUrl} name={p.name} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...S.sb(13), ...clip }}>{p.name}</div>
        {sub && <div style={{ ...S.b(11.5, C.gray), ...clip }}>{sub}</div>}
      </div>
      {/* Follow lives in the sheet now, so the row has to say the state out
          loud or a followed peer looks identical to a stranger. */}
      {p.following && <Chip c={C.purple} bg={C.purpleTint}>FOLLOWING</Chip>}
      <Chip c={TIER_COLOR[tier] || C.amber} bg="#F4F3EF">{tier}</Chip>
    </div>
  );
}

/**
 * The banner. Two numbers that are the same in every orbit, and one that isn't.
 *
 * It leads the screen because the first thing a mentor needs from this tab is
 * the size of the room, not a control. Numbers only ever render once the server
 * has counted them; a placeholder here would be inventing a community.
 */
const RosterBanner = ({ guild }) => {
  const stats = guild ? [
    [Number(guild.worldwide).toLocaleString(), "WORLDWIDE"],
    [String(guild.chapters), "CHAPTERS"],
    ...(guild.here != null ? [[String(guild.here), `AT ${(guild.hereLabel || "THIS ORBIT").toUpperCase()}`]] : []),
  ] : [];
  return (
    <Card style={{ background: C.deep, border: "none", padding: 16 }}>
      <Eyebrow color={C.lilac} style={{ fontSize: 7.5 }}>THE ROSTER · MENTORS ONLY · CROSS-ORBIT</Eyebrow>
      <div style={{ ...S.h(17, C.white), margin: guild ? "6px 0 12px" : "6px 0 0", lineHeight: 1.3 }}>
        {!guild ? "An invitation-only community of mentors."
          : Number(guild.worldwide) === 1
            ? "An invitation-only community, and you’re the first mentor in it."
            : `An invitation-only community of ${Number(guild.worldwide).toLocaleString()} mentors.`}
      </div>
      {stats.length > 0 && (
        <div style={{ display: "flex", gap: 18 }}>
          {stats.map(([v, l]) => (
            <div key={l} style={{ minWidth: 0 }}>
              <div style={S.h(19, C.lilac)}>{v}</div>
              <div style={{ ...S.mono(6.5, "#8B84C9"), overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

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
export const NetworkScreen = ({ back, toast, cohortSize = 0, onAmplifyChange, orbitId, query }) => {
  /* Two hosts, one screen. Opened from the Feed shortcut it is a full screen
     with its own header and scroller; rendered under Cohort → Mentors it is a
     section of that tab, which already owns the title, the search box and the
     scroll. `back` is what tells them apart, only the overlay can go back. */
  const embedded = !back;
  const [guild, setGuild] = useState(null);

  const [peers, setPeers] = useState([]);
  const [peersLoading, setPeersLoading] = useState(true);
  const [peersError, setPeersError] = useState(null);
  /* Embedded, the search term is the Cohort tab's one box searching both
     segments; a second field inside this section would ask the same question
     twice on the same screen. */
  const [ownQ, setOwnQ] = useState("");
  const q = embedded ? (query || "") : ownQ;
  const setQ = setOwnQ;

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

  /* The screen, as one scroll of stacked sections: who is here, who is near
     you, what they wrote, what they rate. The tab strip that used to sit on top
     of the last three is gone, it hid two thirds of the Roster behind a control
     nobody pressed, and a mentor opening this tab on a quiet week saw an empty
     feed and no sign that two hundred peers existed. */
  const roster = (
    <>
      <RosterBanner guild={guild} />

      <Card>
        <Eyebrow style={{ marginBottom: 4 }}>MENTORS NEAR YOU · TAP TO EXPLORE</Eyebrow>
        {/* The overlay has no search box above it, so it carries its own. */}
        {!embedded && (
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "0 12px", margin: "8px 0 2px" }}>
            <Search size={15} color={C.gray} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, role, or expertise"
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "10px 0", fontFamily: F.sans, fontSize: 14, color: C.ink, minWidth: 0 }} />
            {q && <button onClick={() => setQ("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} color={C.gray} /></button>}
          </div>
        )}
        {peersError && <div style={{ ...S.b(12.5, C.coral), padding: "8px 0" }}>{peersError}</div>}
        {peersLoading && !peers.length && <div style={{ ...S.mono(8, C.mute), padding: "10px 0" }}>LOADING MENTORS…</div>}
        {!peersLoading && !peersError && peers.length === 0 && (
          <div style={{ padding: "6px 0 2px" }}>
            <div style={S.sb(13.5)}>{q ? "Nobody matches that." : "No other mentors yet."}</div>
            <div style={{ ...S.b(12.5, C.gray), marginTop: 3 }}>
              {q ? "Try a different name, role, or skill."
                 : "You’re early. Other mentors appear here as they join the founding roster."}
            </div>
            {q && !embedded && <Btn small kind="ghost" style={{ marginTop: 10 }} onClick={() => setQ("")}>Clear search</Btn>}
          </div>
        )}
        {peers.map((p, i) => (
          <PeerRow key={p.id} p={p} first={i === 0} onOpen={setDetail} />
        ))}
        {peers.length > 0 && (
          <div style={{ ...S.b(11.5, C.mute), marginTop: 8 }}>
            {followingCount > 0
              ? `Following ${followingCount}. Their posts are in the Roster feed below.`
              : "Open anyone to follow them, their posts then land in the Roster feed below."}
          </div>
        )}
      </Card>

      <Eyebrow style={{ padding: "2px 2px 0" }}>ROSTER FEED · MENTOR TO MENTOR</Eyebrow>
      {feedError && <Card style={{ background: C.coralTint, border: "none" }}><div style={{ fontSize: 13.5, color: C.coral }}>{feedError}</div></Card>}
      {feedLoading && <Card><div style={S.mono(8, C.mute)}>LOADING…</div></Card>}
      {!feedLoading && !feedError && feed.length === 0 && (
        <GhostCard style={{ textAlign: "center", padding: 24 }}>
          <Users size={18} color={C.purple} />
          <div style={{ ...S.sb(14), marginTop: 8 }}>Nothing here yet</div>
          <div style={{ ...S.b(12.5, C.gray), marginTop: 4 }}>
            Follow a few mentors and their public posts land here. Anything worth passing on, add to your Orbit and your whole cohort reads it.
          </div>
        </GhostCard>
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

      {/* What a mentor wrote and what a mentor rates are different signals, so
          the picks keep their own section rather than being folded into the
          feed, where whoever posted most this week would bury them. */}
      <Eyebrow color={C.teal} style={{ padding: "2px 2px 0" }}>THEIR PICKS · WHAT THE ROSTER RATES</Eyebrow>
      <NetworkShelf toast={toast} />

      <div style={{ ...S.b(11.5, C.mute), padding: "2px 2px 4px" }}>
        The Roster spans every orbit. Your guild follows you
        {guild?.hereLabel ? ` from ${guild.hereLabel} to the public pool.` : " wherever you post."}
      </div>
    </>
  );

  const sheet = detail ? (
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
  ) : null;

  /* Embedded, the Cohort tab owns the page padding and the scroll: a second
     scroller nested inside one is how a list ends up with two scrollbars and a
     section that can't reach its own bottom. */
  if (embedded) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: SP.gap }}>
        {roster}
        {sheet}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <HeaderRow title="The Roster" onBack={back}
        right={followingCount > 0 ? <Label color={C.purple}>FOLLOWING {followingCount}</Label> : null} />
      <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 14px 20px", display: "flex", flexDirection: "column", gap: SP.gap }}>
        {roster}
      </div>
      {sheet}
    </div>
  );
};
