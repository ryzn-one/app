/* ————— Data —————
   What lives here is program design — the badge ladder, the setup script, the
   Week-1 exercise track, the influencer picker options. It is authored content,
   the same for every user, and it is real.

   What used to live here and no longer does: invented mentors, invented
   mentees, invented leaderboards, an invented Mentor Meets event, and a seeded
   mentor feed. Those rendered to signed-in users as though they were other
   members of the platform. People and their numbers now come from the API
   (`/api/roster`, `/api/me`) or they don't render at all. */
import { C } from "./theme.js";

export const BADGE_DEFS = [
  { id: "goal", name: "Goal Setter", tier: "purple", when: "Day 1", req: "Complete intake and set 3 program goals", code: "RYZ-2026-00441", unlocks: "First session scheduling" },
  { id: "first", name: "First Session", tier: "purple", when: "Week 1", req: "Complete your opening session", code: "RYZ-2026-00512", unlocks: "Weekly exercise track" },
  { id: "momentum", name: "Momentum", tier: "teal", when: "Week 4", req: "4 consecutive weeks of engagement", code: "RYZ-2026-00688", unlocks: "Priority mentor replies + cohort shoutout" },
  { id: "midway", name: "Midway", tier: "purple", when: "Week 6", req: "Complete 3 milestone exercises", code: "RYZ-2026-00734", unlocks: "Cohort leaderboard visibility" },
  { id: "approved", name: "Mentor Approved", tier: "teal", when: "Week 8", req: "Your mentor marks you high-engagement", unlocks: "Mentor Meets ticket eligibility" },
  { id: "placement", name: "Placement Ready", tier: "purple", when: "Week 12", req: "Graduate the Program", unlocks: "Alumni network and next-level track" },
  { id: "streak100", name: "100-Day Streak", tier: "teal", when: "Ongoing", req: "100 consecutive active days", unlocks: "Permanent streak badge" },
  { id: "alum", name: "Meets Alum", tier: "coral", when: "Post-event", req: "Attend a Mentor Meets event", unlocks: "Priority access to next cohort" },
];

/* Picker options for the "who do you follow" question — public figures offered
   as prompts, not platform members. Nothing here is presented as a Ryzn user. */
export const GENERAL_INFLUENCERS = ["Michelle Obama", "Oprah Winfrey", "Malala Yousafzai", "Simon Sinek", "Brené Brown", "Mel Robbins", "David Goggins", "Jay Shetty", "Steven Bartlett"];
export const INFLUENCERS_BY_CATEGORY = {
  "Product & tech": ["Sam Altman", "Sundar Pichai", "Satya Nadella", "Marques Brownlee", "Lenny Rachitsky", "Shreyas Doshi", "Whitney Wolfe Herd"],
  "Design": ["Jony Ive", "Chris Do", "Debbie Millman", "Jessica Walsh", "Karri Saarinen"],
  "Entrepreneurship": ["Sara Blakely", "Mark Cuban", "Alex Hormozi", "Gary Vaynerchuk", "Richard Branson", "Codie Sanchez", "Ben Francis"],
  "Finance": ["Warren Buffett", "Cathie Wood", "Ramit Sethi", "Vivian Tu", "Graham Stephan", "Humphrey Yang"],
  "Marketing": ["Seth Godin", "Neil Patel", "Ann Handley", "Steven Bartlett", "Gary Vaynerchuk"],
  "Engineering": ["Elon Musk", "Andrej Karpathy", "Linus Sebastian", "Scott Hanselman", "Kelsey Hightower"],
  "Law": ["Amal Clooney", "Devin Stone (LegalEagle)", "Bryan Stevenson"],
  "Health & medicine": ["Andrew Huberman", "Dr. Mike Varshavski", "Peter Attia", "Mary Claire Haver"],
  "Media & content": ["MrBeast", "Emma Chamberlain", "Casey Neistat", "Alex Cooper", "Ryan Reynolds", "Trevor Noah", "Marques Brownlee"],
  "Sports business": ["Serena Williams", "LeBron James", "Simone Biles", "Cristiano Ronaldo", "Michael Jordan", "Alex Morgan"],
  "Climate": ["Greta Thunberg", "Bill Gates", "Jane Goodall", "Leah Thomas"],
  "Music": ["Taylor Swift", "Rihanna", "Jay-Z", "Bad Bunny", "Billie Eilish"],
};

/* ————— Ryzn AI setup scripts —————
   Functions, not constants: the opening line greets the person who actually
   signed in. Passing no name drops the greeting rather than substituting one —
   addressing a real user by an invented name was the bug that started all this.

   Conversational onboarding is the front door in *every* orbit — there is no
   form anywhere, including behind an HR invite. What changes per orbit is one
   sentence of context: an employee who lands here from their company's invite
   should be told where they are, by name, before they are asked anything. That
   is presentation, not behaviour: the questions, the XP and the ending are
   identical in all three orbits. */

/** The opening line's context sentence. `orbit` is the resolved orbit payload;
    no orbit (or the public one) gets no extra sentence — Ryzn is the default
    place and saying so would be noise. */
