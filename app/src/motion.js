/* ————————————————— SHARED MOTION SYSTEM —————————————————
   One vocabulary for both the consumer app and Teams.
   Keep motion small and purposeful: things enter from where they came from,
   the nav slides instead of snapping, taps push back. Nothing decorative.
*/

/* Easing — a smooth "settle" curve. Matches the feel of the existing
   splashIn / dnaFill keyframes in index.css so old and new motion agree. */
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_OUT = [0.33, 1, 0.68, 1];

/* Durations (seconds) */
export const T_FAST = 0.15; // taps, hovers, toggles
export const T_BASE = 0.25; // screen / tab content swaps
export const T_SLOW = 0.4;  // modals, sheets, splash

/* Springs — used where motion should feel physical rather than timed
   (nav indicator sliding, toggle thumbs, drag snap-back). */
export const SPRING = { type: "spring", stiffness: 420, damping: 36, mass: 0.8 };
export const SPRING_SOFT = { type: "spring", stiffness: 260, damping: 30 };

/* ————— Reduced motion —————
   index.css already kills the legacy CSS keyframes under
   prefers-reduced-motion. This mirrors that for Motion-driven animation:
   pass the hook's value in and transitions collapse to ~instant.
   Usage:  const rm = useReducedMotion(); ... transition={t(rm, T_BASE)}
*/
export const t = (reduced, duration = T_BASE, ease = EASE) =>
  reduced ? { duration: 0 } : { duration, ease };

export const spring = (reduced, cfg = SPRING) =>
  reduced ? { duration: 0 } : cfg;

/* ————— Variants —————
   `fadeSlide` is the default for anything swapping in place. The 8px offset
   is deliberately small — it reads as "connected" rather than "animated".
*/
export const fadeSlide = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/* Directional variant for forward/back navigation. dir: 1 = forward, -1 = back. */
export const slideX = (dir = 1) => ({
  initial: { opacity: 0, x: 24 * dir },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 * dir },
});

/* Sheets / bottom overlays — replaces the .sheet-up class. */
export const sheet = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 24 },
};

/* Desktop modal — scales in from slightly small, feels anchored to center. */
export const modalPop = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 4 },
};

export const backdrop = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/* Badge unlock — ports the .badge-pop keyframe so multiple unlocks
   can be staggered by a parent instead of each firing independently. */
export const badgePop = {
  initial: { opacity: 0, scale: 0.3, rotate: -8 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
};

/* ————— Stagger —————
   Parent wraps a list, children use `staggerItem`. ~35ms reads as a
   cascade without making long lists feel slow to arrive.
*/
export const staggerParent = (stagger = 0.035, delayChildren = 0.02) => ({
  initial: {},
  animate: { transition: { staggerChildren: stagger, delayChildren } },
  exit: {},
});

export const staggerItem = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

/* ————— Interaction presets —————
   Spread onto motion elements: <motion.button {...tap} />
*/
export const tap = { whileTap: { scale: 0.96 } };
export const tapSoft = { whileTap: { scale: 0.98 } };
export const liftHover = {
  whileHover: { y: -4, transition: { duration: T_FAST, ease: EASE_OUT } },
  whileTap: { scale: 0.985 },
};

/* ————— Swipe deck —————
   Thresholds for committing a card swipe. Velocity is checked too so a
   quick flick counts even if the drag distance is short.
*/
export const SWIPE_DISTANCE = 110;
export const SWIPE_VELOCITY = 480;

export const didSwipe = (offsetX, velocityX) =>
  Math.abs(offsetX) > SWIPE_DISTANCE || Math.abs(velocityX) > SWIPE_VELOCITY;
