/* ----- Simulated feed -----

   Demo content for the network feed, so a brand-new account doesn't open onto
   an empty screen. This is the one place in the app that carries invented
   people, and it is deliberately quarantined here rather than mixed into
   data.js, which is authored program content and is real.

   Every item carries `simulated: true`. PostCard reads that flag and keeps the
   card entirely local: likes, comments and the "reviewed" button never touch
   /api/posts, and share is disabled, because none of these posts exist
   server-side and a link to one would dead-end.

   SAMPLE_BADGE puts a small SAMPLE chip in the byline so a simulated post is
   never presented as a real member's. Flip it to false for a demo where the
   chip gets in the way.
*/

export const SAMPLE_BADGE = true;

/* Photography is hotlinked from Unsplash's CDN with explicit width and quality
   params, so a card downloads roughly what it displays. Any URL that fails
   falls back to the generated gradient tile behind it (see `art()` in
   feed.jsx), which is why a dead ID here is a cosmetic problem and not a
   broken card. */
const shot = (id, w = 1080) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const face = (id) => shot(id, 200);

const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
const ago = (ms) => new Date(Date.now() - ms).toISOString();

/* The cast. Handles are here so the byline reads like a social profile, not so
   anything routes to them, a simulated author has no page to open. */
const A = {
  imani: { id: "sim-imani", name: "Imani Cole", handle: "imanicole", avatarUrl: face("1573497019940-1c28c88b4f3e"), followers: 3120 },
  dev:   { id: "sim-dev",   name: "Dev Raman",  handle: "devraman",  avatarUrl: face("1506794778202-cad84cf45f1d"), followers: 1840 },
  sofia: { id: "sim-sofia", name: "Sofia Ruiz", handle: "sofiaruiz", avatarUrl: face("1438761681033-6461ffad8d80"), followers: 5602 },
  marcus:{ id: "sim-marcus",name: "Marcus Bell",handle: "marcusbell",avatarUrl: face("1507003211169-0a1dd7228f2d"), followers: 2410 },
  yuki:  { id: "sim-yuki",  name: "Yuki Tanaka",handle: "yukitanaka",avatarUrl: face("1544005313-94ddf0286df2"), followers: 990 },
  tomas: { id: "sim-tomas", name: "Tomás Silva",handle: "tomassilva",avatarUrl: face("1519085360753-af0119f7cbe7"), followers: 7315 },
  aisha: { id: "sim-aisha", name: "Aisha Nour", handle: "aishanour", avatarUrl: face("1580489944761-15a19d654956"), followers: 4188 },
};

const c = (id, name, text, mins, reactions = 0) => ({
  id, authorName: name, text, createdAt: ago(mins * MIN), reactions, reacted: false,
});

/* Written newest-first. `at` is how long ago the post went up, in minutes; it
   is turned into a real timestamp at import time so relTime reads "2h", "3d"
   the same way it does for a real post. */