export const orbitIntro = (orbit) => {
  if (!orbit || orbit.kind === "public") return null;
  if (orbit.kind === "community") {
    return `You're joining ${orbit.name} — a circle run by one person, not by Ryzn. Your XP, badges and follows come with you and stay yours.`;
  }
  return `You're setting up inside ${orbit.name}'s orbit. Your answers here are visible to your mentor, not to your manager — and your XP, badges and follows are yours, not your employer's.`;
};

export const menteeScript = (firstName, orbit) => [
  { id: "track", xp: 20, type: "single",
    ai: [
      `Welcome to Ryzn${firstName ? `, ${firstName}` : ""}. I’m your setup guide — five questions, about two minutes. Every answer earns XP and sharpens your mentor match.`,
      ...(orbitIntro(orbit) ? [orbitIntro(orbit)] : []),
      "First: where are you right now?",
    ],
    options: ["High school", "University"] },
  { id: "interests", xp: 40, type: "multi", min: 3, custom: true,
    ai: ["What pulls at you? Pick at least three. If the list misses something, write your own — specifics beat categories."],
    options: ["Product & tech", "Design", "Entrepreneurship", "Finance", "Marketing", "Engineering", "Law", "Health & medicine", "Media & content", "Sports business", "Climate", "Music"] },
  { id: "skills", xp: 40, type: "multi", min: 2, custom: true,
    ai: ["Now the skills you’d claim today — even at beginner level. Honesty here gets you a mentor who fills the real gaps."],
    options: ["Public speaking", "Writing", "Coding", "Design tools", "Video editing", "Data & spreadsheets", "Selling", "Leading a team", "Social media", "Research"] },
  { id: "influence", xp: 40, type: "multi", min: 1, custom: true,
    ai: ["Who do you actually follow and learn from? People of influence tell me more about your direction than any category. Add anyone I’ve missed."],
    options: ["Michelle Obama", "Sara Blakely", "MrBeast", "Mark Cuban", "Simone Biles", "Malala Yousafzai", "Serena Williams", "Ryan Reynolds"] },
  { id: "goals", xp: 60, type: "goals",
    ai: ["Last one, and it matters most: your program goals. One is enough to start — write up to three. Specific beats vague: “land a summer internship in product” works, “be successful” doesn’t."],
    placeholders: ["Land a summer internship in product", "Build a portfolio that gets replies", "Speak confidently in interviews"] },
];

export const mentorScript = (firstName, orbit) => [
  { id: "role", xp: 30, type: "write",
    ai: [
      `Welcome to the Roster${firstName ? `, ${firstName}` : ""}. Your invitation checked out.`,
      ...(orbitIntro(orbit) ? [orbitIntro(orbit)] : []),
      "Six questions, then I’ll show you the mentees matched to you. First: your current role and company, in your own words.",
    ],
    placeholder: "Head of Product at —" },
  { id: "industry", xp: 20, type: "single", ai: ["Which industry do you call home?"],
    options: ["Technology", "Finance", "Design & media", "Health", "Law", "Climate & energy"] },
  { id: "expertise", xp: 40, type: "multi", min: 3, custom: true,
    ai: ["What can you genuinely teach? Pick at least three. Mentees see these — claim only what you’d defend in a session."],
    options: ["Product strategy", "Career navigation", "Public speaking", "Hiring & interviews", "Storytelling", "Negotiation", "Technical leadership", "Fundraising", "Personal brand", "First-job readiness"] },
  { id: "menteefit", xp: 40, type: "multi", min: 2, custom: true,
    ai: ["Who do you most want in your cohort? This shapes matching more than anything else."],
    options: ["First-gen students", "Aspiring product people", "Student founders", "Career switchers", "High schoolers exploring", "International students", "Women in tech", "Student athletes"] },
  { id: "capacity", xp: 20, type: "single",
    ai: ["Capacity check. How many mentees can you take this cohort? Smaller is fine — depth beats volume, and your Impact Score reflects outcomes, not headcount."],
    options: ["2 mentees", "4 mentees", "6 mentees"] },
  { id: "why", xp: 50, type: "write",
    ai: ["Last question. Why mentor? One or two honest sentences — this appears on your public profile, so say the thing."],
    placeholder: "Nobody in my family worked in tech. One person took a chance on me and…" },
];

export const STATUS = {
  active: { c: C.teal, bg: C.tealTint, label: "Active" },
  risk: { c: C.amber, bg: C.amberTint, label: "At risk" },
  off: { c: C.coral, bg: C.coralTint, label: "Disengaged" },
};

/* The opening exercise track. Authored program content, identical for everyone,
   and genuinely what a Week-1 mentee is asked to do. The old six-entry
   "returning" variant is gone: it shipped a fabricated completion history
   (three done, one missed) for accounts that had never opened the app. */
export const EXERCISE_TRACK = [
  { day: "Today · Day 1", title: "Write your why", mins: 6, xp: 30,
    prompt: "One honest paragraph: why are you here, really? Your mentor reads this before your first session — it sets the tone for all twelve weeks.", state: "open" },
  { day: "Tomorrow", title: "Your opening question", mins: 5, xp: 30, state: "upcoming" },
  { day: "Day 3", title: "Map what you already know", mins: 8, xp: 40, state: "upcoming" },
];
