import React, { useState, useMemo } from "react";
import {
  Check, Lock, Crown, Plus, Image as ImageIcon, MessageCircle, Play, FileText,
  Upload, Heart, Eye, Send, Pin, Sparkles,
} from "lucide-react";
import { C, F } from "./theme.js";
import { Card, Label, Btn, Monogram, HeaderRow, Bar } from "./ui.jsx";

/* ————————————————— ORBIT FEED —————————————————
   One post model, two screens: the mentor writes it (MentorFeed), the cohort
   reads it (OrbitScreen). Kept to four post kinds on purpose — a mentor who has
   to think about formatting stops posting.
*/

export const KIND_META = {
  status:   { icon: MessageCircle, c: C.teal,   bg: C.tealTint,   label: "Status" },
  photo:    { icon: ImageIcon,     c: C.coral,  bg: C.coralTint,  label: "Photo" },
  video:    { icon: Play,          c: C.purple, bg: C.purpleTint, label: "Video" },
  resource: { icon: FileText,      c: C.amber,  bg: C.amberTint,  label: "Resource" },
};

/** Media is stubbed until uploads exist: a deterministic brand tile per post,
    so the same post always looks the same without shipping placeholder JPEGs. */
const art = (seed, kind) => {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const palettes = [["#5B4FCF", "#2D2580"], ["#0F6E56", "#1A5F6E"], ["#D85A30", "#BA7517"], ["#2D2580", "#5B4FCF"]];
  const [a, b] = palettes[h % palettes.length];
  const r = (n) => ((h >>> n) & 63) / 63;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="320" height="200" fill="url(#g)"/>
    <g fill="#FFFFFF" opacity=".14">
      <rect x="${18 + r(2) * 150}" y="${10 + r(5) * 60}" width="${60 + r(8) * 90}" height="${60 + r(11) * 70}"/>
      <circle cx="${40 + r(14) * 240}" cy="${40 + r(17) * 120}" r="${22 + r(20) * 46}"/>
    </g>
    <g fill="#FFFFFF" opacity=".2">
      <rect x="0" y="${150 + r(23) * 30}" width="320" height="2"/>
      <rect x="${r(26) * 300}" y="0" width="2" height="200"/>
    </g>
    ${kind === "video" ? '<circle cx="160" cy="100" r="26" fill="#FFFFFF" opacity=".9"/><polygon points="153,88 153,112 175,100" fill="#1A1A1A"/>' : ""}
  </svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
};

const MediaBlock = ({ post, height = 168 }) => {
  if (post.kind === "status") return null;
  if (post.kind === "resource") return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: 12 }}>
      <div style={{ width: 40, height: 46, background: C.amberTint, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <FileText size={18} color={C.amber} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis" }}>{post.title}</div>
        <div style={{ fontFamily: F.mono, fontSize: 9, color: C.gray, marginTop: 3 }}>{(post.fileKind || "FILE").toUpperCase()}</div>
      </div>
    </div>
  );
  return (
    <div style={{ marginTop: 10, height, borderRadius: 12, overflow: "hidden", position: "relative", backgroundImage: art(post.id, post.kind), backgroundSize: "cover", backgroundPosition: "center" }}>
      {post.kind === "video" && post.mins && (
        <span style={{ position: "absolute", bottom: 8, right: 10, fontFamily: F.mono, fontSize: 10, color: C.white, background: "rgba(0,0,0,.45)", padding: "3px 7px", borderRadius: 6 }}>{post.mins}</span>
      )}
    </div>
  );
};

