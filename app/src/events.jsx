import React, { useState, useRef } from "react";
import { Plus, X, Check, Calendar, Users, Lock, Trash2, ChevronDown } from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Label, Btn, HeaderRow } from "./ui.jsx";
import { isMentorRole } from "./lib/roles.js";

export const EventComposer = ({ isAdmin, onCreateEvent, onError }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationUrl, setLocationUrl] = useState("");
  const [capacity, setCapacity] = useState("");
  const [mode, setMode] = useState("fixed");
  const [isQuarterly, setIsQuarterly] = useState(false);
  const [slots, setSlots] = useState([{ start: "", end: "" }]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const ready =
    title.trim() &&
    mode &&
    (!mode || slots.every(s => s.start && s.end)) &&
    new Date(slots[0]?.start) < new Date(slots[0]?.end);

  const reset = () => {
    setTitle("");
    setDescription("");
    setLocationLabel("");
    setLocationUrl("");
    setCapacity("");
    setMode("fixed");
    setIsQuarterly(false);
    setSlots([{ start: "", end: "" }]);
    setErr(null);
  };

  const go = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setErr(null);
    try {
      await onCreateEvent({
        title: title.trim(),
        description: description.trim() || null,
        kind: isQuarterly ? "quarterly" : "event",
        audience: "all",
        mode,
        location: locationLabel ? { label: locationLabel, url: locationUrl || null } : null,
        capacity: capacity ? Number(capacity) : null,
        slots: slots
          .filter(s => s.start && s.end)
          .map(s => ({ start: new Date(s.start).toISOString(), end: new Date(s.end).toISOString() })),
      });
      reset();
      setOpen(false);
    } catch (e) {
      setErr(e?.message || "Couldn't create event.");
      onError?.(e);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: `1.5px dashed ${C.line}`,
          borderRadius: 14,
          background: C.surface,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: F.sans,
          fontWeight: 600,
          fontSize: 14,
          color: C.gray,
        }}
      >
        <Plus size={16} /> Host an event
      </button>
    );
  }

  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <Label>Create an event</Label>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: C.gray,
          }}
        >
          <X size={18} />
        </button>
      </div>

      <input
        type="text"
        placeholder="Event title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          fontFamily: F.sans,
          fontSize: 14,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />

      <textarea
        placeholder="Description (optional)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          fontFamily: F.sans,
          fontSize: 14,
          marginBottom: 12,
          boxSizing: "border-box",
          resize: "none",
        }}
      />

      <input
        type="text"
        placeholder="Location (e.g., 'Evergreen Brick Works, Toronto' or 'Virtual')"
        value={locationLabel}
        onChange={e => setLocationLabel(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          fontFamily: F.sans,
          fontSize: 14,
          marginBottom: 8,
          boxSizing: "border-box",
        }}
      />

      <input
        type="url"
        placeholder="Zoom/Meet link (optional)"
        value={locationUrl}
        onChange={e => setLocationUrl(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 12px",
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          fontFamily: F.sans,
          fontSize: 14,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />

      <input
        type="number"
        placeholder="Capacity (optional)"
        value={capacity}
        onChange={e => setCapacity(e.target.value)}
        min="1"
        style={{
          width: "100%",
          padding: "10px 12px",
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          fontFamily: F.sans,
          fontSize: 14,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />

      <div style={{ marginBottom: 12 }}>
        <Label style={{ marginBottom: 8, display: "block" }}>When</Label>
        <div style={{ display: "flex", gap: 6 }}>
          {["fixed", "poll"].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                background: mode === m ? C.purple : C.surface,
                color: mode === m ? C.white : C.ink,
              }}
            >
              {m === "fixed" ? "Pick a time" : "Propose times"}
            </button>
          ))}
        </div>
      </div>

      {mode === "fixed" ? (
        <div style={{ marginBottom: 12 }}>
          <Label>When & where</Label>
          <input
            type="datetime-local"
            value={slots[0]?.start || ""}
            onChange={e => setSlots([{ ...slots[0], start: e.target.value }])}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              fontFamily: F.sans,
              fontSize: 14,
              marginTop: 8,
              marginBottom: 8,
              boxSizing: "border-box",
            }}
          />
          <input
            type="datetime-local"
            value={slots[0]?.end || ""}
            onChange={e => setSlots([{ ...slots[0], end: e.target.value }])}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${C.line}`,
              borderRadius: 10,
              fontFamily: F.sans,
              fontSize: 14,
              boxSizing: "border-box",
            }}
          />
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Label>Proposed times</Label>
            <button
              onClick={() => {
                if (slots.length < 8) setSlots([...slots, { start: "", end: "" }]);
              }}
              disabled={slots.length >= 8}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: slots.length >= 8 ? C.gray : C.purple,
                background: "none",
                border: "none",
                cursor: slots.length >= 8 ? "default" : "pointer",
              }}
            >
              + Add time
            </button>
          </div>
          {slots.map((slot, i) => (
            <div key={i} style={{ marginBottom: 8, display: "flex", gap: 6, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <input
                  type="datetime-local"
                  value={slot.start || ""}
                  onChange={e => {
                    const newSlots = [...slots];
                    newSlots[i].start = e.target.value;
                    setSlots(newSlots);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 8,
                    fontFamily: F.sans,
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="datetime-local"
                  value={slot.end || ""}
                  onChange={e => {
                    const newSlots = [...slots];
                    newSlots[i].end = e.target.value;
                    setSlots(newSlots);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    border: `1px solid ${C.line}`,
                    borderRadius: 8,
                    fontFamily: F.sans,
                    fontSize: 13,
                    boxSizing: "border-box",
                  }}
                />
              </div>
              {slots.length > 1 && (
                <button
                  onClick={() => setSlots(slots.filter((_, idx) => idx !== i))}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.gray,
                    padding: "8px",
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdmin && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={isQuarterly}
            onChange={e => setIsQuarterly(e.target.checked)}
            id="quarterly-check"
            style={{ cursor: "pointer" }}
          />
          <label htmlFor="quarterly-check" style={{ fontSize: 13, cursor: "pointer", flex: 1 }}>
            This is the quarterly Mentor Meet
          </label>
        </div>
      )}

      {err && <div style={{ fontSize: 12, color: C.coral, marginBottom: 12 }}>{err}</div>}

      <div style={{ display: "flex", gap: 8 }}>
        <Btn disabled={!ready || busy} onClick={go} style={{ flex: 1 }}>
          {busy ? "Creating…" : "Create event"}
        </Btn>
        <Btn kind="ghost" onClick={() => setOpen(false)} style={{ flex: 0.4 }}>
          Cancel
        </Btn>
      </div>
    </Card>
  );
};

export const AvailabilityPoll = ({ event, viewerAvailableSlotIds, isHost, onVote, onFinalize }) => {
  return (
    <div>
      <Label style={{ marginBottom: 8, display: "block" }}>What times work for you?</Label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        {event.slots.map(slot => {
          const isSelected = viewerAvailableSlotIds.includes(slot.id);
          const voteCount = event.slotVoteCounts?.[slot.id] || 0;
          const start = new Date(slot.start);
          const end = new Date(slot.end);

          return (
            <button
              key={slot.id}
              onClick={() => {
                const newIds = isSelected
                  ? viewerAvailableSlotIds.filter(id => id !== slot.id)
                  : [...viewerAvailableSlotIds, slot.id];
                onVote(newIds);
              }}
              style={{
                textAlign: "left",
                padding: "10px 12px",
                border: isSelected ? `2px solid ${C.purple}` : `1px solid ${C.line}`,
                borderRadius: 10,
                background: isSelected ? C.purpleTint : C.surface,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontFamily: F.sans,
                fontSize: 13,
              }}
            >
              <span style={{ fontWeight: isSelected ? 600 : 500 }}>
                {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                –
                {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span style={{ fontSize: 12, color: C.gray }}>
                {isSelected && <Check size={14} style={{ marginRight: 4, display: "inline" }} />}
                {voteCount} {voteCount === 1 ? "vote" : "votes"}
              </span>
            </button>
          );
        })}
      </div>

      {isHost && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Label style={{ marginBottom: 0 }}>Finalize this time?</Label>
          {event.slots.map(slot => (
            <Btn
              key={slot.id}
              kind="soft"
              small
              onClick={() => onFinalize(slot.id)}
              style={{ fontSize: 12 }}
            >
              Finalize {new Date(slot.start).toLocaleDateString()}
            </Btn>
          ))}
        </div>
      )}
    </div>
  );
};

export const EventCard = ({
  event,
  userId,
  isAdmin,
  onRsvp,
  onVote,
  onFinalize,
  onCancel,
}) => {
  const isHost = event.hostId === userId || isAdmin;
  const start = new Date(event.slots[0]?.start);
  const end = new Date(event.slots[0]?.end);

  return (
    <Card style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{event.title}</div>
          {event.description && (
            <div style={{ fontSize: 12, color: C.gray, marginTop: 4, lineHeight: 1.4 }}>{event.description}</div>
          )}
        </div>
        {isHost && (
          <button
            onClick={() => onCancel(event.id)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.coral,
              padding: 4,
            }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div style={{ fontSize: 12, color: C.gray, marginBottom: 10, display: "flex", gap: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Calendar size={14} /> {start.toLocaleDateString()}
        </span>
        {event.location?.label && <span>{event.location.label}</span>}
        {event.capacity && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Users size={14} /> {event.goingCount || 0} / {event.capacity}
          </span>
        )}
      </div>

      {event.mode === "fixed" ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <Btn
              small
              kind={event.viewerRsvp === "going" ? "primary" : "soft"}
              onClick={() => onRsvp("going")}
              style={{ flex: 1, fontSize: 13 }}
            >
              {event.viewerRsvp === "going" ? "✓ Going" : "Going"}
            </Btn>
            <Btn
              small
              kind={event.viewerRsvp === "declined" ? "primary" : "soft"}
              onClick={() => onRsvp("declined")}
              style={{ flex: 1, fontSize: 13 }}
            >
              {event.viewerRsvp === "declined" ? "✓ Can't go" : "Can't go"}
            </Btn>
          </div>
          {event.viewerRsvp === "waitlist" && (
            <div style={{ fontSize: 11, color: C.amber, marginTop: 6 }}>You're on the waitlist</div>
          )}
        </div>
      ) : (
        <AvailabilityPoll
          event={event}
          viewerAvailableSlotIds={event.viewerAvailableSlotIds || []}
          isHost={isHost}
          onVote={slotIds => onVote(event.id, slotIds)}
          onFinalize={slotId => onFinalize(event.id, slotId)}
        />
      )}

      {isHost && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.line}`, fontSize: 11, color: C.gray }}>
          <span style={{ fontWeight: 600 }}>Host options:</span> {event.mode === "poll" ? "Finalize a time above." : "Event is set."}
        </div>
      )}
    </Card>
  );
};
