import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Home, Heart, MessageCircle, User, Users, Search, Sparkles, Zap, Flame,
  Calendar, Check, ChevronRight, SlidersHorizontal, Radio,
} from "lucide-react";
import { C, F } from "../theme.js";
import { Card, Label, Btn, Avatar, FormError, firstNameOf, labelOf } from "../ui.jsx";
import { PostCard } from "../feed.jsx";
import { fetchOrgRoster, fetchOrgOrbit, postAction, messageFor } from "../lib/auth-client.js";
import { fmtDate } from "../lib/calendar.js";

/* ————————————————— RYZN FOR TEAMS · the employee app —————————————————

   The same account, the same data, a different shape. Somebody who belongs to
   an org is not on Ryzn-the-network browsing strangers; they are inside their
   company, under rules their HR set, with one thing to do next. That is a
   different product surface, so it is a different set of screens rather than
   the consumer app wearing a company name.

   What actually changes:

     the deck        /api/roster?scope=org — their colleagues, filtered by the
                     org's programme rules, which the server applies (see
                     api/roster.js). Nothing here re-implements a rule.
     the tabs        four, not five. Exercises, Badges and Meets fold into the
                     Home card and the profile — an employee gets one next step,
                     not a menu of five places to look.
     the frame       every screen is stamped with the org, because the whole
                     point is that this mentoring happens at work.

   What does not change: the account, the mentor pairing, the exercises, the
   Impact Score, the posts. Leaving an org drops someone back into the consumer
   app with all of it intact — see the `mode` switch in RyznApp.jsx.

   Everything on these screens is read from the API. There is no seeded org, no
   invented colleague and no placeholder number: an org that has invited nobody
   shows an empty roster and says so. */

export const TEAMS_NAV = {
  mentee: [["home", Home, "Home"], ["mentors", Heart, "Mentors"], ["chat", MessageCircle, "Chat"], ["profile", User, "Profile"]],
  mentor: [["home", Users, "Mentees"], ["roster", Search, "Roster"], ["chat", MessageCircle, "Chat"], ["profile", Sparkles, "Impact"]],
};

/** Tab ids that exist only in teams mode, so the shell can bounce a stale one.
    Switching org membership mid-session would otherwise leave `tab` pointing at
    a screen the current mode doesn't render, and the body would go blank. */
export const TEAMS_TABS = { mentee: ["home", "mentors", "chat", "profile"], mentor: ["home", "roster", "chat", "profile"] };

/* ————— frame ————— */

const Mono = ({ children, color = C.lilac, size = 9 }) => (
  <div style={{ fontFamily: F.mono, fontSize: size, letterSpacing: 1.1, color, textTransform: "uppercase" }}>{children}</div>
);

/** The org-stamped header every teams screen wears. Mentee side is purple,
    mentor side is ink — the same two-sided colour split the rest of the app
    already uses for "being helped" and "helping". */
export const TeamsHeader = ({ org, eyebrow, title, name, avatarUrl, onAvatar, dark, children }) => (
  <div style={{ background: dark ? C.ink : C.purple, color: C.white, padding: "16px 18px 14px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
      <div style={{ minWidth: 0 }}>
        <Mono>{eyebrow || org?.name || "Ryzn for Teams"}</Mono>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.5, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
      </div>
      <button onClick={onAvatar} title="Your profile"
        style={{ border: "2px solid rgba(255,255,255,.45)", background: "transparent", borderRadius: 13, padding: 2, cursor: "pointer", lineHeight: 0, flexShrink: 0 }}>
        <Avatar src={avatarUrl} name={name} size={34} radius={10} bg="rgba(255,255,255,.2)" color={C.white} />
      </button>
    </div>
    {children}
  </div>
);

/** Streak / XP / week, in the header rather than on three separate cards. Reads
    the same profile figures the consumer Home shows — a teams seat does not get
    its own scoreboard. */
const ProgressPill = ({ u, onOpen }) => (
  <button onClick={onOpen}
    style={{
      marginTop: 13, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      background: "rgba(255,255,255,.16)", border: "1px solid rgba(255,255,255,.26)", borderRadius: 14,
      padding: "10px 14px", cursor: "pointer", color: C.white, fontFamily: F.sans,
    }}>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12.5 }}>
      <Flame size={14} color="#FFB59B" /> {u.streak || 0} day{(u.streak || 0) === 1 ? "" : "s"}
    </span>
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 12.5 }}>
      <Zap size={14} color="#FFE0A3" /> {(u.xp || 0).toLocaleString()} XP
    </span>
    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,.82)" }}>Week {u.week || 1}</span>
    <ChevronRight size={15} color="rgba(255,255,255,.8)" />
  </button>
);

