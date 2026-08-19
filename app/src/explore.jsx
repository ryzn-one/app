import React, { useState, useEffect, useMemo } from "react";
import { Search, SlidersHorizontal, Crown, School, Check, Clock, X } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Btn, Seg, Monogram, Avatar, HeaderRow, firstNameOf, labelOf } from "./ui.jsx";
import {
  FilterSheet, MentorDetailSheet, MenteeDetailSheet, AffinityTag, TagRow, EmptyRoster,
} from "./chatmatch.jsx";
import { exploreRoster } from "./lib/auth-client.js";
import { MapBrowse } from "./map.jsx";

/* ----------------- EXPLORE -----------------
   The browsable directory. The swipe decks decide one person at a time and drop
   anyone you've already answered for; this is the other half, search the whole
   roster, including the people already in your cohort, and act on any row.

   Asymmetric by construction: /api/roster only ever returns the opposite side,
   so a mentee explores mentors and a mentor explores mentees. That guard is the
   reason a platform containing minors doesn't have a browsable list of them,
   and it lives on the server, not here.
*/

const STATE_META = {
  none:         null,
  pending_you:  { label: "REQUESTED", c: C.amber, bg: C.amberTint, Icon: Clock },
  pending_them: { label: "ASKED FOR YOU", c: C.purple, bg: C.purpleTint, Icon: Clock },
  accepted:     { label: "IN YOUR ORBIT", c: C.teal, bg: C.tealTint, Icon: Check },
  declined:     { label: "PASSED", c: C.gray, bg: C.surface, Icon: X },
};

function StateChip({ state }) {
  const m = STATE_META[state];
  if (!m) return null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: m.bg, color: m.c, fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.8, borderRadius: 8, padding: "4px 8px", flexShrink: 0 }}>
      <m.Icon size={10} /> {m.label}
    </span>
  );
}

/* Exported because Discover renders the same row under its map, one row
   component, so a person looks identical however you arrived at them. */
export function PersonRow({ p, wanted, onOpen }) {
  const track = labelOf(p.track);
  const industry = labelOf(p.industry);
  const sub = wanted === "mentor"
    ? [p.headline, industry].filter(Boolean).join(" · ")
    : [p.headline, track, p.goals?.[0]].filter(Boolean).join(" · ");
  const tags = wanted === "mentor" ? p.expertise : p.interests;
  return (
    <Card onClick={() => onOpen(p)} style={{ opacity: p.matchState === "declined" ? 0.62 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar src={p.avatarUrl} name={p.name} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
            {wanted === "mentor"
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, color: C.deep, letterSpacing: 0.8, flexShrink: 0 }}><Crown size={10} />{(p.tier || "Scout").toUpperCase()}</span>
              : track && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, color: C.deep, letterSpacing: 0.8, flexShrink: 0 }}><School size={10} />{track.toUpperCase()}</span>}
          </div>
          {sub && <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
        </div>
        <StateChip state={p.matchState} />
      </div>
      {tags?.length > 0 && <div style={{ marginTop: 10 }}><TagRow items={tags} limit={4} /></div>}
      <div style={{ marginTop: 8 }}><AffinityTag affinity={p.affinity} /></div>
    </Card>
  );
}

/**
 * `onRequest(person)` opens a new pairing, `onRespond(matchId, action)` answers
 * one that already exists. Both hit /api/matches, Explore owns no match logic
 * of its own, it just knows which of the two applies from `matchState`.
 */
