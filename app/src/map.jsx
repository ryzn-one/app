import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, Minus, Crosshair, X, MapPin } from "lucide-react";
import { C, F } from "./theme.js";
import { Chip } from "./ui.jsx";
import { project, MIN_BUCKET } from "./lib/regions.js";
import { homeView } from "./lib/home.js";
import { WORLD_PATHS } from "./lib/basemap.js";

/* ————————————————— THE MAP —————————————————

   A pannable, zoomable world map that paints how many people are in a place.

   Three things make it readable that the first version did not have:

   1. Actual coastlines and borders. A grid of purple dots on black is a chart
      only the person who wrote it can read — you cannot tell Lagos from Nairobi
      without the continent under them. lib/basemap.js carries real country
      outlines, already projected into this file's coordinate space.

   2. It opens over the viewer's own continent rather than the whole planet, so
      the first thing on screen is somewhere they recognise. See lib/home.js.

   3. You can move it. Drag to pan, pinch or scroll to zoom.

   It is still a filter control, not a directory of pins: it never plots an
   individual, and `rollUp` guarantees the smallest thing it can point at is
   MIN_BUCKET people. See lib/regions.js for why that rule exists.
*/

const W = 720, H = 360;      // 2:1 — equirectangular wants exactly this ratio
const PX_PER_DEG = W / 360;  // 2
const MIN_W = 46;            // deepest zoom ≈ 23° of longitude across the frame
const MAX_HOME_LAT = 150;    // backstop on how much latitude the opening frame may cover

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Bubble radius from a headcount, in screen pixels. sqrt so area tracks the
    number rather than the radius — the difference between "twice as many"
    reading as twice as big and reading as four times as big. */
const radiusOf = (n) => 6 + Math.sqrt(n) * 2.6;

/**
 * The map.
 *
 * Everything inside the SVG lives in the 720×360 equirectangular space, and the
 * viewBox is the camera. Bubbles, labels and strokes are multiplied by `u`
 * (map units per screen pixel) on the way out, so they stay the same size on
 * screen no matter how far in you are zoomed — a bubble is a hit target, and a
 * hit target that grows with zoom stops being one.
 */
