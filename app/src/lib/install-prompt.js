/* ————————————————— PWA INSTALL ————————————————— */

/* Ryzn is installable — manifest, icons and a fetch-handling worker are all in
 * place — but nothing ever said so. Installing meant knowing to dig through a
 * browser menu, which almost nobody does, so the home-screen app existed and
 * went unused.
 *
 * The offer is made on every browser, because "you can keep this on your home
 * screen" is true everywhere — only the gesture changes. This used to bail out
 * and show nothing wherever `beforeinstallprompt` was absent and the visitor
 * was not on iOS, which silently covered desktop Safari, Firefox and every
 * in-app webview. Six routes now, and none of them is silence:
 *
 *   prompt           Chrome, Edge, Brave, Samsung. `beforeinstallprompt` fires,
 *                    we hold it and replay it on a tap. One button, no steps.
 *   ios-*            iOS never fires it and no page can open the share sheet,
 *                    so the banner teaches the gesture instead. Per browser,
 *                    because the share icon is not in the same place twice.
 *   safari-desktop   macOS Sonoma and later: File → Add to Dock.
 *   firefox-desktop  Firefox cannot install web apps at all — it dropped site
 *                    specific browsers and never shipped a replacement. The
 *                    only honest instruction is to open Ryzn somewhere that can.
 *   in-app           Slack, Instagram, LinkedIn and friends render in a webview
 *                    with no install anything. Step one is leaving the webview.
 *   menu             Everything else, including Firefox on Android, which does
 *                    have Install — just in the menu. Points there.
 */

import { useCallback, useEffect, useReducer, useState } from "react";

const SNOOZE_KEY = "ryzn:install-snoozed-until";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/* The banner is an offer, not an interruption. Waiting a beat means it never
   lands on top of whatever the user opened the app to do. */
export const SHOW_AFTER_MS = 9000;

const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent || "");

/* Already installed — but only on signals that actually mean it. iOS uses the
   legacy `navigator.standalone`; everything else reports a display mode.

   Two checks that used to live here are gone, because neither one says the app
   is on the home screen:
     android-app:// referrer   set on any link opened from any Android app —
                               Slack, Gmail, WhatsApp. It records where the tap
                               came from, not how this page was launched.
     display-mode: minimal-ui  what Chrome Custom Tabs and in-app webviews
                               report. It describes how much browser chrome is
                               drawn, and a plain visitor gets it unasked.

   Both read true for someone simply following a shared link, and because the
   answer is latched into localStorage below, one such visit retired the banner
   on that device permanently — on the marketing site and in the app alike. */
export const isStandalone = () => {
  if (typeof window === "undefined") return false;
  const mq = (q) => window.matchMedia?.(q).matches === true;
  return (
    mq("(display-mode: standalone)") ||
    mq("(display-mode: fullscreen)") ||
    mq("(display-mode: window-controls-overlay)") ||
    window.navigator.standalone === true
  );
};

const isIOS = () =>
  /iphone|ipad|ipod/i.test(ua()) ||
  /* iPadOS 13+ reports itself as a Mac. Touch points are what give it away. */
  (/macintosh/i.test(ua()) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1);

const isAndroid = () => /android/i.test(ua());

/* An in-app webview cannot install anything, and telling someone to look for a
   menu item their browser does not have is worse than saying nothing. Detected
   by the host app's own UA tag, plus Android's generic `; wv` webview marker. */
const isInApp = () =>
  /; ?wv\b/i.test(ua()) ||
  /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|Twitter|Snapchat|Pinterest|Slack|MicroMessenger/i.test(ua());

const isFirefox = () => /firefox\/|fxios/i.test(ua());

/* Safari and nothing pretending to be it. Every Chromium browser on macOS also
   carries "Safari" in its UA, so the exclusions are the actual test. */
const isSafariDesktop = () =>
  !isIOS() &&
  /macintosh/i.test(ua()) &&
  /safari/i.test(ua()) &&
  !/chrome|chromium|crios|edg|opr|brave/i.test(ua());

