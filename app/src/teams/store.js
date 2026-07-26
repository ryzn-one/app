/* Ryzn for Teams — client persistence + demo credentials.
   Swap this module for real API calls when the backend lands. */

export const DEMO_ACCOUNTS = [
  { role: "admin",  email: "priya@northbound.com",  password: "Northbound2026!", name: "Priya Anand",  label: "HR Admin" },
  { role: "mentor", email: "ritwik@northbound.com", password: "RitwikPath26!",  name: "Ritwik Joshi", label: "Mentor" },
  { role: "mentee", email: "maya@northbound.com",   password: "MayaRise26!",    name: "Maya Osei",    label: "Mentee" },
];

const KEYS = {
  session: "ryzn_teams_session",
  org: "ryzn_teams_org",
  settings: "ryzn_teams_settings",
  invites: "ryzn_teams_invites",
  programs: "ryzn_teams_programs",
  sessions: "ryzn_teams_sessions",
  phase: "ryzn_teams_phase",
};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota / private mode */ }
}

export function loadSession() {
  return read(KEYS.session, null);
}

export function saveSession(session) {
  if (!session) localStorage.removeItem(KEYS.session);
  else write(KEYS.session, session);
}

export function authenticate(email, password) {
  const e = (email || "").trim().toLowerCase();
  const p = (password || "").trim();
  const hit = DEMO_ACCOUNTS.find(a => a.email === e && a.password === p);
  if (!hit) return null;
  return { email: hit.email, name: hit.name, role: hit.role, label: hit.label, at: Date.now() };
}

export function loadPhase(fallback = "onboarding") {
  return read(KEYS.phase, fallback);
}

export function savePhase(phase) {
  write(KEYS.phase, phase);
}

export function loadOrg(fallback) {
  return read(KEYS.org, fallback);
}

export function saveOrg(org) {
  write(KEYS.org, org);
}

export function loadSettings(fallback) {
  return read(KEYS.settings, fallback);
}

export function saveSettings(settings) {
  write(KEYS.settings, settings);
}

export function loadInvites(fallback) {
  return read(KEYS.invites, fallback);
}

export function saveInvites(invites) {
  write(KEYS.invites, invites);
}

export function loadPrograms(fallback) {
  return read(KEYS.programs, fallback);
}

export function savePrograms(programs) {
  write(KEYS.programs, programs);
}

export function loadSessions(fallback) {
  return read(KEYS.sessions, fallback);
}

export function saveSessions(sessions) {
  write(KEYS.sessions, sessions);
}

export function clearTeamsStore() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

/** Mentor invite codes must match invite.html: /^RYZ-INV-/i */
export function genMentorInviteCode() {
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `RYZ-INV-2026-${suffix}`;
}

export function genOrgInviteCode(prefix = "NB") {
  return `RYZ-${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Build the public mentor invite page URL (form HTML Bilal shared). */
export function buildInviteUrl({ code, email, role, orgName, adminName }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://ryzn.one";
  // Production app lives at /app/; local Vite root may not.
  const appBase = (typeof window !== "undefined" && window.location.pathname.startsWith("/app"))
    ? "/app/"
    : "/app/";
  const nameGuess = (email || "").split("@")[0].split(/[._]/)[0];
  const display = nameGuess ? nameGuess.charAt(0).toUpperCase() + nameGuess.slice(1) : "";
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (display) params.set("name", display);
  if (adminName) params.set("founder", adminName);
  if (orgName) params.set("org", orgName);
  if (role) params.set("role", role);
  // After accepting the form, land in Teams inside the app
  params.set("claim", `${origin}${appBase}#/teams?join=${encodeURIComponent(code || "")}`);
  // Site root pages (assembled into dist/)
  return `${origin}/mentor-invite.html?${params.toString()}`;
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  return Promise.resolve();
}