const RAW = [
  {
    id: "sim-1", author: A.sofia, kind: "photo", at: 42,
    photo: "1542744173-8e7e53415bb0",
    text: "Spent the morning tearing apart my mentee's product roadmap with sticky notes instead of slides. Twelve initiatives went in. Three came out. That's the job.",
    views: 1840, reactions: 214, comments: 3,
    thread: [
      c("sim-1-c1", "Priya Raghavan", "The sticky note thing works every time. Nobody argues with a wall.", 30, 12),
      c("sim-1-c2", "Dev Raman", "Which three survived?", 24, 3),
      c("sim-1-c3", "Sofia Ruiz", "Retention, onboarding, and one bet nobody could justify but everybody wanted. Kept it on purpose.", 18, 27),
    ],
  },
  {
    id: "sim-2", author: A.marcus, kind: "status", at: 3 * HOUR / MIN,
    text: "Unpopular take: your first job title matters far less than who reviews your work. I took a 15% pay cut at 24 to sit next to someone who was better than me. Compounded harder than any raise since.",
    views: 6210, reactions: 903, comments: 2,
    thread: [
      c("sim-2-c1", "Yuki Tanaka", "This is the single thing I tell every mentee and the single thing none of them believe until year three.", 140, 61),
      c("sim-2-c2", "Imani Cole", "Proximity to good taste is criminally underrated.", 96, 44),
    ],
  },
  {
    id: "sim-3", author: A.imani, kind: "photo", at: 7 * HOUR / MIN,
    photo: "1524178232363-1fb2b075b655",
    title: "Cohort 12, week one",
    text: "Forty students, one room, zero laptops open. We ran the whole session on paper. The quality of the questions doubled.",
    views: 3402, reactions: 487, comments: 2,
    thread: [
      c("sim-3-c1", "Tomás Silva", "No-laptop sessions changed my workshops completely. Steal this, everyone.", 300, 38),
      c("sim-3-c2", "Aisha Nour", "What did you use for the warm-up?", 240, 5),
    ],
  },
  {
    id: "sim-4", author: A.dev, kind: "video", at: 11 * HOUR / MIN,
    title: "How to ask for an intro without being weird",
    poster: "1573164713988-8665fc963095",
    mins: "4:12",
    text: "The three-sentence version I've sent about 200 times. Works because it makes the intro easy to forward, not because it makes you sound impressive.",
    views: 2915, reactions: 340, comments: 1,
    thread: [
      c("sim-4-c1", "Sofia Ruiz", "The forwardable paragraph is the whole trick. Nobody wants to write on your behalf.", 420, 29),
    ],
  },
  {
    id: "sim-5", author: A.yuki, kind: "photo", at: 19 * HOUR / MIN,
    photo: "1517048676732-d65bc937f952",
    text: "First mentee just closed her first design contract. She sent me the invoice screenshot at 11pm with the caption \"IT CLEARED\". Twelve weeks ago she wouldn't send a cold email.",
    views: 4780, reactions: 1120, comments: 2,
    thread: [
      c("sim-5-c1", "Marcus Bell", "This is the entire point of the platform in one post.", 900, 88),
      c("sim-5-c2", "Imani Cole", "Congratulations to both of you.", 800, 51),
    ],
  },
  {
    id: "sim-6", author: A.tomas, kind: "photo", at: DAY / MIN,
    photo: "1517245386807-bb43f82c33c4",
    title: "The 20-minute portfolio audit",
    text: "I do this live with every new mentee. Open the portfolio, start a timer, narrate every thought out loud. Where I get bored is where a hiring manager closes the tab.",
    views: 5301, reactions: 762, comments: 2,
    thread: [
      c("sim-6-c1", "Dev Raman", "Narrating the boredom out loud is brutal and completely necessary.", 1200, 47),
      c("sim-6-c2", "Yuki Tanaka", "Doing this on Thursday. Terrified.", 1100, 19),
    ],
  },
  {
    id: "sim-7", author: A.aisha, kind: "status", at: (DAY + 5 * HOUR) / MIN,
    text: "Reminder that \"I don't know\" is a complete sentence in an interview, as long as the next sentence is \"here's how I'd find out.\"",
    views: 8104, reactions: 1543, comments: 1,
    thread: [
      c("sim-7-c1", "Tomás Silva", "Saved a mentee's final round with exactly this last month.", 1400, 76),
    ],
  },
  {
    id: "sim-8", author: A.marcus, kind: "photo", at: (2 * DAY) / MIN,
    photo: "1559136555-9303baea8ebd",
    text: "Pulled twelve weeks of cohort data before this morning's review. Mentees who posted a single reflection in week one finished at nearly twice the rate of those who didn't. One post. Week one.",
    views: 3960, reactions: 594, comments: 2,
    thread: [
      c("sim-8-c1", "Aisha Nour", "Is that causal or is it just that the people who post are the people who were going to finish?", 2000, 34),
      c("sim-8-c2", "Marcus Bell", "Honestly, probably both. But it's a cheap intervention either way.", 1900, 41),
    ],
  },
  {
    id: "sim-9", author: A.sofia, kind: "photo", at: (2 * DAY + 8 * HOUR) / MIN,
    photo: "1523240795612-9a054b0db644",
    text: "Office hours moved to the café downstairs and attendance tripled. Turns out the conference room was the problem, not the calendar invite.",
    views: 2244, reactions: 388, comments: 1,
    thread: [
      c("sim-9-c1", "Imani Cole", "The room is always the problem.", 2800, 22),
    ],
  },
  {
    id: "sim-10", author: A.dev, kind: "photo", at: (3 * DAY) / MIN,
    photo: "1461749280684-dccba630e2f6",
    title: "Ship something ugly",
    text: "My mentee spent six weeks on a landing page nobody had seen. We put the ugly version live on a Tuesday. Fourteen signups by Friday, and every one of them told us something the redesign couldn't.",
    views: 6820, reactions: 1041, comments: 2,
    thread: [
      c("sim-10-c1", "Yuki Tanaka", "Six weeks of polish versus three days of real feedback. Not close.", 3600, 58),
      c("sim-10-c2", "Marcus Bell", "The ugly version is a research instrument. Reframing it that way makes it easier to press publish.", 3400, 72),
    ],
  },
  {
    id: "sim-11", author: A.aisha, kind: "photo", at: (4 * DAY) / MIN,
    photo: "1543269865-cbf427effbad",
    text: "Ran a mock panel for six students tonight. The strongest answer of the night came from someone who paused for a full eight seconds before speaking. Silence reads as confidence far more often than speed does.",
    views: 3115, reactions: 528, comments: 1,
    thread: [
      c("sim-11-c1", "Sofia Ruiz", "Teaching the pause is harder than teaching the answer.", 4200, 36),
    ],
  },
  {
    id: "sim-12", author: A.yuki, kind: "photo", at: (5 * DAY) / MIN,
    photo: "1499750310107-5fef28a66643",
    text: "Wrote the cold email I wish someone had written for me at 22. Two lines about them, one line about you, one specific ask. That's it. No paragraph about your passion.",
    views: 7402, reactions: 1286, comments: 2,
    thread: [
      c("sim-12-c1", "Tomás Silva", "\"No paragraph about your passion\" should be on a poster.", 5000, 94),
      c("sim-12-c2", "Dev Raman", "The specific ask is the part everyone skips.", 4800, 40),
    ],
  },
  {
    id: "sim-13", author: A.imani, kind: "status", at: (6 * DAY) / MIN,
    text: "Six years of mentoring and the pattern hasn't changed once: the mentees who move fastest are not the most talented, they're the ones who send the follow-up message. Every single time.",
    views: 9840, reactions: 1907, comments: 1,
    thread: [
      c("sim-13-c1", "Marcus Bell", "Follow-up is a skill and nobody teaches it.", 6000, 112),
    ],
  },
  {
    id: "sim-14", author: A.tomas, kind: "photo", at: (8 * DAY) / MIN,
    photo: "1522071820081-009f0129c71c",
    text: "Last session of the cohort. Nine of eleven finished, two are picking it back up in spring, and one is now mentoring in the same programme she joined last year. That's the loop closing.",
    views: 5620, reactions: 998, comments: 1,
    thread: [
      c("sim-14-c1", "Aisha Nour", "The loop closing is the only metric that matters.", 8000, 67),
    ],
  },
];

