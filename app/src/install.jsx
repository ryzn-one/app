import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Share, X, Plus, Download } from "lucide-react";
import { C, F } from "./theme.js";
import { BrandIcon, Btn, Card, SecLabel, SettingRow } from "./ui.jsx";
import { t, spring, T_BASE } from "./motion.js";
import { useInstallPrompt } from "./lib/install-prompt.js";

/* ————————————————— INSTALL BANNER —————————————————

   The offer to put Ryzn on the home screen. It rides above the tab bar so it
   never covers navigation, it snoozes for two weeks on a "Not now", and it is
   gone for good once Ryzn is installed.

   Every browser gets it. On Chrome the primary button is the whole interaction;
   everywhere else there is no button we can wire to anything, so the same
   banner opens that browser's actual gesture rather than pretending it can
   install for you. See lib/install-prompt.js for the routes. */

const SNOOZE_LABEL = "Not now";

/* The way out for anyone the detection cannot reach — desktop Safari, and iOS,
   where the installed app gets its own storage container and can never leave a
   note the browser will read. Without it, "always offer" would mean "nag people
   who already did it", which is how banners get ignored. */
const HAVE_LABEL = "I already have it";

const Steps = ({ guide, style }) => (
  <div style={{ marginTop: 12, background: "rgba(255,255,255,.07)", borderRadius: 12, padding: "12px 13px", ...style }}>
    {guide.steps.map((step, i) => (
      <div key={step} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: i === 0 ? 0 : 9 }}>
        <span style={{
          width: 19, height: 19, borderRadius: 6, flexShrink: 0, background: C.purple, color: C.white,
          fontFamily: F.mono, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
        }}>{i + 1}</span>
        <span style={{ fontSize: 13, color: "#E4E2DE", lineHeight: 1.4 }}>{step}</span>
        {/* The glyphs the copy is pointing at, matched to the step that names
            them, so the words don't carry the whole burden of "which icon". */}
        {/share icon/.test(step) && <Share size={13} color={C.lilac} style={{ flexShrink: 0 }} />}
        {i === guide.steps.length - 1 && <Plus size={13} color={C.lilac} style={{ flexShrink: 0 }} />}
      </div>
    ))}
  </div>
);

/* One line of context under the headline, per route. A visitor in the Slack
   webview and one in desktop Firefox are being asked to do very different
   things, and "Full screen, no address bar" was written for neither. */
const subtitleFor = (route, guide) => {
  switch (route) {
    case "prompt":
      return "Full screen, no address bar, one tap from anywhere.";
    case "in-app":
      return "Open Ryzn in your browser first — this one can’t install apps.";
    case "firefox-desktop":
      return "Firefox can’t install web apps. Chrome, Edge and Safari can.";
    case "safari-desktop":
      return "Add Ryzn to your Dock — full screen, no address bar.";
    default:
      return `Add Ryzn from ${guide.browser} — full screen, no address bar.`;
  }
};

/**
 * @param {{ enabled?: boolean, liftAbove?: number }} props
 *   enabled    false while signed out or mid-onboarding — nothing to install into yet.
 *   liftAbove  px of chrome at the bottom of the screen to clear (the tab bar).
 */