const Body = ({ children }) => (
  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
);

const Empty = ({ title, body, action }) => (
  <Card style={{ textAlign: "center", padding: 26 }}>
    <div style={{ fontSize: 17, fontWeight: 700 }}>{title}</div>
    <div style={{ fontSize: 13, color: C.gray, marginTop: 7, lineHeight: 1.55 }}>{body}</div>
    {action}
  </Card>
);

const Chip = ({ children, c = C.purple, bg = C.purpleTint }) => (
  <span style={{ fontFamily: F.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, color: c, background: bg, padding: "4px 8px", borderRadius: 6, whiteSpace: "nowrap" }}>{children}</span>
);

const Seg = ({ options, value, onChange }) => (
  <div style={{ display: "flex", background: "#EFEEEA", borderRadius: 12, padding: 4, gap: 4 }}>
    {options.map(([id, label]) => (
      <button key={id} onClick={() => onChange(id)} style={{
        flex: 1, border: "none", cursor: "pointer", borderRadius: 9, padding: "8px 0",
        fontFamily: F.sans, fontWeight: 600, fontSize: 12.5,
        background: value === id ? C.ink : "transparent", color: value === id ? C.white : C.gray,
      }}>{label}</button>
    ))}
  </div>
);

/* ————— mentee: home —————

   One card. The prototype's promise — "one step at a time, this is all you need
   to do right now" — only holds if the step is computed rather than listed, so
   this picks the single next real action from the account's actual state and
   renders nothing else.

   The ladder, in order of what genuinely blocks progress:
     1  someone asked for you            answer them
     2  no mentor yet                    go and find one
     3  first exercise not written       that is what unlocks Direct Connect
     4  a session proposal is waiting    confirm a time
     5  today's exercise not written     keep the streak
     6  nothing                          say so, and stop asking
*/
export const TeamsHome = ({ u, org, name, stage1, todayDone, matches = [], sessions = [], onOpen, go, onRespond, busy }) => {
  const invite = matches.find((m) => m.awaitingYou);
  const proposal = sessions.find((s) => s.awaitingYou);
  const next = sessions
    .filter((s) => s.status === "confirmed" && s.confirmedSlot?.start)
    .sort((a, b) => new Date(a.confirmedSlot.start) - new Date(b.confirmedSlot.start))[0];
  const mentorFirst = u.mentorName ? firstNameOf(u.mentorName) : null;

  const step = invite
    ? {
        key: `invite-${invite.id}`, tone: C.deep, who: invite.person?.name, whoLabel: "Asked for you",
        title: `${firstNameOf(invite.person?.name)} wants to mentor you`,
        why: `They read your goals before asking. Accepting opens their track and their library at ${org?.name || "work"}.`,
        action: (
          <div style={{ display: "flex", gap: 8 }}>
            <Btn kind="ghost" style={{ flex: 0.6, borderColor: C.line, color: C.gray }} disabled={busy}
              onClick={() => onRespond(invite.id, "decline")}>Pass</Btn>
            <Btn style={{ flex: 1 }} disabled={busy} onClick={() => onRespond(invite.id, "accept")}>Accept</Btn>
          </div>
        ),
      }
    : !u.mentorName
      ? {
          key: "find", tone: C.purple, whoLabel: org?.name, who: "Nobody yet",
          title: "Find your mentor",
          why: `Browse the mentors at ${org?.name || "your company"} and apply to one. Three quick questions, and they answer in their own time.`,
          action: <Btn onClick={() => go("mentors")}>Browse mentors</Btn>,
        }
      : !stage1
        ? {
            key: "stage1", tone: C.purple, who: u.mentorName, whoLabel: "For your mentor",
            title: "Write your first exercise",
            why: `A short piece ${mentorFirst} reads before your first session. Finishing it opens Direct Connect with them.`,
            unlocks: [[MessageCircle, `Chat with ${mentorFirst}`], [Calendar, "Session booking"]],
            action: <Btn onClick={() => onOpen("exercises")}>Start · +25 XP</Btn>,
          }
        : proposal
          ? {
              key: `session-${proposal.id}`, tone: C.deep, who: proposal.person?.name, whoLabel: "Waiting on you",
              title: "Confirm your session",
              why: `${firstNameOf(proposal.person?.name)} sent ${proposal.slots?.length || "some"} time${(proposal.slots?.length || 0) === 1 ? "" : "s"}. Pick the one that works.`,
              action: <Btn onClick={() => onOpen("sessions")}>Review the times</Btn>,
            }
          : !todayDone
            ? {
                key: "today", tone: C.ink, who: u.mentorName, whoLabel: "With",
                title: "Today’s exercise",
                why: `Keeps your ${u.streak || 0}-day streak alive. ${mentorFirst} reads what you write.`,
                action: <Btn onClick={() => onOpen("exercises")}>Start · +25 XP</Btn>,
              }
            : null;

  return (
    <div>
      <TeamsHeader org={org} eyebrow={`${org?.name || "Ryzn"} · mentee`} title={`Hi, ${firstNameOf(name)}`}
        name={name} avatarUrl={u.avatarUrl} onAvatar={() => go("profile")}>
        <ProgressPill u={u} onOpen={() => onOpen("badges")} />
      </TeamsHeader>

      <Body>
        {step ? (
          <Card key={step.key} style={{ padding: 0, overflow: "hidden", border: `1.5px solid ${C.purple}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: step.tone }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Mono color="rgba(255,255,255,.75)" size={8}>{step.whoLabel}</Mono>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.white, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{step.who || "—"}</div>
              </div>
            </div>
            <div style={{ padding: "16px 16px 18px" }}>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.4 }}>{step.title}</div>
              <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.55, marginTop: 7 }}>{step.why}</div>
              {step.unlocks && (
                <div style={{ marginTop: 13, background: C.surface, borderRadius: 12, padding: "11px 13px" }}>
                  <Label>Finishing this unlocks</Label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {step.unlocks.map(([Icon, label]) => (
                      <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.white, border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 9px", fontSize: 10.5, fontWeight: 600 }}>
                        <Icon size={11} color={C.purple} />{label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 14 }}>{step.action}</div>
              <div style={{ fontSize: 10.5, color: C.mute, marginTop: 9, textAlign: "center" }}>
                One step at a time. This is all you need to do right now.
              </div>
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 22, border: `1.5px solid ${C.teal}`, background: C.tealTint, textAlign: "center" }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: C.white, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}>
              <Check size={22} color={C.teal} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.teal, marginTop: 12 }}>That’s everything for today</div>
            <div style={{ fontSize: 13, color: C.teal, marginTop: 6 }}>
              Streak safe at {u.streak || 0} day{(u.streak || 0) === 1 ? "" : "s"}. See you tomorrow.
            </div>
            {u.mentorId && (
              <Btn small kind="ghost" style={{ marginTop: 14, background: C.white, borderColor: C.teal, color: C.teal }}
                onClick={() => onOpen("orbit")}>Read {mentorFirst}’s library</Btn>
            )}
          </Card>
        )}

        {next && (
          <Card style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }} onClick={() => onOpen("sessions")}>
            <Calendar size={15} color={C.purple} />
            <span style={{ flex: 1, fontSize: 12.5 }}>
              {fmtDate(next.confirmedSlot.start)} · with {firstNameOf(next.person?.name)}
            </span>
            <Chip c={C.teal} bg={C.tealTint}>CONFIRMED</Chip>
          </Card>
        )}
      </Body>
    </div>
  );
};

/* ————— the org deck —————

   One hook for both sides. The rules that narrow this list are applied by the
   server; what arrives back is what this person is allowed to see, plus the
   rules themselves so the deck can say why it is short. */
function useOrgRoster({ side, include, enabled = true }) {
  const [state, setState] = useState({ loading: true, people: [], org: null, rules: {}, error: null });
  const load = useCallback(() => {
    if (!enabled) return;
    setState((s) => ({ ...s, loading: true }));
    // `undefined`, not null — the query builder drops undefined and would
    // otherwise put a literal `side=null` on the URL.
    fetchOrgRoster({ side: side || undefined, include: include || undefined })
      .then((res) => setState({
        loading: false, error: null,
        people: Array.isArray(res.people) ? res.people : [],
        org: res.org || null, rules: res.rules || {},
      }))
      .catch((e) => setState({ loading: false, people: [], org: null, rules: {}, error: messageFor(e, "Couldn’t load your organisation’s roster.") }));
  }, [side, include, enabled]);
  useEffect(load, [load]);
  return { ...state, reload: load };
}

/** Why the deck is narrower than the whole company, said out loud. A rule that
    silently removes people is indistinguishable from an empty org. */
const RuleChips = ({ rules, org }) => {
  const chips = [
    !rules.crossDivision && org?.division && [`${org.division} only`, C.amber, C.amberTint],
    rules.capacityGate && ["Hiding full mentors", C.teal, C.tealTint],
  ].filter(Boolean);
  if (!chips.length) return null;
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {chips.map(([label, c, bg]) => <Chip key={label} c={c} bg={bg}>{label}</Chip>)}
    </div>
  );
};

const PersonRow = ({ p, right, onClick }) => (
  <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", cursor: onClick ? "pointer" : "default" }}>
    <Avatar src={p.avatarUrl} name={p.name} size={38} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 600, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.mute, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {[p.headline, p.division].filter(Boolean).join(" · ").toUpperCase() || "—"}
      </div>
    </div>
    {right}
  </div>
);

/* ————— mentee: mentors ————— */
export const TeamsMentors = ({ u, org, name, onDecide, onOpenMentor, onOpen, toast, seatsLeft }) => {
  const [view, setView] = useState(u.mentorName ? "mine" : "discover");
  const [division, setDivision] = useState("All");
  const [showFilter, setShowFilter] = useState(false);
  const [busy, setBusy] = useState(false);
  const { loading, people, org: orgInfo, rules, error, reload } = useOrgRoster({ side: null });

  const divisions = ["All", ...(orgInfo?.divisions || [])];
  const deck = useMemo(
    () => people.filter((p) => division === "All" || p.division === division),
    [people, division]
  );

  const apply = async (p) => {
    if (busy) return;
    if (seatsLeft <= 0) { toast("All 3 mentor seats are held"); return; }
    setBusy(true);
    try {
      const res = await onDecide(p, "request");
      toast(res?.match?.status === "accepted" ? `You’re matched with ${firstNameOf(p.name)}` : `Applied to ${firstNameOf(p.name)}`);
      reload();
    } catch (e) {
      toast(e.message || "Couldn’t send that.");
    } finally { setBusy(false); }
  };

  const pass = async (p) => {
    if (busy) return;
    setBusy(true);
    try { await onDecide(p, "pass"); reload(); }
    catch (e) { toast(e.message || "Couldn’t save that."); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <TeamsHeader org={org} eyebrow={`${org?.name || "Ryzn"} · mentors`} title="Mentors"
        name={name} avatarUrl={u.avatarUrl} onAvatar={() => onOpen("profile")} />
      <Body>
        <Seg value={view} onChange={setView}
          options={[["discover", "Discover"], ["mine", "My mentor"], ["orbit", "Orbit"]]} />

        {view === "orbit" && <OrgOrbit org={org} toast={toast} />}

        {view === "mine" && (
          u.mentorName ? (
            <>
              <Card onClick={() => onOpenMentor({ id: u.mentorId, name: u.mentorName, headline: u.mentorTitle, avatarUrl: u.mentorAvatarUrl, tier: u.mentorTier, matchState: "accepted" })}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar src={u.mentorAvatarUrl} name={u.mentorName} size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{u.mentorName}</div>
                    <div style={{ fontFamily: F.mono, fontSize: 9, color: C.mute, marginTop: 3 }}>
                      {(u.mentorTitle || "YOUR MENTOR").toUpperCase()}
                    </div>
                  </div>
                  <ChevronRight size={18} color={C.mute} />
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <Btn small kind="soft" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onOpen("orbit"); }}>Library</Btn>
                  <Btn small style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); onOpen("dm"); }}>
                    <MessageCircle size={13} /> Message
                  </Btn>
                </div>
              </Card>
              {(u.supportMentors || []).length > 0 && (
                <Card>
                  <Label>Also supporting you</Label>
                  {(u.supportMentors || []).map((m) => <PersonRow key={m.id} p={m} />)}
                </Card>
              )}
            </>
          ) : (
            <Empty title="No mentor yet."
              body={`Apply to someone from Discover. They see your goals and answer in their own time.`}
              action={<Btn style={{ marginTop: 16 }} onClick={() => setView("discover")}>Browse mentors</Btn>} />
          )
        )}

        {view === "discover" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1 }}><RuleChips rules={rules} org={orgInfo} /></div>
              {divisions.length > 1 && (
                <button onClick={() => setShowFilter((v) => !v)} style={{
                  position: "relative", border: `1.5px solid ${division !== "All" ? C.purple : C.line}`, background: C.white,
                  borderRadius: 10, width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <SlidersHorizontal size={16} color={division !== "All" ? C.purple : C.gray} />
                </button>
              )}
            </div>

            {showFilter && divisions.length > 1 && (
              <Card>
                <Label>Division</Label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {divisions.map((d) => (
                    <button key={d} onClick={() => { setDivision(d); setShowFilter(false); }} style={{
                      border: `1px solid ${division === d ? C.purple : C.line}`, background: division === d ? C.purpleTint : C.white,
                      color: division === d ? C.purple : C.ink, borderRadius: 9, padding: "7px 11px", cursor: "pointer",
                      fontFamily: F.sans, fontSize: 12.5, fontWeight: 600,
                    }}>{d}</button>
                  ))}
                </div>
              </Card>
            )}

            <FormError>{error}</FormError>

            {loading && <Card style={{ padding: 22, textAlign: "center", fontFamily: F.mono, fontSize: 11, color: C.gray, letterSpacing: 1 }}>LOADING…</Card>}

            {!loading && !error && deck.length === 0 && (
              <Empty
                title={people.length === 0 ? `No mentors at ${org?.name || "your company"} yet.` : "Nothing left under these filters."}
                body={people.length === 0
                  ? "Your admin invites mentors from the org console. You’ll see them here the moment they claim their seat — your exercises are open in the meantime."
                  : rules.crossDivision === false
                    ? "Your org limits matching to your own division. Ask your admin to widen it, or clear the division filter."
                    : "Widen the filter to see the rest of the roster."}
                action={division !== "All" ? <Btn small kind="ghost" style={{ marginTop: 14 }} onClick={() => setDivision("All")}>Clear filter</Btn> : null}
              />
            )}

            {deck.map((p) => (
              <Card key={p.id} style={{ padding: 0, overflow: "hidden" }}>
                <div onClick={() => onOpenMentor(p)} style={{ padding: 16, cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar src={p.avatarUrl} name={p.name} size={52} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16.5, fontWeight: 700, letterSpacing: -0.3 }}>{p.name}</div>
                      <div style={{ fontFamily: F.mono, fontSize: 9, color: C.mute, marginTop: 3 }}>
                        {[p.headline, p.division].filter(Boolean).join(" · ").toUpperCase() || "MENTOR"}
                      </div>
                    </div>
                  </div>
                  {p.why && <div style={{ fontSize: 13, color: C.gray, lineHeight: 1.55, marginTop: 11 }}>{p.why}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 11 }}>
                    {(p.expertise || []).slice(0, 3).map((x) => <Chip key={x} c={C.gray} bg={C.surface}>{x}</Chip>)}
                    {p.affinity?.shared > 0 && <Chip c={C.teal} bg={C.tealTint}>{p.affinity.shared} shared</Chip>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
                  <Btn small kind="ghost" style={{ flex: 0.6, borderColor: C.line, color: C.gray }} disabled={busy} onClick={() => pass(p)}>Pass</Btn>
                  <Btn small style={{ flex: 1.4 }} disabled={busy} onClick={() => apply(p)}>Apply to {firstNameOf(p.name)}</Btn>
                </div>
              </Card>
            ))}
          </>
        )}
      </Body>
    </div>
  );
};

/* ————— mentor: mentees ————— */
export const TeamsCohort = ({ u, org, name, matches = [], sessions = [], onRespond, onOpenMentee, onOpen, busy, capacity }) => {
  const inbox = matches.filter((m) => m.awaitingYou);
  const cohort = u.cohort || [];
  const proposals = sessions.filter((s) => s.awaitingYou);
  const seatsLeft = Math.max(0, (capacity ?? 4) - cohort.length);

  return (
    <div>
      <TeamsHeader dark org={org} eyebrow={`${org?.name || "Ryzn"} · mentor`} title="Your mentees"
        name={name} avatarUrl={u.avatarUrl} onAvatar={() => onOpen("profile")} />
      <Body>
        {inbox.length > 0 && (
          <Card style={{ border: `1.5px solid ${C.amber}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Label color={C.amber}>Applications</Label>
              <Chip c={C.amber} bg={C.amberTint}>{inbox.length} NEW</Chip>
            </div>
            {inbox.map((m) => (
              <div key={m.id} style={{ borderTop: `1px solid ${C.line}`, paddingTop: 11, marginTop: 11 }}>
                <PersonRow p={{ ...m.person, headline: m.person?.headline || labelOf(m.person?.track) }} />
                {(m.person?.goals || []).slice(0, 2).map((g) => (
                  <div key={g} style={{ fontSize: 12.5, color: C.gray, lineHeight: 1.5, borderLeft: `2px solid ${C.purple}`, paddingLeft: 10, marginTop: 6 }}>{g}</div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
                  <Btn small kind="ghost" style={{ flex: 0.6, borderColor: C.line, color: C.gray }} disabled={busy} onClick={() => onRespond(m.id, "decline")}>Pass</Btn>
                  <Btn small style={{ flex: 1 }} disabled={busy || seatsLeft <= 0} onClick={() => onRespond(m.id, "accept")}>
                    {seatsLeft <= 0 ? "Cohort full" : "Accept"}
                  </Btn>
                </div>
              </div>
            ))}
          </Card>
        )}

        {proposals.length > 0 && (
          <Card onClick={() => onOpen("sessions")} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px" }}>
            <Calendar size={16} color={C.purple} />
            <span style={{ flex: 1, fontSize: 13 }}>
              {proposals.length} session{proposals.length === 1 ? "" : "s"} waiting on your answer
            </span>
            <ChevronRight size={16} color={C.mute} />
          </Card>
        )}

        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "13px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between" }}>
            <Label>Cohort · {cohort.length}</Label>
            <Label color={seatsLeft ? C.teal : C.coral}>{seatsLeft} SEAT{seatsLeft === 1 ? "" : "S"} FREE</Label>
          </div>
          {cohort.length === 0 ? (
            <div style={{ padding: 20, fontSize: 13, color: C.gray, lineHeight: 1.55 }}>
              Nobody yet. People at {org?.name || "your company"} find you from their Mentors tab — or invite someone
              yourself from the Roster.
            </div>
          ) : (
            <div style={{ padding: "0 16px" }}>
              {cohort.map((m) => (
                <PersonRow key={m.id} p={{ ...m, headline: m.headline || (m.week ? `Week ${m.week}` : null) }}
                  onClick={() => onOpenMentee(m)}
                  right={<ChevronRight size={16} color={C.mute} />} />
              ))}
            </div>
          )}
        </Card>
      </Body>
    </div>
  );
};

/* ————— mentor: the roster ————— */
export const TeamsRoster = ({ u, org, name, onOpen, onOpenMentor, onInvite, toast, cohortSeatsLeft }) => {
  const [view, setView] = useState("mentors");
  const mentors = useOrgRoster({ side: "mentors", enabled: view === "mentors" });
  /* A directory, not a deck: `include=all` keeps the people this mentor has
     already answered for, tagged with their state, so their own cohort doesn't
     vanish from the roster of their own company. */
  const mentees = useOrgRoster({ include: "all", enabled: view === "mentees" });
  const [busy, setBusy] = useState(false);
  const active = view === "mentors" ? mentors : mentees;

  const invite = async (p) => {
    if (busy) return;
    if (cohortSeatsLeft <= 0) { toast("Your cohort is full"); return; }
    setBusy(true);
    try { await onInvite(p); active.reload(); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <TeamsHeader dark org={org} eyebrow={`${org?.name || "Ryzn"} · roster`} title="The Roster"
        name={name} avatarUrl={u.avatarUrl} onAvatar={() => onOpen("profile")} />
      <Body>
        <Card style={{ background: C.deep, border: "none", color: C.white }}>
          <Mono>{org?.name} · Ryzn for Teams</Mono>
          <div style={{ fontSize: 16.5, fontWeight: 700, marginTop: 7, lineHeight: 1.4 }}>
            {active.loading ? "Counting your people…" : `${active.people.length} ${view === "mentors" ? "mentor" : "mentee"}${active.people.length === 1 ? "" : "s"} you can reach here.`}
          </div>
          <div style={{ fontSize: 12.5, color: "#C9C6DE", marginTop: 6, lineHeight: 1.5 }}>
            Everyone on this list holds a seat at {org?.name || "your company"}. Nobody outside it appears.
          </div>
        </Card>

        <Seg value={view} onChange={setView} options={[["mentors", "Mentors"], ["mentees", "Mentees"]]} />

        <FormError>{active.error}</FormError>
        {active.loading && <Card style={{ padding: 22, textAlign: "center", fontFamily: F.mono, fontSize: 11, color: C.gray, letterSpacing: 1 }}>LOADING…</Card>}

        {!active.loading && !active.error && active.people.length === 0 && (
          <Empty
            title={view === "mentors" ? "No other mentors here yet." : "No mentees here yet."}
            body={view === "mentors"
              ? `You’re the first mentor seated at ${org?.name || "this org"}. Your admin can invite more from the org console.`
              : `Nobody at ${org?.name || "this org"} has finished setup yet. They appear the moment they do.`} />
        )}

        {active.people.length > 0 && (
          <Card>
            <RuleChips rules={active.rules} org={active.org} />
            {active.people.map((p) => (
              <PersonRow key={p.id} p={p}
                onClick={view === "mentors" ? () => onOpenMentor(p) : undefined}
                right={view === "mentees" && p.matchState === "none"
                  ? <Btn small kind="soft" disabled={busy} onClick={() => invite(p)}>Invite</Btn>
                  : p.matchState === "accepted"
                    ? <Chip c={C.teal} bg={C.tealTint}>YOURS</Chip>
                    : p.matchState && p.matchState !== "none"
                      ? <Chip c={C.amber} bg={C.amberTint}>PENDING</Chip>
                      : <ChevronRight size={16} color={C.mute} />} />
            ))}
          </Card>
        )}

        <OrgOrbit org={org} toast={toast} />
      </Body>
    </div>
  );
};

/* ————— the org feed —————
   Closed until an org manager opens it, and empty until somebody publishes.
   Both are real states with their own copy: an org that has not activated its
   Orbit is not an org whose people have written nothing. */
const OrgOrbit = ({ org, toast }) => {
  const [state, setState] = useState({ loading: true, posts: [], error: null });
  const [reacted, setReacted] = useState({});
  const [opened, setOpened] = useState({});

  useEffect(() => {
    let dead = false;
    if (!org?.orbitActive) { setState({ loading: false, posts: [], error: null }); return; }
    fetchOrgOrbit()
      .then((res) => {
        if (dead) return;
        setState({ loading: false, posts: res.posts || [], error: null });
        setReacted(Object.fromEntries((res.viewerState?.reacted || []).map((id) => [id, true])));
        setOpened(Object.fromEntries((res.viewerState?.watched || []).map((id) => [id, true])));
      })
      .catch((e) => { if (!dead) setState({ loading: false, posts: [], error: messageFor(e, "Couldn’t load the Orbit.") }); });
    return () => { dead = true; };
  }, [org?.orbitActive]);

  /* Both handlers are load-bearing, not decoration: PostCard calls `onOpen`
     unguarded for a colleague's video or resource, so a feed rendered without
     one throws the moment somebody taps Watch. */
  const react = async (id) => {
    if (reacted[id]) return { already: true };
    setReacted((r) => ({ ...r, [id]: true }));
    try {
      const res = await postAction(id, "react");
      if (res?.self) { setReacted((r) => { const n = { ...r }; delete n[id]; return n; }); return res; }
      setState((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, reactions: (p.reactions ?? 0) + 1 } : p)) }));
      return res;
    } catch (e) {
      setReacted((r) => { const n = { ...r }; delete n[id]; return n; });
      throw e;
    }
  };

  const open = async (post) => {
    if (opened[post.id]) return;
    setOpened((o) => ({ ...o, [post.id]: true }));
    try {
      const { xp } = await postAction(post.id, "view");
      if (xp) toast?.(`+${xp} XP · reviewed`);
    } catch (e) {
      setOpened((o) => { const n = { ...o }; delete n[post.id]; return n; });
      toast?.(messageFor(e, "Couldn’t open that."));
    }
  };

  if (!org?.orbitActive) {
    return (
      <Card style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
        <Radio size={17} color={C.mute} style={{ marginTop: 2, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>The {org?.name} Orbit is closed</div>
          <div style={{ fontSize: 12.5, color: C.gray, marginTop: 5, lineHeight: 1.5 }}>
            Your org admin opens it. Once it’s open, everything your colleagues publish to their profiles lands here.
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <FormError>{state.error}</FormError>
      {state.loading && <Card style={{ padding: 20, textAlign: "center", fontFamily: F.mono, fontSize: 11, color: C.gray, letterSpacing: 1 }}>LOADING THE ORBIT…</Card>}
      {!state.loading && !state.error && state.posts.length === 0 && (
        <Empty title="Nothing in the Orbit yet."
          body={`It fills up as people at ${org?.name || "your company"} publish to their profiles.`} />
      )}
      {state.posts.map((p) => (
        <PostCard key={p.id} post={p} author={p.authorName} authorId={p.authorId}
          reacted={!!reacted[p.id]} onReact={react}
          done={!!opened[p.id]} onOpen={open} toast={toast} />
      ))}
    </>
  );
};

/* ————— chat —————
   Direct Connect, listed. A thread exists because a pairing was accepted — the
   list is the accepted matches and nothing else, so there is no thread here
   that the server would refuse to open. */
export const TeamsChat = ({ u, org, name, role, matches = [], stage1, onOpenThread, onOpen }) => {
  const threads = matches.filter((m) => m.status === "accepted");
  const locked = role === "mentee" && !stage1;

  return (
    <div>
      <TeamsHeader dark={role === "mentor"} org={org} eyebrow={`${org?.name || "Ryzn"} · direct connect`} title="Messages"
        name={name} avatarUrl={u.avatarUrl} onAvatar={() => onOpen("profile")} />
      <Body>
        {locked && (
          <Card style={{ background: C.amberTint, border: "none" }}>
            <Label color={C.amber}>Not open yet</Label>
            <div style={{ fontSize: 13, color: C.ink, marginTop: 7, lineHeight: 1.55 }}>
              Direct Connect opens when you finish your first exercise — it’s what gives your mentor
              something to reply to.
            </div>
            <Btn small style={{ marginTop: 13 }} onClick={() => onOpen("exercises")}>Write it now</Btn>
          </Card>
        )}
        {threads.length === 0 ? (
          <Empty title="No conversations yet."
            body={role === "mentee"
              ? "A thread opens the moment a mentor accepts you."
              : "A thread opens the moment you accept a mentee."} />
        ) : (
          <Card style={{ padding: "0 16px" }}>
            {threads.map((m) => (
              <PersonRow key={m.id} p={{ ...m.person, headline: m.person?.headline || labelOf(m.person?.track) }}
                onClick={locked ? undefined : () => onOpenThread(m.person)}
                right={locked
                  ? <Chip c={C.mute} bg={C.surface}>LOCKED</Chip>
                  : <ChevronRight size={16} color={C.mute} />} />
            ))}
          </Card>
        )}
      </Body>
    </div>
  );
};

/* The org console is reached the same way in both modes — the gear on the
   profile, then the organisation row in Settings (app-shared.jsx). Belonging to
   an org shapes the default surface; it never walls the account in. */