/** One post. `mine` renders the mentor's own view (stats, no XP button). */
export const PostCard = ({ post, author, tier, mine, reacted, onReact, onOpen, done }) => {
  const meta = KIND_META[post.kind] || KIND_META.status;
  const Icon = meta.icon;
  const openable = post.kind === "video" || post.kind === "resource";
  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Monogram name={author} size={38} bg={C.purple} color={C.white} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>{author}{mine && " · you"}</span>
            {tier && <Crown size={11} color={C.purple} />}
          </div>
          <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
            {post.pinned && <><Pin size={9} color={C.purple} /> </>}{String(post.when || "now").toUpperCase()} · {meta.label.toUpperCase()}
          </div>
        </div>
        <div style={{ width: 28, height: 28, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={13} color={meta.c} />
        </div>
      </div>

      {post.title && post.kind !== "resource" && <div style={{ fontWeight: 700, fontSize: 15, marginTop: 11 }}>{post.title}</div>}
      {post.text && <div style={{ fontSize: 13.5, lineHeight: 1.55, color: post.title && post.kind !== "resource" ? C.gray : C.ink, marginTop: post.title && post.kind !== "resource" ? 4 : 11 }}>{post.text}</div>}
      <MediaBlock post={post} />

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 12 }}>
        <button onClick={mine ? undefined : () => onReact(post.id)} style={{
          display: "inline-flex", alignItems: "center", gap: 6, border: "none", background: "none",
          cursor: mine ? "default" : "pointer", padding: 0, fontFamily: F.mono, fontSize: 11, fontWeight: 700,
          color: reacted ? C.coral : C.gray,
        }}>
          <Heart size={14} color={reacted ? C.coral : "#A5A39D"} fill={reacted ? C.coral : "none"} />
          {post.reactions + (reacted ? 1 : 0)}
        </button>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: F.mono, fontSize: 11, color: C.gray }}>
          <Eye size={14} color="#A5A39D" /> {post.views}
        </span>
        {!mine && openable && (
          <button onClick={() => onOpen(post)} style={{
            marginLeft: "auto", fontFamily: F.mono, fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer",
            padding: "7px 11px", borderRadius: 10, background: done ? C.tealTint : meta.bg, color: done ? C.teal : meta.c, whiteSpace: "nowrap",
          }}>{done ? "✓ DONE" : `${post.kind === "video" ? "WATCH" : "OPEN"} · +${post.xp} XP`}</button>
        )}
        {mine && post.isNew && <span style={{ marginLeft: "auto", fontFamily: F.mono, fontSize: 8, background: C.purple, color: C.white, padding: "3px 6px", fontWeight: 700 }}>NEW</span>}
      </div>
    </Card>
  );
};