/**
 * Which route to installing this browser actually offers. Never null — a
 * browser we cannot place gets the menu route rather than silence.
 *
 * @param {boolean} hasPrompt whether a live `beforeinstallprompt` is in hand.
 */
export function installRoute(hasPrompt) {
  if (hasPrompt) return "prompt";
  if (isInApp()) return "in-app";
  if (isIOS()) {
    const s = ua();
    if (/crios/i.test(s)) return "ios-chrome";
    if (/edgios/i.test(s)) return "ios-edge";
    if (/fxios/i.test(s)) return "ios-firefox";
    return "ios-safari";
  }
  if (isSafariDesktop()) return "safari-desktop";
  /* Firefox on Android does install web apps, from the menu. Firefox on the
     desktop does not, at all — so only the desktop gets sent elsewhere. */
  if (isFirefox() && !isAndroid()) return "firefox-desktop";
  return "menu";
}

/**
 * The gesture for a route, as {browser, steps}. Null for "prompt", where the
 * button is the whole interaction and there is nothing to teach.
 */
export function routeGuide(route) {
  switch (route) {
    case "prompt":
      return null;
    case "in-app":
      return {
        browser: "this app's built-in browser",
        steps: ["Open the ••• or share menu", "Choose “Open in browser”", "Install from there"],
      };
    case "ios-chrome":
      return {
        browser: "Chrome",
        steps: ["Tap the share icon in the address bar", "Choose “Add to Home Screen”", "Tap Add"],
      };
    case "ios-edge":
      return {
        browser: "Edge",
        steps: ["Tap the ••• menu", "Choose “Add to Home Screen”", "Tap Add"],
      };
    /* Firefox on iOS has no Add to Home Screen at all — the only working advice
       is to switch browsers, so that is what it gets. */
    case "ios-firefox":
      return {
        browser: "Firefox",
        steps: ["Open ryzn.one in Safari", "Tap the share icon in the bottom bar", "Choose “Add to Home Screen”"],
      };
    case "ios-safari":
      return {
        browser: "Safari",
        steps: ["Tap the share icon in the bottom bar", "Scroll to “Add to Home Screen”", "Tap Add"],
      };
    case "safari-desktop":
      return {
        browser: "Safari",
        steps: ["Open the File menu", "Choose “Add to Dock”", "Click Add"],
      };
    case "firefox-desktop":
      return {
        browser: "Firefox",
        steps: ["Firefox can’t install web apps", "Open ryzn.one in Chrome, Edge or Safari", "Install from there"],
      };
    default:
      return isAndroid()
        ? { browser: "your browser", steps: ["Open the browser menu", "Choose “Install” or “Add to Home screen”", "Confirm"] }
        : { browser: "your browser", steps: ["Open the browser menu", "Look for “Install Ryzn”", "Confirm"] };
  }
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

/* Most browsers offer no way to ask whether the app is already on the home
   screen, and `isStandalone` only answers for the window you are in — so
   someone who installed Ryzn and later opens ryzn.one in a tab would be pitched
   the app they already have. Four signals settle it, and each one is recorded
   so it outlives the window that produced it:
     a standalone launch        proof, on every platform.
     the appinstalled event     proof, but only for installs we started.
     getInstalledRelatedApps    Chrome and Edge only, and the reason the
                                manifest points at itself.
     "I already have it"        the escape hatch for everywhere the above are
                                unavailable — desktop Safari, and iOS, where the
                                installed app gets its own storage container and
                                so cannot leave a note Safari will ever read.

   Versioned, because the old key was written off the two bogus signals in
   isStandalone above. Every device that ever opened a Ryzn link from an Android
   app is carrying a `ryzn:installed` that means nothing, and narrowing the
   check alone would not dislodge it — the flag is already on disk. A new name
   ignores the old verdict and lets those devices be asked again. */
const INSTALLED_KEY = "ryzn:installed:v2";
const LEGACY_INSTALLED_KEY = "ryzn:installed";

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
  try { window.localStorage.removeItem(LEGACY_INSTALLED_KEY); } catch { /* private mode */ }

  /* Running standalone right now — the app is installed, and this is the fact
     that has to outlive the window. */
  if (isStandalone()) { installed = true; rememberInstalled(); }

  /* Chrome and Edge will name the app back to us if it is installed. Async, so
     it lands after the first render and has to announce itself. */
  if (navigator.getInstalledRelatedApps) {
    navigator.getInstalledRelatedApps()
      .then((apps) => {
        if (apps && apps.length > 0) { installed = true; rememberInstalled(); notify(); }
      })
      .catch(() => {});
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    /* Chrome does not offer to install something already installed, so a live
       event is proof the app is gone — clear the memory rather than let a stale
       flag suppress an offer the browser itself is making. */
    installed = false;
    try { window.localStorage.removeItem(INSTALLED_KEY); } catch { /* private mode */ }
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    rememberInstalled();
    clearSnooze();
    notify();
  });

  /* "The install banner never showed up" has half a dozen honest answers — this
     browser has no route, it is snoozed, it thinks you installed it already,
     the delay has not elapsed — and none of them are visible from the outside.
     Rather than guess, `__ryznInstall()` in the console says which one it is.
     `__ryznInstall.reset()` clears both flags to re-test. */
  window.__ryznInstall = () => {
    const route = installRoute(deferred !== null);
    const known = installed || isStandalone() || wasInstalled();
    return {
      route,
      guide: routeGuide(route),
      standalone: isStandalone(),
      hasBeforeInstallPrompt: deferred !== null,
      rememberedInstalled: wasInstalled(),
      relatedAppsSupported: !!navigator.getInstalledRelatedApps,
      snoozed: isSnoozed(),
      snoozedUntil: readSnooze() ? new Date(readSnooze()).toISOString() : null,
      delayMs: SHOW_AFTER_MS,
      userAgent: ua(),
      verdict:
        known ? "hidden: Ryzn is already installed on this device"
        : isSnoozed() ? "hidden: snoozed by a 'Not now'"
        : "eligible: shows once the delay elapses and no modal is open",
    };
  };
  window.__ryznInstall.reset = () => {
    clearSnooze();
    installed = false;
    try { window.localStorage.removeItem(INSTALLED_KEY); } catch { /* private mode */ }
    notify();
    return "cleared — reload to be offered again";
  };
}

