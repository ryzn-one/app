/* ————— Add to calendar —————

   A confirmed session is only useful if it reaches the calendar the person
   actually looks at, so this emits both routes: an .ics file (Apple Calendar,
   Outlook, anything) and a Google Calendar template URL. Everything is built in
   the browser from the session we already hold — no third-party calendar
   integration, no OAuth, and nothing leaves the app until the user clicks. */

const pad = (n) => String(n).padStart(2, "0");

/** UTC basic format: 20260730T170000Z — what both ICS and Google expect. */
export const toStamp = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
};

/** RFC 5545 escaping: backslash, semicolon, comma, and newline. */
const esc = (s) =>
  String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

const bodyFor = (session) => {
  const lines = [];
  if (session.agenda?.length) {
    lines.push("Agenda:");
    session.agenda.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  }
  if (session.notes) lines.push("", session.notes);
  if (session.location?.url) lines.push("", session.location.url);
  lines.push("", "Booked on Ryzn · ryzn.one");
  return lines.join("\n");
};

const summaryFor = (session) =>
  `${session.title || "Mentorship session"} · ${session.person?.name || "Ryzn"}`;

/** A single-event VCALENDAR for a confirmed session. Null if nothing is booked. */
export function icsFor(session) {
  const slot = session?.confirmedSlot;
  const start = toStamp(slot?.start);
  const end = toStamp(slot?.end);
  if (!start || !end) return null;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ryzn//Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${session.id}@ryzn.one`,
    `DTSTAMP:${toStamp(new Date())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${esc(summaryFor(session))}`,
    `DESCRIPTION:${esc(bodyFor(session))}`,
    ...(session.location?.label || session.location?.url
      ? [`LOCATION:${esc(session.location.label || session.location.url)}`]
      : []),
    ...(session.location?.url ? [`URL:${esc(session.location.url)}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Downloads the .ics. Returns false when the session has no confirmed time. */
export function downloadIcs(session) {
  const ics = icsFor(session);
  if (!ics) return false;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ryzn-session-${session.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick — Safari needs the URL alive through the click.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

/** Google Calendar's pre-filled event composer. Null if nothing is booked. */
export function googleCalendarUrl(session) {
  const start = toStamp(session?.confirmedSlot?.start);
  const end = toStamp(session?.confirmedSlot?.end);
  if (!start || !end) return null;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summaryFor(session),
    dates: `${start}/${end}`,
    details: bodyFor(session),
  });
  const where = session.location?.label || session.location?.url;
  if (where) params.set("location", where);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/* ————— formatting helpers shared by the session screens ————— */

export const dayKeyOf = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const fmtTime = (value) =>
  new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export const fmtDate = (value) =>
  new Date(value).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

export const fmtRange = (slot) =>
  slot ? `${fmtDate(slot.start)} · ${fmtTime(slot.start)}–${fmtTime(slot.end)}` : "";

/** "in 3 days" / "tomorrow" / "today" — relative, from now. */
export function countdown(value) {
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const ms = then - Date.now();
  if (ms < 0) return "past";
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return "within the hour";
  if (hours < 24) return `in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(hours / 24);
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  return `in ${Math.round(days / 7)} weeks`;
}

/** Local <input type="datetime-local"> value for a Date. */
export const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Next occurrence of a round hour, `days` from now — the composer's default. */
export function defaultSlot(days = 3, hour = 17, minutes = 45) {
  const start = new Date();
  start.setDate(start.getDate() + days);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + minutes * 60_000);
  return { start: toLocalInput(start), end: toLocalInput(end) };
}
