import React, { useState, useEffect, useMemo } from "react";
import { Search, X, MapPin } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Btn, Chip, Seg, firstNameOf, labelOf } from "./ui.jsx";
import { MenteeDetailSheet, MentorDetailSheet, EmptyRoster } from "./chatmatch.jsx";
import { PersonRow } from "./explore.jsx";
import { MapBrowse } from "./map.jsx";
import { exploreRoster } from "./lib/auth-client.js";

/* ----------------- DISCOVER -----------------

   The browsable half of finding people, with a map in front of it.

   The map is a filter control, not a directory of pins. It paints how many
   people are in a place and hands you a selection when you tap one; it never
   plots an individual, and `rollUp` guarantees the smallest thing it can point
   at is MIN_BUCKET people. That is what makes a geographic view of a roster
   that contains minors a thing we can ship at all, see lib/regions.js.

   It also happens to be the only version that scales: /api/roster answers 50
   rows at a time, so a map that drew a pin per person would silently claim the
   roster is 50 people. Counts come from an aggregate, the list stays paged.

   In Map view the map is the screen. Everything the old layout stacked
   underneath it, a headcount line, a data badge, a filter row, a list, either
   moved into the sheet a tapped region opens or went away, because a map you
   cannot read is not improved by captions describing it. The rendering, panning
   and zooming all live in map.jsx.
*/

/** Tracks a mentee can be on. The map sheet and the list row share the list. */
const TRACKS = ["Any", "University", "High school"];

/**
 * Map + list over one shared filter state.
 *
 * The selection is a filter chip like any other, tapping a bubble and tapping
 * a track are the same kind of act. That is the whole reason the map is worth
 * having: it is an input and a readout of the current filter at once.
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

  const buckets = [];
  const selected = buckets.find((b) => b.id === regionId) || null;

  /* Same debounce and same endpoint as Explore, this pane replaces that
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

  const tagged = useMemo(
    () => people.map((p) => ({ ...p, _track: labelOf(p.track) })),
    [people]
  );

  const list = tagged.filter((p) =>
    (!regionId || p._region?.id === regionId) &&
    (track === "Any" || p._track === track)
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

  /* Derived entirely from matchState, same as Explore, the sheet and the row
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
  const isMap = view === "Map";

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: isMap ? "4px 20px 8px" : "4px 20px 10px", flexShrink: 0 }}>
        <Seg options={["Map", "List"]} value={view} onChange={setView} small />

        <div style={{ display: "flex", alignItems: "center", gap: 9, background: C.white, border: `1px solid ${C.line}`, borderRadius: 12, padding: "0 12px", marginTop: 10 }}>
          <Search size={15} color={C.gray} />
          <input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={wanted === "mentor" ? "Search name, role, or expertise" : "Search name, track, or goal"}
            style={{ flex: 1, border: "none", outline: "none", background: "transparent", padding: "12px 0", fontFamily: F.sans, fontSize: 14.5, color: C.ink, minWidth: 0 }} />
          {q && <button onClick={() => setQ("")} style={{ border: "none", background: "none", cursor: "pointer", padding: 4, display: "flex" }}><X size={14} color={C.gray} /></button>}
        </div>

        {/* List view keeps its filter row. Map view does not: the region is the
            filter, and the track chips ride along inside the region sheet. */}
        {!isMap && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, alignItems: "center" }}>
              {selected && (
                <button onClick={() => setRegionId(null)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
                  <Chip><MapPin size={10} /> {selected.name} · {selected.count} <X size={10} /></Chip>
                </button>
              )}
              {TRACKS.map((t) => (
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
          </>
        )}
      </div>

      {isMap ? (
        <MapBrowse
          buckets={buckets} regionId={regionId} onSelect={setRegionId}
          people={tagged} wanted={wanted} loading={loading} error={error}
          track={track} onTrack={setTrack} tracks={wanted === "mentee" ? TRACKS : null}
          renderRow={(p) => <PersonRow key={p.id} p={p} wanted={wanted} onOpen={setDetail} />}
        />
      ) : (
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
      )}

      {detail && <Sheet m={detail} close={() => setDetail(null)} footer={footerFor(detail)} />}
    </div>
  );
};