export const ExploreScreen = ({ role, back, toast, onRequest, onRespond, canRequest, capacityNote, openAccepted }) => {
  const wanted = role === "mentee" ? "mentor" : "mentee";
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filters, setFilters] = useState(wanted === "mentor" ? { tier: "Any", industry: "Any" } : { track: "Any" });
  /* The same map the mentor side browses its mentees on. A mentee looking for a
     mentor is asking a geographic question at least as often, "who does this
     near me", so the two screens get the same control rather than one of them
     getting a search box and the other a map. */
  const [view, setView] = useState("Map");
  const [regionId, setRegionId] = useState(null);

  /* Debounced so typing doesn't fire a query per keystroke. Search is
     server-side because the roster can outgrow what's loaded. */
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const { people: rows } = await exploreRoster({ q: q.trim() || undefined });
        if (!cancelled) { setPeople(Array.isArray(rows) ? rows : []); setError(null); }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Couldn’t load the Roster.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 280 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  /* Filters stay client-side on purpose: the industry options are built from
     the loaded roster, so filtering server-side would shrink the option list to
     only what already matched, the filter would erase its own options. */
  const sections = useMemo(() => wanted === "mentor"
    ? [
        { key: "tier", label: "Tier", options: ["Any", "Scout", "Pathfinder", "Architect", "Legend"] },
        { key: "industry", label: "Industry", options: ["Any", ...new Set(people.map(p => labelOf(p.industry)).filter(Boolean))] },
      ]
    : [{ key: "track", label: "Track", options: ["Any", "University", "High school"] }],
    [people, wanted]);

  const passes = (p) => Object.entries(filters).every(([k, v]) => v === "Any" || labelOf(p[k]) === v);
  const list = people.filter(passes);
  const activeF = Object.values(filters).filter(v => v !== "Any").length;

  const buckets = [];
  const placed = list;

  const act = async (p, fn) => {
    if (busy) return;
    setBusy(true);
    try { await fn(); setDetail(null); const { people: rows } = await exploreRoster({ q: q.trim() || undefined }); setPeople(Array.isArray(rows) ? rows : []); }
    catch (e) { toast(e?.message || "That didn’t go through."); }
    finally { setBusy(false); }
  };

  /* One row's worth of action, derived entirely from matchState so the sheet
     and the list can never disagree about what's possible. */
  const footerFor = (p) => {
    const first = firstNameOf(p.name);
    if (p.matchState === "accepted") {
      return <Btn kind="soft" onClick={() => { setDetail(null); openAccepted?.(p); }}>{wanted === "mentor" ? `Open ${first}’s Orbit` : `Open ${first}’s progress`}</Btn>;
    }
    if (p.matchState === "pending_them") {
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="ghost" style={{ flex: 0.6, borderColor: C.line, color: C.gray }} disabled={busy} onClick={() => act(p, () => onRespond(p.matchId, "decline"))}>Pass</Btn>
          <Btn style={{ flex: 1 }} disabled={busy || !canRequest} onClick={() => act(p, () => onRespond(p.matchId, "accept"))}>{canRequest ? `Accept ${first}` : capacityNote}</Btn>
        </div>
      );
    }
    if (p.matchState === "pending_you") return <Btn disabled>Request sent · waiting on {first}</Btn>;
    // A declined pair can ask again, api/matches.js allows it deliberately.
    return (
      <Btn disabled={busy || !canRequest} onClick={() => act(p, () => onRequest(p))}>
        {!canRequest ? capacityNote : p.matchState === "declined" ? `Ask ${first} anyway` : wanted === "mentor" ? `Request ${first}` : `Invite ${first} to your cohort`}
      </Btn>
    );
  };

  const Sheet = wanted === "mentor" ? MentorDetailSheet : MenteeDetailSheet;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <HeaderRow
        title={wanted === "mentor" ? "Explore mentors" : "Explore mentees"}
        onBack={back}
        right={
          <button onClick={() => setShowFilter(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: activeF ? C.purpleTint : "none", border: `1px solid ${activeF ? C.purple : C.line}`, borderRadius: 10, padding: "6px 10px", cursor: "pointer", color: activeF ? C.purple : C.gray, fontFamily: F.sans, fontWeight: 600, fontSize: 12.5 }}>
            <SlidersHorizontal size={13} />{activeF ? `${activeF}` : "Filter"}
          </button>
        }
      />
      <div style={{ padding: view === "Map" ? "0 20px 8px" : "0 20px 10px" }}>
        <Seg options={["Map", "List"]} value={view} onChange={setView} small style={{ marginBottom: 10 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "0 12px" }}>
          <Search size={15} color={C.gray} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={wanted === "mentor" ? "Search name, role, or expertise" : "Search name, track, or goal"}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "12px 0", fontFamily: F.sans, fontSize: 14.5, color: C.ink, minWidth: 0 }} />
          {q && <button onClick={() => setQ("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} color={C.gray} /></button>}
        </div>
        {/* The map carries its own counts inside the region sheet, so this line
            would be a second, quieter answer to a question already answered. */}
        {view === "List" && (
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 8, letterSpacing: 0.5 }}>
            {loading ? "LOADING THE ROSTER…" : `${list.length} ${wanted.toUpperCase()}${list.length === 1 ? "" : "S"}${q ? ` MATCHING “${q.toUpperCase()}”` : " ON THE ROSTER"}`}
          </div>
        )}
      </div>

      {view === "Map" ? (
        <MapBrowse
          buckets={buckets} regionId={regionId} onSelect={setRegionId}
          people={placed} wanted={wanted} loading={loading} error={error}
          renderRow={p => <PersonRow key={p.id} p={p} wanted={wanted} onOpen={setDetail} />}
        />
      ) : (
        <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {error && <Card style={{ background: C.coralTint, border: "none" }}><div style={{ fontSize: 13.5, color: C.coral }}>{error}</div></Card>}
          {!loading && !error && list.length === 0 && (
            <div style={{ height: 320 }}>
              <EmptyRoster
                title={q || activeF ? "Nobody matches that." : wanted === "mentor" ? "No mentors yet." : "No mentees yet."}
                body={q || activeF
                  ? "Try a different name, skill, or filter."
                  : `New ${wanted}s appear here as they finish onboarding.`}
                action={(q || activeF) ? <Btn kind="ghost" style={{ marginTop: 16 }} onClick={() => { setQ(""); setFilters(f => Object.fromEntries(Object.keys(f).map(k => [k, "Any"]))); }}>Clear search</Btn> : null}
              />
            </div>
          )}
          {list.map(p => <PersonRow key={p.id} p={p} wanted={wanted} onOpen={setDetail} />)}
        </div>
      )}

      {detail && <Sheet m={detail} close={() => setDetail(null)} footer={footerFor(detail)} />}
      <FilterSheet open={showFilter} close={() => setShowFilter(false)} values={filters} setValues={setFilters}
        count={list.length} countLabel={wanted} sections={sections} />
    </div>
  );
};
