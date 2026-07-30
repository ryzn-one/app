import React, { useMemo, useState } from "react";
import {
  Calendar, CalendarCheck, CalendarClock, CalendarPlus, Check, ChevronLeft, ChevronRight,
  Clock, Download, ExternalLink, Plus, RotateCcw, Trash2, Video, X,
} from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Label, Btn, Monogram, HeaderRow } from "./ui.jsx";
import {
  countdown, dayKeyOf, defaultSlot, downloadIcs, fmtDate, fmtRange, fmtTime, googleCalendarUrl,
} from "./lib/calendar.js";

/* ————————————————— 1:1 SESSIONS —————————————————

   One side proposes times, the other picks one. Nothing here claims a booking
   that both people haven't agreed to: a session shows a date only once it is
   `confirmed`, and only a confirmed session offers the calendar buttons.

   This replaces the placeholder Sessions tab, which derived a card per mentee,
   printed "NOT YET BOOKED", and told mentors to agree a time in their thread. */

const STATUS_META = {
  proposed: { label: "Awaiting a time", c: C.amber, bg: C.amberTint },
  confirmed: { label: "Booked", c: C.teal, bg: C.tealTint },
  declined: { label: "Declined", c: C.coral, bg: C.coralTint },
  canceled: { label: "Canceled", c: C.gray, bg: C.surface },
  completed: { label: "Logged", c: C.purple, bg: C.purpleTint },
};

const DEFAULT_AGENDA = [
  "Intro: walk through their goals",
  "Set the weekly cadence and channel",
  "Assign the Week 1 exercise track",
];

const inputStyle = {
  width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 10,
  fontFamily: F.sans, fontSize: 14, boxSizing: "border-box", background: C.white, color: C.ink,
};

const Pill = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.proposed;
  return (
    <span style={{
      fontFamily: F.mono, fontSize: 9, letterSpacing: 0.8, fontWeight: 700, color: meta.c,
      background: meta.bg, padding: "4px 8px", borderRadius: 8, whiteSpace: "nowrap",
    }}>
      {meta.label.toUpperCase()}
    </span>
  );
};

/* ————————————————— MONTH CALENDAR —————————————————
   Booked sessions in solid purple, proposals still waiting on someone in amber.
   Tapping a day filters the list underneath it. */

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export const MonthCalendar = ({ sessions = [], selected, onSelect }) => {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  /* dayKey → { booked, proposed } so a cell can show what kind of day it is
     without walking every session again per cell. */
  const marks = useMemo(() => {
    const map = new Map();
    const add = (value, kind) => {
      const key = dayKeyOf(value);
      if (!key) return;
      const entry = map.get(key) || { booked: 0, proposed: 0 };
      entry[kind] += 1;
      map.set(key, entry);
    };
    for (const s of sessions) {
      if (s.status === "confirmed" || s.status === "completed") add(s.confirmedSlot?.start, "booked");
      else if (s.status === "proposed") s.slots?.forEach((slot) => add(slot.start, "proposed"));
    }
    return map;
  }, [sessions]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = first.getDay();
  const todayKey = dayKeyOf(new Date());

  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const step = (dir) => setCursor(new Date(year, month + dir, 1));

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => step(-1)} aria-label="Previous month"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, margin: -6, color: C.ink }}>
          <ChevronLeft size={18} />
        </button>
        <div style={{ fontWeight: 700, fontSize: 15 }}>
          {cursor.toLocaleDateString([], { month: "long", year: "numeric" })}
        </div>
        <button onClick={() => step(1)} aria-label="Next month"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, margin: -6, color: C.ink }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", textAlign: "center", paddingBottom: 4 }}>
            {d}
          </div>
        ))}
        {cells.map((date, i) => {
          if (!date) return <div key={`pad-${i}`} />;
          const key = dayKeyOf(date);
          const mark = marks.get(key);
          const isToday = key === todayKey;
          const isSelected = key === selected;
          return (
            <button
              key={key}
              onClick={() => onSelect?.(isSelected ? null : key)}
              style={{
                aspectRatio: "1 / 1", border: isToday ? `1.5px solid ${C.ink}` : "1px solid transparent",
                borderRadius: 10, cursor: "pointer", padding: 0,
                background: isSelected ? C.purple : mark?.booked ? C.purpleTint : "transparent",
                color: isSelected ? C.white : C.ink,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                fontFamily: F.sans, fontSize: 12.5, fontWeight: mark ? 700 : 500,
              }}
            >
              {date.getDate()}
              <span style={{ display: "flex", gap: 2, height: 4 }}>
                {mark?.booked ? <span style={{ width: 4, height: 4, borderRadius: 2, background: isSelected ? C.white : C.purple }} /> : null}
                {mark?.proposed ? <span style={{ width: 4, height: 4, borderRadius: 2, background: isSelected ? "#F0D9A8" : C.amber }} /> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 12, fontFamily: F.mono, fontSize: 9, color: C.gray }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: C.purple }} /> BOOKED
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: C.amber }} /> PROPOSED
        </span>
      </div>
    </Card>
  );
};

