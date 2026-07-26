/* ————— Data ————— */
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

export const MENTEE_SCRIPT = [
  { id: "track", xp: 20, type: "single",
    ai: ["Welcome to Ryzn, Alex. I’m your setup guide — five questions, about two minutes. Every answer earns XP and sharpens your mentor match.", "First: where are you right now?"],
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
export const MENTOR_SCRIPT = [
  { id: "role", xp: 30, type: "write",
    ai: ["Welcome to the Roster, Jordan. Your invitation checked out — you’re one of 20 founding-cohort candidates.", "Six questions, then I’ll show you the mentees who matched to you. First: your current role and company, in your own words."],
    placeholder: "VP of Product at Harbourline" },
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

export const MENTOR_MATCHES = [
  { name: "Jordan Clarke", title: "VP of Product", company: "Harbourline", tier: "Pathfinder", match: 96, impact: 847, graduated: 11, focus: "Product", city: "Toronto",
    bio: "First-gen grad who talked his way into tech support and climbed to VP. Runs Harbourline’s 40-person product org. Direct, warm, allergic to vague goals.",
    tags: ["Product & tech", "Public speaking", "Follows Sara Blakely too"],
    achievements: ["Scaled Harbourline product 6 → 40 people", "Shipped a payments platform used by 2M Canadians", "11 Ryzn graduates · 92% program completion"],
    companies: ["Harbourline · VP of Product", "Northbound Bank · product advisor", "TechTO · community board"],
    talks: ["ProductTank Toronto — “Roadmaps are promises”", "TMU career night keynote · 2025", "Mentor Meets Vancouver ’26 · panel"],
    resources: ["Cold-open email template", "First-90-days PM guide", "Resume teardown checklist"] },
  { name: "Priya Raman", title: "Head of Design", company: "Nova Health", tier: "Architect", match: 91, impact: 1204, graduated: 19, focus: "Design", city: "Toronto",
    bio: "Reviews 200+ portfolios a year and still answers every one. Believes taste is trainable and proof beats polish. First in her family to work in design.",
    tags: ["Design", "Portfolio building", "First-gen mentor"],
    achievements: ["Rebuilt Nova Health design system · team of 14", "19 Ryzn graduates — most of any mentor", "Adobe Design Circle mentor · 2 years"],
    companies: ["Nova Health · Head of Design", "OCAD U · guest critic", "Hers2Design · founding volunteer"],
    talks: ["Config watch-party keynote · Toronto", "DesignTO — “Taste is trainable”"],
    resources: ["Portfolio red-flag checklist", "Case study skeleton (Figma)"] },
  { name: "Marcus Bell", title: "Founder, two exits", company: "Bell Ventures", tier: "Legend", match: 89, impact: 1187, graduated: 24, focus: "Entrepreneurship", city: "Toronto",
    bio: "Built and sold two companies before 35. Teaches selling as a life skill, not a job title. Founding Ryzn mentor — 24 graduates and counting.",
    tags: ["Entrepreneurship", "Selling", "Founding mentor"],
    achievements: ["Two exits before 35 (logistics, SaaS)", "24 Ryzn graduates · 4 now founders", "Angel in 15 Canadian startups"],
    companies: ["Bell Ventures · GP", "Startup Genome · advisor", "Futurpreneur · mentor"],
    talks: ["Collision — “Sell before you build”", "Mentor Meets Montreal ’26 · closing talk"],
    resources: ["First-10-customers playbook", "The 5-line pitch template"] },
  { name: "Dana Wolfe", title: "Engineering Manager", company: "Fieldnote", tier: "Pathfinder", match: 86, impact: 902, graduated: 8, focus: "Engineering", city: "Toronto",
    bio: "TMU alum, self-taught coder, now leads two teams at Fieldnote. Runs mock technical interviews that feel uncomfortably like the real thing.",
    tags: ["Coding", "Technical careers", "TMU alum"],
    achievements: ["Self-taught → EM in 6 years", "8 Ryzn graduates · 6 hired into tech", "Built Fieldnote’s intern program from zero"],
    companies: ["Fieldnote · Engineering Manager", "TMU · alumni mentor board"],
    talks: ["CUSEC — “The interview is a skill”", "Fieldnote engineering blog · 12 posts"],
    resources: ["Mock interview question bank", "Junior dev portfolio guide"] },
  { name: "Omar Farah", title: "Strategy Lead", company: "Northbound Bank", tier: "Pathfinder", match: 84, impact: 811, graduated: 7, focus: "Finance", city: "Toronto",
    bio: "Case-interview coach who cracked consulting the hard way, then chose banking strategy. Toronto through and through — knows every coffee spot near Union.",
    tags: ["Finance", "Case interviews", "Toronto-based"],
    achievements: ["Ex-MBB consultant → bank strategy lead", "7 Ryzn graduates · 3 into finance co-ops", "Coached 60+ case interviews pro bono"],
    companies: ["Northbound Bank · Strategy Lead", "Somali Professionals Network · board"],
    talks: ["Rotman case night · recurring coach", "Mentor Meets Toronto ’26 · speaker"],
    resources: ["Case math drill sheet", "Networking coffee script"] },
];
export const MENTEE_MATCHES = [
  { name: "Alex Reyes", school: "Toronto Metropolitan", track: "University", match: 96, focus: "Product", goal: "Land a summer internship in product",
    bio: "Second-year business tech management, first-gen, works part-time retail. Wrote three of the most specific goals in the cohort intake.",
    tags: ["Product & tech", "Public speaking"],
    goals: ["Land a summer internship in product", "Build a portfolio that gets replies", "Speak confidently in interviews"],
    skills: ["Public speaking", "Spreadsheets", "Figma basics"],
    highlights: ["DECA provincial finalist", "Runs TMU first-year mentorship circle", "Retail key-holder — 3 years, same store"] },
  { name: "Sam Otieno", school: "University of Toronto", track: "University", match: 93, focus: "Engineering", goal: "Ship a side project people actually use",
    bio: "CS major who ships side projects nobody uses yet — wants to change the ‘nobody’ part. Learns fast, over-scopes faster.",
    tags: ["Aspiring product person", "Coding"],
    goals: ["Ship a side project people actually use", "Learn to talk about my work", "Get a dev internship by summer"],
    skills: ["React", "Python", "Git"],
    highlights: ["3 hackathons · 1 win", "Built a course-planner app (400 users)", "TA for intro CS"] },
  { name: "Noor Haddad", school: "Western University", track: "University", match: 90, focus: "Product", goal: "Break into product from co-op engineering",
    bio: "Co-op engineer pivoting to product. Debate alum, natural storyteller, currently rewriting her resume for the fourth time.",
    tags: ["Career switcher", "Storytelling"],
    goals: ["Break into product from co-op engineering", "Tell my story without underselling it", "Find a PM co-op for winter term"],
    skills: ["SQL", "Wireframing", "Debate"],
    highlights: ["Co-op at a hardware startup", "Debate nationals semifinalist", "4 case teardowns published on Medium"] },
  { name: "Mia Tran", school: "Northview Secondary", track: "High School", match: 88, focus: "Design", goal: "Figure out if tech is even for me",
    bio: "Grade 11. Designs the posters for every club at Northview and wonders if that counts. (It does.) Exploring whether tech fits.",
    tags: ["High schooler exploring", "Design"],
    goals: ["Figure out if tech is even for me", "Turn my club posters into a portfolio", "Talk to 3 people who design for a living"],
    skills: ["Canva", "Procreate", "Instagram content"],
    highlights: ["Poster designer for 6 school clubs", "Grade 10 art award", "Started the design corner in the school paper"] },
  { name: "Leo Kim", school: "Earl Haig Secondary", track: "High School", match: 85, focus: "Business", goal: "Start a small business before graduation",
    bio: "Grade 12. Runs a sneaker resale side hustle with real margins and a spreadsheet to prove it. Wants to make it legit.",
    tags: ["Student founder", "Selling"],
    goals: ["Start a small business before graduation", "Learn basic bookkeeping", "Get my first 10 repeat customers"],
    skills: ["Selling", "Negotiation", "Excel basics"],
    highlights: ["Sneaker resale · $4K revenue", "Runs the school buy/sell page", "Saved for his first car himself"] },
];

export const EXTRA_MENTEES = [
  { name: "Zara Ali", school: "York University", track: "University", match: 87, focus: "Business", goal: "Get my first marketing internship",
    bio: "Second-year marketing student who runs a 12K-follower food account — and just realized that’s a portfolio.",
    tags: ["Marketing", "Social media"],
    goals: ["Get my first marketing internship", "Turn my food account into a case study", "Learn email marketing properly"],
    skills: ["Reels & TikTok", "Copywriting", "CapCut"],
    highlights: ["12K-follower food account", "Grew club Instagram 5× in a term", "Campus brand ambassador"] },
  { name: "Owen Brooks", school: "Central Tech", track: "High School", match: 84, focus: "Engineering", goal: "Build a robotics portfolio for university apps",
    bio: "Grade 12 robotics captain. His team made provincials — he wrote the code and the grant application.",
    tags: ["Robotics", "Coding"],
    goals: ["Build a robotics portfolio for university apps", "Win provincials this year", "Learn CAD properly"],
    skills: ["Python", "Arduino", "Team lead"],
    highlights: ["Robotics captain · provincials", "Wrote the team’s $3K grant", "Teaches a middle-school code club"] },
  { name: "Fatima Noor", school: "McMaster University", track: "University", match: 86, focus: "Product", goal: "Land a PM-adjacent co-op by January",
    bio: "Health sci student who keeps redesigning the apps she uses. Wants to find out if that instinct is a career.",
    tags: ["Product & tech", "Research"],
    goals: ["Land a PM-adjacent co-op by January", "Redesign one real app end-to-end", "Learn to run user interviews"],
    skills: ["Research", "Notion", "Figma"],
    highlights: ["Health sci + CS minor", "Redesigned the campus clinic booking flow (concept)", "Peer research assistant"] },
];
export const MENTEE_POOL = [...MENTEE_MATCHES, ...EXTRA_MENTEES];

export const RETURNING_MENTEES = [
  { name: "Alex Reyes", week: 6, streak: 34, status: "active" },
  { name: "Sam Otieno", week: 6, streak: 21, status: "active" },
  { name: "Noor Haddad", week: 6, streak: 18, status: "active" },
  { name: "Mia Tran", week: 6, streak: 5, status: "risk" },
  { name: "Leo Kim", week: 2, streak: 3, status: "risk" },
  { name: "Dev Patel", week: 4, streak: 0, status: "off" },
];
export const STATUS = {
  active: { c: C.teal, bg: C.tealTint, label: "Active" },
  risk: { c: C.amber, bg: C.amberTint, label: "At risk" },
  off: { c: C.coral, bg: C.coralTint, label: "Disengaged" },
};

export const EXERCISES_RETURNING = [
  { day: "Today · Wed Jul 15", title: "The cold open", milestone: true, mins: 8, xp: 40,
    prompt: "Write the 3-sentence intro you’d send to someone in your target industry. Specific role, specific ask, no filler. Jordan reads these before your Tuesday session.", state: "open" },
  { day: "Tue Jul 14", title: "Map your second-degree network", mins: 10, xp: 40, state: "done" },
  { day: "Mon Jul 13", title: "One question you’re avoiding", mins: 5, xp: 30, state: "done" },
  { day: "Sun Jul 12", title: "Rest day reflection", mins: 5, xp: 20, state: "missed" },
  { day: "Sat Jul 11", title: "Rewrite your headline", milestone: true, mins: 10, xp: 50, state: "done" },
  { day: "Fri Jul 10", title: "Listen back: session notes", mins: 6, xp: 30, state: "done" },
];
export const EXERCISES_FRESH = [
  { day: "Today · Day 1", title: "Write your why", mins: 6, xp: 30,
    prompt: "One honest paragraph: why are you here, really? Your mentor reads this before your first session — it sets the tone for all twelve weeks.", state: "open" },
  { day: "Tomorrow", title: "Your opening question", mins: 5, xp: 30, state: "upcoming" },
  { day: "Day 3", title: "Map what you already know", mins: 8, xp: 40, state: "upcoming" },
];

export const COHORT_BOARD_STATIC = [
  { rank: 1, handle: "R-0388", xp: 2610 }, { rank: 2, handle: "R-0417", xp: 2455 },
  { rank: 3, handle: "R-0472", xp: 2390 }, { rank: 5, handle: "R-0355", xp: 2085 },
  { rank: 6, handle: "R-0401", xp: 1930 }, { rank: 7, handle: "R-0446", xp: 1710 },
];
export const SCHOOL_BOARD = [
  { rank: 1, school: "Toronto Metropolitan", badges: 41, me: true },
  { rank: 2, school: "University of Toronto", badges: 38 },
  { rank: 3, school: "McMaster University", badges: 29 },
];
export const MENTOR_BOARD_TOP = [
  { rank: 9, name: "Priya Raman", tier: "Architect", score: 1204 },
  { rank: 10, name: "Marcus Bell", tier: "Legend", score: 1187 },
  { rank: 11, name: "Dana Wolfe", tier: "Pathfinder", score: 902 },
];
export const EVENT = {
  city: "Toronto", date: "Sat Sept 26, 2026", venue: "Evergreen Brick Works", days: 70,
  speakers: [
    { name: "Marcus Bell", role: "Founder, two exits", tier: "Legend" },
    { name: "Priya Raman", role: "Head of Design, Nova Health", tier: "Architect" },
    { name: "Jordan Clarke", role: "VP of Product, Harbourline", tier: "Pathfinder" },
  ],
  past: [{ city: "Vancouver", when: "Apr ’26", n: 142 }, { city: "Montreal", when: "Jan ’26", n: 118 }],
};
export const MENTOR_CONTENT = [
  { id: "greet", type: "video", title: "Hey — I’m Jordan. Start here.", mins: "1:24", views: 212, xp: 10 },
  { id: "v1", type: "video", title: "3 questions that open any door", mins: "4:12", views: 238, xp: 5 },
  { id: "r1", type: "resource", title: "Resume teardown checklist", kind: "PDF · 6 pages", views: 184, xp: 5 },
  { id: "p1", type: "post", text: "Stop networking. Start asking better questions. Every warm intro this cohort landed started with curiosity, not a pitch.", views: 96, xp: 5, when: "2d" },
  { id: "v2", type: "video", title: "How I read a portfolio in 90 seconds", mins: "6:03", views: 157, xp: 5 },
];
export const MENTOR_FEED_SEED = MENTOR_CONTENT.slice(1).map((x, i) => ({ ...x, reactions: [21, 14, 9, 11][i] || 8 }));