/**
 * @param {{ delay?: number, enabled?: boolean }} opts
 *   delay   ms to wait before `visible` flips true. 0 shows immediately —
 *           used by the Settings row, which is asked for rather than offered.
 *   enabled false parks the hook (signed out, mid-onboarding, …).
 *
 * @returns {{
 *   visible: boolean, installed: boolean, route: string, canPrompt: boolean,
 *   guide: {browser: string, steps: string[]}|null, busy: boolean,
 *   install: () => Promise<"accepted"|"dismissed"|"manual">,
 *   dismiss: () => void, alreadyHave: () => void,
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

  const canPrompt = deferred !== null;
  const route = installRoute(canPrompt);
  const guide = routeGuide(route);

  /* A live `beforeinstallprompt` settles it outright and already cleared the
     memory above, so the two can never disagree. */
  const known = installed || isStandalone() || wasInstalled();

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

  /* Taken at their word, permanently. On desktop Safari and on iOS there is no
     API that can confirm it, and a banner that keeps asking after you have done
     what it asked is the reason people learn to ignore banners. */
  const alreadyHave = useCallback(() => {
    installed = true;
    rememberInstalled();
    notify();
  }, []);

  return {
    visible: enabled && ripe && !dismissed && !known,
    installed: known,
    route,
    canPrompt,
    guide,
    busy,
    install,
    dismiss,
    alreadyHave,
  };
}
