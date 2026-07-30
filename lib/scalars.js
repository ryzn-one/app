/**
 * Collapse single-select values that landed as string[] (chat used to submit
 * `sel` for every non-write step) into a plain string. Null when empty.
 */
export const asLabel = (v) => {
  if (Array.isArray(v)) {
    const first = v.find((x) => typeof x === "string" && x.trim());
    return first ? first.trim() : null;
  }
  if (typeof v === "string") {
    const s = v.trim();
    return s || null;
  }
  return null;
};
