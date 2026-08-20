import Anthropic from "@anthropic-ai/sdk";

/**
 * Course drafting with Claude, the "fill it out with AI" half of the course
 * designer.
 *
 * Nothing in here writes to the database. A draft is a *proposal*: the endpoint
 * hands it back to the mentor, the mentor edits or throws it away, and only the
 * ordinary PUT /api/program they trigger afterwards persists anything. That
 * split is the whole design — AI never pushes a phase into a live program on
 * its own, a human always confirms.
 *
 * Two shapes:
 *   draftPhase   one phase, aware of the phases already written so it proposes
 *                the next logical step rather than repeating week one
 *   draftCourse  a whole 4-6 phase arc, kickoff to graduation
 */

const MODEL = "claude-opus-5";

/** Unset key = feature off, not a crash. The endpoint turns this into a clean
    "AI drafting isn't switched on" rather than a 500 nobody can act on. */
export const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

let client;
const anthropic = () => (client ||= new Anthropic());

/* Structured output keeps rewards flat (`reward_label` / `reward_description`
   rather than a nullable object): a JSON schema with a union is more for the
   model to get wrong, and "" reads as "no reward" without ceremony. */
const PHASE_PROPERTIES = {
  title: { type: "string", description: "Short phase name, at most 6 words. No numbering." },
  duration: { type: "string", description: 'Timeframe in the mentor\'s own shorthand, e.g. "Week 1" or "Weeks 2-6".' },
  description: { type: "string", description: "One or two sentences on what the mentee actually does in this phase." },
  reward_label: { type: "string", description: 'Certificate or reward earned on completion, or "" if this phase awards nothing.' },
  reward_description: { type: "string", description: 'One line on what earning it means, or "" when there is no reward.' },
};
const PHASE_SCHEMA = {
  type: "object",
  properties: PHASE_PROPERTIES,
  required: ["title", "duration", "description", "reward_label", "reward_description"],
  additionalProperties: false,
};
const COURSE_SCHEMA = {
  type: "object",
  properties: {
    phases: { type: "array", minItems: 3, maxItems: 6, items: PHASE_SCHEMA },
  },
  required: ["phases"],
  additionalProperties: false,
};

const SYSTEM = `You help mentors on Ryzn design their mentorship course.

A course is a short ordered list of phases a mentee moves through, kickoff to graduation. Each phase has a title, a duration, a description, and optionally a certificate or reward earned on completion.

House style, follow it exactly:
- Titles are plain and short: "Kickoff & goals", "Skill building", "Network & practice", "Graduation". Never number them.
- Durations are relative to the start of the program, never calendar dates: "Week 1", "Weeks 2-6".
- Descriptions are one or two sentences, concrete about what the mentee does, second person or imperative. No marketing language, no emoji, no exclamation marks.
- Rewards are rare. Give one only where a phase genuinely ends in something worth certifying, and never more than one or two across a course. Leave reward fields as "" otherwise.
- Write for this specific mentor's field. Generic advice that would fit any mentor anywhere is a failure.

You are drafting, not deciding. The mentor reviews and edits everything before it is saved.`;

/** The mentor, as much as the profile knows, so a draft sounds like their field
    and not like a template. Every line is optional — a thin profile just means
    a more general draft, not an error. */
function mentorContext(profile = {}) {
  const lines = [];
  const add = (label, value) => {
    const text = Array.isArray(value) ? value.filter(Boolean).join(", ") : value;
    if (text) lines.push(`${label}: ${String(text).slice(0, 400)}`);
  };
  add("Role", profile.role);
  add("Industry", profile.industry);
  add("Headline", profile.headline);
  add("Expertise", profile.expertise);
  add("Experience", profile.experience);
  add("Who they mentor best", profile.menteefit);
  add("Why they mentor", profile.why);
  return lines.length ? lines.join("\n") : "No profile details on file.";
}

const existingList = (phases = []) =>
  phases.length
    ? phases.map((p, i) => `${i + 1}. ${p.title}${p.duration ? ` (${p.duration})` : ""}${p.description ? ` — ${p.description}` : ""}`).join("\n")
    : "(none yet)";

async function ask({ prompt, schema }) {
  const response = await anthropic().messages.create({
    model: MODEL,
    max_tokens: 4000,
    // A form fill behind a spinner on a phone: shallow thinking, fast turnaround.
    output_config: { effort: "low", format: { type: "json_schema", schema } },
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  if (response.stop_reason === "refusal") {
    const err = new Error("The model declined to draft this.");
    err.code = "ai_refused";
    throw err;
  }
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) {
    const err = new Error("The model returned nothing to draft from.");
    err.code = "ai_empty";
    throw err;
  }
  return JSON.parse(text);
}

/** Flat model output → the phase shape the app and cleanPhases already speak. */
const toPhase = (raw) => ({
  title: String(raw?.title || "").trim(),
  duration: String(raw?.duration || "").trim(),
  description: String(raw?.description || "").trim(),
  reward: String(raw?.reward_label || "").trim()
    ? {
        label: String(raw.reward_label).trim(),
        description: String(raw.reward_description || "").trim(),
        color: "purple",
      }
    : null,
});

/**
 * One phase. `index` is where it will sit and `replacing` says whether the
 * phase already there is being rewritten, so "add a phase" from the middle of a
 * timeline drafts a middle phase rather than another kickoff.
 */
export async function draftPhase({ profile, phases = [], index = phases.length, replacing = false, hint = "" }) {
  const position = replacing && phases[index]
    ? `This rewrites phase ${index + 1}, "${phases[index].title}". Keep it in that slot in the arc, and don't repeat what the phases around it cover.`
    : index >= phases.length
      ? `This is phase ${phases.length + 1}, the next one after the list above.`
      : `This phase will be inserted at position ${index + 1}, between "${phases[index - 1]?.title || "the start"}" and "${phases[index].title}".`;

  const data = await ask({
    schema: PHASE_SCHEMA,
    prompt: `The mentor:
${mentorContext(profile)}

Phases already in their course:
${existingList(phases)}

${position}
${hint ? `\nWhat the mentor said this phase is about: ${hint}` : "\nThe mentor gave no steer, so infer the most useful next phase from their field and what is already there."}

Draft that one phase.`,
  });
  return toPhase(data);
}

/** A whole arc. Used from the empty course designer, where a starter list beats
    a blank timeline. */
export async function draftCourse({ profile, hint = "" }) {
  const data = await ask({
    schema: COURSE_SCHEMA,
    prompt: `The mentor:
${mentorContext(profile)}
${hint ? `\nWhat they want the course to cover: ${hint}` : ""}

Draft their full course: 4 to 5 phases, kickoff through graduation, in order.`,
  });
  return (Array.isArray(data?.phases) ? data.phases : []).map(toPhase).filter((p) => p.title);
}
