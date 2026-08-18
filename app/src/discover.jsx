import React, { useState, useEffect, useMemo } from "react";
import { Search, X, MapPin } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Btn, Chip, Seg, firstNameOf, labelOf } from "./ui.jsx";
import { MenteeDetailSheet, MentorDetailSheet, EmptyRoster } from "./chatmatch.jsx";
import { PersonRow } from "./explore.jsx";
import { exploreRoster } from "./lib/auth-client.js";
import { project, rollUp, totalOf, mockBucketFor, MIN_BUCKET, MOCK_CITIES } from "./lib/regions.js";

/* ————————————————— DISCOVER —————————————————

   The browsable half of finding people, with a map in front of it.

   The map is a filter control, not a directory of pins. It paints how many
   people are in a place and hands you a selection when you tap one; it never
   plots an individual, and `rollUp` guarantees the smallest thing it can point
   at is MIN_BUCKET people. That is what makes a geographic view of a roster
   that contains minors a thing we can ship at all — see lib/regions.js.

   It also happens to be the only version that scales: /api/roster answers 50
   rows at a time, so a map that drew a pin per person would silently claim the
   roster is 50 people. Counts come from an aggregate, the list stays paged.
*/

const W = 720, H = 360;   // 2:1 — equirectangular wants exactly this ratio.

/** Bubble radius from a headcount. sqrt so area tracks the number rather than
    the radius, which is the difference between "twice as many" reading as
    twice as big and reading as four times as big. */
const radiusOf = (n) => 5 + Math.sqrt(n) * 2.4;

/**
 * The map.
 *
 * `basemap` takes an array of SVG path strings in this same 720×360
 * equirectangular space — drop coastlines in and they render under the
 * bubbles. Without it you get the graticule, which is why every bubble carries
 * its own label: the map has to be readable before the landmass shows up.
 */