export const InstallBanner = ({ enabled = true, liftAbove = 0 }) => {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { visible, route, guide, busy, install, dismiss, alreadyHave } = useInstallPrompt({ enabled });

  const manual = route !== "prompt";

  const onPrimary = async () => {
    if (manual) { setOpen((v) => !v); return; }
    await install();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install-banner"
          /* x lives in the animation, not in style — Motion writes `transform`
             itself, so an inline translateX(-50%) would be overwritten and the
             banner would sit off-centre. Same trick as the toast. */
          initial={{ opacity: 0, y: 24, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 16, x: "-50%" }}
          transition={t(reduced, T_BASE)}
          role="dialog"
          aria-label="Install Ryzn"
          style={{
            position: "fixed",
            left: "50%",
            bottom: `calc(${14 + liftAbove}px + var(--safe-bottom, 0px))`,
            zIndex: 92,
            width: "min(380px, calc(100vw - 28px))",
            background: C.ink,
            color: C.white,
            borderRadius: 18,
            padding: "14px 14px 12px",
            boxShadow: "0 18px 48px rgba(26,26,26,.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <BrandIcon size={42} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: F.mono, fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: C.lilac }}>
                INSTALL RYZN
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginTop: 3, lineHeight: 1.25 }}>
                Keep Ryzn on your home screen
              </div>
              <div style={{ fontSize: 12.5, color: "#C9C6C0", marginTop: 3, lineHeight: 1.45 }}>
                {subtitleFor(route, guide)}
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, lineHeight: 0, color: "#8B8983", flexShrink: 0 }}
            >
              <X size={15} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {manual && open && (
              <motion.div
                key="steps"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={t(reduced, T_BASE)}
                style={{ overflow: "hidden" }}
              >
                <Steps guide={guide} />
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              type="button"
              onClick={dismiss}
              style={{
                flex: 0.75, border: "1.5px solid rgba(255,255,255,.22)", background: "transparent",
                color: "#C9C6C0", borderRadius: 12, padding: "10px 12px", fontFamily: F.sans,
                fontWeight: 700, fontSize: 13, cursor: "pointer",
              }}
            >
              {SNOOZE_LABEL}
            </button>
            <motion.button
              type="button"
              disabled={busy}
              onClick={onPrimary}
              whileTap={reduced ? undefined : { scale: 0.97 }}
              transition={spring(reduced)}
              style={{
                flex: 1.25, border: "none", background: C.purple, color: C.white, borderRadius: 12,
                padding: "10px 12px", fontFamily: F.sans, fontWeight: 700, fontSize: 13,
                cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              {manual
                ? <>{open ? "Hide steps" : "Show me how"}</>
                : <><Download size={14} /> Install</>}
            </motion.button>
          </div>

          {/* Only where we could not have known. On Chrome and Edge
              getInstalledRelatedApps already answered, and a live prompt event
              means the app is definitively not installed — offering this there
              would just be a way to hide the banner by lying to it. */}
          {manual && (
            <button
              type="button"
              onClick={alreadyHave}
              style={{
                display: "block", width: "100%", marginTop: 9, background: "none", border: "none",
                color: "#8B8983", fontFamily: F.sans, fontSize: 11.5, fontWeight: 600,
                cursor: "pointer", padding: 2,
              }}
            >
              {HAVE_LABEL}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * The same offer, asked for rather than offered. Dismissing the banner snoozes
 * it for a fortnight and "I already have it" retires it for good, so without
 * this there would be no way back to the instructions. Renders nothing once
 * Ryzn is installed.
 */
export const InstallSection = () => {
  const [open, setOpen] = useState(false);
  const { installed, route, guide, busy, install } = useInstallPrompt({ delay: 0 });
  /* The whole section disappears once there is nothing to offer, rather than
     leaving a heading over an empty card. Every browser has a route now, so
     being installed is the only thing that removes it. */
  if (installed) return null;
  const manual = route !== "prompt";
  return (
    <>
      <SecLabel>This device</SecLabel>
      <Card style={{ paddingTop: 4, paddingBottom: 4 }}>
        <SettingRow
          label="Install the app"
          sub={manual
            ? `Add Ryzn to your home screen from ${guide.browser}.`
            : "Add Ryzn to your home screen — full screen, no address bar."}
          last
        >
          <div style={{ textAlign: "right" }}>
            <Btn kind="ghost" small disabled={busy}
              onClick={async () => { if (manual) setOpen((v) => !v); else await install(); }}>
              {manual ? <><Share size={13} /> {open ? "Hide" : "How"}</> : <><Download size={13} /> Install</>}
            </Btn>
          </div>
        </SettingRow>
        {manual && open && (
          <div style={{ background: C.ink, borderRadius: 14, padding: "10px 8px", margin: "0 0 12px" }}>
            <Steps guide={guide} style={{ marginTop: 0, background: "transparent", padding: "2px 5px" }} />
          </div>
        )}
      </Card>
    </>
  );
};