/* ————————————————— TIME PICKER —————————————————
   Up to five options. The other side picks one; that pick is the booking. */

const SlotRows = ({ slots, setSlots, max = 5 }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    {slots.map((slot, i) => (
      <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          type="datetime-local" value={slot.start} aria-label={`Option ${i + 1} start`}
          onChange={(e) => setSlots(slots.map((s, j) => (j === i ? { ...s, start: e.target.value } : s)))}
          style={{ ...inputStyle, flex: 1, fontSize: 13, padding: "8px 10px" }}
        />
        <input
          type="datetime-local" value={slot.end} aria-label={`Option ${i + 1} end`}
          onChange={(e) => setSlots(slots.map((s, j) => (j === i ? { ...s, end: e.target.value } : s)))}
          style={{ ...inputStyle, flex: 1, fontSize: 13, padding: "8px 10px" }}
        />
        {slots.length > 1 && (
          <button onClick={() => setSlots(slots.filter((_, j) => j !== i))} aria-label="Remove this option"
            style={{ background: "none", border: "none", cursor: "pointer", color: C.gray, padding: 6 }}>
            <X size={16} />
          </button>
        )}
      </div>
    ))}
    {slots.length < max && (
      <button
        onClick={() => setSlots([...slots, defaultSlot(slots.length + 3)])}
        style={{
          alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer",
          color: C.purple, fontFamily: F.sans, fontWeight: 600, fontSize: 12.5, padding: "2px 0",
        }}
      >
        + Add another option
      </button>
    )}
  </div>
);

/* ————————————————— COMPOSER ————————————————— */