export const RegionMap = ({ buckets = [], selectedId, onSelect, style }) => {
  const boxRef = useRef(null);
  const [box, setBox] = useState(null);        // container size in CSS pixels
  const [view, setView] = useState(null);      // { cx, cy, w } in map units
  const home = useMemo(() => homeView(), []);

  /* Zooming out past the frame's height would show blank space above the pole,
     so the widest allowed view is whatever keeps the projection inside H. On a
     tall phone that means the world is deliberately not fully zoomable out —
     the alternative is letterboxing a map that was asked to fill the screen. */
  const clampView = useCallback((v, b = box) => {
    if (!b) return v;
    const w = clamp(v.w, MIN_W, Math.min(W, H * (b.w / b.h)));
    const h = w * (b.h / b.w);
    return {
      w,
      cx: clamp(v.cx, w / 2, W - w / 2),
      cy: clamp(v.cy, h / 2, H - h / 2),
    };
  }, [box]);

  /**
   * The opening frame.
   *
   * A continent's span is quoted in degrees of longitude, but the projection
   * ties the two axes together: on a phone, showing 120° of longitude across a
   * 390px width also means showing 200-odd degrees of latitude, and "zoom to
   * North America" turns into a view of both Americas.
   *
   * Longitude wins that argument, because longitude is where the bubbles are —
   * a frame that fits San Francisco and New York on screen at once is doing its
   * job even if the top of it is Arctic. MAX_HOME_LAT is only a backstop
   * against a very tall, very narrow window; on ordinary phone and desktop
   * shapes the continent's own span is what binds.
   */
  const homeFrame = useCallback((b = box) => clampView({
    cx: project(0, home.lng, W, H).x,
    cy: project(home.lat, 0, W, H).y,
    w: b
      ? Math.min(home.span * PX_PER_DEG, MAX_HOME_LAT * PX_PER_DEG * (b.w / b.h))
      : home.span * PX_PER_DEG,
  }, b), [home, box, clampView]);

  /* The container drives the camera's aspect ratio, so the view cannot be set
     until the container has been measured — and has to be re-clamped when it
     changes (rotation, desktop resize, the region sheet opening). */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width < 1 || height < 1) return;
      const b = { w: width, h: height };
      setBox(b);
      setView((v) => (v ? clampView(v, b) : homeFrame(b)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const u = box && view ? view.w / box.w : 1;   // map units per screen pixel
  const viewH = view && box ? view.w * (box.h / box.w) : H;

  /* ————— gestures ————— */

  const ptrs = useRef(new Map());
  const pinch = useRef(null);
  const moved = useRef(false);

  const zoomAt = useCallback((factor, sx, sy) => {
    setView((v) => {
      if (!v || !box) return v;
      const uu = v.w / box.w;
      const h = v.w * (box.h / box.w);
      const mx = v.cx - v.w / 2 + sx * uu;      // map point under the gesture
      const my = v.cy - h / 2 + sy * uu;
      const nw = clamp(v.w * factor, MIN_W, Math.min(W, H * (box.w / box.h)));
      const nu = nw / box.w;
      const nh = nw * (box.h / box.w);
      return clampView({ cx: mx - sx * nu + nw / 2, cy: my - sy * nu + nh / 2, w: nw });
    });
  }, [box, clampView]);

  /* Wheel has to be bound by hand: React's onWheel is passive, and a passive
     handler cannot preventDefault, which means scrolling over the map would
     scroll the page behind it instead of zooming. */
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(Math.exp(e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e) => {
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 1) moved.current = false;
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) };
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const prev = ptrs.current.get(e.pointerId);
    if (!prev || !box) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.current.size >= 2 && pinch.current) {
      const [a, b] = [...ptrs.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 0 && pinch.current.dist > 0) {
        const r = boxRef.current.getBoundingClientRect();
        zoomAt(pinch.current.dist / dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      }
      pinch.current.dist = dist;
      moved.current = true;
      return;
    }

    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
    setView((v) => (v ? clampView({ ...v, cx: v.cx - dx * (v.w / box.w), cy: v.cy - dy * (v.w / box.w) }) : v));
  };

  const points = useMemo(() => buckets.map((b) => ({
    ...b,
    ...project(b.lat, b.lng, W, H),
    r: radiusOf(b.count),
  })), [buckets]);

  /**
   * Selection is a hit test on pointerup, not an onClick on the bubble.
   *
   * The container captures the pointer so a drag survives leaving the map, and
   * a captured pointer retargets the click that follows it — bubbles with their
   * own onClick simply never fire. Hit-testing here also gets the two things
   * the DOM would not: a bubble is grabbable anywhere inside its circle rather
   * than inside the SVG group's bounding box, which includes the empty strip
   * around its label, and a pan that happens to end over a bubble does not
   * select it.
   */
  const endPointer = (e, select = true) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinch.current = null;
    if (!select || ptrs.current.size > 0 || moved.current || !box || !view) return;

    const rect = boxRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const left = view.cx - view.w / 2, top = view.cy - viewH / 2;

    let hit = null, best = Infinity;
    for (const p of points) {
      const d = Math.hypot((p.x - left) / u - sx, (p.y - top) / u - sy);
      if (d <= p.r + 5 && d < best) { best = d; hit = p; }
    }
    onSelect?.(hit ? (hit.id === selectedId ? null : hit.id) : null);
  };

  /* At world scale the labels collide into a smear — London and Berlin are nine
     pixels apart. Zoomed in they are the point of the thing. */
  const showLabels = !view || view.w <= 520;

  return (
    <div ref={boxRef} style={{ position: "relative", background: C.ink, overflow: "hidden", touchAction: "none", cursor: "grab", ...style }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={endPointer} onPointerCancel={(e) => endPointer(e, false)}
      onDoubleClick={(e) => {
        const r = boxRef.current.getBoundingClientRect();
        zoomAt(0.55, e.clientX - r.left, e.clientY - r.top);
      }}>
      <svg
        viewBox={view ? `${view.cx - view.w / 2} ${view.cy - viewH / 2} ${view.w} ${viewH}` : `0 0 ${W} ${H}`}
        width="100%" height="100%" style={{ display: "block" }} role="group"
        aria-label="People by region. Select a region to filter the list.">

        {/* Ocean. Tapping it clears the selection — see endPointer. */}
        <rect x={-W} y={-H} width={W * 3} height={H * 3} fill={C.ink} pointerEvents="none" />

        {/* Land. Every country is its own path, so the borders are real borders
            rather than a silhouette of the continents. */}
        <g fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)"
          strokeWidth={0.7 * u} strokeLinejoin="round" pointerEvents="none">
          {WORLD_PATHS.map((d, i) => <path key={i} d={d} />)}
        </g>

        {points.map((p) => {
          const on = selectedId === p.id;
          return (
            /* onKeyDown is the keyboard path only — pointers go through
               endPointer's hit test. */
            <g key={p.id} role="button" tabIndex={0}
              aria-pressed={on}
              aria-label={`${p.name}, ${p.count} people`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(on ? null : p.id); }
              }}
              style={{ cursor: "pointer", outline: "none" }}>
              {on && <circle cx={p.x} cy={p.y} r={(p.r + 7) * u} fill="none" stroke={C.lilac} strokeWidth={1.5 * u} />}
              <circle cx={p.x} cy={p.y} r={p.r * u} fill={C.purple} opacity={0.82} />
              <circle cx={p.x} cy={p.y} r={p.r * u} fill="none"
                stroke={on ? C.lilac : "rgba(183,175,242,.6)"} strokeWidth={(on ? 2 : 1) * u} />
              <text x={p.x} y={p.y + 3.6 * u} textAnchor="middle"
                fontFamily={F.mono} fontSize={10.5 * u} fontWeight={700} fill={C.white} pointerEvents="none">
                {p.count}
              </text>
              {(showLabels || on) && (
                <text x={p.x} y={p.y + (p.r + 13) * u} textAnchor="middle"
                  fontFamily={F.mono} fontSize={9.5 * u} letterSpacing={0.6 * u}
                  fill={on ? C.lilac : "rgba(255,255,255,.7)"} pointerEvents="none">
                  {p.name.toUpperCase()}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Zoom and recenter. Recenter is the way back when a pan has left you
          over open ocean, which is otherwise a dead end on a dark map. */}
      <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <MapBtn label="Zoom in" onClick={() => box && zoomAt(0.6, box.w / 2, box.h / 2)}><Plus size={15} /></MapBtn>
        <MapBtn label="Zoom out" onClick={() => box && zoomAt(1 / 0.6, box.w / 2, box.h / 2)}><Minus size={15} /></MapBtn>
        <MapBtn label={`Recenter on ${home.name}`} onClick={() => setView(homeFrame())}><Crosshair size={15} /></MapBtn>
      </div>
    </div>
  );
};

const MapBtn = ({ children, label, onClick }) => (
  <button aria-label={label} title={label} onClick={onClick}
    onPointerDown={(e) => e.stopPropagation()}
    style={{
      width: 32, height: 32, borderRadius: 9, cursor: "pointer",
      background: "rgba(26,26,26,.72)", border: "1px solid rgba(255,255,255,.18)",
      color: C.white, display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(6px)",
    }}>
    {children}
  </button>
);

/**
 * Map + the sheet that a tapped region opens.
 *
 * The map owns the whole surface and the people slide in over it, rather than
 * the map being a strip above a list. That is the difference between a map you
 * glance at and a map you use: at strip height, half the screen was chrome
 * describing a map too small to read.
 *
 * `renderRow` is a prop rather than an import so this file stays independent of
 * explore.jsx, which imports it back.
 */
export const MapBrowse = ({
  buckets = [], regionId, onSelect, people = [], wanted = "mentee",
  renderRow, loading, error, track = "Any", onTrack, tracks = null,
}) => {
  const selected = buckets.find((b) => b.id === regionId) || null;
  const inRegion = people.filter((p) => p._region?.id === regionId);
  const list = track === "Any" ? inRegion : inRegion.filter((p) => p._track === track);

  return (
    /* The map has no intrinsic height — it is an absolutely-positioned child of
       this box, so this box is the only thing that can give it one. `flex: 1`
       fills whatever the host screen has left over, which is the intent, but it
       yields *zero* in any host that isn't a full-height flex column. A map that
       renders as nothing is indistinguishable from a map that failed to load, so
       the floor is not optional: below it, `flex: 1` is a preference, not the
       only source of height. */
    <div style={{ position: "relative", flex: 1, minHeight: "min(58vh, 400px)" }}>
      <RegionMap buckets={buckets} selectedId={regionId} onSelect={onSelect}
        style={{ position: "absolute", inset: 0 }} />

      {selected && (
        <div className="sheet-up" style={{
          position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 20,
          background: C.white, borderRadius: "20px 20px 0 0",
          boxShadow: "0 -10px 30px rgba(26,26,26,.28)",
          maxHeight: "62%", display: "flex", flexDirection: "column",
        }}>
          <div style={{ padding: "12px 20px 10px", flexShrink: 0, borderBottom: `1px solid ${C.line}` }}>
            <div style={{ width: 38, height: 4, background: "#D8D6D0", borderRadius: 2, margin: "0 auto 12px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={15} color={C.purple} />{selected.name}
                </div>
                {selected.sub && (
                  <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2 }}>{selected.sub}</div>
                )}
              </div>
              <button onClick={() => onSelect(null)} aria-label="Close"
                style={{ border: "none", background: C.surface, borderRadius: 9, cursor: "pointer", padding: 7, display: "flex", flexShrink: 0 }}>
                <X size={15} color={C.ink} />
              </button>
            </div>

            {tracks && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {tracks.map((t) => (
                  <button key={t} onClick={() => onTrack?.(t)} style={{ border: "none", background: "none", padding: 0, cursor: "pointer" }}>
                    <Chip c={track === t ? C.white : C.gray} bg={track === t ? C.purple : C.surface}>{t}</Chip>
                  </button>
                ))}
              </div>
            )}

            <div style={{ fontFamily: F.mono, fontSize: 9, color: C.mute, marginTop: 10, letterSpacing: 0.5 }}>
              {loading ? "LOADING…" : `${list.length} ${wanted.toUpperCase()}${list.length === 1 ? "" : "S"} SHOWING · ${selected.count} IN ${selected.name.toUpperCase()}`}
            </div>
          </div>

          <div className="app-scroll" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "12px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
            {error && (
              <div style={{ background: C.coralTint, borderRadius: 12, padding: 12, fontSize: 13.5, color: C.coral }}>{error}</div>
            )}
            {list.map((p) => renderRow(p))}
            {!loading && !error && list.length === 0 && (
              <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.5, padding: "10px 0 4px" }}>
                Nobody here matches that filter yet.
              </div>
            )}
            {/* Said where it actually explains something: this bucket is a
                region because the cities inside it were too small to name. */}
            {selected.kind === "region" && (
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.mute, letterSpacing: 0.5, lineHeight: 1.6, marginTop: 4 }}>
                CITIES WITH FEWER THAN {MIN_BUCKET} PEOPLE ROLL UP INTO THEIR REGION
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
