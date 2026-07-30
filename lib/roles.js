/**
 * Consumer-app side of a Better Auth role.
 *
 * Founders (`admin`) participate in the product as mentors — there is no
 * mentee experience for staff. The UI and match APIs are binary mentor|mentee,
 * so `admin` maps onto the mentor side everywhere those surfaces run.
 */

export const isMentorRole = (role) => role === "mentor" || role === "admin";

/** Binary side used by the consumer app, matches, roster, and onboarding. */
export const appSide = (role) => (isMentorRole(role) ? "mentor" : "mentee");

/**
 * Has this account already finished the one-time Ryzn AI setup?
 * Founders never run it — they land in the mentor app directly.
 */
export const isOnboardingDone = (me) => {
  if (!me?.user) return false;
  if (me.user.role === "admin") return true;
  return !!(
    me.profile?.onboardingComplete ||
    me.profile?.onboardingCompletedAt ||
    me.user?.onboardingComplete
  );
};