export const SessionComposer = ({ role, people = [], onCreate, onError }) => {
  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState(people[0]?.id || "");
  const [title, setTitle] = useState("Opening session");
  const [agenda, setAgenda] = useState(DEFAULT_AGENDA);
  const [locationLabel, setLocationLabel] = useState("Video call");
  const [locationUrl, setLocationUrl] = useState("");
  const [slots, setSlots] = useState(() => [defaultSlot(3), defaultSlot(4)]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const person = people.find((p) => p.id === personId) || people[0];
  const ready = person && slots.length > 0 && slots.every((s) => s.start && s.end && new Date(s.start) < new Date(s.end));

  if (people.length === 0) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%", padding: "12px 16px", border: `1.5px dashed ${C.line}`, borderRadius: 14,
          background: C.surface, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          fontFamily: F.sans, fontWeight: 600, fontSize: 14, color: C.gray,
        }}
      >
        <CalendarPlus size={16} /> Propose a session
      </button>
    );
  }

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onCreate({
        otherId: person.id,
        title: title.trim() || "Mentorship session",
        agenda: agenda.map((a) => a.trim()).filter(Boolean),
        week: person.week ?? null,
        location: locationLabel || locationUrl ? { label: locationLabel.trim() || null, url: locationUrl.trim() || null } : null,
        slots: slots.map((s) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() })),
      });
      setOpen(false);
      setSlots([defaultSlot(3), defaultSlot(4)]);
    } catch (e) {
      setErr(e?.message || "Couldn't send that.");
      onError?.(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Label color={C.purple}>Propose a session</Label>
        <button onClick={() => setOpen(false)} aria-label="Close"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.gray }}>
          <X size={18} />
        </button>
      </div>

      {people.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <Label style={{ marginBottom: 8 }}>{role === "mentor" ? "Which mentee" : "Which mentor"}</Label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {people.map((p) => (
              <button
                key={p.id} onClick={() => setPersonId(p.id)}
                style={{
                  padding: "8px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  fontFamily: F.sans, fontWeight: 600, fontSize: 13,
                  background: p.id === person?.id ? C.purple : C.surface,
                  color: p.id === person?.id ? C.white : C.ink,
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Session title"
        style={{ ...inputStyle, marginBottom: 12 }} />

      <Label style={{ marginBottom: 8 }}>Agenda</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0 12px" }}>
        {agenda.map((line, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontFamily: F.mono, fontSize: 10, color: C.purple }}>{String(i + 1).padStart(2, "0")}</span>
            <input
              value={line} placeholder="What you'll cover"
              onChange={(e) => setAgenda(agenda.map((a, j) => (j === i ? e.target.value : a)))}
              style={{ ...inputStyle, fontSize: 13, padding: "8px 10px" }}
            />
            <button onClick={() => setAgenda(agenda.filter((_, j) => j !== i))} aria-label="Remove line"
              style={{ background: "none", border: "none", cursor: "pointer", color: C.gray, padding: 6 }}>
              <X size={15} />
            </button>
          </div>
        ))}
        {agenda.length < 8 && (
          <button onClick={() => setAgenda([...agenda, ""])}
            style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", color: C.purple, fontFamily: F.sans, fontWeight: 600, fontSize: 12.5 }}>
            + Add a line
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="Where (e.g. Video call)"
          style={{ ...inputStyle, flex: 1, fontSize: 13, padding: "9px 10px" }} />
        <input value={locationUrl} onChange={(e) => setLocationUrl(e.target.value)} placeholder="Meeting link (optional)" type="url"
          style={{ ...inputStyle, flex: 1, fontSize: 13, padding: "9px 10px" }} />
      </div>

      <Label style={{ marginBottom: 8 }}>Times you can do · they pick one</Label>
      <div style={{ marginTop: 8 }}>
        <SlotRows slots={slots} setSlots={setSlots} />
      </div>

      {err && <div style={{ fontSize: 12.5, color: C.coral, marginTop: 10, lineHeight: 1.4 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Btn disabled={!ready || busy} onClick={submit} style={{ flex: 1 }}>
          {busy ? "Sending…" : `Send to ${(person?.name || "them").split(" ")[0]}`}
        </Btn>
        <Btn kind="ghost" onClick={() => setOpen(false)} style={{ flex: 0.4 }}>Cancel</Btn>
      </div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 10, letterSpacing: 0.6 }}>
        NOTHING IS BOOKED UNTIL {(person?.name || "THEY").split(" ")[0].toUpperCase()} PICKS A TIME
      </div>
    </Card>
  );
};

/* ————————————————— SESSION CARD ————————————————— */

const AddToCalendar = ({ session, toast }) => {
  const google = googleCalendarUrl(session);
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      <Btn small kind="soft" style={{ flex: 1, minWidth: 130 }}
        onClick={() => { if (!downloadIcs(session)) toast?.("No time booked yet."); }}>
        <Download size={14} /> Add to calendar
      </Btn>
      {google && (
        <Btn small kind="ghost" style={{ flex: 1, minWidth: 130, borderColor: C.line, color: C.gray }}
          onClick={() => window.open(google, "_blank", "noopener")}>
          <Calendar size={14} /> Google
        </Btn>
      )}
    </div>
  );
};

export const SessionCard = ({ session, busy, onAction, toast }) => {
  const [rescheduling, setRescheduling] = useState(false);
  const [slots, setSlots] = useState(() => [defaultSlot(3)]);
  const meta = STATUS_META[session.status] || STATUS_META.proposed;
  const first = (session.person?.name || "them").split(" ")[0];
  const live = session.status === "proposed" || session.status === "confirmed";
  const past = session.confirmedSlot ? new Date(session.confirmedSlot.end).getTime() < Date.now() : false;
  const canLog = session.status === "confirmed" && session.viewerSide === "mentor" && past;

  const act = (action, extra) => onAction(session.id, action, extra);

  return (
    <Card style={session.awaitingYou ? { border: `1.5px solid ${C.amber}` } : undefined}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Monogram name={session.person?.name || "—"} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{session.person?.name}</div>
          <div style={{ fontSize: 12.5, color: C.gray, marginTop: 1 }}>{session.title}</div>
        </div>
        <Pill status={session.status} />
      </div>

      {/* Confirmed: the one place a date is stated as fact. */}
      {session.confirmedSlot && (
        <div style={{ marginTop: 12, background: meta.bg, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarCheck size={16} color={meta.c} />
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{fmtRange(session.confirmedSlot)}</div>
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9.5, color: meta.c, marginTop: 6, letterSpacing: 0.6 }}>
            {session.status === "completed" ? "LOGGED BY THE MENTOR" : countdown(session.confirmedSlot.start).toUpperCase()}
            {session.location?.label ? ` · ${session.location.label.toUpperCase()}` : ""}
          </div>
        </div>
      )}

      {/* Proposed: the times on the table. Tapping one is the booking. */}
      {session.status === "proposed" && (
        <div style={{ marginTop: 12 }}>
          <Label>{session.awaitingYou ? `${first} proposed · pick one` : "Waiting on them to pick"}</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {session.slots.map((slot) => (
              <button
                key={slot.id}
                disabled={!session.awaitingYou || busy}
                onClick={() => act("accept", { slotId: slot.id })}
                style={{
                  textAlign: "left", padding: "10px 12px", borderRadius: 10,
                  border: `1px solid ${session.awaitingYou ? C.purple : C.line}`,
                  background: session.awaitingYou ? C.white : C.surface,
                  cursor: session.awaitingYou && !busy ? "pointer" : "default",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                  fontFamily: F.sans, fontSize: 13, color: C.ink,
                }}
              >
                <span style={{ fontWeight: 600 }}>{fmtDate(slot.start)} · {fmtTime(slot.start)}–{fmtTime(slot.end)}</span>
                {session.awaitingYou && (
                  <span style={{ fontFamily: F.mono, fontSize: 9, color: C.purple, display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={13} /> BOOK
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {session.agenda?.length > 0 && (
        <div style={{ marginTop: 12, background: C.surface, borderRadius: 12, padding: 12 }}>
          <Label>Agenda{session.week ? ` · Week ${session.week}` : ""}</Label>
          {session.agenda.map((a, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 13, lineHeight: 1.45 }}>
              <span style={{ fontFamily: F.mono, fontSize: 10, color: C.purple, marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
              {a}
            </div>
          ))}
        </div>
      )}

      {session.notes && (
        <div style={{ fontSize: 12.5, color: C.gray, marginTop: 10, lineHeight: 1.5 }}>{session.notes}</div>
      )}

      {session.status === "confirmed" && session.location?.url && (
        <Btn small kind="dark" style={{ width: "100%", marginTop: 12 }}
          onClick={() => window.open(session.location.url, "_blank", "noopener")}>
          <Video size={14} /> Join the call <ExternalLink size={12} />
        </Btn>
      )}

      {(session.status === "confirmed" || session.status === "completed") && (
        <AddToCalendar session={session} toast={toast} />
      )}

      {/* Counter-offer. Either side, and it hands the turn back to the other. */}
      {rescheduling && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}` }}>
          <Label style={{ marginBottom: 8 }}>New times · {first} picks one</Label>
          <div style={{ marginTop: 8 }}>
            <SlotRows slots={slots} setSlots={setSlots} />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Btn small style={{ flex: 1 }} disabled={busy || !slots.every((s) => s.start && s.end)}
              onClick={async () => {
                // Only collapse on success — a rejected time should keep the
                // rows on screen so they can be fixed rather than retyped.
                const res = await act("reschedule", {
                  slots: slots.map((s) => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() })),
                });
                if (res) setRescheduling(false);
              }}>
              Send new times
            </Btn>
            <Btn small kind="ghost" style={{ flex: 0.5, borderColor: C.line, color: C.gray }} onClick={() => setRescheduling(false)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {live && !rescheduling && (
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {canLog && (
            <Btn small kind="soft" disabled={busy} style={{ flex: 1, minWidth: 120 }} onClick={() => act("complete")}>
              <Check size={14} /> Log as done
            </Btn>
          )}
          <Btn small kind="ghost" disabled={busy} style={{ flex: 1, minWidth: 120, borderColor: C.line, color: C.gray }}
            onClick={() => { setSlots([defaultSlot(3)]); setRescheduling(true); }}>
            <RotateCcw size={13} /> {session.awaitingYou ? "Suggest other times" : "Reschedule"}
          </Btn>
          {session.awaitingYou ? (
            <Btn small kind="ghost" disabled={busy} style={{ flex: 1, minWidth: 100, borderColor: C.coralTint, color: C.coral }}
              onClick={() => act("decline")}>
              Decline
            </Btn>
          ) : (
            <Btn small kind="ghost" disabled={busy} style={{ flex: 1, minWidth: 100, borderColor: C.coralTint, color: C.coral }}
              onClick={() => act("cancel")}>
              <Trash2 size={13} /> Cancel
            </Btn>
          )}
        </div>
      )}
    </Card>
  );
};

/* ————————————————— SCREEN —————————————————
   Shared by the mentor's Sessions tab and the mentee's Sessions overlay: the
   flow is symmetric, so there is one screen rather than two that drift. */

export const SessionsScreen = ({
  role, people = [], sessions = [], loading, error, busy, onCreate, onAction, toast, back,
}) => {
  const [selectedDay, setSelectedDay] = useState(null);

  const { needsYou, upcoming, awaitingThem, history } = useMemo(() => {
    const byStart = (a, b) => new Date(a.confirmedSlot.start) - new Date(b.confirmedSlot.start);
    const isPast = (s) => s.confirmedSlot && new Date(s.confirmedSlot.end).getTime() < Date.now();
    return {
      needsYou: sessions.filter((s) => s.awaitingYou),
      upcoming: sessions.filter((s) => s.status === "confirmed" && !isPast(s)).sort(byStart),
      awaitingThem: sessions.filter((s) => s.status === "proposed" && !s.awaitingYou),
      history: sessions.filter(
        (s) => s.status === "completed" || s.status === "declined" || s.status === "canceled" || (s.status === "confirmed" && isPast(s))
      ),
    };
  }, [sessions]);

  /* Selecting a day in the calendar narrows every list to that day. */
  const onDay = useMemo(() => {
    if (!selectedDay) return null;
    return sessions.filter((s) =>
      s.confirmedSlot
        ? dayKeyOf(s.confirmedSlot.start) === selectedDay
        : s.status === "proposed" && s.slots?.some((slot) => dayKeyOf(slot.start) === selectedDay)
    );
  }, [selectedDay, sessions]);

  const booked = sessions.filter((s) => s.status === "confirmed").length;
  const cardProps = { busy, onAction, toast };

  return (
    <div>
      <HeaderRow
        title="Sessions"
        onBack={back}
        right={<Label>{booked} BOOKED{needsYou.length ? ` · ${needsYou.length} TO ANSWER` : ""}</Label>}
      />
      <div data-tour="mentor-sessions-list" style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

        {loading && sessions.length === 0 && (
          <div style={{ padding: 20, textAlign: "center", color: C.gray, fontSize: 13 }}>Loading sessions…</div>
        )}
        {error && (
          <Card style={{ background: C.coralTint, border: `1px solid ${C.coral}` }}>
            <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>Couldn’t load your sessions. Check your connection and try again.</div>
          </Card>
        )}

        {/* Their move, first. This is the "accept the session" surface. */}
        {needsYou.length > 0 && (
          <>
            <Label color={C.amber}>Needs your answer</Label>
            {needsYou.map((s) => <SessionCard key={s.id} session={s} {...cardProps} />)}
          </>
        )}

        <SessionComposer role={role} people={people} onCreate={onCreate} onError={(e) => toast?.(e?.message || "Couldn't send that.")} />

        {people.length === 0 && !loading && (
          <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Calendar size={18} color={C.gray} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>No one to book with yet</div>
                <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>
                  {role === "mentor"
                    ? "An accepted mentee unlocks session booking with them."
                    : "Once a mentor accepts you, you can propose times here."}
                </div>
              </div>
            </div>
          </Card>
        )}

        {sessions.length > 0 && (
          <MonthCalendar sessions={sessions} selected={selectedDay} onSelect={setSelectedDay} />
        )}

        {selectedDay && (
          <>
            <Label color={C.purple}>{fmtDate(`${selectedDay}T12:00:00`)}</Label>
            {onDay.length === 0
              ? <Card style={{ background: C.surface }}><div style={{ fontSize: 13, color: C.gray }}>Nothing on this day.</div></Card>
              : onDay.map((s) => <SessionCard key={s.id} session={s} {...cardProps} />)}
          </>
        )}

        {!selectedDay && (
          <>
            {upcoming.length > 0 && (
              <>
                <Label color={C.teal}>Booked</Label>
                {upcoming.map((s) => <SessionCard key={s.id} session={s} {...cardProps} />)}
              </>
            )}

            {awaitingThem.length > 0 && (
              <>
                <Label>Waiting on them</Label>
                {awaitingThem.map((s) => <SessionCard key={s.id} session={s} {...cardProps} />)}
              </>
            )}

            {history.length > 0 && (
              <>
                <Label>Past</Label>
                {history.map((s) => <SessionCard key={s.id} session={s} {...cardProps} />)}
              </>
            )}
          </>
        )}

        {!loading && sessions.length === 0 && people.length > 0 && (
          <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CalendarClock size={18} color={C.gray} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>No sessions yet</div>
                <div style={{ fontSize: 12.5, color: C.gray, marginTop: 3, lineHeight: 1.45 }}>
                  Propose a couple of times above. {role === "mentor" ? "Your mentee" : "Your mentor"} picks one, and it lands on both calendars.
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