/** Compose box. One text field, four kinds, one button — that's the whole thing. */
export const Composer = ({ onPublish, name }) => {
  const [kind, setKind] = useState("status");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [attached, setAttached] = useState(false);
  const needsFile = kind === "photo" || kind === "video" || kind === "resource";
  const needsTitle = kind === "video" || kind === "resource";
  const ready = kind === "photo" ? attached || text.trim() : needsTitle ? title.trim() && attached : text.trim();

  const reset = () => { setText(""); setTitle(""); setAttached(false); setKind("status"); };
  const go = () => {
    if (!ready) return;
    onPublish({ kind, text: text.trim(), title: title.trim() });
    reset();
  };

  const placeholder = {
    status: "Say the thing. Your whole Orbit reads it.",
    photo: "Add a line about this photo…",
    video: "Optional note for your cohort…",
    resource: "Why they should open it…",
  }[kind];

  return (
    <Card style={{ padding: 14 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Monogram name={name} size={38} bg={C.purple} color={C.white} />
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder={placeholder}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", resize: "none", fontFamily: F.sans, fontSize: 14, lineHeight: 1.5, color: C.ink, paddingTop: 8, minWidth: 0 }} />
      </div>

      {needsTitle && (
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={kind === "video" ? "Video title — e.g. “How to ask for an intro”" : "Resource title — e.g. “Cover letter template”"}
          style={{ width: "100%", marginTop: 8, border: `1px solid ${C.line}`, borderRadius: 12, padding: "11px 12px", fontFamily: F.sans, fontSize: 13.5, background: C.surface, outline: "none", boxSizing: "border-box" }} />
      )}

      {needsFile && (
        attached ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, background: C.tealTint, borderRadius: 12, padding: "10px 12px" }}>
            <Check size={14} color={C.teal} strokeWidth={3} />
            <span style={{ fontSize: 12.5, color: C.teal, fontWeight: 600, flex: 1 }}>{kind === "photo" ? "Photo attached" : kind === "video" ? "Video attached" : "File attached"}</span>
            <button onClick={() => setAttached(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: F.mono, fontSize: 9.5, color: C.teal, fontWeight: 700 }}>REMOVE</button>
          </div>
        ) : (
          <button onClick={() => setAttached(true)} style={{
            width: "100%", marginTop: 8, border: `1.5px dashed ${C.line}`, borderRadius: 12, padding: "12px 0", cursor: "pointer",
            background: C.surface, fontFamily: F.sans, fontWeight: 600, fontSize: 13, color: C.gray,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}><Upload size={14} /> {kind === "photo" ? "Add a photo" : kind === "video" ? "Record or upload a video" : "Attach a file or link"}</button>
        )
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
        {Object.entries(KIND_META).map(([id, m]) => {
          const on = kind === id, Icon = m.icon;
          return (
            <button key={id} onClick={() => { setKind(id); if (id === "status") setAttached(false); }} style={{
              display: "inline-flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer", borderRadius: 10,
              padding: "7px 10px", fontFamily: F.sans, fontWeight: 600, fontSize: 12.5,
              background: on ? m.bg : "transparent", color: on ? m.c : C.gray,
            }}><Icon size={13} />{m.label}</button>
          );
        })}
        <Btn small style={{ marginLeft: "auto" }} disabled={!ready} onClick={go}><Send size={13} /> Post</Btn>
      </div>
    </Card>
  );
};

/* ————————————————— MENTOR: your feed ————————————————— */

export const MentorFeed = ({ u, name, feed, publish, greetingUp, uploadGreeting }) => {
  const views = feed.reduce((a, p) => a + p.views, 0);
  const reactions = feed.reduce((a, p) => a + p.reactions, 0);
  const reach = u.cohort ? u.cohort.length : 0;
  return (
    <div>
      <HeaderRow title="Your feed" right={<Label color={C.purple}>+10 IMPACT PER POST</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[[String(reach), "in your orbit", C.purple], [views.toLocaleString(), "views", C.ink], [String(reactions), "reactions", C.coral]].map(([n, l, c]) => (
            <Card key={l} style={{ padding: 12, textAlign: "center" }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: c }}>{n}</div>
              <div style={{ fontFamily: F.mono, fontSize: 8.5, color: C.gray, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 }}>{l}</div>
            </Card>
          ))}
        </div>

        {!greetingUp && (
          <Card style={{ border: `1.5px dashed ${C.purple}` }}>
            <Label color={C.purple}>Greeting video · pinned to the top of your Orbit</Label>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 8, lineHeight: 1.5 }}>60–90 seconds. Who you are, who you help, one honest reason you’re here. Mentees who watch a greeting are twice as likely to finish Stage 1.</div>
            <Btn style={{ marginTop: 12 }} onClick={uploadGreeting}><Upload size={15} /> Record or upload · +15 Impact</Btn>
          </Card>
        )}

        <Composer name={name} onPublish={publish} />

        {feed.length === 0 ? (
          <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA", textAlign: "center", padding: 22 }}>
            <Sparkles size={18} color={C.purple} />
            <div style={{ fontWeight: 700, fontSize: 14, marginTop: 8 }}>Nothing posted yet</div>
            <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>Your first post lands in every mentee’s Orbit — no message required, no meeting needed.</div>
          </Card>
        ) : (
          feed.map(p => <PostCard key={p.id} post={p} author={name} tier mine />)
        )}
      </div>
    </div>
  );
};

/* ————————————————— MENTEE: the Orbit ————————————————— */

