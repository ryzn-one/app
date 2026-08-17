/* ————————————————— PWA INSTALL ————————————————— */

/* Ryzn is installable — manifest, icons and a fetch-handling worker are all in
 * place — but nothing ever said so. Installing meant knowing to dig through a
 * browser menu, which almost nobody does, so the home-screen app existed and
 * went unused. This is the offer, made once, in the app.
 *
 * Two routes exist and only one of them is automatic:
 *   Chrome / Edge / Android   fire `beforeinstallprompt`. We hold the event and
 *                             replay it on a tap, so install is one button.
 *   iOS                       never fires it. Add to Home Screen lives in the
 *                             share sheet and cannot be triggered from a page,
 *                             so the banner has to teach the gesture instead.
 *
 * Everything else (desktop Safari, Firefox on iOS) gets no banner rather than
 * instructions we can't stand behind.
 */

import { useCallback, useEffect, useReducer, useState } from "react";

const SNOOZE_KEY = "ryzn:install-snoozed-until";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/* The banner is an offer, not an interruption. Waiting a beat means it never
   lands on top of whatever the user opened the app to do. */
export const SHOW_AFTER_MS = 9000;

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent || "");

/* Already installed — in every form the platforms report it. iOS uses the
   legacy `navigator.standalone`; a launch from the Android home screen shows up
   as an android-app:// referrer. */
export const isStandalone = () => {
  if (typeof window === "undefined") return false;
  const mq = (q) => window.matchMedia?.(q).matches === true;
  return (
    mq("(display-mode: standalone)") ||
    mq("(display-mode: fullscreen)") ||
    mq("(display-mode: minimal-ui)") ||
    mq("(display-mode: window-controls-overlay)") ||
    window.navigator.standalone === true ||
    document.referrer.startsWith("android-app://")
  );
};

const isIOS = () =>
  /iphone|ipad|ipod/i.test(ua()) ||
  /* iPadOS 13+ reports itself as a Mac. Touch points are what give it away. */
  (/macintosh/i.test(ua()) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);

/**
 * The manual route, per iOS browser. Returns null where we have no honest
 * instructions to give — the banner then stays hidden.
 */
export function iosGuide() {
  if (!isIOS()) return null;
  const s = ua();
  if (/crios/i.test(s)) return {
    browser: "Chrome",
    steps: ["Tap the share icon in the address bar", "Choose “Add to Home Screen”", "Tap Add"],
  };
  if (/edgios/i.test(s)) return {
    browser: "Edge",
    steps: ["Tap the ••• menu", "Choose “Add to Home Screen”", "Tap Add"],
  };
  /* Firefox on iOS has no Add to Home Screen at all — the only working advice
     is to switch browsers, so that is what it gets. */
  if (/fxios/i.test(s)) return {
    browser: "Firefox",
    steps: ["Open ryzn.one in Safari", "Tap the share icon in the bottom bar", "Choose “Add to Home Screen”"],
  };
  return {
    browser: "Safari",
    steps: ["Tap the share icon in the bottom bar", "Scroll to “Add to Home Screen”", "Tap Add"],
  };
}

const readSnooze = () => {
  try {
    const until = Number(window.localStorage.getItem(SNOOZE_KEY));
    return Number.isFinite(until) ? until : 0;
  } catch { return 0; }
};

const isSnoozed = () => {
  if (typeof window === "undefined") return true;
  return readSnooze() > Date.now();
};

const snooze = () => {
  try { window.localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* private mode */ }
};

export const clearSnooze = () => {
  try { window.localStorage.removeItem(SNOOZE_KEY); } catch { /* private mode */ }
};

/* iOS offers no way to ask whether the app is already on the home screen, and
   `isStandalone` only answers for the window you are in — so someone who
   installed Ryzn and later opens ryzn.one in a Safari tab would be pitched the
   app they already have. The one reliable signal is a launch in standalone
   mode: seeing it once, from any page on the origin, is proof. It is recorded
   and from then on the banner stays down. */
const INSTALLED_KEY = "ryzn:installed";

const rememberInstalled = () => {
  try { window.localStorage.setItem(INSTALLED_KEY, "1"); } catch { /* private mode */ }
};

const wasInstalled = () => {
  try { return window.localStorage.getItem(INSTALLED_KEY) === "1"; } catch { return false; }
};

/* Chrome fires `beforeinstallprompt` the moment the worker takes control, which
   routinely beats React's first effect. The event is captured at module load
   and replayed to whichever hook mounts later, so an early fire is never lost.
   It is also single-use: once prompt() has run, the browser must hand us a new
   one before we can ask again. */
let deferred = null;
let installed = false;
const subs = new Set();
const notify = () => subs.forEach((fn) => fn());

if (typeof window !== "undefined") {
  /* Running standalone right now — the app is installed, and this is the fact
     that has to outlive the window. */
  if (isStandalone()) { installed = true; rememberInstalled(); }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    rememberInstalled();
    clearSnooze();
    notify();
  });
}

/**
 * @param {{ delay?: number, enabled?: boolean }} opts
 *   delay   ms to wait before `visible` flips true. 0 shows immediately —
 *           used by the Settings row, which is asked for rather than offered.
 *   enabled false parks the hook (signed out, mid-onboarding, …).
 *
 * @returns {{
 *   visible: boolean, canInstall: boolean, mode: "prompt"|"manual"|null,
 *   guide: {browser: string, steps: string[]}|null, busy: boolean,
 *   install: () => Promise<"accepted"|"dismissed"|"manual">, dismiss: () => void,
 * }}
 */
export function useInstallPrompt({ delay = SHOW_AFTER_MS, enabled = true } = {}) {
  const [, bump] = useReducer((n) => n + 1, 0);
  const [ripe, setRipe] = useState(delay <= 0);
  const [dismissed, setDismissed] = useState(() => isSnoozed());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    subs.add(bump);
    return () => { subs.delete(bump); };
  }, []);

  useEffect(() => {
    if (delay <= 0 || !enabled) return;
    const id = setTimeout(() => setRipe(true), delay);
    return () => clearTimeout(id);
  }, [delay, enabled]);

  const guide = iosGuide();
  const standalone = installed || isStandalone();
  const mode = deferred ? "prompt" : guide ? "manual" : null;
  const canInstall = enabled && !standalone && mode !== null;

  /* A remembered install suppresses the banner but not the Settings row. The
     flag can only go stale one way — the app was installed and then removed —
     and someone in that position who goes looking for "Install the app" should
     find it. A live `beforeinstallprompt` settles it outright: Chrome does not
     offer to install something already installed, so it overrides the memory. */
  const knownInstalled = !deferred && wasInstalled();

  const install = useCallback(async () => {
    if (!deferred) return "manual";
    const event = deferred;
    setBusy(true);
    try {
      event.prompt();
      const { outcome } = await event.userChoice;
      /* Spent either way — Chrome will fire a fresh event if it decides to
         offer again, and reusing this one throws. */
      deferred = null;
      notify();
      /* Turning down the browser's own dialog is a real "no". Asking again on
         the next visit is how install prompts earn their reputation. */
      if (outcome === "dismissed") { snooze(); setDismissed(true); }
      return outcome;
    } catch {
      deferred = null;
      notify();
      return "dismissed";
    } finally {
      setBusy(false);
    }
  }, []);

  const dismiss = useCallback(() => { snooze(); setDismissed(true); }, []);

  return {
    visible: canInstall && ripe && !dismissed && !knownInstalled,
    canInstall,
    mode,
    guide,
    busy,
    install,
    dismiss,
  };
}