export const RegionMap = ({ buckets = [], selectedId, onSelect, basemap = null, unplaced = 0 }) => {
  const max = Math.max(1, ...buckets.map((b) => b.count));

  const points = useMemo(() => buckets.map((b) => ({
    ...b,
    ...project(b.lat, b.lng, W, H),
    r: radiusOf(b.count),
  })), [buckets]);

  /* Graticule every 30°. Enough to place a bubble roughly, few enough that it
     stays background rather than becoming the subject. */
  const meridians = [];
  for (let lng = -150; lng <= 150; lng += 30) meridians.push(project(0, lng, W, H).x);
  const parallels = [];
  for (let lat = -60; lat <= 60; lat += 30) parallels.push(project(lat, 0, W, H).y);

  return (
    <div style={{ position: "relative", background: C.ink, borderRadius: 14, overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} role="group"
        aria-label="Mentees by region. Select a region to filter the list.">
        {/* Background — click to clear the selection. */}
        <rect x={0} y={0} width={W} height={H} fill={C.ink}
          onClick={() => onSelect?.(null)} style={{ cursor: selectedId ? "pointer" : "default" }} />

        <g stroke="rgba(255,255,255,.07)" strokeWidth={1} pointerEvents="none">
          {meridians.map((x) => <line key={`m${x}`} x1={x} y1={0} x2={x} y2={H} />)}
          {parallels.map((y) => <line key={`p${y}`} x1={0} y1={y} x2={W} y2={y} />)}
          {/* The equator, marginally brighter — the one line worth reading. */}
          <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,.13)" />
        </g>

        {basemap && (
          <g fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.14)" strokeWidth={0.6} pointerEvents="none">
            {basemap.map((d, i) => <path key={i} d={d} />)}
          </g>
        )}

        {points.map((p) => {
          const on = selectedId === p.id;
          const weight = 0.35 + 0.55 * (p.count / max);
          return (
            <g key={p.id} role="button" tabIndex={0}
              aria-pressed={on}
              aria-label={`${p.name}, ${p.count} mentees`}
              onClick={() => onSelect?.(on ? null : p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(on ? null : p.id); }
              }}
              style={{ cursor: "pointer", outline: "none" }}>
              {on && <circle cx={p.x} cy={p.y} r={p.r + 7} fill="none" stroke={C.lilac} strokeWidth={1.5} opacity={0.9} />}
              <circle cx={p.x} cy={p.y} r={p.r} fill={C.purple} opacity={weight} />
              <circle cx={p.x} cy={p.y} r={p.r} fill="none" stroke={on ? C.lilac : "rgba(183,175,242,.55)"} strokeWidth={on ? 2 : 1} />
              <text x={p.x} y={p.y + 3.5} textAnchor="middle"
                fontFamily={F.mono} fontSize={10} fontWeight={700} fill={C.white} pointerEvents="none">
                {p.count}
              </text>
              <text x={p.x} y={p.y + p.r + 13} textAnchor="middle"
                fontFamily={F.mono} fontSize={9} letterSpacing={0.6}
                fill={on ? C.lilac : "rgba(255,255,255,.62)"} pointerEvents="none">
                {p.name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>

      {/* The disclosure rule, said out loud. A map that quietly omits places is
          worse than one that tells you it rounded — and this is the line that
          explains why a mentor's own small city may not be on it. */}
      <div style={{ position: "absolute", left: 12, bottom: 10, right: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, pointerEvents: "none" }}>
        <span style={{ fontFamily: F.mono, fontSize: 8.5, color: "rgba(255,255,255,.45)", letterSpacing: 0.6, lineHeight: 1.5 }}>
          CITIES UNDER {MIN_BUCKET} ROLL UP INTO THEIR REGION
        </span>
        {unplaced > 0 && (
          <span style={{ fontFamily: F.mono, fontSize: 8.5, color: "rgba(255,255,255,.45)", letterSpacing: 0.6, whiteSpace: "nowrap" }}>
            +{unplaced} ELSEWHERE
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Map + list over one shared filter state.
 *
 * The selection is a filter chip like any other — tapping a bubble and tapping
 * a track are the same kind of act, and the chip row is where both show up.
 * That is the whole reason the map is worth having: it is an input and a
 * readout of the current filter at once.
 */
export const DiscoverPane = ({ role, toast, onRequest, onRespond, canRequest, capacityNote, openAccepted }) => {
  const wanted = role === "mentee" ? "mentor" : "mentee";
  const [view, setView] = useState("Map");
  const [q, setQ] = useState("");
  const [regionId, setRegionId] = useState(null);
  const [track, setTrack] = useState("Any");
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);

  const { buckets, unplaced, foldedCities } = useMemo(() => rollUp(MOCK_CITIES), []);
  const total = useMemo(() => totalOf(MOCK_CITIES), []);
  const selected = buckets.find((b) => b.id === regionId) || null;

  /* Same debounce and same endpoint as Explore — this pane replaces that
     screen's chrome, not its data path. */
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

  /* Region comes from mockBucketFor because profiles carry no location yet.
     Everything else on this row is real. When the field lands, this map()
     disappears and the filter moves into the query. */
  const tagged = useMemo(
    () => people.map((p) => ({ ...p, _region: mockBucketFor(p.id, buckets) })),
    [people, buckets]
  );

  const list = tagged.filter((p) =>
    (!regionId || p._region?.id === regionId) &&
    (track === "Any" || labelOf(p.track) === track)
  );

  const act = async (p, fn) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      setDetail(null);
      const { people: rows } = await exploreRoster({ q: q.trim() || undefined });
      setPeople(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast?.(e?.message || "That didn’t go through.");
    } finally { setBusy(false); }
  };

  /* Derived entirely from matchState, same as Explore — the sheet and the row
     can never disagree about what's possible. */
  const footerFor = (p) => {
    const first = firstNameOf(p.name);
    if (p.matchState === "accepted") {
      return <Btn kind="soft" onClick={() => { setDetail(null); openAccepted?.(p); }}>
        {wanted === "mentor" ? `Open ${first}’s Orbit` : `Open ${first}’s progress`}
      </Btn>;
    }
    if (p.matchState === "pending_them") {
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <Btn kind="ghost" style={{ flex: 0.6, borderColor: C.line, color: C.gray }} disabled={busy}
            onClick={() => act(p, () => onRespond(p.matchId, "decline"))}>Pass</Btn>
          <Btn style={{ flex: 1 }} disabled={busy || !canRequest}
            onClick={() => act(p, () => onRespond(p.matchId, "accept"))}>{canRequest ? `Accept ${first}` : capacityNote}</Btn>
        </div>
      );
    }
    if (p.matchState === "pending_you") return <Btn disabled>Request sent · waiting on {first}</Btn>;
    return (
      <Btn disabled={busy || !canRequest} onClick={() => act(p, () => onRequest(p))}>
        {!canRequest ? capacityNote : p.matchState === "declined" ? `Ask ${first} anyway` : wanted === "mentor" ? `Request ${first}` : `Invite ${first} to your cohort`}
      </Btn>
    );
  };

  const Sheet = wanted === "mentor" ? MentorDetailSheet : MenteeDetailSheet;
  const activeChips = (selected ? 1 : 0) + (track === "Any" ? 0 : 1);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "4px 20px 10px", flexShrink: 0 }}>
        <Seg options={["Map", "List"]} value={view} onChange={setView} small />

        <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "0 12px", marginTop: 10 }}>
          <Search size={15} color={C.gray} />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={wanted === "mentor" ? "Search name, role, or expertise" : "Search name, track, or goal"}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "12px 0", fontFamily: F.sans, fontSize: 14.5, color: C.ink, minWidth: 0 }} />
          {q && <button onClick={() => setQ("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} color={C.gray} /></button>}
        </div>

        {view === "Map" && (
          <div style={{ marginTop: 10 }}>
            <RegionMap buckets={buckets} selectedId={regionId} onSelect={setRegionId} unplaced={unplaced} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7, gap: 10 }}>
              <span style={{ fontFamily: F.mono, fontSize: 9, color: C.mute, letterSpacing: 0.5 }}>
                {total} PLACED · {foldedCities} {foldedCities === 1 ? "CITY" : "CITIES"} ROLLED UP
              </span>
              {/* Not decoration. The counts and the region on every row are
                  invented — nobody should read this map as live geography. */}
              <Chip c={C.amber} bg={C.amberTint}>Demo data</Chip>
            </div>
          </div>
        )}

        {/* One chip row for both kinds of filter. A tapped bubble lands here
            exactly like a track does, and clears the same way. */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" }}>
          {selected && (
            <button onClick={() => setRegionId(null)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
              <Chip><MapPin size={10} /> {selected.name} · {selected.count} <X size={10} /></Chip>
            </button>
          )}
          {["Any", "University", "High school"].map((t) => (
            <button key={t} onClick={() => setTrack(t)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
              <Chip c={track === t ? C.white : C.gray} bg={track === t ? C.purple : C.surface}>{t}</Chip>
            </button>
          ))}
          {activeChips > 0 && (
            <button onClick={() => { setRegionId(null); setTrack("Any"); }}
              style={{ border: "none", background: "none", cursor: "pointer", fontFamily: F.mono, fontSize: 9, color: C.purple, fontWeight: 700, letterSpacing: 0.6, padding: "4px 2px" }}>
              CLEAR
            </button>
          )}
        </div>

        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.mute, marginTop: 8, letterSpacing: 0.5 }}>
          {loading ? "LOADING THE ROSTER…" : `${list.length} ${wanted.toUpperCase()}${list.length === 1 ? "" : "S"}${selected ? ` IN ${selected.name.toUpperCase()}` : ""}`}
        </div>
      </div>

      <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "6px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        {error && <Card style={{ background: C.coralTint, border: "none" }}><div style={{ fontSize: 13.5, color: C.coral }}>{error}</div></Card>}
        {!loading && !error && list.length === 0 && (
          <div style={{ height: 280 }}>
            <EmptyRoster
              title={selected ? `Nobody in ${selected.name}.` : q || activeChips ? "Nobody matches that." : `No ${wanted}s yet.`}
              body={selected || q || activeChips
                ? "Try a different region, search, or track."
                : `New ${wanted}s appear here as they finish onboarding.`}
              action={(selected || q || activeChips)
                ? <Btn kind="ghost" style={{ marginTop: 16 }} onClick={() => { setQ(""); setRegionId(null); setTrack("Any"); }}>Clear filters</Btn>
                : null}
            />
          </div>
        )}
        {list.map((p) => <PersonRow key={p.id} p={p} wanted={wanted} onOpen={setDetail} />)}
      </div>

      {detail && <Sheet m={detail} close={() => setDetail(null)} footer={footerFor(detail)} />}
    </div>
  );
};