export const OrbitScreen = ({ u, stage1, feed = [], watched, onWatch, reacted, onReact, openDm, back, go }) => {
  const [view, setView] = useState("feed");
  if (!u.mentorName) return (
    <div>
      <HeaderRow title="Orbit" onBack={back} />
      <div style={{ padding: "0 20px 20px" }}>
        <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>No mentor yet</div>
          <div style={{ fontSize: 12.5, color: C.gray, marginTop: 4, lineHeight: 1.5 }}>Once you’re matched, everything your mentor posts lands here.</div>
        </Card>
      </div>
    </div>
  );
  const first = u.mentorName.split(" ")[0];
  const resources = useMemo(() => feed.filter(p => p.kind === "video" || p.kind === "resource"), [feed]);
  const reviewed = resources.filter(p => watched[p.id]).length;

  return (
    <div>
      <HeaderRow title={`${first}’s Orbit`} onBack={back} right={<Label color={C.teal}>{reviewed}/{resources.length} REVIEWED</Label>} />
      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        <Card style={{ background: C.ink, border: "none", color: C.white, padding: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Monogram name={u.mentorName} size={54} bg={C.purple} color={C.white} radius={0} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{u.mentorName}</div>
              {u.mentorTitle && <div style={{ fontSize: 12.5, color: "#B5B3AE" }}>{u.mentorTitle}</div>}
              {u.mentorTier && <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.purple, padding: "4px 9px", marginTop: 7, fontFamily: F.mono, fontSize: 9, letterSpacing: 1 }}><Crown size={11} /> {u.mentorTier.toUpperCase()} MENTOR</div>}
            </div>
          </div>
          {/* Was a hard-coded "847 IMPACT · 11 GRADUATED" beside whoever the
              mentee's real mentor is — the mentor's own numbers attributed
              wrongly. Only the post count is knowable here. */}
          <div style={{ display: "flex", gap: 26, marginTop: 16 }}>
            <div><div style={{ fontSize: 20, fontWeight: 700, color: "#B7AFF2" }}>{feed.length}</div><div style={{ fontFamily: F.mono, fontSize: 8, color: "#8B8985", letterSpacing: 1 }}>POSTS</div></div>
          </div>
        </Card>

        {stage1 ? (
          <Card style={{ background: C.tealTint, border: "none", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><MessageCircle size={16} color={C.white} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.teal }}>Direct Connect · earned</div>
              <div style={{ fontSize: 12, color: C.teal, opacity: 0.85 }}>{first} replies within a day.</div>
            </div>
            <Btn small style={{ background: C.teal }} onClick={openDm}><MessageCircle size={13} /> Message</Btn>
          </Card>
        ) : (
          <Card style={{ border: "1.5px dashed #CFCDC7", background: "#EFEEEA" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 40, height: 40, background: "#E2E1DC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Lock size={16} color={C.gray} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Direct Connect is earned, not given</div>
                <div style={{ fontSize: 12.5, color: C.gray, marginTop: 2, lineHeight: 1.45 }}>The Orbit is open to you now — everything {first} posts, plus every resource. Finish Stage 1 and messaging unlocks too.</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}><Bar pct={0} /></div>
            <div style={{ fontFamily: F.mono, fontSize: 9.5, color: C.gray, marginTop: 5 }}>STAGE 1 · 0 OF 1 EXERCISES DONE</div>
            <Btn kind="dark" style={{ marginTop: 12 }} onClick={go}>Do today’s exercise · 6 min</Btn>
          </Card>
        )}

        <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4 }}>
          {[["feed", "Feed"], ["resources", `Resources · ${resources.length}`]].map(([id, l]) => (
            <button key={id} onClick={() => setView(id)} style={{ flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "9px 0", fontFamily: F.sans, fontWeight: 600, fontSize: 13, background: view === id ? C.white : "transparent", color: view === id ? C.ink : C.gray }}>{l}</button>
          ))}
        </div>

        {view === "feed" && feed.length === 0 && (
          <Card style={{ textAlign: "center", padding: 26 }}>
            <div style={{ fontSize: 13.5, color: C.gray, lineHeight: 1.5 }}>{first} hasn’t posted yet. Everything they share lands here first.</div>
          </Card>
        )}
        {view === "feed"
          ? feed.map(p => (
            <PostCard key={p.id} post={p} author={u.mentorName} tier
              reacted={!!reacted[p.id]} onReact={onReact}
              onOpen={() => onWatch(p.id, p.xp)} done={!!watched[p.id]} />
          ))
          : resources.map(p => {
            const meta = KIND_META[p.kind], Icon = meta.icon, done = watched[p.id];
            return (
              <Card key={p.id}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon size={16} color={meta.c} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.title}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: "#A5A39D", marginTop: 3 }}>{(p.mins || p.fileKind || "FILE").toUpperCase()} · {p.views} VIEWS</div>
                  </div>
                  <button onClick={() => onWatch(p.id, p.xp)} style={{ fontFamily: F.mono, fontSize: 10, fontWeight: 700, border: "none", cursor: "pointer", padding: "7px 10px", borderRadius: 10, background: done ? C.tealTint : meta.bg, color: done ? C.teal : meta.c, whiteSpace: "nowrap" }}>{done ? "✓ DONE" : `+${p.xp} XP`}</button>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
};
