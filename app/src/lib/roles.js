/**
 * Consumer-app side of a Better Auth role.
 * Mirrors ../../../../lib/roles.js, founders participate as mentors only.
 */
export const isMentorRole = (role) => role === "mentor" || role === "admin";
export const appSide = (role) => (isMentorRole(role) ? "mentor" : "mentee");

/** One-time Ryzn AI setup, never re-run once any durable flag says done. */
export const isOnboardingDone = (me) => {
  if (!me?.user) return false;
  if (me.user.role === "admin") return true;
  return !!(
    me.profile?.onboardingComplete ||
    me.profile?.onboardingCompletedAt ||
    me.user?.onboardingComplete
  );
};