/** One RAW entry, in the exact shape PostCard expects from /api/posts. */
const build = (r) => ({
  id: r.id,
  kind: r.kind,
  title: r.title || null,
  text: r.text || null,
  mins: r.mins || null,
  createdAt: ago(Math.round(r.at * MIN)),
  views: r.views ?? 0,
  reactions: r.reactions ?? 0,
  comments: r.comments ?? (r.thread?.length || 0),
  xp: 10,
  visibility: "public",
  pinned: false,
  /* A photo carries a real URL; a video carries only a poster, because an
     autoplaying stock clip in a demo feed is worse than a still with a play
     badge on it. MediaBlock renders the poster path when there is no `url`. */
  media: r.kind === "photo" ? { url: shot(r.photo) }
       : r.kind === "video" ? { posterUrl: shot(r.poster) }
       : null,
  authorId: r.author.id,
  authorName: r.author.name,
  authorHandle: r.author.handle,
  authorAvatarUrl: r.author.avatarUrl,
  followers: r.author.followers,
  thread: r.thread || [],
  simulated: true,
});

/** The whole simulated feed, newest first. */
export const SIM_POSTS = RAW.map(build);

/**
 * `count` simulated posts, offset so two surfaces showing the network don't
 * open on the same card. Returns fresh objects each call, PostCard mutates
 * nothing but local state, and reusing one array across two mounted feeds made
 * a like in Discover appear in the mentor Brief.
 */
export const simFeedPosts = (count = SIM_POSTS.length, offset = 0) =>
  Array.from({ length: Math.min(count, SIM_POSTS.length) }, (_, i) => ({
    ...SIM_POSTS[(i + offset) % SIM_POSTS.length],
  }));
