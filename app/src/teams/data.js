import { T } from "./theme.js";
import { PHOTOS, COVER, MCOVER, face } from "./media.js";
export const MENTORS = [
  { id:"m1", name:"Ritwik Joshi", init:"RJ", photo:PHOTOS.ritwik, cover:COVER.ritwik, invitedBy:"Priya Anand · HR", community:"The Roster · Northbound chapter", questions:["What outcome do you want out of 12 weeks with me?","Tell me about a time you pushed through real resistance.","How many focused hours a week can you actually commit?"], role:"Senior Product Manager", division:"Product", level:"Staff+", match:96, grads:11, color:T.deep,
    about:"Shipped three zero-to-one products. I mentor on narrative, prioritization, and surviving exec reviews.",
    skills:["Product strategy","Stakeholder mgmt","Roadmaps","Storytelling"],
    achievements:["Led Payments 2.0 launch (2.1M users)","Promoted IC5 to Senior PM in 2 cycles","Internal 'Narrative First' course creator"],
    talks:[{t:"Owning the room in exec reviews",len:"18 min"},{t:"Roadmaps people actually read",len:"12 min"}],
    resources:[{t:"PRD teardown checklist",type:"DOC"},{t:"Stakeholder map template",type:"FIGMA"}],
    stats:{score:847,tier:"PATHFINDER",rank:"#2 · this org"} },
  { id:"m2", name:"Dana Wolfe", init:"DW", photo:PHOTOS.dana, cover:COVER.dana, invitedBy:"Ritwik Joshi", community:"The Roster · Northbound chapter", questions:["What system have you built that you are proud of?","Where does your technical judgment fail you today?","What does leadership mean to you in one sentence?"], role:"Director of Engineering", division:"Engineering", level:"Staff+", match:91, grads:7, color:T.teal,
    about:"20 years building teams. I mentor engineers crossing into technical leadership.",
    skills:["System design","Career ladders","Tech leadership"],
    achievements:["Scaled platform org 8 to 40","Author of internal design-review rubric"],
    talks:[{t:"From IC to tech lead without losing the code",len:"22 min"}],
    resources:[{t:"Design doc rubric",type:"DOC"}],
    stats:{score:1012,tier:"ARCHITECT",rank:"#1 · this org"} },
  { id:"m3", name:"Sam Ito", init:"SI", photo:PHOTOS.sam, cover:COVER.sam, invitedBy:"Dana Wolfe", community:"The Roster · Northbound chapter", questions:["Link or describe one piece of work you love.","What craft skill are you avoiding?","Why now?"], role:"Design Manager", division:"Design", level:"Staff+", match:88, grads:5, color:T.coral,
    about:"Craft-obsessed. I mentor on portfolio, critique, and design leverage.",
    skills:["Craft reviews","Portfolio","Design ops"],
    achievements:["Rebuilt onboarding flows (+18% activation)"],
    talks:[{t:"Critique that doesn't crush people",len:"15 min"}],
    resources:[{t:"Portfolio review template",type:"FIGMA"}],
    stats:{score:610,tier:"PATHFINDER",rank:"#4 · this org"} },
  { id:"m4", name:"Lena Park", init:"LP", photo:PHOTOS.lena, cover:COVER.lena, invitedBy:"Ritwik Joshi", community:"The Roster · Northbound chapter", questions:["What decision should data have changed for you recently?","Rate your SQL honestly, 1 to 10.","What question keeps bugging you?"], role:"Product Analyst", division:"Product", level:"IC", match:84, grads:1, color:T.amber,
    about:"Data storyteller. I mentor on SQL fluency and experiment design.",
    skills:["SQL","Experimentation","Dashboards"],
    achievements:["Built the org's north-star dashboard"],
    talks:[],
    resources:[{t:"SQL starter pack",type:"DOC"}],
    stats:{score:180,tier:"SCOUT",rank:"#11 · this org"} },
];
export const MENTEES = [
  { id:"e1", name:"Maya Osei", init:"MO", photo:PHOTOS.maya, invitedBy:"Priya Anand · HR", community:"Cohort 6 · Northbound", cover:MCOVER.maya, division:"Product", role:"Associate PM", wk:6, streak:12, state:"green", note:"Midway exercise submitted",
    goals:["Run my first exec review by Q4","Own a feature end to end"], skills:["User research","Jira","Figma basics"],
    highlights:["Top 5% onboarding score","4-week streak badge","Peer-voted best demo, June"] },
  { id:"e2", name:"Arjun Patel", init:"AP", photo:PHOTOS.arjun, invitedBy:"Maya Osei", community:"Cohort 6 · Northbound", cover:MCOVER.arjun, division:"Product", role:"Rotational Analyst", wk:6, streak:9, state:"green", note:"Session booked Thu",
    goals:["Choose a specialization","Build exec presence"], skills:["SQL","Amplitude"], highlights:["Momentum badge Wk 4"] },
  { id:"e3", name:"Chloe Kim", init:"CK", photo:PHOTOS.chloe, invitedBy:"Sam Ito", community:"Cohort 6 · Northbound", cover:MCOVER.chloe, division:"Design", role:"Product Designer I", wk:4, streak:2, state:"amber", note:"No session in 11 days",
    goals:["Portfolio ready by Dec"], skills:["Figma","Prototyping"], highlights:["First Session badge"] },
];
export const LOCAL_MENTEES = [
  { id:"x1", name:"Tom Nguyen", cover:MCOVER.tom, init:"TN", photo:PHOTOS.tom, invitedBy:"Dana Wolfe", community:"Cohort 7 waitlist", division:"Engineering", role:"Junior Engineer", wk:0, streak:0, state:"green",
    note:"Applied to your Orbit · answers on your Home", goals:["Lead a design review by year end","Stop being the quiet one in reviews"], skills:["Go","Kubernetes","Runbooks"], highlights:["Rewrote the on-call runbook solo"] },
  { id:"x2", name:"Ivy Chen", cover:MCOVER.ivy, init:"IC", photo:PHOTOS.ivy, invitedBy:"Org invite · HR", community:"Cohort 7 waitlist", division:"Design", role:"Visual Designer", wk:0, streak:0, state:"green",
    note:"Seeking a mentor this cohort", goals:["Ship a design system component","Build critique confidence"], skills:["Figma","Motion","Type"], highlights:["Rebranded the intranet in a week"] },
  { id:"x3", name:"Dev Kapoor", cover:MCOVER.dev, init:"DK", photo:PHOTOS.dev, invitedBy:"Org invite · HR", community:"Cohort 7 waitlist", division:"Product", role:"Growth Analyst", wk:0, streak:0, state:"green",
    note:"Seeking a mentor this cohort", goals:["Own a growth experiment end to end","Present to the exec team"], skills:["SQL","Amplitude","A/B testing"], highlights:["Found the churn leak in Q2"] },
  { id:"x4", name:"Sofia Marino", cover:MCOVER.sofia, init:"SM", photo:PHOTOS.sofia, invitedBy:"Leo Tanaka", community:"Cohort 7 waitlist", division:"Design", role:"UX Researcher", wk:0, streak:0, state:"green",
    note:"Seeking a mentor this cohort", goals:["Run a full discovery cycle solo","Publish an internal research playbook"], skills:["Interviews","Synthesis","Notion"], highlights:["Cut onboarding drop-off 9% with one study"] },
  { id:"x5", name:"Marcus Bell", cover:MCOVER.marcus, init:"MB", photo:PHOTOS.marcus, invitedBy:"Dana Wolfe", community:"Cohort 7 waitlist", division:"Engineering", role:"Platform Engineer II", wk:0, streak:0, state:"green",
    note:"Seeking a mentor this cohort", goals:["Design a service end to end","Speak at the eng all-hands"], skills:["Rust","Terraform","Observability"], highlights:["Halved deploy times in March"] },
  { id:"x6", name:"Aisha Bakr", cover:MCOVER.aisha, init:"AB", photo:PHOTOS.aisha, invitedBy:"Priya Anand · HR", community:"Cohort 7 waitlist", division:"Product", role:"APM Intern", wk:0, streak:0, state:"green",
    note:"Seeking a mentor this cohort", goals:["Convert intern to full-time","Ship one customer-facing fix"], skills:["Docs","Jira","User calls"], highlights:["Top intern cohort score"] },
  { id:"x7", name:"Leo Tanaka", cover:MCOVER.leo, init:"LT", photo:PHOTOS.leo, invitedBy:"Sam Ito", community:"Cohort 7 waitlist", division:"Design", role:"Product Designer II", wk:0, streak:0, state:"green",
    note:"Seeking a mentor this cohort", goals:["Lead a critique","Own a design-system token set"], skills:["Figma","Tokens","Prototyping"], highlights:["Shipped dark mode for the app"] },
];
export const STAGE1 = [
  { id:1, label:"Set two goals for the program", sub:"What do you want out of the next 12 weeks?", xp:50 },
  { id:2, label:"Record a 60-second hello", sub:"Your mentor watches this before day one.", xp:75 },
  { id:3, label:"Share where you're starting from", sub:"A 2-minute snapshot so your mentor meets you where you are.", xp:75 },
];
export const COMMUNITY = {
  stats: { mentors: 214, chapters: 12, thisOrg: 6 },
  posts: [
    { who:"Dana Wolfe", init:"DW", color:"#0F6E56", photo:PHOTOS.dana, when:"2h", text:"New resource: my design-review rubric, now with the async variant. Steal it.", tag:"RESOURCE" },
    { who:"Sam Ito", init:"SI", color:"#D85A30", photo:PHOTOS.sam, when:"1d", text:"Clip from last week's critique workshop: how to open feedback without flattening people.", tag:"TALK · 6 MIN" },
    { who:"Ritwik Joshi", init:"RJ", color:"#2D2580", photo:PHOTOS.ritwik, when:"2d", text:"Maya just ran her first stakeholder pre-read. Watching someone find their voice never gets old.", tag:"WIN" },
  ],
  events: [
    { title:"Mentor roundtable · handling stalled mentees", date:"Wed Aug 5 · 12:00", who:"Mentors only" },
    { title:"Northbound Mentor Meets · quarterly", date:"Fri Sep 25 · Evergreen Hall", who:"Tiered invite" },
  ],
};
export const COHORT_FEED = [
  { who:"Arjun P.", init:"AP", photo:PHOTOS.arjun, text:"unlocked the Momentum badge", when:"3h", tag:"BADGE", color:"#0F6E56" },
  { who:"Design cohort", init:"DS", text:"crossed 100 sessions this quarter", when:"1d", tag:"MILESTONE", color:"#D85A30" },
  { who:"Priya (HR)", init:"PA", photo:PHOTOS.priya, text:"posted: AMA with Dana Wolfe, Thursday", when:"2d", tag:"EVENT", color:"#BA7517" },
];
export const BADGES = [
  { n:"Goal Setter", d:"You set two real goals on day one.", how:"Awarded automatically when your goals were saved.", c:"#5B4FCF", state:"earned", when:"Day 1" },
  { n:"First Session", d:"You showed up for session one.", how:"Confirmed by Ritwik after your kickoff.", c:"#2D2580", state:"earned", when:"Week 1" },
  { n:"Momentum", d:"Four weeks straight without missing.", how:"Streak-tracked; no manual claims.", c:"#0F6E56", state:"earned", when:"Week 4" },
  { n:"Midway", d:"Reach halfway with zero missed sessions.", how:"On track: keep Thursday and it lands this week.", c:"#BA7517", state:"progress", pct:82, when:"Week 6" },
  { n:"Mentor Approved", d:"Ritwik vouches for your growth.", how:"Your mentor signs this one personally.", c:"#D85A30", state:"locked", when:"Week 8" },
  { n:"Program Graduate", d:"All twelve weeks, done for real.", how:"Exports to your development summary.", c:"#1A1A1A", state:"locked", when:"Week 12" },
];
export const SEED_DIVISIONS = [
  { name:"Product", color:T.purple }, { name:"Engineering", color:T.teal }, { name:"Design", color:T.coral },
];
export const SEED_PROGRAMS = [
  { id:"p1", name:"Q3 Mentors · Product & Tech", division:"All", mode:"Deep", weeks:12, status:"Live", people:50 },
];
export const SEED_SESSIONS = [
  { id:"s1", title:"Cohort kickoff", type:"Kickoff", host:"Priya Anand", date:"Mon Jul 27 · 9:00", who:"All participants" },
  { id:"s2", title:"Office hours: exec presence", type:"Office hours", host:"Ritwik Joshi", date:"Thu Jul 30 · 16:00", who:"Product division" },
];
export const SEED_INVITES = [
  { email:"omar.h@northbound.com", role:"Mentor", code:"RYZ-INV-2026-8H2KOMAR", status:"Accepted" },
  { email:"grace.l@northbound.com", role:"Mentee", code:"RYZ-NB-4T7Q", status:"Sent" },
];
export const DEPT_STATS = d => ({ Product:{pairs:14,sess:21,pts:1240}, Engineering:{pairs:18,sess:24,pts:1105}, Design:{pairs:8,sess:11,pts:860} }[d] || {pairs:4,sess:3,pts:220});
export const AT_RISK_INIT = [
  { pair:"C. Kim + S. Ito", division:"Design", days:11, nudged:false },
  { pair:"T. Nguyen + D. Wolfe", division:"Engineering", days:14, nudged:false },
];
export const genCode = p => `RYZ-${p}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
export const JOIN_PHOTOS = [
  face({skin:"#C68863",hair:"#2E1F1A",style:"long",beard:false,shirt:"#5B4FCF",bg:"#EEF0FC"}),
  face({skin:"#E8B48F",hair:"#3A2415",style:"bob",beard:false,shirt:"#0F6E56",bg:"#E1F5EE"}),
  face({skin:"#B97A56",hair:"#171310",style:"short",beard:true,shirt:"#D85A30",bg:"#FAECE7"}),
  face({skin:"#8A5A3B",hair:"#12100E",style:"short",beard:false,shirt:"#BA7517",bg:"#F7EEDD"}),
];
export const FOCUS_OPTS = ["Product strategy","SQL & data","Design craft","Leadership","Storytelling","System design"];


export const SEED_REQUESTS = [
  { id:"r1", mentorId:"m1", status:"pending",
    from:{ name:"Tom Nguyen", init:"TN", photo:PHOTOS.tom, division:"Engineering", role:"Junior Engineer" },
    answers:["I want to stop being the quiet one in design reviews and lead one by week 12.","Shipped our on-call runbook rewrite nobody wanted to touch. Took 6 weekends.","5 focused hours, calendar-blocked already."] },
];
export const SEED_CHAT = {
  "maya-ritwik": [
    { from:"ritwik", text:"Welcome Maya. I read your two goals before accepting, the exec-review one is very doable by Q4.", t:"Mon 9:12" },
    { from:"maya", text:"That's exactly why I requested you. Where do we start?", t:"Mon 9:30" },
    { from:"ritwik", text:"Thursday's session: bring one decision you had to argue for recently. We'll rebuild how you framed it.", t:"Mon 9:41" },
  ],
  "arjun-ritwik": [{ from:"arjun", text:"Confirmed for Thursday, prepping the case study now.", t:"Tue 11:02" }],
  "chloe-ritwik": [],
  "ritwik-dana": [{ from:"dana", text:"Your Orbit question set is sharp. Borrowing the resistance one for mine.", t:"Wed 15:20" }],
};

