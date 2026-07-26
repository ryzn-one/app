import React, { useState, useMemo, useRef, useEffect } from "react";
import { LayoutDashboard, Users, FolderKanban, CalendarDays, Send, Settings, Home, Heart, MessageCircle, User, ChevronLeft, Plus, X, Check, Lock, Search, Building2, Sparkles, ArrowRight, Copy, Bell, SlidersHorizontal, Flame, Zap, ChevronRight, ExternalLink, LogOut, Eye, EyeOff } from "lucide-react";

/* ================= RYZN FOR TEAMS · production-style demo ================= */

import { T, S, DIV_COLORS } from "./theme.js";
import { PHOTOS, ph1, initsOf, MAYA_PHOTO_OPTS, RITWIK_PHOTO_OPTS } from "./media.js";
import { MENTORS, MENTEES, LOCAL_MENTEES, STAGE1, COMMUNITY, COHORT_FEED, BADGES,
  SEED_DIVISIONS, SEED_PROGRAMS, SEED_SESSIONS, SEED_INVITES, DEPT_STATS, AT_RISK_INIT,
  genCode, JOIN_PHOTOS, FOCUS_OPTS, SEED_REQUESTS, SEED_CHAT } from "./data.js";
import {
  DEMO_ACCOUNTS, authenticate, loadSession, saveSession, loadPhase, savePhase,
  loadOrg, saveOrg, loadSettings, saveSettings, loadInvites, saveInvites,
  loadPrograms, savePrograms, loadSessions, saveSessions, clearTeamsStore,
  genMentorInviteCode, buildInviteUrl, copyText,
} from "./store.js";

/* ---------- primitives ---------- */
const Chip = ({c=T.purple,bg=T.ptint,children,style,onClick}) => (
  <span onClick={onClick} style={{...S.mono(8.5,c),background:bg,padding:"4px 9px",borderRadius:7,fontWeight:700,cursor:onClick?"pointer":"default",display:"inline-block",...style}}>{children}</span>
);
const Dia = ({c=T.purple,s=10,style}) => <span style={{width:s,height:s,background:c,transform:"rotate(45deg)",display:"inline-block",flexShrink:0,...style}}/>;
const Bar = ({pct,c=T.teal,h=6}) => (
  <div style={{height:h,background:"#E6E5E1",borderRadius:h/2,overflow:"hidden"}}>
    <div style={{width:`${Math.min(100,pct)}%`,height:"100%",background:c,transition:"width .5s ease"}}/>
  </div>
);
const Btn = ({onClick,children,kind="solid",style,small,disabled}) => (
  <button disabled={disabled} onClick={onClick} style={{
    fontFamily:T.sans,fontWeight:600,fontSize:small?12:13.5,cursor:disabled?"default":"pointer",opacity:disabled?.5:1,
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,
    padding:small?"8px 13px":"12px 18px",borderRadius:11,border:"none",transition:"transform .1s",
    ...(kind==="solid"?{background:T.purple,color:"#fff"}:
       kind==="ink"?{background:T.ink,color:"#fff"}:
       kind==="teal"?{background:T.ttint,color:T.teal}:
       kind==="danger"?{background:T.ctint,color:T.coral}:
       {background:"#fff",color:T.ink,border:`1.5px solid ${T.line}`}),...style}}>{children}</button>
);
const Toggle = ({on,onChange}) => (
  <div onClick={()=>onChange(!on)} style={{width:38,height:22,borderRadius:11,background:on?T.teal:"#D5D4D0",position:"relative",cursor:"pointer",transition:"background .2s",flexShrink:0}}>
    <div style={{width:16,height:16,borderRadius:"50%",background:"#fff",position:"absolute",top:3,left:on?19:3,transition:"left .2s"}}/>
  </div>
);
const Seg = ({options,value,onChange,small}) => (
  <div style={{display:"inline-flex",background:"#EFEEEA",borderRadius:10,padding:3,gap:2,flexWrap:"wrap"}}>
    {options.map(o=>(
      <button key={o} onClick={()=>onChange(o)} style={{fontFamily:T.sans,fontWeight:600,fontSize:small?10.5:12,
        padding:small?"5px 10px":"7px 12px",border:"none",borderRadius:8,cursor:"pointer",
        background:value===o?T.ink:"transparent",color:value===o?"#fff":T.gray,transition:"all .15s"}}>{o}</button>
    ))}
  </div>
);
function Ava({init,c=T.deep,s=36,fs=13,src}){
  const list = Array.isArray(src) ? src : src ? [src] : [];
  const [idx,setIdx]=useState(0);
  return (
    <div style={{width:s,height:s,borderRadius:s*0.3,background:c,display:"flex",alignItems:"center",justifyContent:"center",
      fontFamily:T.sans,fontWeight:700,fontSize:fs,color:"#fff",flexShrink:0,overflow:"hidden"}}>
      {idx<list.length ? <img src={list[idx]} alt={init} onError={()=>setIdx(i=>i+1)} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : init}
    </div>);
}
const Field = ({label,children}) => (
  <div><div style={{...S.mono(8.5,T.gray),marginBottom:7}}>{label}</div>{children}</div>
);
const Modal = ({title,onClose,children,width=430}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(26,26,26,.45)",zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
    <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width,maxWidth:"100%",maxHeight:"86vh",overflowY:"auto",padding:22}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={S.h(17)}>{title}</div>
        <button onClick={onClose} style={{border:"none",background:T.surface,borderRadius:9,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={15}/></button>
      </div>
      {children}
    </div>
  </div>
);
const Toast = ({msg}) => !msg?null:(
  <div style={{position:"fixed",bottom:22,left:"50%",transform:"translateX(-50%)",background:T.ink,color:"#fff",
    fontFamily:T.sans,fontSize:13,fontWeight:600,padding:"12px 18px",borderRadius:12,zIndex:99,maxWidth:"90vw",
    boxShadow:"0 12px 30px rgba(0,0,0,.25)"}}>{msg}</div>
);

/* ================= SEAT LOGIN (demo credentials that feel real) ================= */
function SeatLogin({ expectedRole, org, onSuccess, onBack, toast }) {
  const account = DEMO_ACCOUNTS.find(a => a.role === expectedRole) || DEMO_ACCOUNTS[0];
  const [email, setEmail] = useState(account.email);
  const [pw, setPw] = useState(account.password);
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  const submit = () => {
    const session = authenticate(email, pw);
    if (!session) { setErr("Email or password doesn't match."); return; }
    saveSession(session);
    toast(`Signed in as ${session.name}`);
    onSuccess(session);
  };

  return (
    <div style={{minHeight:"70vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:420,maxWidth:"100%",background:"#fff",border:`1px solid ${T.line}`,borderRadius:20,padding:24}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
          {onBack && <button onClick={onBack} style={{border:"none",background:T.surface,borderRadius:9,width:30,height:30,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={16}/></button>}
          <div style={{fontFamily:T.sans,fontWeight:700,fontSize:20,letterSpacing:"-0.03em"}}>RYZN</div>
          <Chip>FOR TEAMS</Chip>
        </div>
        <div style={S.mono(8.5,T.purple)}>{org?.name?.toUpperCase() || "NORTHBOUND BANK"} · SIGN IN</div>
        <div style={{...S.h(22),marginTop:8}}>Welcome back, {account.name.split(" ")[0]}.</div>
        <div style={{...S.b(13,T.gray),marginTop:6}}>Use your work credentials to open the {account.label.toLowerCase()} seat.</div>

        <div style={{marginTop:18,display:"flex",flexDirection:"column",gap:12}}>
          <Field label="WORK EMAIL">
            <input style={S.input} value={email} onChange={e=>{ setEmail(e.target.value); setErr(""); }} autoComplete="username"/>
          </Field>
          <Field label="PASSWORD">
            <div style={{position:"relative"}}>
              <input style={{...S.input,paddingRight:42}} type={show?"text":"password"} value={pw} onChange={e=>{ setPw(e.target.value); setErr(""); }} autoComplete="current-password"/>
              <button type="button" onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:10,border:"none",background:"none",cursor:"pointer",padding:4}}>
                {show ? <EyeOff size={16} color={T.gray}/> : <Eye size={16} color={T.gray}/>}
              </button>
            </div>
          </Field>
          {err && <div style={{...S.b(12.5,T.coral),fontWeight:600}}>{err}</div>}
          <Btn style={{width:"100%"}} onClick={submit}><Lock size={14}/> Sign in to {account.label}</Btn>
        </div>

        <div style={{marginTop:16,background:T.surface,border:`1px solid ${T.line}`,borderRadius:12,padding:12}}>
          <div style={S.mono(7.5,T.mute)}>DEMO CREDENTIALS · PILOT</div>
          {DEMO_ACCOUNTS.map(a=>(
            <div key={a.email} style={{display:"flex",justifyContent:"space-between",gap:8,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <div>
                <div style={{...S.b(12,T.ink),fontWeight:600}}>{a.label}</div>
                <div style={S.mono(8,T.gray)}>{a.email}</div>
              </div>
              <button onClick={()=>{ setEmail(a.email); setPw(a.password); setErr(""); toast(`${a.label} credentials filled`); }}
                style={{border:"none",background:T.ptint,color:T.purple,borderRadius:8,padding:"6px 10px",cursor:"pointer",fontFamily:T.sans,fontWeight:600,fontSize:11}}>
                Use
              </button>
            </div>
          ))}
          <div style={{...S.b(10.5,T.mute),marginTop:8,fontStyle:"italic"}}>Passwords: Northbound2026! · RitwikPath26! · MayaRise26!</div>
        </div>
      </div>
    </div>
  );
}

/* ================= ONBOARDING: request code → register → setup ================= */
function Onboarding({ onDone, toast }) {
  const [step, setStep] = useState("landing"); // landing | code | register | setup
  const [email, setEmail] = useState("");
  const [sentCode] = useState(genCode("ORG"));
  const [codeIn, setCodeIn] = useState("");
  const [org, setOrg] = useState({ name:"", industry:"Technology", size:"200-1,000", admin:"" });
  const [divs, setDivs] = useState(SEED_DIVISIONS);
  const [divIn, setDivIn] = useState("");
  const [setupStep, setSetupStep] = useState(0);
  const [rules, setRules] = useState({ levelGate:true, crossDiv:true, leaderboard:"Department", capMode:"Deep" });
  const [prog, setProg] = useState({ name:"Q3 Mentors", weeks:"12" });

  const Shell = ({kicker, title, sub, children, back}) => (
    <div style={{minHeight:"100vh",background:T.purple,display:"flex",alignItems:"center",justifyContent:"center",padding:20,position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",width:220,height:220,background:T.deep,transform:"rotate(45deg)",top:-70,right:-40,opacity:.6}}/>
      <div style={{position:"absolute",width:150,height:150,background:T.deep,transform:"rotate(45deg)",bottom:40,right:90,opacity:.4}}/>
      <div style={{width:480,maxWidth:"100%",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:22}}>
          {back && <button onClick={back} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:9,width:30,height:30,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={16}/></button>}
          <span style={{fontFamily:T.sans,fontWeight:700,fontSize:20,color:"#fff",letterSpacing:"-0.03em"}}>RYZN</span>
          <span style={{...S.mono(8.5,T.lilac)}}>FOR TEAMS</span>
        </div>
        <div style={{...S.mono(9,T.lilac)}}>{kicker}</div>
        <div style={{...S.h(30,"#fff"),marginTop:8}}>{title}</div>
        {sub && <div style={{...S.b(14,"#DDD9F6"),marginTop:10}}>{sub}</div>}
        <div style={{background:"#fff",borderRadius:20,padding:22,marginTop:20}}>{children}</div>
      </div>
    </div>
  );

  if (step==="landing") return (
    <Shell kicker="Invitation-first, like everything Ryzn" title="Bring Ryzn to your organization."
      sub="Request an invite code for your company. We review every org so the network stays high-trust.">
      <Field label="WORK EMAIL">
        <input style={S.input} placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)}/>
      </Field>
      <Btn style={{width:"100%",marginTop:14}} onClick={()=>{ if(!email.includes("@")) return toast("Enter a work email"); setStep("code"); toast(`Invite code emailed to ${email}`); }}>
        Request invite code <ArrowRight size={15}/></Btn>
      <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0"}}>
        <div style={{flex:1,height:1,background:T.line}}/><span style={S.mono(8,T.mute)}>OR</span><div style={{flex:1,height:1,background:T.line}}/>
      </div>
      <Btn kind="ghost" style={{width:"100%"}} onClick={onDone.demo}>
        <Sparkles size={15}/> Explore the demo org (Northbound Bank)</Btn>
    </Shell>
  );

  if (step==="code") return (
    <Shell back={()=>setStep("landing")} kicker="Check your inbox" title="Enter your org invite code."
      sub={<span>For this demo, your code is <b style={{color:"#fff",fontFamily:T.mono}}>{sentCode}</b></span>}>
      <Field label="INVITE CODE">
        <input style={{...S.input,fontFamily:T.mono,letterSpacing:"0.08em"}} placeholder="RYZ-ORG-XXXX" value={codeIn} onChange={e=>setCodeIn(e.target.value.toUpperCase())}/>
      </Field>
      <Btn style={{width:"100%",marginTop:14}} onClick={()=>{ if(codeIn.trim()!==sentCode) return toast("Code doesn't match the one we sent"); setStep("register"); }}>
        Verify code <Check size={15}/></Btn>
    </Shell>
  );

  if (step==="register") return (
    <Shell back={()=>setStep("code")} kicker="Code verified" title="Register your organization.">
      <div style={{display:"flex",flexDirection:"column",gap:13}}>
        <Field label="ORGANIZATION NAME"><input style={S.input} placeholder="Acme Corp" value={org.name} onChange={e=>setOrg({...org,name:e.target.value})}/></Field>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          <Field label="INDUSTRY">
            <select style={S.input} value={org.industry} onChange={e=>setOrg({...org,industry:e.target.value})}>
              {["Technology","Financial services","Healthcare","Retail","Manufacturing","Other"].map(o=><option key={o}>{o}</option>)}
            </select></Field>
          <Field label="COMPANY SIZE">
            <select style={S.input} value={org.size} onChange={e=>setOrg({...org,size:e.target.value})}>
              {["Under 200","200-1,000","1,000-5,000","5,000+"].map(o=><option key={o}>{o}</option>)}
            </select></Field>
        </div>
        <Field label="YOUR NAME (ORG ADMIN)"><input style={S.input} placeholder="Priya Anand" value={org.admin} onChange={e=>setOrg({...org,admin:e.target.value})}/></Field>
        <Btn style={{width:"100%"}} onClick={()=>{ if(!org.name||!org.admin) return toast("Name your org and yourself"); setStep("setup"); }}>
          Create organization <ArrowRight size={15}/></Btn>
        <div style={{...S.b(10.5,T.mute),textAlign:"center"}}>SSO via Google or Microsoft connects here in production.</div>
      </div>
    </Shell>
  );

  /* setup wizard: divisions → rules → first program */
  const steps = ["Divisions & tags","Matching rules","First program"];
  return (
    <Shell back={()=>setupStep>0?setSetupStep(s=>s-1):setStep("register")} kicker={`Set up ${org.name} · step ${setupStep+1} of 3`} title={steps[setupStep]}>
      <div style={{display:"flex",gap:5,marginBottom:16}}>
        {steps.map((_,i)=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=setupStep?T.purple:T.line}}/>)}
      </div>

      {setupStep===0 && <>
        <div style={{...S.b(12.5),marginBottom:12}}>Divisions become filters everywhere: matching rules, dashboards, session invites.</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:12}}>
          {divs.map((d,i)=>(
            <span key={d.name} style={{display:"inline-flex",alignItems:"center",gap:7,background:T.surface,border:`1px solid ${T.line}`,borderRadius:9,padding:"7px 10px"}}>
              <Dia c={d.color} s={8}/><span style={{...S.b(12.5,T.ink),fontWeight:600}}>{d.name}</span>
              <X size={12} style={{cursor:"pointer",color:T.mute}} onClick={()=>setDivs(v=>v.filter(x=>x.name!==d.name))}/>
            </span>))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input style={{...S.input,flex:1}} placeholder="Add a division (e.g. Operations)" value={divIn} onChange={e=>setDivIn(e.target.value)}
            onKeyDown={e=>{ if(e.key==="Enter"&&divIn.trim()){ setDivs(v=>[...v,{name:divIn.trim(),color:DIV_COLORS[v.length%DIV_COLORS.length]}]); setDivIn(""); } }}/>
          <Btn kind="ink" onClick={()=>{ if(divIn.trim()){ setDivs(v=>[...v,{name:divIn.trim(),color:DIV_COLORS[v.length%DIV_COLORS.length]}]); setDivIn(""); } }}><Plus size={15}/></Btn>
        </div>
        <Btn style={{width:"100%",marginTop:16}} onClick={()=>setSetupStep(1)}>Continue</Btn>
      </>}

      {setupStep===1 && <>
        {[["Staff+ mentors only","levelGate"],["Allow cross-division matching","crossDiv"]].map(([l,k])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${T.line}`}}>
            <span style={S.b(13,T.ink)}>{l}</span><Toggle on={rules[k]} onChange={v=>setRules(r=>({...r,[k]:v}))}/>
          </div>))}
        <div style={{padding:"12px 0",borderBottom:`1px solid ${T.line}`}}>
          <div style={{...S.b(13,T.ink),marginBottom:9}}>Leaderboard visibility</div>
          <Seg small options={["Off","Anonymized","Department"]} value={rules.leaderboard} onChange={v=>setRules(r=>({...r,leaderboard:v}))}/>
        </div>
        <div style={{padding:"12px 0"}}>
          <div style={{...S.b(13,T.ink),marginBottom:9}}>Default mentor capacity</div>
          <Seg small options={["Deep","Cohort"]} value={rules.capMode} onChange={v=>setRules(r=>({...r,capMode:v}))}/>
          <div style={{...S.b(10.5,T.mute),marginTop:7,fontStyle:"italic"}}>Deep: 1-3 mentees each. Cohort: one mentor hosts up to 30.</div>
        </div>
        <Btn style={{width:"100%",marginTop:10}} onClick={()=>setSetupStep(2)}>Continue</Btn>
      </>}

      {setupStep===2 && <>
        <div style={{display:"flex",flexDirection:"column",gap:13}}>
          <Field label="PROGRAM NAME"><input style={S.input} value={prog.name} onChange={e=>setProg({...prog,name:e.target.value})}/></Field>
          <Field label="LENGTH"><Seg small options={["8","12"]} value={prog.weeks} onChange={v=>setProg({...prog,weeks:v})}/> <span style={{...S.b(12,T.mute),marginLeft:8}}>weeks</span></Field>
          <Btn style={{width:"100%"}} onClick={()=>onDone.custom({org:{...org,divisions:divs},rules,program:{...prog,weeks:+prog.weeks}})}>
            Launch console <ArrowRight size={15}/></Btn>
          <div style={{...S.b(10.5,T.mute),textAlign:"center"}}>You can add programs, sessions, and invites from the console.</div>
        </div>
      </>}
    </Shell>
  );
}

/* ================= shared: profile sheets + chat ================= */
function MentorProfile({ m, onClose, onRequest, requested, inPhone, onMessage, onConnect }) {
  const Wrap = ({children}) => inPhone
    ? <div style={{position:"absolute",inset:0,background:"#fff",zIndex:20,overflowY:"auto"}}>{children}</div>
    : <div style={{position:"fixed",top:0,right:0,bottom:0,width:400,maxWidth:"92vw",background:"#fff",zIndex:70,boxShadow:"-18px 0 44px rgba(26,26,26,.18)",overflowY:"auto"}}>{children}</div>;
  return (
    <Wrap>
      <div style={{background:m.color,padding:"16px 18px 22px",color:"#fff",position:"relative",overflow:"hidden"}}>
        <img src={m.cover||ph1(m.photo)} alt={m.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 20%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(0,0,0,.3) 0%, rgba(0,0,0,.12) 40%, rgba(0,0,0,.62) 100%)"}}/>
        <button onClick={onClose} style={{position:"absolute",top:14,left:14,zIndex:2,border:"none",background:"rgba(0,0,0,.35)",backdropFilter:"blur(6px)",borderRadius:9,width:30,height:30,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={16}/></button>
        <div style={{textAlign:"center",marginTop:84,position:"relative",zIndex:1,textShadow:"0 1px 10px rgba(0,0,0,.45)"}}>
          <div style={{...S.h(19,"#fff"),marginTop:4}}>{m.name}</div>
          <div style={{...S.mono(8.5,"rgba(255,255,255,.75)"),marginTop:5}}>{m.role} · {m.division}</div>
          <div style={{display:"flex",gap:7,justifyContent:"center",marginTop:10}}>
            <Chip c="#fff" bg="rgba(0,0,0,.25)">{m.match}% MATCH</Chip>
            <Chip c="#fff" bg="rgba(0,0,0,.25)">{m.grads} DEVELOPED</Chip>
            <Chip c="#fff" bg="rgba(0,0,0,.25)">{m.stats.tier}</Chip>
          </div>
        </div>
      </div>
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
        <div style={S.card}>
          <div style={S.mono(8.5,T.purple)}>MEMBERSHIP</div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
            <Users size={14} color={T.teal}/>
            <div><div style={{...S.b(12.5,T.ink),fontWeight:600}}>{m.community||"The Roster"}</div><div style={S.mono(7,T.mute)}>COMMUNITY</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0"}}>
            <Send size={14} color={T.purple}/>
            <div><div style={{...S.b(12.5,T.ink),fontWeight:600}}>{m.invitedBy||"Founding roster"}</div><div style={S.mono(7,T.mute)}>INVITED BY</div></div>
          </div>
        </div>
        <div style={S.card}><div style={S.mono(8.5,T.purple)}>ABOUT</div><div style={{...S.b(13,T.ink),marginTop:7}}>{m.about}</div></div>
        <div style={S.card}>
          <div style={S.mono(8.5,T.purple)}>SKILLS</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:9}}>
            {m.skills.map(s=><Chip key={s} c={T.gray} bg={T.surface} style={{textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:11}}>{s}</Chip>)}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.mono(8.5,T.purple)}>TRACK RECORD</div>
          {m.achievements.map(a=>(
            <div key={a} style={{display:"flex",gap:9,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <Dia c={m.color} s={7} style={{marginTop:5}}/><span style={S.b(12.5,T.ink)}>{a}</span>
            </div>))}
        </div>
        {(m.talks.length>0||m.resources.length>0) && (
          <div style={S.card}>
            <div style={S.mono(8.5,T.purple)}>TALKS & RESOURCES</div>
            {m.talks.map(t=>(
              <div key={t.t} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
                <span style={{...S.b(12.5,T.ink),fontWeight:600}}>▶ {t.t}</span><span style={S.mono(8,T.mute)}>{t.len}</span>
              </div>))}
            {m.resources.map(r=>(
              <div key={r.t} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
                <span style={S.b(12.5,T.ink)}>{r.t}</span><Chip c={T.teal} bg={T.ttint}>{r.type}</Chip>
              </div>))}
          </div>)}
        <div style={{...S.card,background:T.ink,border:"none"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={S.mono(8,T.lilac)}>IMPACT SCORE</div>
              <div style={{fontFamily:T.sans,fontWeight:700,fontSize:32,color:T.lilac,letterSpacing:"-0.03em"}}>{m.stats.score}</div></div>
            <div style={{textAlign:"right"}}><div style={S.mono(8,T.mute)}>{m.stats.rank}</div></div>
          </div>
        </div>
        {onRequest && <Btn style={{width:"100%"}} onClick={onRequest} disabled={requested}>{requested?"Requested ✓":"Request this mentor"}</Btn>}
        {onMessage && <Btn style={{width:"100%"}} onClick={onMessage}><MessageCircle size={15}/> Message {m.name.split(" ")[0]}</Btn>}
        {onConnect && <Btn style={{width:"100%"}} onClick={onConnect}>Request an intro</Btn>}
      </div>
    </Wrap>
  );
}

function MenteeProfile({ e, onClose, onMessage, onInvite, inPhone }) {
  const Wrap = ({children}) => inPhone
    ? <div style={{position:"absolute",inset:0,background:"#fff",zIndex:20,overflowY:"auto"}}>{children}</div>
    : <div style={{position:"fixed",top:0,right:0,bottom:0,width:400,maxWidth:"92vw",background:"#fff",zIndex:70,boxShadow:"-18px 0 44px rgba(26,26,26,.18)",overflowY:"auto"}}>{children}</div>;
  const sc = e.state==="green"?T.teal:e.state==="amber"?T.amber:T.coral;
  return (
    <Wrap>
      <div style={{background:T.ink,padding:"16px 18px 22px",color:"#fff",position:"relative",overflow:"hidden",minHeight:230}}>
        <img src={e.cover||ph1(e.photo)} alt={e.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 18%"}}/>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(0,0,0,.32) 0%, rgba(0,0,0,.1) 38%, rgba(0,0,0,.66) 100%)"}}/>
        <button onClick={onClose} style={{position:"absolute",top:14,left:14,zIndex:2,border:"none",background:"rgba(0,0,0,.35)",backdropFilter:"blur(6px)",borderRadius:9,width:30,height:30,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={16}/></button>
        <div style={{textAlign:"center",marginTop:96,position:"relative",zIndex:1,textShadow:"0 1px 10px rgba(0,0,0,.5)"}}>
          <div style={{...S.h(19,"#fff"),marginTop:10}}>{e.name}</div>
          <div style={{...S.mono(8.5,T.mute),marginTop:5}}>{e.role} · {e.division}</div>
          <div style={{display:"flex",gap:7,justifyContent:"center",marginTop:10}}>
            <Chip c="#fff" bg={T.deep}>WEEK {e.wk}/12</Chip>
            <Chip c="#fff" bg={sc}>{e.streak}-DAY STREAK</Chip>
          </div>
        </div>
      </div>
      <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
        <div style={S.card}>
          <div style={S.mono(8.5,T.purple)}>MEMBERSHIP</div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
            <Users size={14} color={T.teal}/>
            <div><div style={{...S.b(12.5,T.ink),fontWeight:600}}>{e.community||"Cohort 6 · Northbound"}</div><div style={S.mono(7,T.mute)}>COMMUNITY</div></div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0"}}>
            <Send size={14} color={T.purple}/>
            <div><div style={{...S.b(12.5,T.ink),fontWeight:600}}>{e.invitedBy||"Org invite"}</div><div style={S.mono(7,T.mute)}>INVITED BY</div></div>
          </div>
        </div>
        <div style={S.card}>
          <div style={S.mono(8.5,T.purple)}>PROGRAM GOALS</div>
          {e.goals.map(g=>(
            <div key={g} style={{display:"flex",gap:9,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <Dia c={T.purple} s={7} style={{marginTop:5}}/><span style={{...S.b(12.5,T.ink),fontWeight:600}}>{g}</span>
            </div>))}
        </div>
        <div style={S.card}>
          <div style={S.mono(8.5,T.purple)}>SKILLS</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:9}}>
            {e.skills.map(s=><Chip key={s} c={T.gray} bg={T.surface} style={{textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:11}}>{s}</Chip>)}
          </div>
        </div>
        <div style={S.card}>
          <div style={S.mono(8.5,T.purple)}>HIGHLIGHTS</div>
          {e.highlights.map(h=>(
            <div key={h} style={{display:"flex",gap:9,padding:"8px 0",borderBottom:`1px solid ${T.line}`}}>
              <Dia c={T.teal} s={7} style={{marginTop:5}}/><span style={S.b(12.5,T.ink)}>{h}</span>
            </div>))}
        </div>
        <div style={{...S.card,background:e.state==="amber"?T.atint:T.ttint,border:"none"}}>
          <div style={{...S.b(12,e.state==="amber"?T.amber:T.teal),fontWeight:600}}>
            {e.state==="amber"?`Slipping: ${e.note}. A note from you now doubles re-engagement.`:`On track: ${e.note}.`}
          </div>
        </div>
        {onMessage && <Btn style={{width:"100%"}} onClick={onMessage}><MessageCircle size={15}/> Message {e.name.split(" ")[0]}</Btn>}
        {onInvite && <Btn style={{width:"100%"}} onClick={onInvite}>Invite to apply to your Orbit</Btn>}
      </div>
    </Wrap>
  );
}

/* chat thread (shared across roles via chat state) */
function ChatThread({ me, other, thread, msgs, onSend, onBack, locked, lockNote }) {
  const [txt, setTxt] = useState("");
  const boxRef = useRef(null);
  useEffect(()=>{ if(boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; },[msgs.length]);
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderBottom:`1px solid ${T.line}`,background:"#fff"}}>
        {onBack && <button onClick={onBack} style={{border:"none",background:T.surface,borderRadius:8,width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={15}/></button>}
        <Ava init={other.init} c={other.color||T.deep} s={32} fs={12} src={other.photo}/>
        <div><div style={{...S.h(13.5)}}>{other.name}</div><div style={S.mono(7.5,T.teal)}>DIRECT CONNECT · EARNED</div></div>
      </div>
      {locked ? (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:24,textAlign:"center"}}>
          <div style={{width:52,height:52,borderRadius:16,background:T.ptint,display:"flex",alignItems:"center",justifyContent:"center"}}><Lock size={22} color={T.purple}/></div>
          <div style={S.h(15)}>Messaging is earned</div>
          <div style={S.b(12.5)}>{lockNote}</div>
        </div>
      ) : (<>
        <div ref={boxRef} style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:8,background:T.surface}}>
          {msgs.map((m,i)=>(
            <div key={i} style={{alignSelf:m.from===me?"flex-end":"flex-start",maxWidth:"78%",
              background:m.from===me?T.purple:"#fff",color:m.from===me?"#fff":T.ink,
              border:m.from===me?"none":`1px solid ${T.line}`,
              borderRadius:14,padding:"9px 13px",fontFamily:T.sans,fontSize:13,lineHeight:1.45}}>
              {m.text}
              <div style={{...S.mono(6.5,m.from===me?T.lilac:T.mute),marginTop:4}}>{m.t}</div>
            </div>))}
        </div>
        <div style={{display:"flex",gap:8,padding:12,background:"#fff",borderTop:`1px solid ${T.line}`}}>
          <input style={{...S.input,flex:1,padding:"10px 13px"}} placeholder="Write a message" value={txt}
            onChange={e=>setTxt(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"&&txt.trim()){ onSend(thread,me,txt.trim()); setTxt(""); } }}/>
          <Btn small onClick={()=>{ if(txt.trim()){ onSend(thread,me,txt.trim()); setTxt(""); } }}><Send size={14}/></Btn>
        </div>
      </>)}
    </div>
  );
}

/* ================= EMPLOYEE PHONE APP (Maya mentee / Ritwik mentor) ================= */
function PhoneFrame({ children }) {
  return (
    <div style={{width:392,height:720,background:"#fff",border:`1px solid ${T.line}`,borderRadius:30,overflow:"hidden",
      boxShadow:"0 26px 64px rgba(26,26,26,.14)",position:"relative",display:"flex",flexDirection:"column"}}>{children}</div>
  );
}
function TabBar({ tabs, tab, setTab }) {
  return (
    <div style={{display:"flex",borderTop:`1px solid ${T.line}`,background:"#fff"}}>
      {tabs.map(([id,label,Icon])=>(
        <button key={id} onClick={()=>setTab(id)} style={{flex:1,border:"none",background:"transparent",cursor:"pointer",
          padding:"9px 0 11px",display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <Icon size={19} color={tab===id?T.purple:T.mute} strokeWidth={tab===id?2.4:2}/>
          <span style={{fontFamily:T.sans,fontSize:9.5,fontWeight:tab===id?700:500,color:tab===id?T.purple:T.mute}}>{label}</span>
        </button>))}
    </div>
  );
}


/* ---- guided task flows: every "Start" opens a real experience ---- */
function TaskFlow({ flow, onClose, toast }) {
  const { kind, m, item, complete } = flow;
  const [qi,setQi]=useState(0); const [ans,setAns]=useState(["","",""]);
  const [g1,setG1]=useState(""); const [g2,setG2]=useState("");
  const [rec,setRec]=useState("idle"); const [secs,setSecs]=useState(0);
  const [conf,setConf]=useState(""); const [note,setNote]=useState("");
  const [essay,setEssay]=useState("");
  useEffect(()=>{ if(rec!=="rec") return; const t=setInterval(()=>setSecs(x=>x+1),1000); return ()=>clearInterval(t); },[rec]);
  const finish = () => { complete(); onClose(); };
  const Header = ({title}) => (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",background:m?m.color:T.ink,color:"#fff"}}>
      <button onClick={onClose} style={{border:"none",background:"rgba(0,0,0,.25)",borderRadius:9,width:30,height:30,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={16}/></button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{...S.mono(6.5,"rgba(255,255,255,.7)")}}>{m?`FOR ${m.name.toUpperCase()}`:"TODAY"}</div>
        <div style={{...S.h(14,"#fff")}}>{title}</div>
      </div>
      {m && <Ava init={m.init} c="rgba(0,0,0,.25)" s={30} fs={11}/>}
    </div>
  );
  return (
    <div style={{position:"absolute",inset:0,background:T.surface,zIndex:30,display:"flex",flexDirection:"column"}}>
      {kind==="qualify" && <>
        <Header title={`Join ${m.name.split(" ")[0]}'s Orbit`}/>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:13}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <Ava init={m.init} c={m.color} s={40} fs={14} src={m.photo}/>
            <div style={{...S.b(12,T.gray)}}>{m.name.split(" ")[0]} asks every applicant three questions. Your answers travel with your request.</div>
          </div>
          <div style={{display:"flex",gap:5,justifyContent:"center"}}>
            {[0,1,2].map(i=><div key={i} style={{width:i===qi?22:7,height:7,borderRadius:4,background:i<=qi?T.purple:T.line,transition:"all .2s"}}/>)}
          </div>
          <div style={{...S.card,padding:16}}>
            <div style={S.mono(7.5,T.purple)}>QUESTION {qi+1} OF 3</div>
            <div style={{...S.h(15),marginTop:8}}>{m.questions[qi]}</div>
            <textarea style={{...S.input,minHeight:110,resize:"vertical",marginTop:12}} placeholder="Honest beats polished."
              value={ans[qi]} onChange={e=>setAns(a=>a.map((x,i)=>i===qi?e.target.value:x))}/>
            <div style={{...S.mono(7,ans[qi].trim().length>=20?T.teal:T.mute),textAlign:"right",marginTop:6}}>
              {ans[qi].trim().length>=20?"GOOD ANSWER ✓":"A SENTENCE OR TWO"}</div>
          </div>
        </div>
        <div style={{padding:14,background:"#fff",borderTop:`1px solid ${T.line}`,display:"flex",gap:8}}>
          {qi>0 && <Btn kind="ghost" onClick={()=>setQi(q=>q-1)}>Back</Btn>}
          {qi<2
            ? <Btn style={{flex:1}} disabled={ans[qi].trim().length<20} onClick={()=>setQi(q=>q+1)}>Next question</Btn>
            : <Btn style={{flex:1}} disabled={ans[2].trim().length<20} onClick={()=>{ complete(ans); onClose(); }}>Send my application</Btn>}
        </div>
      </>}
      {kind==="goals" && <>
        <Header title="Set two goals"/>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          <div style={S.b(12.5)}>Write them how you'd say them out loud. {m.name.split(" ")[0]} reads these before your first session.</div>
          <Field label="GOAL 1"><input style={S.input} placeholder="e.g. Run my first exec review by Q4" value={g1} onChange={e=>setG1(e.target.value)}/></Field>
          <Field label="GOAL 2"><input style={S.input} placeholder="e.g. Own a feature end to end" value={g2} onChange={e=>setG2(e.target.value)}/></Field>
          <div style={{...S.card,padding:12,background:T.ptint,border:"none"}}>
            <div style={{...S.b(11.5,T.deep)}}>Good goals are specific and slightly scary. "Get better at product" is neither.</div>
          </div>
        </div>
        <div style={{padding:14,background:"#fff",borderTop:`1px solid ${T.line}`}}>
          <Btn style={{width:"100%"}} disabled={!g1.trim()||!g2.trim()} onClick={finish}>Save my goals · +{item.xp} XP</Btn>
        </div>
      </>}
      {kind==="hello" && <>
        <Header title="Record a 60-second hello"/>
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:20}}>
          <div style={{...S.b(12.5),textAlign:"center",maxWidth:260}}>Say who you are, what you're working toward, and one thing you're stuck on. Imperfect is perfect.</div>
          <div onClick={()=>{ if(rec==="idle"){setRec("rec");setSecs(0);} else if(rec==="rec"){setRec("done");} }}
            style={{width:110,height:110,borderRadius:"50%",background:rec==="rec"?T.coral:rec==="done"?T.teal:T.purple,
              display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"#fff",
              boxShadow:rec==="rec"?`0 0 0 10px ${T.ctint}`:"none",transition:"all .25s"}}>
            {rec==="done"?<Check size={34}/>:<span style={{...S.h(15,"#fff")}}>{rec==="rec"?"STOP":"REC"}</span>}
            {rec==="rec" && <span style={{...S.mono(9,"#fff"),marginTop:4}}>0:{String(secs).padStart(2,"0")}</span>}
          </div>
          <div style={S.mono(8,T.mute)}>{rec==="idle"?"TAP TO START":rec==="rec"?"RECORDING · TAP TO STOP":"NICE TAKE ✓"}</div>
        </div>
        <div style={{padding:14,background:"#fff",borderTop:`1px solid ${T.line}`}}>
          <Btn style={{width:"100%"}} disabled={rec!=="done"} onClick={finish}>Use this take · +{item.xp} XP</Btn>
        </div>
      </>}
      {kind==="snapshot" && <>
        <Header title="Where you're starting from"/>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:14}}>
          <Field label="RIGHT NOW I'M...">
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {["Finding my footing","Building momentum","Ready to be stretched"].map(o=>(
                <div key={o} onClick={()=>setConf(o)} style={{...S.card,padding:"12px 14px",cursor:"pointer",
                  border:`1.5px solid ${conf===o?T.purple:T.line}`,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${conf===o?T.purple:T.line}`,background:conf===o?T.purple:"#fff"}}/>
                  <span style={{...S.b(13,T.ink),fontWeight:600}}>{o}</span>
                </div>))}
            </div>
          </Field>
          <Field label="ONE THING YOUR MENTOR SHOULD KNOW">
            <input style={S.input} placeholder="e.g. I freeze when a VP pushes back" value={note} onChange={e=>setNote(e.target.value)}/>
          </Field>
        </div>
        <div style={{padding:14,background:"#fff",borderTop:`1px solid ${T.line}`}}>
          <Btn style={{width:"100%"}} disabled={!conf||!note.trim()} onClick={finish}>Share snapshot · +{item.xp} XP</Btn>
        </div>
      </>}
      {kind==="exercise" && <>
        <Header title="Today's exercise · 5 min"/>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          <div style={{...S.card,padding:13,background:T.ptint,border:"none"}}>
            <div style={S.mono(7.5,T.deep)}>WEEK 6 PROMPT</div>
            <div style={{...S.b(13,T.deep),marginTop:6,fontWeight:600}}>"In six months, when someone says your name in a room you're not in, what do you want them to say?"</div>
          </div>
          <textarea style={{...S.input,minHeight:150,resize:"vertical"}} placeholder="Write it rough. You'll refine it with Ritwik on Thursday."
            value={essay} onChange={e=>setEssay(e.target.value)}/>
          <div style={{...S.mono(7.5,essay.length>=60?T.teal:T.mute),textAlign:"right"}}>{essay.length>=60?"READY TO SUBMIT ✓":`${Math.max(0,60-essay.length)} MORE CHARACTERS`}</div>
        </div>
        <div style={{padding:14,background:"#fff",borderTop:`1px solid ${T.line}`}}>
          <Btn style={{width:"100%"}} disabled={essay.length<60} onClick={finish}>Submit · +25 XP · keeps your streak</Btn>
        </div>
      </>}
      {kind==="session" && <>
        <Header title="Thursday's session"/>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          <div style={S.card}>
            <div style={S.mono(8,T.purple)}>THU JUL 30 · 4:30 PM · 45 MIN</div>
            <div style={{...S.h(15),marginTop:8}}>Week 6 session with Ritwik</div>
            <div style={{marginTop:10}}>
              {["Review your positioning story","Rebuild one recent decision you argued for","Set two intro targets for Week 7"].map((a,i)=>(
                <div key={a} style={{display:"flex",gap:9,padding:"8px 0",borderBottom:i<2?`1px solid ${T.line}`:"none"}}>
                  <span style={S.mono(8.5,T.purple)}>0{i+1}</span><span style={S.b(12.5,T.ink)}>{a}</span>
                </div>))}
            </div>
          </div>
          <div style={{...S.b(11,T.mute),textAlign:"center"}}>Agenda auto-built from where you are in the program.</div>
        </div>
        <div style={{padding:14,background:"#fff",borderTop:`1px solid ${T.line}`}}>
          <Btn style={{width:"100%"}} onClick={finish}>Confirm I'll be there · +10 XP</Btn>
        </div>
      </>}
    </div>
  );
}

function MenteeApp({ org, settings, st, toast }) {
  const [tab, setTab] = useState("home");
  const [matchTab, setMatchTab] = useState("discover");
  const [sheet, setSheet] = useState(null);
  const [deckIdx, setDeckIdx] = useState(0);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState({ division:"All", focus:"All" });
  const [daily, setDaily] = useState({ exercise:false, confirmed:false });
  const [streak, setStreak] = useState(12);
  const [flow, setFlow] = useState(null);        /* active guided task flow */
  const [mChat, setMChat] = useState(false);     /* open mentor thread from inbox */
  const [statsOpen, setStatsOpen] = useState(false); /* frosted stats sheet */
  const [badgeSel, setBadgeSel] = useState(null);    /* badge detail card */
  const [profileSet, setProfileSet] = useState(false); /* profile settings sheet */
  const [prefs, setPrefs] = useState({ sessionRem:true, streakRem:true, badgeVis:true, feedVis:true, avail:"Flexible" });
  const [draft, setDraft] = useState(null);          /* profile edit draft */
  const [gIn, setGIn] = useState(""); const [skIn, setSkIn] = useState("");
  const [tracks, setTracks] = useState({});      /* extra mentors: {mentorId: doneIds[]} */
  const [focusId, setFocusId] = useState("m1");  /* which mentor's track the step card shows */
  const allDone = st.stage1Done.length===STAGE1.length;

  const FOCUS = ["All","Product strategy","System design","Storytelling","SQL","Portfolio","Career ladders"];
  const deck = useMemo(()=>MENTORS.filter(m=>{
    if (m.id==="m1" || tracks[m.id]) return false;
    if (settings.levelGate && m.level!=="Staff+") return false;
    if (!settings.crossDiv && m.division!=="Product") return false;
    if (filters.division!=="All" && m.division!==filters.division) return false;
    if (filters.focus!=="All" && !m.skills.includes(filters.focus)) return false;
    return true;
  }),[settings.levelGate,settings.crossDiv,filters,tracks]);
  const cur = deck.length? deck[deckIdx%deck.length] : null;
  const mentor = st.mentorProfile;
  const me = st.menteeProfile;
  const mi = initsOf(me.name);
  const activeFilters = (filters.division!=="All"?1:0)+(filters.focus!=="All"?1:0);

  const doRequest = (m) => {
    setSheet(null);
    setFlow({ kind:"qualify", m, item:{},
      complete:(answers)=>{
        setTracks(t=>({ ...t, [m.id]: [] }));
        st.setRequests(r=>[...r,{ id:genCode("R"), mentorId:m.id, status:"pending",
          from:{ self:true, name:me.name, init:mi, photo:me.photo, division:me.division, role:me.role }, answers }]);
        toast(`Application sent to ${m.name.split(" ")[0]}'s Orbit ✓`);
        setDeckIdx(i=>i+1);
      }});
  };

  /* ---- per-mentor unlock tracks ---- */
  const allTracks = [
    { mentor: mentor, done: st.stage1Done, mark:(id,xp)=>{ st.setStage1Done(d=>[...d,id]); st.setXp(x=>x+xp); } },
    ...Object.keys(tracks).map(mid=>({
      mentor: MENTORS.find(m=>m.id===mid),
      done: tracks[mid],
      mark:(id,xp)=>{ setTracks(t=>({...t,[mid]:[...t[mid],id]})); st.setXp(x=>x+xp); },
    })),
  ];
  const focusTrack = allTracks.find(t=>t.mentor.id===focusId && t.done.length<STAGE1.length)
    || allTracks.find(t=>t.done.length<STAGE1.length);
  const nextItem = focusTrack ? STAGE1.find(x=>!focusTrack.done.includes(x.id)) : null;

  const FLOW_KIND = { 1:"goals", 2:"hello", 3:"snapshot" };
  const step = focusTrack && nextItem
    ? { k:"stage-"+focusTrack.mentor.id, m:focusTrack.mentor,
        tag:`UNLOCK TRACK · STEP ${focusTrack.done.length+1} OF ${STAGE1.length}`,
        title:nextItem.label, why:nextItem.sub,
        btn:`Start · +${nextItem.xp} XP`,
        done:focusTrack.done,
        run:()=>setFlow({ kind:FLOW_KIND[nextItem.id], m:focusTrack.mentor, item:nextItem,
          complete:()=>{ focusTrack.mark(nextItem.id, nextItem.xp);
            const finishing = focusTrack.done.length+1===STAGE1.length;
            if (finishing) toast(focusTrack.mentor.id==="m1"
              ? "Stage 1 complete · chat with Ritwik is open 🎉"
              : `Stage 1 for ${focusTrack.mentor.name.split(" ")[0]} done · chat opens when they accept`);
            else toast(`+${nextItem.xp} XP · nice`); } }) }
    : !daily.exercise
    ? { k:"ex", m:mentor, tag:"TODAY'S EXERCISE · 5 MINUTES", title:"Write your positioning story",
        why:`Keeps your ${streak}-day streak alive. Ritwik reads it before Thursday.`, btn:"Start · +25 XP",
        run:()=>setFlow({ kind:"exercise", m:null, item:{xp:25},
          complete:()=>{ setDaily(d=>({...d,exercise:true})); setStreak(v=>v+1); st.setXp(x=>x+25); toast(`+25 XP · streak ${streak+1} 🔥`); } }) }
    : !daily.confirmed
    ? { k:"sess", m:mentor, tag:"ONE MORE THING", title:"Confirm Thursday's session",
        why:"Ritwik is holding 4:30 PM for you.", btn:"Review & confirm · +10 XP",
        run:()=>setFlow({ kind:"session", m:mentor, item:{xp:10},
          complete:()=>{ setDaily(d=>({...d,confirmed:true})); st.setXp(x=>x+10); toast("+10 XP · see you Thursday"); } }) }
    : null;
  const isUnlockStep = step && step.k.startsWith("stage-");
  const LVL = 4, NEXT = 1500;

  const UNLOCKS = m => [
    { Icon:MessageCircle, label:`Chat with ${m.name.split(" ")[0]}` },
    { Icon:CalendarDays, label:"Session booking" },
    { Icon:Zap, label:"+200 XP total" },
  ];

  return (
    <PhoneFrame>
      <div style={{background:T.purple,padding:"14px 16px 12px",color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={S.mono(7.5,T.lilac)}>{org.program} · {org.name.toUpperCase()}</div>
            <div style={{...S.h(17,"#fff"),marginTop:4}}>
              {tab==="home"?`Morning, ${me.name.split(" ")[0]}`:tab==="match"?"Mentors":tab==="chat"?"Messages":"Your profile"}</div>
          </div>
          <button onClick={()=>setTab("profile")} className="glassPill" style={{border:"2px solid rgba(255,255,255,.45)",background:"transparent",
            borderRadius:12,padding:2,cursor:"pointer",lineHeight:0}} title="Your profile">
            <Ava init={mi} c={T.deep} s={34} fs={12} src={me.photo}/>
          </button>
        </div>
        {tab==="home" && (
          <button onClick={()=>setStatsOpen(true)} className="glassPill" style={{
            marginTop:12,width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",
            background:"rgba(255,255,255,.16)",backdropFilter:"blur(12px) saturate(1.5)",WebkitBackdropFilter:"blur(12px) saturate(1.5)",
            border:"1px solid rgba(255,255,255,.28)",borderRadius:14,padding:"10px 14px",cursor:"pointer"}}>
            <span style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:T.sans,fontWeight:700,fontSize:12.5,color:"#fff"}}>
              <Flame size={14} color="#FFB59B"/> {streak} days</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:6,fontFamily:T.sans,fontWeight:700,fontSize:12.5,color:"#fff"}}>
              <Zap size={14} color="#FFE0A3"/> {st.xp.toLocaleString()} XP</span>
            <span style={{fontFamily:T.sans,fontSize:11.5,color:"rgba(255,255,255,.8)"}}>Week 6 of 12</span>
            <ChevronRight size={15} color="rgba(255,255,255,.8)"/>
          </button>)}
      </div>

      <div style={{flex:1,overflowY:"auto",position:"relative",background:T.surface}}>

        {/* ============ HOME ============ */}
        {tab==="home" && <div style={{padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {step ? (
            <div key={step.k+(step.done?step.done.length:0)} style={{...S.card,padding:0,overflow:"hidden",border:`1.5px solid ${T.purple}`,animation:"cardIn .3s ease"}}>
              {/* mentor identity strip: which mentor this card belongs to */}
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",background:isUnlockStep?step.m.color:T.ink}}>
                <Ava init={step.m.init} c="rgba(0,0,0,.25)" s={30} fs={11}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{...S.mono(7,"rgba(255,255,255,.75)")}}>{isUnlockStep?"FOR YOUR MENTOR":"WITH"}</div>
                  <div style={{...S.h(13,"#fff")}}>{step.m.name}</div>
                </div>
                <span style={{...S.mono(7,"rgba(255,255,255,.85)"),background:"rgba(0,0,0,.25)",padding:"4px 8px",borderRadius:6}}>{step.tag}</span>
              </div>
              <div style={{padding:"16px 16px 18px"}}>
                <div style={S.h(18)}>{step.title}</div>
                <div style={{...S.b(12.5),marginTop:7}}>{step.why}</div>

                {/* what completing this track unlocks */}
                {isUnlockStep && (
                  <div style={{marginTop:13,background:T.surface,borderRadius:12,padding:"11px 13px"}}>
                    <div style={S.mono(7,T.gray)}>FINISHING THIS TRACK UNLOCKS</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                      {UNLOCKS(step.m).map(({Icon,label})=>(
                        <span key={label} style={{display:"inline-flex",alignItems:"center",gap:5,background:"#fff",border:`1px solid ${T.line}`,
                          borderRadius:8,padding:"5px 9px",fontFamily:T.sans,fontSize:10.5,fontWeight:600,color:T.ink}}>
                          <Icon size={11} color={T.purple}/>{label}
                        </span>))}
                    </div>
                  </div>)}

                <Btn style={{width:"100%",marginTop:14}} onClick={step.run}>{step.btn}</Btn>
                <div style={{...S.b(10.5,T.mute),marginTop:9,textAlign:"center"}}>One step at a time. This is all you need to do right now.</div>
              </div>
            </div>
          ) : (
            <div style={{...S.card,padding:22,border:`1.5px solid ${T.teal}`,background:T.ttint,textAlign:"center",animation:"cardIn .3s ease"}}>
              <div style={{width:46,height:46,borderRadius:14,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>
                <Check size={22} color={T.teal}/>
              </div>
              <div style={{...S.h(17,T.teal),marginTop:12}}>That's everything for today</div>
              <div style={{...S.b(12.5,T.teal),marginTop:6}}>Streak safe at {streak} days 🔥 See you tomorrow.</div>
              <Btn small kind="ghost" style={{marginTop:14,background:"#fff"}} onClick={()=>{ setTab("match"); setMatchTab("mine"); }}>
                Visit your mentor's resources</Btn>
            </div>
          )}

          {/* other unlock tracks, only when there is more than one */}
          {allTracks.length>1 && (
            <div style={{...S.card,padding:14}}>
              <div style={S.mono(8,T.purple)}>YOUR UNLOCK TRACKS</div>
              {allTracks.map((t,i)=>{
                const doneN = t.done.length, full = doneN===STAGE1.length, isFocus = focusTrack && t.mentor.id===focusTrack.mentor.id;
                return (
                  <div key={t.mentor.id} onClick={()=>!full&&setFocusId(t.mentor.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:full?"default":"pointer",
                      borderBottom:i<allTracks.length-1?`1px solid ${T.line}`:"none"}}>
                    <Ava init={t.mentor.init} c={t.mentor.color} s={30} fs={10.5}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{...S.h(12.5)}}>{t.mentor.name} {isFocus&&!full&&<span style={{...S.mono(6.5,T.purple)}}>· SHOWING</span>}</div>
                      <div style={{marginTop:5,width:"90%"}}><Bar pct={(doneN/STAGE1.length)*100} c={full?T.teal:T.purple} h={4}/></div>
                    </div>
                    {full ? <span style={S.mono(7.5,T.teal)}>UNLOCKED ✓</span> : <span style={S.mono(7.5,T.mute)}>{doneN}/{STAGE1.length}</span>}
                  </div>);
              })}
              <div style={{...S.b(10.5,T.mute),marginTop:7,fontStyle:"italic"}}>Tap a track to work on that mentor's steps.</div>
            </div>)}

          {daily.confirmed && (
            <div style={{...S.card,padding:"12px 16px",display:"flex",alignItems:"center",gap:10}}>
              <CalendarDays size={15} color={T.purple}/>
              <span style={{...S.b(12,T.ink),flex:1}}>Thu 4:30 PM · Session with Ritwik</span>
              <span style={S.mono(7.5,T.teal)}>CONFIRMED ✓</span>
            </div>)}
        </div>}

        {/* ============ MATCH ============ */}
        {tab==="match" && <div style={{padding:14,display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",justifyContent:"center"}}>
            <Seg small options={["Discover","My mentor","Community"]}
              value={matchTab==="discover"?"Discover":matchTab==="mine"?"My mentor":"Community"}
              onChange={v=>setMatchTab(v==="Discover"?"discover":v==="My mentor"?"mine":"community")}/>
          </div>

          {matchTab==="community" && (<>
            <div style={{...S.card,padding:16,background:T.ink,border:"none",color:"#fff"}}>
              <div style={S.mono(8,T.lilac)}>COHORT 6 · MEMBERS ONLY</div>
              <div style={{...S.h(16,"#fff"),marginTop:7}}>You're one of 50 chosen this quarter.</div>
              <div style={{...S.b(11.5,"#C9C6DE"),marginTop:6}}>Every person here earned their seat. What happens in the cohort stays in the cohort.</div>
            </div>
            <div style={{...S.card,padding:14}}>
              <div style={S.mono(8,T.purple)}>COHORT FEED</div>
              {COHORT_FEED.map((p,i)=>(
                <div key={p.who+p.when} style={{display:"flex",gap:10,padding:"11px 0",borderBottom:i<COHORT_FEED.length-1?`1px solid ${T.line}`:"none"}}>
                  <Ava init={p.init} c={p.color} s={30} fs={10} src={p.photo}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{...S.b(12.5,T.ink)}}><b>{p.who}</b> {p.text}</div>
                    <div style={{display:"flex",gap:8,marginTop:4,alignItems:"center"}}>
                      <Chip c={T.teal} bg={T.ttint}>{p.tag}</Chip>
                      <span style={S.mono(7,T.mute)}>{p.when} AGO</span>
                    </div>
                  </div>
                </div>))}
            </div>
            <div style={{...S.card,padding:14}}>
              <div style={S.mono(8,T.coral)}>COHORT EVENTS</div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
                <CalendarDays size={15} color={T.coral}/>
                <div style={{flex:1}}>
                  <div style={{...S.b(12.5,T.ink),fontWeight:700}}>AMA with Dana Wolfe</div>
                  <div style={S.b(10.5,T.mute)}>Thu · submitted questions only</div>
                </div>
                <Btn small kind="teal" onClick={()=>toast("You're on the AMA list ✓")}>Join</Btn>
              </div>
            </div>
          </>)}

          {matchTab==="community" ? null : matchTab==="mine" ? (<>
            <div style={{...S.card,padding:0,overflow:"hidden",borderRadius:18}}>
              <div onClick={()=>setSheet({type:"active",data:mentor})} style={{height:124,background:mentor.color,position:"relative",overflow:"hidden",cursor:"pointer"}}>
                <img src={mentor.cover||ph1(mentor.photo)} alt={mentor.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 24%"}}/>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(0,0,0,.05) 20%, rgba(0,0,0,.62) 100%)"}}/>
                <div style={{position:"absolute",left:16,right:12,bottom:11,textShadow:"0 1px 8px rgba(0,0,0,.5)"}}>
                  <div style={{...S.h(16,"#fff")}}>{mentor.name}</div>
                  <div style={{...S.mono(7.5,"rgba(255,255,255,.85)"),marginTop:3}}>{mentor.role} · YOUR MENTOR SINCE WEEK 1</div>
                </div>
              </div>
              <div style={{padding:14}}>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <Chip c={T.teal} bg={T.ttint}>ACTIVE</Chip>
                  <Chip>NEXT · THU 4:30 PM</Chip>
                  <Chip c={T.gray} bg={T.surface}>{mentor.stats.tier}</Chip>
                </div>
                <div style={{display:"flex",gap:7,marginTop:12}}>
                  <Btn small kind="ghost" style={{flex:1}} onClick={()=>setSheet({type:"active",data:mentor})}>Profile & resources</Btn>
                  <Btn small style={{flex:1}} onClick={()=>setTab("chat")}><MessageCircle size={13}/> Message</Btn>
                </div>
              </div>
            </div>
            {st.requests.filter(r=>r.from.self).length>0 && (
              <div style={{...S.card,padding:14}}>
                <div style={S.mono(8,T.amber)}>ORBIT APPLICATIONS</div>
                {st.requests.filter(r=>r.from.self).map(r=>{
                  const m = MENTORS.find(x=>x.id===r.mentorId);
                  return (
                    <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0"}}>
                      <Ava init={m.init} c={m.color} s={28} fs={10} src={m.photo}/>
                      <span style={{...S.b(12.5,T.ink),fontWeight:600,flex:1}}>{m.name}'s Orbit</span>
                      <span style={S.mono(7.5,T.amber)}>AWAITING ACCEPT</span>
                    </div>);
                })}
              </div>)}
            <div style={{...S.card,padding:14}}>
              <div style={S.mono(8,T.purple)}>FROM RITWIK'S LIBRARY</div>
              {mentor.resources.map(r=>(
                <div key={r.t} onClick={()=>toast(`Opening "${r.t}"`)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.line}`,cursor:"pointer"}}>
                  <span style={{...S.b(12.5,T.ink),fontWeight:600}}>{r.t}</span><Chip c={T.teal} bg={T.ttint}>{r.type}</Chip>
                </div>))}
              {mentor.talks.map(t=>(
                <div key={t.t} onClick={()=>toast(`Playing "${t.t}"`)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${T.line}`,cursor:"pointer"}}>
                  <span style={{...S.b(12.5,T.ink),fontWeight:600}}>▶ {t.t}</span><span style={S.mono(8,T.mute)}>{t.len}</span>
                </div>))}
            </div>
          </>) : (<>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{flex:1,display:"flex",gap:5,flexWrap:"wrap"}}>
                {settings.levelGate&&<Chip c={T.teal} bg={T.ttint}>STAFF+</Chip>}
                {!settings.crossDiv&&<Chip c={T.amber} bg={T.atint}>PRODUCT ONLY</Chip>}
                {filters.division!=="All"&&<Chip>{filters.division.toUpperCase()}</Chip>}
                {filters.focus!=="All"&&<Chip>{filters.focus.toUpperCase()}</Chip>}
              </div>
              <button onClick={()=>setShowFilter(true)} style={{position:"relative",border:`1.5px solid ${activeFilters?T.purple:T.line}`,
                background:"#fff",borderRadius:10,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <SlidersHorizontal size={16} color={activeFilters?T.purple:T.gray}/>
                {activeFilters>0 && <span style={{position:"absolute",top:-5,right:-5,width:16,height:16,borderRadius:8,background:T.purple,color:"#fff",
                  fontFamily:T.sans,fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{activeFilters}</span>}
              </button>
            </div>
            {!cur ? (
              <div style={{...S.card,textAlign:"center",padding:26}}>
                <div style={S.h(14)}>No mentors match these filters</div>
                <div style={{...S.b(11.5),marginTop:5}}>Widen your filters, or ask HR to widen the org rules.</div>
                {activeFilters>0 && <Btn small kind="ghost" style={{marginTop:12}} onClick={()=>setFilters({division:"All",focus:"All"})}>Clear my filters</Btn>}
              </div>
            ) : (
              <div style={{position:"relative"}}>
                <div style={{position:"absolute",top:10,left:14,right:14,height:"100%",background:"#fff",border:`1px solid ${T.line}`,borderRadius:20,opacity:.6}}/>
                <div key={cur.id+deckIdx} style={{...S.card,position:"relative",padding:0,overflow:"hidden",borderRadius:20,
                  minHeight:430,display:"flex",flexDirection:"column",animation:"cardIn .28s ease"}}>
                  {/* tall photo header */}
                  <div onClick={()=>setSheet({type:"mentor",data:cur})} style={{height:216,background:cur.color,position:"relative",cursor:"pointer",overflow:"hidden"}}>
                    <img src={cur.cover||ph1(cur.photo)} alt={cur.name} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"center 22%"}}/>
                    <div style={{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(0,0,0,.28) 0%, rgba(0,0,0,0) 32%, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%)"}}/>
                    <span style={{position:"absolute",top:10,right:10,...S.mono(8,"#fff"),background:"rgba(0,0,0,.4)",backdropFilter:"blur(6px)",padding:"5px 9px",borderRadius:8}}>{cur.match}% MATCH</span>
                    <span style={{position:"absolute",bottom:9,left:0,right:0,textAlign:"center",...S.mono(7,"rgba(255,255,255,.9)"),textShadow:"0 1px 6px rgba(0,0,0,.5)"}}>TAP FOR FULL PROFILE</span>
                    {/* browse arrows: look around without spending a pass or request */}
                    {deck.length>1 && (<>
                      <button onClick={e=>{e.stopPropagation();setDeckIdx(i=>(i-1+deck.length)%deck.length);}} style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",
                        width:32,height:32,borderRadius:"50%",border:"none",cursor:"pointer",background:"rgba(0,0,0,.3)",backdropFilter:"blur(6px)",
                        display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={17} color="#fff"/></button>
                      <button onClick={e=>{e.stopPropagation();setDeckIdx(i=>(i+1)%deck.length);}} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",
                        width:32,height:32,borderRadius:"50%",border:"none",cursor:"pointer",background:"rgba(0,0,0,.3)",backdropFilter:"blur(6px)",
                        display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronRight size={17} color="#fff"/></button>
                    </>)}
                  </div>
                  {/* full body */}
                  <div style={{padding:16,flex:1,display:"flex",flexDirection:"column"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                      <div style={S.h(18)}>{cur.name}</div>
                      {deck.length>1 && <span style={S.mono(7.5,T.mute)}>{(deckIdx%deck.length)+1} / {deck.length}</span>}
                    </div>
                    <div style={{...S.mono(8,T.mute),marginTop:4}}>{cur.role} · {cur.division} · {cur.grads} DEVELOPED</div>
                    <div style={{...S.b(12.5,T.gray),marginTop:10,lineHeight:1.55}}>{cur.about}</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:11}}>
                      {cur.skills.slice(0,4).map(sk=><Chip key={sk} c={T.gray} bg={T.surface} style={{textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:10.5}}>{sk}</Chip>)}
                    </div>
                    <div style={{flex:1}}/>
                    {deck.length>1 && (
                      <div style={{display:"flex",gap:5,justifyContent:"center",margin:"10px 0 2px"}}>
                        {deck.map((_,i)=><span key={i} style={{width:i===(deckIdx%deck.length)?16:6,height:6,borderRadius:3,
                          background:i===(deckIdx%deck.length)?T.purple:T.line,transition:"all .2s"}}/>)}
                      </div>)}
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <Btn small kind="ghost" style={{flex:1,color:T.coral,borderColor:T.coral}} onClick={()=>setDeckIdx(i=>i+1)}>Pass</Btn>
                      <Btn small style={{flex:1.4}} onClick={()=>doRequest(cur)}>Apply to {cur.name.split(" ")[0]}'s Orbit</Btn>
                    </div>
                  </div>
                </div>
              </div>)}
            <div style={{...S.b(10.5,T.mute),textAlign:"center"}}>Browse with the arrows · applying opens 3 quick questions</div>

            {showFilter && (
              <div style={{position:"absolute",inset:0,zIndex:25,background:"rgba(26,26,26,.35)"}} onClick={()=>setShowFilter(false)}>
                <div onClick={e=>e.stopPropagation()} style={{position:"absolute",left:0,right:0,bottom:0,background:"#fff",
                  borderRadius:"22px 22px 0 0",padding:18,boxShadow:"0 -12px 40px rgba(26,26,26,.18)"}}>
                  <div style={{width:38,height:4,borderRadius:2,background:T.line,margin:"0 auto 14px"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={S.h(15)}>Filter matches</div>
                    <button onClick={()=>setFilters({division:"All",focus:"All"})} style={{border:"none",background:"transparent",cursor:"pointer",...S.b(12,T.purple),fontWeight:700}}>Reset</button>
                  </div>
                  <div style={{...S.mono(8,T.gray),margin:"14px 0 8px"}}>DIVISION</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {["All",...org.divisions.map(d=>d.name)].map(d=>(
                      <Chip key={d} onClick={()=>setFilters(f=>({...f,division:d}))}
                        c={filters.division===d?"#fff":T.gray} bg={filters.division===d?T.purple:T.surface}
                        style={{padding:"7px 12px",textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:12}}>{d}</Chip>))}
                  </div>
                  <div style={{...S.mono(8,T.gray),margin:"14px 0 8px"}}>FOCUS AREA</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {FOCUS.map(fo=>(
                      <Chip key={fo} onClick={()=>setFilters(f=>({...f,focus:fo}))}
                        c={filters.focus===fo?"#fff":T.gray} bg={filters.focus===fo?T.purple:T.surface}
                        style={{padding:"7px 12px",textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:12}}>{fo}</Chip>))}
                  </div>
                  <Btn style={{width:"100%",marginTop:16}} onClick={()=>{ setShowFilter(false); setDeckIdx(0); }}>
                    Show {deck.length} match{deck.length===1?"":"es"}</Btn>
                </div>
              </div>)}
          </>)}
        </div>}

        {tab==="chat" && (mChat
          ? <div style={{position:"absolute",inset:0}}>
              <ChatThread me="maya" other={mentor} thread="maya-ritwik" msgs={st.chat["maya-ritwik"]||[]}
                onSend={st.send} onBack={()=>setMChat(false)} locked={!allDone}
                lockNote="Finish Ritwik's unlock track on Home and this thread opens instantly."/>
            </div>
          : <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
              <div style={{...S.card,padding:14}}>
                <div style={S.mono(8,T.purple)}>YOUR MENTORS</div>
                <div onClick={()=>setMChat(true)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",cursor:"pointer"}}>
                  <Ava init={mentor.init} c={mentor.color} s={38} fs={13} src={mentor.photo}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={S.h(13.5)}>{mentor.name}</div>
                    <div style={{...S.b(11,T.mute),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {allDone ? ((st.chat["maya-ritwik"]||[]).slice(-1)[0]?.text || "Say hello") : "🔒 Finish your unlock track to open"}</div>
                  </div>
                  {allDone ? <MessageCircle size={15} color={T.purple}/> : <Lock size={14} color={T.mute}/>}
                </div>
              </div>
              <div style={{...S.card,padding:14}}>
                <div style={S.mono(8,T.amber)}>ORBIT APPLICATIONS · AWAITING ACCEPT</div>
                {st.requests.filter(r=>r.from.self).length===0
                  ? <div style={{...S.b(11.5,T.mute),marginTop:8}}>Apply to a mentor in Discover and they appear here.</div>
                  : st.requests.filter(r=>r.from.self).map(r=>{
                      const m2 = MENTORS.find(x=>x.id===r.mentorId);
                      return (
                        <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0"}}>
                          <Ava init={m2.init} c={m2.color} s={34} fs={12} src={m2.photo}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={S.h(13)}>{m2.name}'s Orbit</div>
                            <div style={S.b(10.5,T.mute)}>3 answers delivered with your request</div>
                          </div>
                          <span style={S.mono(7.5,T.amber)}>PENDING</span>
                        </div>);
                    })}
              </div>
              <div style={{...S.b(10.5,T.mute),textAlign:"center"}}>Chat opens per mentor the moment they accept you into their Orbit.</div>
            </div>)}

        {tab==="profile" && <div style={{padding:16,display:"flex",flexDirection:"column",gap:14}}>
          {/* big hero */}
          <div style={{...S.card,padding:22,textAlign:"center",borderRadius:22,position:"relative"}}>
            <button onClick={()=>{ setDraft({...st.menteeProfile, goals:[...st.menteeProfile.goals], skills:[...st.menteeProfile.skills]}); setProfileSet(true); }} style={{position:"absolute",top:14,right:14,width:34,height:34,borderRadius:11,
              border:`1.5px solid ${T.line}`,background:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}} title="Profile settings">
              <Settings size={16} color={T.gray}/>
            </button>
            <div style={{display:"flex",justifyContent:"center"}}><Ava init={mi} c={T.purple} s={86} fs={26} src={me.photo}/></div>
            <div style={{...S.h(21),marginTop:12}}>{me.name}</div>
            <div style={{...S.b(13,T.gray),marginTop:4}}>{me.role} · {me.division}</div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:14}}>
              <span style={{background:T.ptint,borderRadius:12,padding:"9px 14px",fontFamily:T.sans,fontWeight:700,fontSize:13.5,color:T.deep,display:"inline-flex",alignItems:"center",gap:6}}>
                <Zap size={15} color={T.purple}/> Level 4</span>
              <span style={{background:T.ctint,borderRadius:12,padding:"9px 14px",fontFamily:T.sans,fontWeight:700,fontSize:13.5,color:T.coral,display:"inline-flex",alignItems:"center",gap:6}}>
                <Flame size={15} color={T.coral}/> {streak} days</span>
            </div>
            <div style={{marginTop:16}}><Bar pct={(st.xp/NEXT)*100} c={T.purple} h={10}/></div>
            <div style={{...S.b(12,T.gray),marginTop:8}}><b style={{color:T.ink}}>{st.xp.toLocaleString()} XP</b> · {NEXT-st.xp} more to Level 5</div>
          </div>

          {/* badges: Apple-style icon rail + animate-down detail */}
          <div>
            <div style={{...S.h(16),marginBottom:4}}>Your badges</div>
            <div style={{...S.b(12.5,T.gray),marginBottom:10}}>Tap one. Earned once, yours forever.</div>
            <div style={{display:"flex",gap:12,overflowX:"auto",padding:"4px 2px 10px",scrollSnapType:"x mandatory"}} className="noScroll">
              {BADGES.map(b=>{
                const sel = badgeSel===b.n;
                return (
                  <div key={b.n} onClick={()=>setBadgeSel(sel?null:b.n)} style={{flexShrink:0,width:74,textAlign:"center",cursor:"pointer",scrollSnapAlign:"start"}}>
                    <div style={{width:62,height:62,margin:"0 auto",borderRadius:19,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",
                      background:b.state==="locked"?"#E4E3DF":b.c,
                      boxShadow:sel?`0 8px 22px ${b.c}55, 0 0 0 3px ${b.c}`:"0 4px 12px rgba(26,26,26,.10)",
                      transform:sel?"scale(1.06)":"scale(1)",transition:"all .22s cubic-bezier(.22,1.4,.36,1)"}}>
                      {b.state==="locked" ? <Lock size={20} color={T.mute}/> : <Dia c="#fff" s={20}/>}
                      {b.state==="earned" && <span style={{position:"absolute",right:-4,bottom:-4,width:20,height:20,borderRadius:10,background:T.teal,
                        border:"2.5px solid #fff",display:"flex",alignItems:"center",justifyContent:"center"}}><Check size={11} color="#fff"/></span>}
                      {b.state==="progress" && <svg width="62" height="62" viewBox="0 0 62 62" style={{position:"absolute",inset:0}}>
                        <circle cx="31" cy="31" r="28.5" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="3"/>
                        <circle cx="31" cy="31" r="28.5" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"
                          strokeDasharray="179" strokeDashoffset={179-179*(b.pct/100)} transform="rotate(-90 31 31)"/>
                      </svg>}
                    </div>
                    <div style={{...S.b(10.5,badgeSel&&!sel?T.mute:T.ink),fontWeight:600,marginTop:7,lineHeight:1.2}}>{b.n}</div>
                  </div>);
              })}
            </div>
            {badgeSel && (()=>{ const b = BADGES.find(x=>x.n===badgeSel); return (
              <div key={b.n} style={{...S.card,padding:0,overflow:"hidden",borderRadius:18,marginTop:2,animation:"dropIn .32s cubic-bezier(.22,1.2,.36,1)"}}>
                <div style={{height:6,background:b.state==="locked"?T.line:b.c}}/>
                <div style={{padding:16,display:"flex",gap:14}}>
                  <div style={{width:52,height:52,borderRadius:16,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                    background:b.state==="locked"?"#E4E3DF":b.c}}>
                    {b.state==="locked"?<Lock size={19} color={T.mute}/>:<Dia c="#fff" s={17}/>}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                      <div style={S.h(16)}>{b.n}</div>
                      {b.state==="earned" && <span style={{...S.mono(8,T.teal),fontWeight:700}}>EARNED · {b.when.toUpperCase()}</span>}
                      {b.state==="progress" && <span style={{...S.mono(8,b.c),fontWeight:700}}>{b.pct}% THERE</span>}
                      {b.state==="locked" && <span style={S.mono(8,T.mute)}>UNLOCKS {b.when.toUpperCase()}</span>}
                    </div>
                    <div style={{...S.b(12.5,T.gray),marginTop:5}}>{b.d}</div>
                    {b.state==="progress" && <div style={{marginTop:10,width:"90%"}}><Bar pct={b.pct} c={b.c} h={7}/></div>}
                    <div style={{...S.b(11,T.mute),marginTop:10,fontStyle:"italic"}}>{b.how}</div>
                  </div>
                </div>
              </div>); })()}
          </div>

          <div style={{...S.card,padding:16,borderRadius:18}}>
            <div style={S.mono(8.5,T.purple)}>MY GOALS</div>
            {me.goals.map(g=>(
              <div key={g} style={{display:"flex",gap:9,padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
                <Dia c={T.purple} s={8} style={{marginTop:5}}/><span style={{...S.b(13,T.ink),fontWeight:600}}>{g}</span>
              </div>))}
            <div style={{...S.mono(8.5,T.purple),marginTop:14}}>SKILLS</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:10}}>
              {me.skills.map(sk=><Chip key={sk} c={T.gray} bg={T.surface} style={{textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:11.5}}>{sk}</Chip>)}
            </div>
            <div style={{...S.b(10.5,T.mute),marginTop:12,fontStyle:"italic"}}>Edit these in Profile settings (gear, top right).</div>
          </div>

          {/* division standings, improved */}
          {settings.leaderboard!=="Off" && (
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:10}}>
                <div style={S.h(16)}>Division standings</div>
                <span style={S.mono(7.5,T.mute)}>Q3 · WEEK 6</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {[...org.divisions].map(d=>({...d,...DEPT_STATS(d.name)})).sort((a,b)=>b.pts-a.pts).slice(0,4).map((d,i)=>{
                  const mine = d.name==="Product";
                  const deltas=[120,85,60,25];
                  return (
                    <div key={d.name} style={{...S.card,padding:"13px 15px",borderRadius:16,display:"flex",alignItems:"center",gap:12,
                      border:mine?`1.5px solid ${T.purple}`:`1px solid ${T.line}`,background:mine?T.ptint:"#fff"}}>
                      <span style={{...S.h(17,i===0?T.amber:i===1?"#9B9995":i===2?"#A9714B":T.mute),width:22,textAlign:"center"}}>{i+1}</span>
                      <Dia c={d.color} s={10}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{...S.h(14)}}>{settings.leaderboard==="Anonymized"?`Team ${String.fromCharCode(65+i)}`:d.name}{mine&&<span style={{...S.mono(7,T.purple),marginLeft:8}}>YOUR DIVISION</span>}</div>
                        <div style={{...S.b(11,T.mute),marginTop:3}}>{d.pairs} pairs · {d.sess} sessions this week</div>
                        <div style={{marginTop:7,width:"92%"}}><Bar pct={(d.pts/1300)*100} c={d.color} h={5}/></div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{...S.h(15)}}>{d.pts.toLocaleString()}</div>
                        <div style={{...S.mono(7,T.teal),marginTop:2}}>▲ +{deltas[i]} WK</div>
                      </div>
                    </div>);
                })}
              </div>
            </div>)}
        </div>}

        {profileSet && draft && (
          <div style={{position:"absolute",inset:0,background:T.surface,zIndex:32,display:"flex",flexDirection:"column",animation:"frostIn .25s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",background:T.ink,color:"#fff"}}>
              <button onClick={()=>setProfileSet(false)} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:9,width:30,height:30,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={16}/></button>
              <div style={{...S.h(15,"#fff")}}>Profile settings</div>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>PROFILE PHOTO</div>
                <div style={{display:"flex",gap:10,marginTop:11}}>
                  {MAYA_PHOTO_OPTS.map((p,i)=>{
                    const on = ph1(draft.photo)===ph1(p);
                    return (
                      <button key={i} onClick={()=>setDraft(d=>({...d,photo:p}))} style={{border:on?`2.5px solid ${T.purple}`:`1.5px solid ${T.line}`,
                        background:"#fff",borderRadius:14,padding:2,cursor:"pointer",lineHeight:0,transform:on?"scale(1.06)":"none",transition:"all .18s"}}>
                        <Ava init="M" c={T.purple} s={46} fs={15} src={p}/>
                      </button>);
                  })}
                </div>
                <div style={{...S.b(10.5,T.mute),marginTop:9,fontStyle:"italic"}}>First option syncs from SSO. In production you can upload your own.</div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>IDENTITY</div>
                <div style={{marginTop:10}}>
                  <div style={S.mono(7,T.mute)}>DISPLAY NAME</div>
                  <input style={{...S.input,marginTop:6}} value={draft.name} onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/>
                </div>
                {[["Email","maya.o@northbound.com"],["Division",draft.division]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
                    <span style={S.b(12.5,T.mute)}>{k}</span><span style={{...S.b(12.5,T.ink),fontWeight:600}}>{v}</span>
                  </div>))}
                <div style={{...S.b(10.5,T.mute),marginTop:8,fontStyle:"italic"}}>Email and division come from Northbound SSO.</div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>MY GOALS</div>
                {draft.goals.map(g=>(
                  <div key={g} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
                    <Dia c={T.purple} s={7}/><span style={{...S.b(12.5,T.ink),fontWeight:600,flex:1}}>{g}</span>
                    <X size={13} color={T.mute} style={{cursor:"pointer"}} onClick={()=>setDraft(d=>({...d,goals:d.goals.filter(x=>x!==g)}))}/>
                  </div>))}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <input style={{...S.input,flex:1,padding:"9px 12px",fontSize:12.5}} placeholder="Add a goal" value={gIn} onChange={e=>setGIn(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&gIn.trim()){ setDraft(d=>({...d,goals:[...d.goals,gIn.trim()]})); setGIn(""); } }}/>
                  <Btn small kind="ink" onClick={()=>{ if(gIn.trim()){ setDraft(d=>({...d,goals:[...d.goals,gIn.trim()]})); setGIn(""); } }}><Plus size={14}/></Btn>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>SKILLS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:10}}>
                  {draft.skills.map(sk=>(
                    <span key={sk} style={{display:"inline-flex",alignItems:"center",gap:6,background:T.surface,border:`1px solid ${T.line}`,borderRadius:9,padding:"6px 10px"}}>
                      <span style={{...S.b(12,T.ink),fontWeight:600}}>{sk}</span>
                      <X size={11} color={T.mute} style={{cursor:"pointer"}} onClick={()=>setDraft(d=>({...d,skills:d.skills.filter(x=>x!==sk)}))}/>
                    </span>))}
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <input style={{...S.input,flex:1,padding:"9px 12px",fontSize:12.5}} placeholder="Add a skill" value={skIn} onChange={e=>setSkIn(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&skIn.trim()){ setDraft(d=>({...d,skills:[...d.skills,skIn.trim()]})); setSkIn(""); } }}/>
                  <Btn small kind="ink" onClick={()=>{ if(skIn.trim()){ setDraft(d=>({...d,skills:[...d.skills,skIn.trim()]})); setSkIn(""); } }}><Plus size={14}/></Btn>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>REMINDERS</div>
                {[["Session reminders","sessionRem"],["Streak nudges at 7 PM","streakRem"]].map(([l,k])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                    <span style={S.b(12.5,T.ink)}>{l}</span>
                    <Toggle on={prefs[k]} onChange={v=>setPrefs(p=>({...p,[k]:v}))}/>
                  </div>))}
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>VISIBILITY</div>
                {[["Badges visible to my manager","badgeVis"],["Show my wins on the cohort feed","feedVis"]].map(([l,k])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                    <span style={S.b(12.5,T.ink)}>{l}</span>
                    <Toggle on={prefs[k]} onChange={v=>setPrefs(p=>({...p,[k]:v}))}/>
                  </div>))}
                <div style={{...S.b(10.5,T.mute),marginTop:8,fontStyle:"italic"}}>Your Impact data is never on a public board. HR policy.</div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>SESSION AVAILABILITY</div>
                <div style={{marginTop:10}}>
                  <Seg small options={["Mornings","Afternoons","Flexible"]} value={prefs.avail} onChange={v=>setPrefs(p=>({...p,avail:v}))}/>
                </div>
                <div style={{...S.b(10.5,T.mute),marginTop:9,fontStyle:"italic"}}>Ritwik sees this when booking your sessions.</div>
              </div>
              <Btn style={{width:"100%"}} onClick={()=>{ st.setMenteeProfile(draft); setProfileSet(false); toast("Profile saved · visible everywhere instantly ✓"); }}>Save settings</Btn>
              <button onClick={()=>toast("Signed out (demo) · SSO handles this in production")} style={{border:"none",background:"transparent",cursor:"pointer",...S.b(12.5,T.coral),fontWeight:700,padding:"6px 0 14px"}}>Sign out</button>
            </div>
          </div>)}

        {statsOpen && (
          <div onClick={()=>setStatsOpen(false)} style={{position:"absolute",inset:0,zIndex:34,
            background:"rgba(240,240,244,.45)",backdropFilter:"blur(18px) saturate(1.6)",WebkitBackdropFilter:"blur(18px) saturate(1.6)",
            animation:"frostIn .3s ease",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"54px 14px"}}>
            <div onClick={e=>e.stopPropagation()} style={{width:"100%",borderRadius:24,overflow:"hidden",
              background:"rgba(255,255,255,.78)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",
              border:"1px solid rgba(255,255,255,.9)",boxShadow:"0 24px 60px rgba(45,37,128,.22)",
              animation:"glassPop .5s cubic-bezier(.22,1.4,.36,1)"}}>
              <div style={{padding:"16px 18px 6px"}}>
                <div style={{width:36,height:4,borderRadius:2,background:"rgba(26,26,26,.15)",margin:"0 auto 12px"}}/>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:46,height:46,borderRadius:15,background:T.ctint,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <Flame size={22} color={T.coral}/></div>
                  <div style={{flex:1}}>
                    <div style={S.h(17)}>{streak}-day streak</div>
                    <div style={S.b(11,T.gray)}>Personal best: 18 · next badge at 14 days</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:6,justifyContent:"space-between",marginTop:12}}>
                  {["F","S","S","M","T","W","T"].map((d,i)=>{
                    const today = i===6, lit = i<6 || daily.exercise;
                    return (
                      <div key={i} style={{flex:1,textAlign:"center"}}>
                        <div style={{aspectRatio:"1",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",
                          background:lit?T.coral:"rgba(26,26,26,.06)",border:today&&!lit?`1.5px dashed ${T.coral}`:"none",
                          animation:today&&!lit?"pulseDot 1.6s infinite":"none"}}>
                          <Flame size={13} color={lit?"#fff":T.mute}/>
                        </div>
                        <div style={{...S.mono(6.5,today?T.coral:T.mute),marginTop:4}}>{today?"NOW":d}</div>
                      </div>);
                  })}
                </div>
                {!daily.exercise && <div style={{...S.b(10.5,T.coral),marginTop:8,textAlign:"center",fontWeight:600}}>Today's exercise keeps the flame alive.</div>}
                <div style={{height:1,background:"rgba(26,26,26,.08)",margin:"14px 0"}}/>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{position:"relative",width:52,height:52,flexShrink:0}}>
                    <svg width="52" height="52" viewBox="0 0 52 52">
                      <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(91,79,207,.15)" strokeWidth="6"/>
                      <circle cx="26" cy="26" r="21" fill="none" stroke={T.purple} strokeWidth="6"
                        strokeDasharray="132" strokeDashoffset={132-132*(st.xp/1500)} transform="rotate(-90 26 26)"
                        style={{transition:"stroke-dashoffset .6s ease"}}/>
                    </svg>
                    <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                      <span style={{...S.mono(5.5,T.mute)}}>LVL</span><span style={S.h(13)}>4</span>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={S.h(17)}>{st.xp.toLocaleString()} XP</div>
                    <div style={S.b(11,T.gray)}>{1500-st.xp} to Level 5 · unlocks a custom badge frame</div>
                  </div>
                </div>
                <div style={{marginTop:10,background:"rgba(91,79,207,.06)",borderRadius:12,padding:"10px 12px"}}>
                  <div style={S.mono(7,T.purple)}>RECENT</div>
                  {[["Today","Positioning story","+25"],["Mon","60-second hello","+75"],["Mon","Two goals set","+50"]].map(([w,l,x])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}>
                      <span style={S.b(11.5,T.ink)}>{l} <span style={{color:T.mute}}>· {w}</span></span>
                      <span style={{...S.mono(9,T.teal),fontWeight:700}}>{x}</span>
                    </div>))}
                </div>
                <div style={{height:1,background:"rgba(26,26,26,.08)",margin:"14px 0"}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={S.b(12,T.ink)}>Program · Week 6 of 12</span>
                  <span style={S.mono(7.5,T.purple)}>50%</span>
                </div>
                <div style={{marginTop:7}}><Bar pct={50} c={T.purple}/></div>
              </div>
              <button onClick={()=>setStatsOpen(false)} style={{width:"100%",border:"none",cursor:"pointer",marginTop:12,
                padding:"13px 0",fontFamily:T.sans,fontWeight:700,fontSize:13,color:T.purple,
                background:"rgba(91,79,207,.08)"}}>Done</button>
            </div>
          </div>)}

        {flow && <TaskFlow flow={flow} onClose={()=>setFlow(null)} toast={toast}/>}

        {sheet?.type==="mentor" && (
          <MentorProfile inPhone m={sheet.data} onClose={()=>setSheet(null)} requested={false}
            onRequest={()=>doRequest(sheet.data)}/>)}
        {sheet?.type==="active" && (
          <MentorProfile inPhone m={sheet.data} onClose={()=>setSheet(null)}
            onMessage={()=>{ setSheet(null); setTab("chat"); }}/>)}
      </div>

      <TabBar tab={tab} setTab={setTab} tabs={[["home","Home",Home],["match","Mentors",Heart],["chat","Chat",MessageCircle],["profile","Profile",User]]}/>
    </PhoneFrame>
  );
}

function MentorApp({ org, settings, st, toast }) {
  const [tab, setTab] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [peer, setPeer] = useState(null);
  const [nettee, setNettee] = useState(null); /* mentee browsed from the network */
  const [exTab, setExTab] = useState("mentors"); /* explore: mentors | mentees */
  const [mq, setMq] = useState("");               /* mentee search */
  const [mdiv, setMdiv] = useState("All");        /* mentee division filter */
  const [invited, setInvited] = useState([]);     /* invited mentee ids */
  const netList = LOCAL_MENTEES.filter(m=>
    (mdiv==="All"||m.division===mdiv) &&
    (mq===""||m.name.toLowerCase().includes(mq.toLowerCase())||m.role.toLowerCase().includes(mq.toLowerCase())||m.skills.join(" ").toLowerCase().includes(mq.toLowerCase())));
  const [openReq, setOpenReq] = useState(null);
  const [qs, setQs] = useState(MENTORS[0].questions);
  const me = st.mentorProfile;
  const [manage, setManage] = useState(false);
  const [md, setMd] = useState(null); /* mentor profile draft */
  const [aIn,setAIn]=useState(""); const [skIn2,setSkIn2]=useState("");
  const [rT,setRT]=useState(""); const [rK,setRK]=useState("DOC"); const [tT,setTT]=useState(""); const [tL,setTL]=useState("");
  const myRequests = st.requests.filter(r=>r.mentorId==="m1" && r.status==="pending");
  const [openThread, setOpenThread] = useState(null);
  const cap = settings.capMode==="Deep"?settings.capDeep:settings.cohortCap;
  const mentees = settings.capMode==="Deep"?MENTEES.slice(0,Math.min(3,cap)):MENTEES;
  const threads = mentees.map(m=>({ key:`${m.id==="e1"?"maya":m.name.split(" ")[0].toLowerCase()}-ritwik`, m }));
  const sc = s=>s==="green"?T.teal:s==="amber"?T.amber:T.coral;

  return (
    <PhoneFrame>
      <div style={{background:T.ink,padding:"14px 16px 12px",color:"#fff"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={S.mono(7.5,T.lilac)}>{org.program} · MENTOR</div>
            <div style={{...S.h(17,"#fff"),marginTop:4}}>{tab==="home"?"Your mentees":tab==="explore"?"The Roster":tab==="chat"?"Messages":"Your impact"}</div>
          </div>
          <button onClick={()=>setTab("impact")} style={{border:"2px solid rgba(255,255,255,.35)",background:"transparent",borderRadius:12,padding:2,cursor:"pointer",lineHeight:0}} title="Your impact">
            <Ava init={initsOf(me.name)} c={T.purple} s={34} fs={12} src={me.photo}/>
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",position:"relative",background:T.surface}}>
        {tab==="home" && <div style={{padding:14,display:"flex",flexDirection:"column",gap:11}}>
          {myRequests.length>0 && (
            <div style={{...S.card,padding:14,border:`1.5px solid ${T.amber}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={S.mono(8,T.amber)}>ORBIT REQUESTS</span>
                <Chip c={T.amber} bg={T.atint}>{myRequests.length} NEW</Chip>
              </div>
              {myRequests.map(r=>(
                <div key={r.id} style={{borderBottom:`1px solid ${T.line}`,paddingBottom:10,marginBottom:4}}>
                  <div onClick={()=>setOpenReq(openReq===r.id?null:r.id)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",cursor:"pointer"}}>
                    <Ava init={r.from.init} c={T.deep} s={34} fs={12} src={r.from.photo}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={S.h(13)}>{r.from.name}</div>
                      <div style={S.b(10.5,T.mute)}>{r.from.role} · {r.from.division} · answered your 3 questions</div>
                    </div>
                    <ChevronRight size={15} color={T.mute} style={{transform:openReq===r.id?"rotate(90deg)":"none",transition:"transform .15s"}}/>
                  </div>
                  {openReq===r.id && (
                    <div style={{background:T.surface,borderRadius:12,padding:"11px 13px",marginTop:2}}>
                      {qs.map((q,i)=>(
                        <div key={i} style={{marginBottom:i<2?10:0}}>
                          <div style={{...S.mono(6.5,T.purple)}}>Q{i+1} · {q.toUpperCase().slice(0,44)}{q.length>44?"...":""}</div>
                          <div style={{...S.b(11.5,T.ink),marginTop:3}}>{r.answers[i]}</div>
                        </div>))}
                      <div style={{display:"flex",gap:8,marginTop:12}}>
                        <Btn small kind="ghost" style={{flex:1,color:T.coral,borderColor:T.coral}}
                          onClick={()=>{ st.setRequests(x=>x.filter(y=>y.id!==r.id)); toast("Passed, gently. They can reapply next cohort."); }}>Pass</Btn>
                        <Btn small style={{flex:1.4}}
                          onClick={()=>{ st.setRequests(x=>x.filter(y=>y.id!==r.id)); toast(`${r.from.name.split(" ")[0]} joins your Orbit 🎉 Chat opens on their side.`); }}>
                          Accept into Orbit</Btn>
                      </div>
                    </div>)}
                </div>))}
            </div>)}
          <div style={{...S.card,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={S.mono(8,T.purple)}>{settings.capMode==="Deep"?"DEEP MODE":"COHORT MODE"} · SET BY HR</span>
              <Chip>{settings.capMode==="Deep"?`${mentees.length}/${cap} SLOTS`:`30/${cap} SEATS`}</Chip>
            </div>
            <div style={{marginTop:9}}><Bar pct={settings.capMode==="Deep"?(mentees.length/cap)*100:60} c={T.purple}/></div>
          </div>
          <div style={{...S.card,padding:14}}>
            <div style={S.mono(8,T.purple)}>TAP A MENTEE FOR THEIR FULL PROFILE</div>
            {mentees.map((m,i)=>(
              <div key={m.id} onClick={()=>setSheet(m)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer",
                borderBottom:i<mentees.length-1?`1px solid ${T.line}`:"none"}}>
                <Ava init={m.init} c={T.deep} s={34} fs={12} src={m.photo}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={S.h(13)}>{m.name}</div>
                  <div style={S.b(10.5,T.mute)}>Wk {m.wk} · {m.streak}-day streak · {m.note}</div>
                </div>
                <span style={{width:9,height:9,borderRadius:"50%",background:sc(m.state),flexShrink:0}}/>
              </div>))}
          </div>
        </div>}

        {tab==="explore" && <div style={{padding:14,display:"flex",flexDirection:"column",gap:11}}>
          <div style={{...S.card,padding:16,background:T.deep,border:"none",color:"#fff"}}>
            <div style={S.mono(8,T.lilac)}>THE ROSTER · MENTORS ONLY</div>
            <div style={{...S.h(16,"#fff"),marginTop:7}}>An invitation-only community of {COMMUNITY.stats.mentors} mentors.</div>
            <div style={{display:"flex",gap:14,marginTop:12}}>
              {[["214","WORLDWIDE"],["12","CHAPTERS"],["6","AT NORTHBOUND"]].map(([n,l])=>(
                <div key={l}><div style={{...S.h(18,T.lilac)}}>{n}</div><div style={S.mono(6.5,"#9C93E8")}>{l}</div></div>))}
            </div>
          </div>

          <div style={{display:"flex",justifyContent:"center"}}>
            <Seg small options={["Mentors","Mentees"]} value={exTab==="mentors"?"Mentors":"Mentees"}
              onChange={v=>setExTab(v==="Mentors"?"mentors":"mentees")}/>
          </div>

          {exTab==="mentors" && <div style={{...S.card,padding:14}}>
            <div style={S.mono(8,T.purple)}>MENTORS NEAR YOU · TAP TO EXPLORE</div>
            {MENTORS.filter(m=>m.id!=="m1").map((m,i)=>(
              <div key={m.id} onClick={()=>setPeer(m)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer",
                borderBottom:i<2?`1px solid ${T.line}`:"none"}}>
                <Ava init={m.init} c={m.color} s={34} fs={12}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={S.h(13)}>{m.name}</div>
                  <div style={S.b(10.5,T.mute)}>{m.role} · {m.grads} developed</div>
                </div>
                <Chip c={T.gray} bg={T.surface}>{m.stats.tier}</Chip>
              </div>))}
          </div>}

          {exTab==="mentees" && <div style={{...S.card,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={S.mono(8,T.teal)}>MENTEES IN YOUR NETWORK</span>
              <Chip c={T.teal} bg={T.ttint}>{netList.length} FOUND</Chip>
            </div>
            <div style={{position:"relative",marginTop:10}}>
              <Search size={14} color={T.mute} style={{position:"absolute",left:11,top:11}}/>
              <input style={{...S.input,padding:"9px 12px 9px 32px",fontSize:12.5}} placeholder="Search name, role, or skill"
                value={mq} onChange={e=>setMq(e.target.value)}/>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:9}}>
              {["All",...org.divisions.map(d=>d.name)].map(d=>(
                <Chip key={d} onClick={()=>setMdiv(d)} c={mdiv===d?"#fff":T.gray} bg={mdiv===d?T.teal:T.surface}
                  style={{padding:"6px 11px",textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:11,cursor:"pointer"}}>{d}</Chip>))}
            </div>
            {netList.length===0
              ? <div style={{...S.b(12,T.mute),textAlign:"center",padding:"18px 0 8px"}}>No one matches. Try a different skill or division.</div>
              : netList.map((m,i)=>(
              <div key={m.id} onClick={()=>setNettee(m)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer",
                borderBottom:i<netList.length-1?`1px solid ${T.line}`:"none"}}>
                <Ava init={m.init} c={T.deep} s={34} fs={12} src={m.photo}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={S.h(13)}>{m.name}</div>
                  <div style={S.b(10.5,T.mute)}>{m.role} · {m.division}</div>
                </div>
                {m.id==="x1" ? <Chip c={T.amber} bg={T.atint}>APPLIED</Chip>
                 : invited.includes(m.id) ? <Chip c={T.teal} bg={T.ttint}>INVITED ✓</Chip>
                 : <Chip c={T.gray} bg={T.surface}>SEEKING</Chip>}
              </div>))}
            <div style={{...S.b(10.5,T.mute),marginTop:8,fontStyle:"italic"}}>Invites ask them to answer your 3 Orbit questions. Capacity rules still apply.</div>
          </div>}

          <div style={{...S.card,padding:14}}>
            <div style={S.mono(8,T.purple)}>ROSTER FEED</div>
            {COMMUNITY.posts.map((p,i)=>(
              <div key={p.who+p.when} style={{display:"flex",gap:10,padding:"11px 0",borderBottom:i<COMMUNITY.posts.length-1?`1px solid ${T.line}`:"none"}}>
                <Ava init={p.init} c={p.color} s={30} fs={10} src={p.photo}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{...S.b(12,T.ink)}}><b>{p.who}</b> · <span style={S.mono(7,T.mute)}>{p.when}</span></div>
                  <div style={{...S.b(12,T.gray),marginTop:3}}>{p.text}</div>
                  <div style={{marginTop:5}}><Chip c={T.teal} bg={T.ttint}>{p.tag}</Chip></div>
                </div>
              </div>))}
            <Btn small kind="ghost" style={{width:"100%",marginTop:10}} onClick={()=>toast("Composer opens: share a win, a resource, or a talk")}>
              <Plus size={13}/> Share with the Roster</Btn>
          </div>

          <div style={{...S.card,padding:14}}>
            <div style={S.mono(8,T.coral)}>ROSTER EVENTS</div>
            {COMMUNITY.events.map((ev,i)=>(
              <div key={ev.title} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<COMMUNITY.events.length-1?`1px solid ${T.line}`:"none"}}>
                <CalendarDays size={15} color={T.coral}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{...S.b(12.5,T.ink),fontWeight:700}}>{ev.title}</div>
                  <div style={S.b(10.5,T.mute)}>{ev.date} · {ev.who}</div>
                </div>
                <Btn small kind="teal" onClick={()=>toast(`RSVP'd: ${ev.title}`)}>RSVP</Btn>
              </div>))}
          </div>
        </div>}

        {tab==="chat" && (openThread
          ? <div style={{position:"absolute",inset:0}}>
              <ChatThread me="ritwik" other={{...openThread.m, color:T.deep}} thread={openThread.key}
                msgs={st.chat[openThread.key]||[]} onSend={st.send} onBack={()=>setOpenThread(null)}
                locked={openThread.key==="maya-ritwik" && st.stage1Done.length<STAGE1.length}
                lockNote="Maya unlocks this thread by completing Stage 1. You'll be notified the moment she does."/>
            </div>
          : <div style={{padding:14,display:"flex",flexDirection:"column",gap:12}}>
              <div style={{...S.card,padding:14}}>
                <div style={S.mono(8,T.purple)}>YOUR ORBIT · MENTEES</div>
                {threads.map((t,i)=>{
                  const locked = t.key==="maya-ritwik" && st.stage1Done.length<STAGE1.length;
                  const last = (st.chat[t.key]||[]).slice(-1)[0];
                  const md = MENTEES.find(x=>x.name===t.m.name);
                  return (
                    <div key={t.key} onClick={()=>setOpenThread({...t, m:{...t.m, photo:(MENTEES.find(x=>x.name===t.m.name)||{}).photo}})} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer",
                      borderBottom:i<threads.length-1?`1px solid ${T.line}`:"none"}}>
                      <Ava init={t.m.init} c={T.deep} s={36} fs={12} src={md?.photo}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={S.h(13)}>{t.m.name}</div>
                        <div style={{...S.b(11,T.mute),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {locked?"🔒 Unlocks after their Stage 1":last?last.text:"Say hello"}</div>
                      </div>
                      {locked?<Lock size={14} color={T.mute}/>:<MessageCircle size={15} color={T.purple}/>}
                    </div>);
                })}
              </div>
              <div style={{...S.card,padding:14}}>
                <div style={S.mono(8,T.teal)}>THE ROSTER · FELLOW MENTORS</div>
                {[{key:"ritwik-dana", m:MENTORS[1]}].map(t=>{
                  const last = (st.chat[t.key]||[]).slice(-1)[0];
                  return (
                    <div key={t.key} onClick={()=>setOpenThread({key:t.key, m:{name:t.m.name, init:t.m.init, color:t.m.color, photo:t.m.photo}})}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",cursor:"pointer"}}>
                      <Ava init={t.m.init} c={t.m.color} s={36} fs={12} src={t.m.photo}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={S.h(13)}>{t.m.name}</div>
                        <div style={{...S.b(11,T.mute),whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{last?last.text:"Say hello"}</div>
                      </div>
                      <MessageCircle size={15} color={T.teal}/>
                    </div>);
                })}
                <div style={{...S.b(10.5,T.mute),marginTop:6,fontStyle:"italic"}}>Peer threads from the Explore space land here.</div>
              </div>
            </div>)}

        {tab==="impact" && <div style={{padding:14,display:"flex",flexDirection:"column",gap:11}}>
          <div style={{...S.card,padding:14,display:"flex",alignItems:"center",gap:12}}>
            <Ava init={initsOf(me.name)} c={me.color} s={46} fs={15} src={me.photo}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={S.h(14.5)}>{me.name}</div>
              <div style={{...S.b(11,T.mute),marginTop:2}}>{me.role} · {me.skills.length} skills · {me.resources.length+me.talks.length} in library</div>
            </div>
            <Btn small onClick={()=>{ setMd({...me, skills:[...me.skills], achievements:[...me.achievements], resources:[...me.resources], talks:[...me.talks]}); setManage(true); }}>Manage profile</Btn>
          </div>
          <div style={{...S.card,padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={S.mono(8,T.purple)}>YOUR ORBIT · QUALIFYING QUESTIONS</span>
              <Chip>ASKED ON EVERY REQUEST</Chip>
            </div>
            <div style={{...S.b(11.5,T.gray),marginTop:8}}>Applicants answer these three before their request reaches you. Sharp questions filter for serious people.</div>
            {qs.map((q,i)=>(
              <div key={i} style={{marginTop:10}}>
                <div style={S.mono(7,T.mute)}>QUESTION {i+1}</div>
                <input style={{...S.input,marginTop:5,padding:"10px 12px",fontSize:12.5}} value={q}
                  onChange={e=>setQs(v=>v.map((x,j)=>j===i?e.target.value:x))}/>
              </div>))}
            <Btn small style={{width:"100%",marginTop:12}} onClick={()=>toast("Orbit questions saved · live on your profile")}>Save questions</Btn>
          </div>
          <div style={{...S.card,background:T.deep,border:"none",color:"#fff",padding:16}}>
            <div style={S.mono(8,T.lilac)}>YOUR IMPACT SCORE</div>
            <div style={{fontFamily:T.sans,fontWeight:700,fontSize:46,color:T.lilac,letterSpacing:"-0.04em",lineHeight:1,marginTop:6}}>847</div>
            <div style={{...S.mono(7.5,"#9C93E8"),marginTop:6}}>11 DEVELOPED · ▲ 63 THIS QUARTER</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginTop:13}}>
              {["SCOUT","PATHFINDER","ARCHITECT","LEGEND"].map((t,i)=>(
                <div key={t} style={{height:24,background:i<=1?T.purple:"#3A3470",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={S.mono(6,i<=1?"#fff":"#6f68a8")}>{t}</span></div>))}
            </div>
            <div style={{...S.b(10.5,"#9C93E8"),marginTop:9,fontStyle:"italic"}}>Visible to you and HR. {settings.leaderboard==="Department"?"Divisions compete; individuals don't.":"Rankings per HR policy."}</div>
          </div>
          <div style={{...S.card,padding:14}}>
            <div style={S.mono(8,T.purple)}>THIS WEEK</div>
            {[["Session with Maya · Thu 16:30","Agenda auto-built from Week 6"],["Office hours · Thu 16:00","12 signed up from Product"],["Chloe flagged amber","No session in 11 days"]].map(([a,b])=>(
              <div key={a} style={{padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
                <div style={{...S.b(12.5,T.ink),fontWeight:600}}>{a}</div><div style={S.b(10.5,T.mute)}>{b}</div>
              </div>))}
          </div>
        </div>}

        {manage && md && (
          <div style={{position:"absolute",inset:0,background:T.surface,zIndex:32,display:"flex",flexDirection:"column",animation:"frostIn .25s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",background:T.ink,color:"#fff"}}>
              <button onClick={()=>setManage(false)} style={{border:"none",background:"rgba(255,255,255,.15)",borderRadius:9,width:30,height:30,cursor:"pointer",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={16}/></button>
              <div style={{...S.h(15,"#fff")}}>Manage profile</div>
              <span style={{...S.mono(6.5,T.lilac),marginLeft:"auto"}}>MENTEES SEE CHANGES INSTANTLY</span>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>PHOTO</div>
                <div style={{display:"flex",gap:10,marginTop:11}}>
                  {RITWIK_PHOTO_OPTS.map((p,i)=>{
                    const on = ph1(md.photo)===ph1(p);
                    return (
                      <button key={i} onClick={()=>setMd(d=>({...d,photo:p}))} style={{border:on?`2.5px solid ${T.purple}`:`1.5px solid ${T.line}`,
                        background:"#fff",borderRadius:14,padding:2,cursor:"pointer",lineHeight:0,transform:on?"scale(1.06)":"none",transition:"all .18s"}}>
                        <Ava init="R" c={T.deep} s={46} fs={15} src={p}/>
                      </button>);
                  })}
                </div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>IDENTITY</div>
                <div style={{marginTop:10}}><div style={S.mono(7,T.mute)}>DISPLAY NAME</div>
                  <input style={{...S.input,marginTop:6}} value={md.name} onChange={e=>setMd(d=>({...d,name:e.target.value}))}/></div>
                <div style={{marginTop:10}}><div style={S.mono(7,T.mute)}>HEADLINE</div>
                  <input style={{...S.input,marginTop:6}} value={md.role} onChange={e=>setMd(d=>({...d,role:e.target.value}))}/></div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>ABOUT</div>
                <textarea style={{...S.input,minHeight:84,resize:"vertical",marginTop:10}} value={md.about} onChange={e=>setMd(d=>({...d,about:e.target.value}))}/>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>SKILLS</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:10}}>
                  {md.skills.map(sk=>(
                    <span key={sk} style={{display:"inline-flex",alignItems:"center",gap:6,background:T.surface,border:`1px solid ${T.line}`,borderRadius:9,padding:"6px 10px"}}>
                      <span style={{...S.b(12,T.ink),fontWeight:600}}>{sk}</span>
                      <X size={11} color={T.mute} style={{cursor:"pointer"}} onClick={()=>setMd(d=>({...d,skills:d.skills.filter(x=>x!==sk)}))}/>
                    </span>))}
                </div>
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <input style={{...S.input,flex:1,padding:"9px 12px",fontSize:12.5}} placeholder="Add a skill" value={skIn2} onChange={e=>setSkIn2(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&skIn2.trim()){ setMd(d=>({...d,skills:[...d.skills,skIn2.trim()]})); setSkIn2(""); } }}/>
                  <Btn small kind="ink" onClick={()=>{ if(skIn2.trim()){ setMd(d=>({...d,skills:[...d.skills,skIn2.trim()]})); setSkIn2(""); } }}><Plus size={14}/></Btn>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>TRACK RECORD</div>
                {md.achievements.map(a=>(
                  <div key={a} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
                    <Dia c={md.color} s={7}/><span style={{...S.b(12.5,T.ink),flex:1}}>{a}</span>
                    <X size={13} color={T.mute} style={{cursor:"pointer"}} onClick={()=>setMd(d=>({...d,achievements:d.achievements.filter(x=>x!==a)}))}/>
                  </div>))}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <input style={{...S.input,flex:1,padding:"9px 12px",fontSize:12.5}} placeholder="Add an achievement" value={aIn} onChange={e=>setAIn(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&aIn.trim()){ setMd(d=>({...d,achievements:[...d.achievements,aIn.trim()]})); setAIn(""); } }}/>
                  <Btn small kind="ink" onClick={()=>{ if(aIn.trim()){ setMd(d=>({...d,achievements:[...d.achievements,aIn.trim()]})); setAIn(""); } }}><Plus size={14}/></Btn>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>LIBRARY · RESOURCES</div>
                {md.resources.map(r=>(
                  <div key={r.t} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
                    <span style={{...S.b(12.5,T.ink),fontWeight:600,flex:1}}>{r.t}</span><Chip c={T.teal} bg={T.ttint}>{r.type}</Chip>
                    <X size={13} color={T.mute} style={{cursor:"pointer"}} onClick={()=>setMd(d=>({...d,resources:d.resources.filter(x=>x.t!==r.t)}))}/>
                  </div>))}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <input style={{...S.input,flex:1,padding:"9px 12px",fontSize:12.5}} placeholder="Resource title" value={rT} onChange={e=>setRT(e.target.value)}/>
                  <select style={{...S.input,width:92,padding:"9px 8px",fontSize:12}} value={rK} onChange={e=>setRK(e.target.value)}>
                    {["DOC","FIGMA","SHEET","LINK"].map(k=><option key={k}>{k}</option>)}
                  </select>
                  <Btn small kind="ink" onClick={()=>{ if(rT.trim()){ setMd(d=>({...d,resources:[...d.resources,{t:rT.trim(),type:rK}]})); setRT(""); toast("Resource added to draft"); } }}><Plus size={14}/></Btn>
                </div>
              </div>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>LIBRARY · TALKS</div>
                {md.talks.map(t=>(
                  <div key={t.t} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 0",borderBottom:`1px solid ${T.line}`}}>
                    <span style={{...S.b(12.5,T.ink),fontWeight:600,flex:1}}>▶ {t.t}</span><span style={S.mono(8,T.mute)}>{t.len}</span>
                    <X size={13} color={T.mute} style={{cursor:"pointer"}} onClick={()=>setMd(d=>({...d,talks:d.talks.filter(x=>x.t!==t.t)}))}/>
                  </div>))}
                <div style={{display:"flex",gap:8,marginTop:10}}>
                  <input style={{...S.input,flex:1,padding:"9px 12px",fontSize:12.5}} placeholder="Talk title" value={tT} onChange={e=>setTT(e.target.value)}/>
                  <input style={{...S.input,width:74,padding:"9px 8px",fontSize:12}} placeholder="12 min" value={tL} onChange={e=>setTL(e.target.value)}/>
                  <Btn small kind="ink" onClick={()=>{ if(tT.trim()){ setMd(d=>({...d,talks:[...d.talks,{t:tT.trim(),len:tL.trim()||"5 min"}]})); setTT(""); setTL(""); } }}><Plus size={14}/></Btn>
                </div>
              </div>
              <Btn style={{width:"100%"}} onClick={()=>{ st.setMentorProfile(md); setManage(false); toast("Profile published · Maya's app updated instantly"); }}>Publish changes</Btn>
            </div>
          </div>)}

        {nettee && <MenteeProfile inPhone e={nettee} onClose={()=>setNettee(null)}
          onInvite={nettee.id==="x1"||invited.includes(nettee.id)?undefined:()=>{
            setInvited(v=>[...v,nettee.id]);
            toast(`Invitation sent · ${nettee.name.split(" ")[0]} will answer your 3 Orbit questions`);
            setNettee(null); }}/>}
        {peer && <MentorProfile inPhone m={peer} onClose={()=>setPeer(null)}
          onConnect={()=>{ toast(`Intro request sent to ${peer.name.split(" ")[0]} via the Roster`); setPeer(null); }}/>}
        {sheet && <MenteeProfile inPhone e={sheet} onClose={()=>setSheet(null)}
          onMessage={()=>{ const key = sheet.id==="e1"?"maya-ritwik":`${sheet.name.split(" ")[0].toLowerCase()}-ritwik`;
            setSheet(null); setTab("chat"); setOpenThread({key, m:sheet}); }}/>}
      </div>

      <TabBar tab={tab} setTab={setTab} tabs={[["home","Mentees",Users],["explore","Explore",Search],["chat","Chat",MessageCircle],["impact","Impact",Sparkles]]}/>
    </PhoneFrame>
  );
}


/* ================= JOIN FLOW: chat-style 60-second onboarding ================= */
function JoinFlow({ org, onClose, onComplete, toast }) {
  const [msgs, setMsgs] = useState([]);
  const [mode, setMode] = useState("none");
  const [chips, setChips] = useState([]);
  const [txt, setTxt] = useState("");
  const [multi, setMulti] = useState([]);
  const [p, setP] = useState({ role:null, name:"", photo:null, goal:"", headline:"", focus:[], resource:"", cap:null });
  const [stepId, setStepId] = useState("role");
  const [final, setFinal] = useState(null);
  const [secs, setSecs] = useState(0);
  const boxRef = useRef(null);
  useEffect(()=>{ const t=setInterval(()=>setSecs(x=>x+1),1000); return ()=>clearInterval(t); },[]);
  useEffect(()=>{
    const go = () => { if(boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; };
    go(); const t1=setTimeout(go,120); const t2=setTimeout(go,450);
    return ()=>{ clearTimeout(t1); clearTimeout(t2); };
  },[msgs.length, mode]);

  const bot = (text, nextMode, nextChips=[]) => {
    setMode("none");
    setTimeout(()=>{ setMsgs(m=>[...m,{from:"bot",text}]); setChips(nextChips); setMode(nextMode); }, 320);
  };
  const mine = (text, node) => setMsgs(m=>[...m,{from:"me",text,node}]);

  useEffect(()=>{ bot(`Welcome to ${org.program} 👋 Your invite code checked out. Let's get you profile-ready in under a minute. Are you here to mentor, to be mentored, or both?`, "chips", ["Mentee","Mentor","Both"]); },[]);

  const finish = (fp) => {
    setStepId("ready"); setMode("none"); setFinal(fp);
    setTimeout(()=>{ setMsgs(m=>[...m,{from:"bot",ready:true,p:fp}]); setMode("done"); }, 380);
  };
  const answer = (val, display, node) => {
    mine(display ?? (Array.isArray(val)?val.join(" · "):val), node);
    if (stepId==="role") {
      setP(x=>({...x, role:val})); setStepId("name");
      bot("Love it. What should people call you?", "text");
    } else if (stepId==="name") {
      setP(x=>({...x, name:val})); setStepId("photo");
      bot(`Nice to meet you, ${val.split(" ")[0]}. Pick a face, or upload your own. You can change it anytime.`, "photos");
    } else if (stepId==="photo") {
      setP(x=>({...x, photo:val}));
      if (p.role==="Mentee") { setStepId("goal"); bot("What's the one thing you want out of the next 12 weeks? Honest beats polished.", "text"); }
      else { setStepId("headline"); bot("One line: what do you mentor on?", "text"); }
    } else if (stepId==="goal") {
      const fp = {...p, goal:val};
      setP(fp); setStepId("focus");
      bot("Last one. Pick up to 3 focus areas so matching can do its magic.", "multi");
    } else if (stepId==="headline") {
      setP(x=>({...x, headline:val})); setStepId("resource");
      bot("Got a link to one resource you'd share with mentees? A doc, a deck, anything. Or skip for now.", "link");
    } else if (stepId==="resource") {
      setP(x=>({...x, resource:val==="__skip__"?"":val})); setStepId("cap");
      bot("How many mentees at once feels right?", "chips", ["1","2","3"]);
    } else if (stepId==="cap") {
      const fp = {...p, cap:val};
      setP(fp);
      if (p.role==="Both") { setStepId("goal2"); bot("And for your own growth: what is one thing YOU want out of the next 12 weeks?", "text"); }
      else finish(fp);
    } else if (stepId==="goal2") {
      finish({...p, goal:val});
    } else if (stepId==="focus") {
      finish({...p, focus:val});
    }
  };
  const readiness = fp => {
    const items = [["Photo",!!fp.photo],["Name",!!fp.name],
      fp.role==="Mentee"?["First goal",!!fp.goal]:["Headline",!!fp.headline],
      fp.role==="Mentee"?["Focus areas",fp.focus.length>0]:["Resource",!!fp.resource]];
    const pct = Math.round(items.filter(i=>i[1]).length/items.length*100);
    return {items,pct};
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:80,background:"rgba(26,26,26,.5)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}>
        <PhoneFrame>
          <div style={{background:T.purple,padding:"13px 16px",color:"#fff",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div>
              <div style={S.mono(7.5,T.lilac)}>{org.name.toUpperCase()} · JOIN</div>
              <div style={{...S.h(15,"#fff"),marginTop:3}}>Set up your profile</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{...S.mono(9,"#fff")}}>0:{String(secs).padStart(2,"0")}</div>
              <div style={S.mono(6,T.lilac)}>UNDER A MINUTE</div>
            </div>
          </div>

          <div ref={boxRef} style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:9,background:T.surface}}>
            {msgs.map((m,i)=> m.ready ? (
              (()=>{ const r = readiness(m.p); return (
                <div key={i} style={{...S.card,padding:0,overflow:"hidden",borderRadius:18,animation:"dropIn .4s cubic-bezier(.22,1.2,.36,1)"}}>
                  <div style={{height:6,background:r.pct===100?T.teal:T.amber}}/>
                  <div style={{padding:16,textAlign:"center"}}>
                    <div style={{display:"flex",justifyContent:"center"}}><Ava init={initsOf(m.p.name||"You")} c={T.purple} s={58} fs={19} src={m.p.photo}/></div>
                    <div style={{...S.h(17),marginTop:9}}>{m.p.name}</div>
                    <div style={{...S.mono(7.5,T.mute),marginTop:4}}>{m.p.role==="Mentee"?"MENTEE":m.p.role==="Both"?"MENTOR + MENTEE":"MENTOR"} · {org.name.toUpperCase()}</div>
                    {m.p.headline && <div style={{...S.b(12,T.gray),marginTop:7,fontStyle:"italic"}}>"{m.p.headline}"</div>}
                    {m.p.goal && <div style={{...S.b(12,T.gray),marginTop:7}}>Goal: {m.p.goal}</div>}
                    {m.p.focus.length>0 && <div style={{display:"flex",gap:5,justifyContent:"center",flexWrap:"wrap",marginTop:9}}>
                      {m.p.focus.map(f=><Chip key={f} c={T.gray} bg={T.surface} style={{textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:10.5}}>{f}</Chip>)}</div>}
                    {m.p.resource && <div style={{...S.b(11,T.teal),marginTop:8,fontWeight:600}}>📎 {m.p.resource} added to your library</div>}
                    <div style={{display:"flex",alignItems:"center",gap:12,marginTop:14,background:T.surface,borderRadius:12,padding:"11px 13px",textAlign:"left"}}>
                      <div style={{position:"relative",width:44,height:44,flexShrink:0}}>
                        <svg width="44" height="44" viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r="18" fill="none" stroke="#E2E0F5" strokeWidth="5"/>
                          <circle cx="22" cy="22" r="18" fill="none" stroke={r.pct===100?T.teal:T.amber} strokeWidth="5" strokeLinecap="round"
                            strokeDasharray="113" strokeDashoffset={113-113*(r.pct/100)} transform="rotate(-90 22 22)"/>
                        </svg>
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",...S.h(10)}}>{r.pct}%</div>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{...S.h(12.5)}}>Profile readiness</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px",marginTop:4}}>
                          {r.items.map(([l,ok])=>(
                            <span key={l} style={{...S.mono(6.5,ok?T.teal:T.amber)}}>{ok?"✓":"○"} {l.toUpperCase()}</span>))}
                        </div>
                      </div>
                    </div>
                    <Btn style={{width:"100%",marginTop:12}} onClick={()=>{ onComplete(m.p, r.pct); }}>Enter {org.program} →</Btn>
                  </div>
                </div>); })()
            ) : (
              <div key={i} style={{alignSelf:m.from==="me"?"flex-end":"flex-start",maxWidth:"82%",
                background:m.from==="me"?T.purple:"#fff",color:m.from==="me"?"#fff":T.ink,
                border:m.from==="me"?"none":`1px solid ${T.line}`,borderRadius:15,padding:"10px 13px",
                fontFamily:T.sans,fontSize:13,lineHeight:1.5,animation:"cardIn .25s ease"}}>
                {m.node || m.text}
              </div>
            ))}
            {mode==="none" && msgs.length>0 && stepId!=="ready" && (
              <div style={{alignSelf:"flex-start",background:"#fff",border:`1px solid ${T.line}`,borderRadius:15,padding:"11px 15px"}}>
                <span className="typing"><span/><span/><span/></span>
              </div>)}
          </div>

          <div style={{padding:12,background:"#fff",borderTop:`1px solid ${T.line}`}}>
            {mode==="chips" && (
              <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center"}}>
                {chips.map(c=><Btn key={c} small kind={c==="Mentee"?"solid":"ghost"} onClick={()=>answer(c)}>{c}</Btn>)}
              </div>)}
            {(mode==="text"||mode==="link") && (
              <div style={{display:"flex",gap:8}}>
                <input autoFocus style={{...S.input,flex:1,padding:"10px 13px"}} placeholder={mode==="link"?"https://... or skip":"Type here"}
                  value={txt} onChange={e=>setTxt(e.target.value)}
                  onKeyDown={e=>{ if(e.key==="Enter"&&txt.trim()){ answer(txt.trim()); setTxt(""); } }}/>
                {mode==="link" && <Btn small kind="ghost" onClick={()=>answer("__skip__","Skip for now")}>Skip</Btn>}
                <Btn small onClick={()=>{ if(txt.trim()){ answer(txt.trim()); setTxt(""); } }}><Send size={14}/></Btn>
              </div>)}
            {mode==="photos" && (
              <div style={{display:"flex",gap:9,justifyContent:"center",alignItems:"center"}}>
                {JOIN_PHOTOS.map((ph,i)=>(
                  <button key={i} onClick={()=>answer(ph,"That one ✓",<Ava init="✓" c={T.deep} s={44} fs={14} src={ph}/>)}
                    style={{border:`1.5px solid ${T.line}`,background:"#fff",borderRadius:14,padding:2,cursor:"pointer",lineHeight:0}}>
                    <Ava init="?" c={T.deep} s={46} fs={14} src={ph}/>
                  </button>))}
                <button onClick={()=>toast("Camera roll opens in production · pick a preset for the demo")}
                  style={{width:52,height:52,border:`1.5px dashed ${T.line}`,background:T.surface,borderRadius:14,cursor:"pointer",
                    display:"flex",alignItems:"center",justifyContent:"center"}}><Plus size={17} color={T.mute}/></button>
              </div>)}
            {mode==="multi" && (
              <div>
                <div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"center"}}>
                  {FOCUS_OPTS.map(f=>{
                    const on = multi.includes(f);
                    return <Chip key={f} onClick={()=>setMulti(v=>on?v.filter(x=>x!==f):v.length<3?[...v,f]:v)}
                      c={on?"#fff":T.gray} bg={on?T.purple:T.surface}
                      style={{padding:"8px 12px",textTransform:"none",letterSpacing:0,fontFamily:T.sans,fontSize:12,cursor:"pointer"}}>{f}</Chip>;
                  })}
                </div>
                <Btn style={{width:"100%",marginTop:10}} disabled={multi.length===0}
                  onClick={()=>{ const sel=[...multi]; setMulti([]); answer(sel); }}>
                  Lock in {multi.length||""} focus area{multi.length===1?"":"s"}</Btn>
              </div>)}
            {mode==="done" && final && (()=>{ const r = readiness(final); return (
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{textAlign:"center",flexShrink:0}}>
                  <div style={{...S.h(15,r.pct===100?T.teal:T.amber)}}>{r.pct}%</div>
                  <div style={S.mono(5.5,T.mute)}>READY</div>
                </div>
                <Btn style={{flex:1}} onClick={()=>onComplete(final, r.pct)}>Enter {org.program} →</Btn>
              </div>); })()}
            {mode==="none" && <div style={{...S.b(11,T.mute),textAlign:"center"}}>···</div>}
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

/* ================= ADMIN CONSOLE ================= */
function Console({ org, setOrg, settings, setSettings, st, toast }) {
  const [nav, setNav] = useState("dashboard");
  const [modal, setModal] = useState(null); // program | session | invite
  const [person, setPerson] = useState(null); // {type, data}
  const [peopleFilter, setPeopleFilter] = useState("All");
  const [q, setQ] = useState("");
  const set = (k,v)=>setSettings(s=>({...s,[k]:v}));

  /* forms */
  const [joinPrev, setJoinPrev] = useState(false);
  const [pf, setPf] = useState({ name:"", division:"All", mode:settings.capMode, weeks:"12" });
  const [sf, setSf] = useState({ title:"", type:"Office hours", host:MENTORS[0].name, date:"", who:"All participants" });
  const [inv, setInv] = useState({ kind:"Employees", emails:"", role:"Mentee", partner:"" });

  const people = useMemo(()=>{
    const rows = [
      ...MENTORS.map(m=>({type:"mentor",data:m,name:m.name,division:m.division,role:"Mentor",status:`${m.grads} developed · ${m.stats.tier}`})),
      ...MENTEES.map(e=>({type:"mentee",data:e,name:e.name,division:e.division,role:"Mentee",status:e.state==="amber"?"At risk":`Wk ${e.wk} · on track`})),
    ];
    return rows.filter(r=>(peopleFilter==="All"||r.division===peopleFilter)&&(q===""||r.name.toLowerCase().includes(q.toLowerCase())));
  },[peopleFilter,q]);

  const NAV = [["dashboard","Dashboard",LayoutDashboard],["people","People",Users],["programs","Programs",FolderKanban],
    ["sessions","Sessions",CalendarDays],["invites","Invites",Send],["settings","Settings",Settings]];

  return (
    <div style={{display:"flex",background:"#fff",border:`1px solid ${T.line}`,borderRadius:22,overflow:"hidden",minHeight:640}}>
      {/* sidebar */}
      <div style={{width:198,background:T.ink,padding:"18px 12px",display:"flex",flexDirection:"column",gap:3,flexShrink:0}}>
        <div style={{padding:"2px 10px 14px"}}>
          <div style={{fontFamily:T.sans,fontWeight:700,fontSize:17,color:"#fff",letterSpacing:"-0.02em"}}>RYZN</div>
          <div style={{...S.mono(6.5,T.lilac),marginTop:2}}>FOR TEAMS · CONSOLE</div>
        </div>
        {NAV.map(([id,label,Icon])=>(
          <button key={id} onClick={()=>setNav(id)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 11px",
            border:"none",borderRadius:10,cursor:"pointer",textAlign:"left",transition:"background .15s",
            background:nav===id?T.purple:"transparent"}}>
            <Icon size={16} color={nav===id?"#fff":"#8B8985"}/>
            <span style={{fontFamily:T.sans,fontWeight:600,fontSize:12.5,color:nav===id?"#fff":"#B5B3AE"}}>{label}</span>
          </button>))}
        <div style={{marginTop:"auto",padding:"12px 10px",borderTop:"1px solid #2c2c2c",display:"flex",alignItems:"center",gap:9}}>
          <Ava init="PA" c={T.amber} s={28} fs={10} src={PHOTOS.priya}/>
          <div><div style={{...S.b(11,"#B5B3AE"),fontWeight:600}}>{org.admin||"Priya Anand"}</div>
          <div style={S.mono(6.5,T.mute)}>ORG ADMIN</div></div>
        </div>
      </div>

      {/* main */}
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:`1px solid ${T.line}`}}>
          <div>
            <div style={S.h(16)}>{org.name}</div>
            <div style={S.mono(7.5,T.mute)}>{org.industry?.toUpperCase()} · {org.size} · SSO ON</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {nav==="programs"&&<Btn small onClick={()=>setModal("program")}><Plus size={14}/> New program</Btn>}
            {nav==="sessions"&&<Btn small onClick={()=>setModal("session")}><Plus size={14}/> New session</Btn>}
            {nav==="invites"&&<><Btn small kind="ghost" onClick={()=>setJoinPrev(true)}><Sparkles size={14}/> Preview join experience</Btn><Btn small onClick={()=>setModal("invite")}><Send size={14}/> Send invites</Btn></>}
            <Btn small kind="ghost" onClick={()=>toast("3 notifications: 1 approval, 2 at-risk pairs")}><Bell size={14}/></Btn>
          </div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:18,background:T.surface}}>
          {/* ---------- DASHBOARD ---------- */}
          {nav==="dashboard" && <div style={{display:"flex",flexDirection:"column",gap:13}}>
            {(()=>{ const items=[
                ["SSO connected",true],["Roster imported · 50 people",true],
                ["All mentors approved", st.approvals.length===0],["Success criteria agreed",true],
                ["Kickoff scheduled · Mon Jul 27",true],["Baseline survey sent",true]];
              const done=items.filter(x=>x[1]).length; const ready=done===items.length;
              return (
                <div style={{...S.card,border:`1.5px solid ${ready?T.teal:T.amber}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={S.mono(8.5,ready?T.teal:T.amber)}>PILOT READINESS · {done} OF {items.length}</span>
                    {ready
                      ? <Btn small kind="teal" onClick={()=>toast("Pilot marked ready · 90-day clock starts at kickoff 🚀")}>Mark pilot ready</Btn>
                      : <Chip c={T.amber} bg={T.atint}>ACTION NEEDED</Chip>}
                  </div>
                  <div style={{marginTop:10}}><Bar pct={(done/items.length)*100} c={ready?T.teal:T.amber}/></div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 14px",marginTop:12}}>
                    {items.map(([l,ok])=>(
                      <div key={l} style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:16,height:16,borderRadius:5,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                          background:ok?T.teal:T.atint,border:ok?"none":`1.5px solid ${T.amber}`}}>{ok&&<Check size={10} color="#fff"/>}</div>
                        <span style={{...S.b(11.5,ok?T.ink:T.amber),fontWeight:ok?500:700}}>{l}{!ok&&" → People tab"}</span>
                      </div>))}
                  </div>
                </div>); })()}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {[["Pairs active","46/50",T.teal,92],["Stage-1 done","88%",T.teal,88],["Sessions this wk","61",T.purple,76],["At risk",String(st.atRisk.filter(a=>!a.nudged).length),T.coral,null]].map(([l,v,c,pct])=>(
                <div key={l} style={{...S.card,padding:14}}>
                  <div style={S.mono(7.5,T.mute)}>{l.toUpperCase()}</div>
                  <div style={{...S.h(23,c),marginTop:5}}>{v}</div>
                  {pct!==null&&<div style={{marginTop:8}}><Bar pct={pct} c={c}/></div>}
                </div>))}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:12}}>
              <div style={S.card}>
                <div style={S.mono(8.5,T.purple)}>DIVISION ENGAGEMENT</div>
                {org.divisions.map((d,i)=>{
                  const stt=DEPT_STATS(d.name);
                  return (
                    <div key={d.name} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:i<org.divisions.length-1?`1px solid ${T.line}`:"none"}}>
                      <Dia c={d.color} s={8}/>
                      <span style={{...S.b(13,T.ink),fontWeight:600,width:96}}>{d.name}</span>
                      <div style={{flex:1}}><Bar pct={(stt.pts/1300)*100} c={d.color}/></div>
                      <span style={S.mono(8,T.mute)}>{stt.pairs} PAIRS</span>
                    </div>);
                })}
              </div>
              <div style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={S.mono(8.5,T.coral)}>AT-RISK PAIRS</div>
                  <Chip c={T.coral} bg={T.ctint}>10+ DAYS QUIET</Chip>
                </div>
                {st.atRisk.map((a,i)=>(
                  <div key={a.pair} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 0",borderBottom:i<st.atRisk.length-1?`1px solid ${T.line}`:"none"}}>
                    <Dia c={a.nudged?T.teal:T.coral} s={8}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{...S.b(12.5,T.ink),fontWeight:600}}>{a.pair}</div>
                      <div style={S.b(10.5,T.mute)}>{a.division} · {a.days} days</div>
                    </div>
                    {a.nudged?<span style={S.mono(7.5,T.teal)}>NUDGED ✓</span>:
                      <Btn small kind="teal" onClick={()=>{ st.setAtRisk(r=>r.map(x=>x.pair===a.pair?{...x,nudged:true}:x)); toast("Nudge sent to both sides"); }}>Nudge</Btn>}
                  </div>))}
              </div>
            </div>
            <div style={{display:"flex",gap:9}}>
              <Btn small kind="ink" onClick={()=>toast("Results report exported · CSV + PDF")}>Export results report</Btn>
              <Btn small kind="ghost" onClick={()=>toast("Development summaries queued for review cycle")}>Send to review cycle</Btn>
            </div>
          </div>}

          {/* ---------- PEOPLE ---------- */}
          {nav==="people" && <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:1,minWidth:180}}>
                <Search size={14} color={T.mute} style={{position:"absolute",left:12,top:12}}/>
                <input style={{...S.input,paddingLeft:34,padding:"10px 12px 10px 34px"}} placeholder="Search people" value={q} onChange={e=>setQ(e.target.value)}/>
              </div>
              <Seg small options={["All",...org.divisions.map(d=>d.name)]} value={peopleFilter} onChange={setPeopleFilter}/>
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>TEAM · CLICK ANY ROW FOR THE FULL PROFILE</div>
              {people.map((r,i)=>(
                <div key={r.name} onClick={()=>setPerson(r)} style={{display:"grid",gridTemplateColumns:"34px 1.3fr 1fr .7fr 1.1fr",gap:10,alignItems:"center",
                  padding:"10px 0",borderBottom:i<people.length-1?`1px solid ${T.line}`:"none",cursor:"pointer"}}>
                  <Ava init={r.data.init} c={r.type==="mentor"?r.data.color:T.deep} s={30} fs={10.5} src={r.data.photo}/>
                  <span style={{...S.b(13,T.ink),fontWeight:600}}>{r.name}</span>
                  <span style={S.b(12,T.mute)}>{r.division}</span>
                  <Chip c={r.role==="Mentor"?T.teal:T.purple} bg={r.role==="Mentor"?T.ttint:T.ptint}>{r.role.toUpperCase()}</Chip>
                  <span style={{...S.b(11.5,r.status==="At risk"?T.coral:T.gray),textAlign:"right"}}>{r.status}</span>
                </div>))}
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.amber)}>MENTOR APPROVAL QUEUE</div>
              {st.approvals.length===0?<div style={{...S.b(12,T.mute),marginTop:8}}>Queue clear ✓</div>:
                st.approvals.map(a=>(
                  <div key={a.name} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.line}`}}>
                    <Ava init={a.name.split(" ").map(w=>w[0]).join("")} c={T.deep} s={32} fs={11} src={PHOTOS.omar}/>
                    <div style={{flex:1}}><div style={{...S.b(13,T.ink),fontWeight:600}}>{a.name}</div><div style={S.b(11,T.mute)}>{a.role} · {a.dept}</div></div>
                    <Btn small onClick={()=>{ st.setApprovals(qq=>qq.filter(x=>x.name!==a.name)); toast(`${a.name} approved as mentor`); }}>Approve</Btn>
                  </div>))}
            </div>
          </div>}

          {/* ---------- PROGRAMS ---------- */}
          {nav==="programs" && <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {st.programs.map(pr=>(
              <div key={pr.id} style={{...S.card,display:"flex",alignItems:"center",gap:12}}>
                <Dia c={pr.status==="Live"?T.teal:T.amber} s={10}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={S.h(14.5)}>{pr.name}</div>
                  <div style={S.mono(7.5,T.mute)}>{pr.division.toUpperCase()} · {pr.mode.toUpperCase()} MODE · {pr.weeks} WEEKS · {pr.people} PEOPLE</div>
                </div>
                <Chip c={pr.status==="Live"?T.teal:T.amber} bg={pr.status==="Live"?T.ttint:T.atint}>{pr.status.toUpperCase()}</Chip>
                {pr.status!=="Live"&&<Btn small onClick={()=>{ st.setPrograms(ps=>ps.map(x=>x.id===pr.id?{...x,status:"Live"}:x)); toast(`${pr.name} is live. Invites can go out.`); }}>Launch</Btn>}
              </div>))}
            <div onClick={()=>setModal("program")} style={{...S.card,border:`1.5px dashed ${T.line}`,background:"transparent",textAlign:"center",cursor:"pointer",padding:18}}>
              <span style={{...S.b(13,T.purple),fontWeight:700}}>+ Create a program</span>
              <div style={{...S.b(11,T.mute),marginTop:4}}>Onboarding buddies, high-potential track, reverse mentoring, leadership pipeline</div>
            </div>
          </div>}

          {/* ---------- SESSIONS ---------- */}
          {nav==="sessions" && <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {st.sessions.map(ss=>(
              <div key={ss.id} style={{...S.card,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,textAlign:"center",flexShrink:0}}>
                  <CalendarDays size={18} color={T.purple}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={S.h(14)}>{ss.title}</div>
                  <div style={S.mono(7.5,T.mute)}>{ss.date} · HOST {ss.host.toUpperCase()} · {ss.who.toUpperCase()}</div>
                </div>
                <Chip c={ss.type==="Kickoff"?T.coral:T.purple} bg={ss.type==="Kickoff"?T.ctint:T.ptint}>{ss.type.toUpperCase()}</Chip>
                <Btn small kind="ghost" onClick={()=>toast(`Reminders sent for "${ss.title}"`)}>Remind</Btn>
              </div>))}
            <div onClick={()=>setModal("session")} style={{...S.card,border:`1.5px dashed ${T.line}`,background:"transparent",textAlign:"center",cursor:"pointer",padding:18}}>
              <span style={{...S.b(13,T.purple),fontWeight:700}}>+ Schedule a session</span>
              <div style={{...S.b(11,T.mute),marginTop:4}}>Kickoffs, office hours, workshops, 1:1 blocks</div>
            </div>
          </div>}

          {/* ---------- INVITES ---------- */}
          {nav==="invites" && <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              {[["Sent",String(st.invites.length),T.purple],["Accepted",String(st.invites.filter(i=>i.status==="Accepted").length),T.teal],["Pending",String(st.invites.filter(i=>i.status==="Sent").length),T.amber]].map(([l,v,c])=>(
                <div key={l} style={{...S.card,padding:13}}>
                  <div style={S.mono(7.5,T.mute)}>{l.toUpperCase()}</div>
                  <div style={{...S.h(21,c),marginTop:4}}>{v}</div>
                </div>))}
            </div>
            <div style={{...S.card,background:T.ptint,border:`1px solid #DDD9F6`}}>
              <div style={S.mono(8.5,T.purple)}>MENTOR INVITE PAGE</div>
              <div style={{...S.b(12.5,T.deep),marginTop:6}}>Mentor invites open the branded form at <b>/mentor-invite.html</b> with their code pre-filled. Accepting lands them in Teams.</div>
            </div>
            <div style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={S.mono(8.5,T.purple)}>INVITATIONS · SINGLE-USE CODES</div>
                <Btn small kind="ghost" onClick={()=>{
                  const link = `${window.location.origin}/app/#/teams`;
                  copyText(link).then(()=>toast("Org join link copied"));
                }}><Copy size={13}/> Copy org link</Btn>
              </div>
              {st.invites.map((iv,i)=>(
                <div key={iv.code} style={{padding:"12px 0",borderBottom:i<st.invites.length-1?`1px solid ${T.line}`:"none"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1.4fr .7fr 1.2fr auto",gap:10,alignItems:"center"}}>
                    <span style={{...S.b(12.5,T.ink),fontWeight:600,overflow:"hidden",textOverflow:"ellipsis"}}>{iv.email}</span>
                    <Chip c={iv.role==="Mentor"?T.teal:iv.role==="Partner"?T.amber:T.purple} bg={iv.role==="Mentor"?T.ttint:iv.role==="Partner"?T.atint:T.ptint}>{iv.role.toUpperCase()}</Chip>
                    <span style={{...S.mono(8,T.gray)}}>{iv.code}</span>
                    {iv.status==="Accepted"?<span style={{...S.mono(8,T.teal),textAlign:"right"}}>ACCEPTED ✓</span>:
                      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                        {iv.url && <Btn small kind="ghost" onClick={()=>{ copyText(iv.url).then(()=>toast("Invite link copied")); }}><Copy size={12}/> Link</Btn>}
                        {iv.url && <Btn small kind="ghost" onClick={()=>window.open(iv.url,"_blank","noopener")}><ExternalLink size={12}/> Open</Btn>}
                        <Btn small kind="ghost" onClick={()=>{
                          if (iv.url) copyText(iv.url).then(()=>toast(`Reminder ready · link copied for ${iv.email}`));
                          else toast(`Reminder re-sent to ${iv.email}`);
                        }}>Resend</Btn>
                      </div>}
                  </div>
                  {iv.url && <div style={{...S.mono(7,T.mute),marginTop:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{iv.url}</div>}
                </div>))}
            </div>
          </div>}

          {/* ---------- SETTINGS ---------- */}
          {nav==="settings" && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>DIVISIONS & TAGS</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:10}}>
                {org.divisions.map(d=>(
                  <span key={d.name} style={{display:"inline-flex",alignItems:"center",gap:7,background:T.surface,border:`1px solid ${T.line}`,borderRadius:9,padding:"6px 10px"}}>
                    <Dia c={d.color} s={8}/><span style={{...S.b(12,T.ink),fontWeight:600}}>{d.name}</span>
                    <X size={11} style={{cursor:"pointer",color:T.mute}} onClick={()=>setOrg(o=>({...o,divisions:o.divisions.filter(x=>x.name!==d.name)}))}/>
                  </span>))}
                <Btn small kind="ghost" onClick={()=>{ const n=prompt("Division name"); if(n) setOrg(o=>({...o,divisions:[...o.divisions,{name:n,color:DIV_COLORS[o.divisions.length%DIV_COLORS.length]}]})); }}><Plus size={13}/> Add</Btn>
              </div>
              <div style={{...S.b(10.5,T.mute),marginTop:10,fontStyle:"italic"}}>Divisions drive filters in People, matching rules, and session audiences.</div>
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>MATCHING RULES</div>
              {[["Staff+ mentors only","levelGate"],["Allow cross-division matching","crossDiv"]].map(([l,k])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                  <span style={S.b(12.5,T.ink)}>{l}</span>
                  <Toggle on={settings[k]} onChange={v=>{ set(k,v); toast("Rules updated. Maya's deck refiltered."); }}/>
                </div>))}
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>MENTOR CAPACITY</div>
              <div style={{marginTop:9}}><Seg small options={["Deep","Cohort"]} value={settings.capMode} onChange={v=>{ set("capMode",v); toast(`Capacity: ${v} mode. Ritwik's app updated.`); }}/></div>
              {settings.capMode==="Deep"
                ? <div style={{marginTop:10}}><span style={S.b(12)}>Max mentees each </span><Seg small options={["1","2","3"]} value={String(settings.capDeep)} onChange={v=>set("capDeep",+v)}/></div>
                : <div style={{marginTop:10}}><span style={S.b(12)}>Cohort cap </span><Seg small options={["15","30","50"]} value={String(settings.cohortCap)} onChange={v=>set("cohortCap",+v)}/></div>}
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>NOTIFICATIONS</div>
              {[["Weekly engagement digest to admins","digest"],["At-risk pair alerts (14-day quiet)","riskAlerts"],["Announce badges in Slack","badgeAnnounce"]].map(([l,k])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                  <span style={S.b(12.5,T.ink)}>{l}</span>
                  <Toggle on={settings[k]} onChange={v=>{ set(k,v); toast(v?"Enabled":"Disabled"); }}/>
                </div>))}
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>INTEGRATIONS</div>
              {[["Slack","Connected",true],["Google Calendar","Connected",true],["BambooHR (HRIS sync)","Connect",false]].map(([name,label,on])=>(
                <div key={name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                  <span style={{...S.b(12.5,T.ink),fontWeight:600}}>{name}</span>
                  {on ? <Chip c={T.teal} bg={T.ttint}>CONNECTED</Chip>
                      : <Btn small kind="ghost" onClick={()=>toast(`${name} OAuth window opens in production`)}>{label}</Btn>}
                </div>))}
              <div style={{...S.b(10.5,T.mute),marginTop:8,fontStyle:"italic"}}>Roster sync and session invites flow through these.</div>
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>DATA & PRIVACY</div>
              <div style={{padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                <div style={{...S.b(12.5,T.ink),marginBottom:8}}>Data retention</div>
                <Seg small options={["90 days","1 year","3 years"]} value={settings.retention} onChange={v=>{ set("retention",v); toast(`Retention: ${v}`); }}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                <span style={S.b(12.5,T.ink)}>Anonymize analytics exports</span>
                <Toggle on={settings.anonExports} onChange={v=>{ set("anonExports",v); toast(v?"Exports anonymized":"Exports include names"); }}/>
              </div>
              <Btn small kind="ghost" style={{marginTop:12}} onClick={()=>toast("Full org export queued · link emailed to admins")}>Export all org data</Btn>
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>SECURITY</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                <span style={{...S.b(12.5,T.ink),fontWeight:600}}>SSO · Google Workspace</span><Chip c={T.teal} bg={T.ttint}>ON</Chip>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${T.line}`}}>
                <span style={S.b(12.5,T.ink)}>Require 2FA for admins</span>
                <Toggle on={settings.twoFA} onChange={v=>{ set("twoFA",v); toast(v?"2FA required for admins":"2FA optional"); }}/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0"}}>
                <span style={S.b(12.5,T.ink)}>Allowed email domain</span>
                <span style={{...S.mono(9,T.gray)}}>northbound.com</span>
              </div>
            </div>
            <div style={S.card}>
              <div style={S.mono(8.5,T.purple)}>LEADERBOARD & PRIVACY</div>
              <div style={{marginTop:9}}><Seg small options={["Off","Anonymized","Department"]} value={settings.leaderboard} onChange={v=>{ set("leaderboard",v); toast(`Leaderboard: ${v}`); }}/></div>
              <div style={{...S.b(10.5,T.mute),marginTop:9,fontStyle:"italic"}}>Individual rankings stay off. Impact Scores are visible to the mentor and HR only.</div>
            </div>
          </div>}
        </div>
      </div>

      {joinPrev && <JoinFlow org={org} toast={toast} onClose={()=>setJoinPrev(false)}
        onComplete={(fp,pct)=>{ setJoinPrev(false);
          st.setInvites(v=>{ const i=v.findIndex(x=>x.status==="Sent"); return i<0?v:v.map((x,j)=>j===i?{...x,status:"Accepted"}:x); });
          toast(`${fp.name.split(" ")[0]} onboarded in under a minute · profile ${pct}% ready`); }}/>}

      {/* person drawer */}
      {person?.type==="mentor" && <MentorProfile m={person.data} onClose={()=>setPerson(null)}/>}
      {person?.type==="mentee" && <MenteeProfile e={person.data} onClose={()=>setPerson(null)}/>}

      {/* modals */}
      {modal==="program" && (
        <Modal title="Create a program" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <Field label="PROGRAM NAME"><input style={S.input} placeholder="High-potential track" value={pf.name} onChange={e=>setPf({...pf,name:e.target.value})}/></Field>
            <Field label="DIVISION"><Seg small options={["All",...org.divisions.map(d=>d.name)]} value={pf.division} onChange={v=>setPf({...pf,division:v})}/></Field>
            <Field label="CAPACITY MODE"><Seg small options={["Deep","Cohort"]} value={pf.mode} onChange={v=>setPf({...pf,mode:v})}/></Field>
            <Field label="LENGTH (WEEKS)"><Seg small options={["8","12"]} value={pf.weeks} onChange={v=>setPf({...pf,weeks:v})}/></Field>
            <Btn onClick={()=>{ if(!pf.name) return toast("Name the program");
              st.setPrograms(ps=>[...ps,{id:genCode("P"),name:pf.name,division:pf.division,mode:pf.mode,weeks:+pf.weeks,status:"Draft",people:0}]);
              setModal(null); setPf({...pf,name:""}); toast(`"${pf.name}" created as draft`); }}>Create program</Btn>
          </div>
        </Modal>)}

      {modal==="session" && (
        <Modal title="Schedule a session" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <Field label="TITLE"><input style={S.input} placeholder="Office hours: system design" value={sf.title} onChange={e=>setSf({...sf,title:e.target.value})}/></Field>
            <Field label="TYPE"><Seg small options={["Kickoff","Office hours","Workshop","1:1 block"]} value={sf.type} onChange={v=>setSf({...sf,type:v})}/></Field>
            <Field label="HOST"><select style={S.input} value={sf.host} onChange={e=>setSf({...sf,host:e.target.value})}>{MENTORS.map(m=><option key={m.id}>{m.name}</option>)}</select></Field>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="WHEN"><input style={S.input} placeholder="Thu Aug 6 · 16:00" value={sf.date} onChange={e=>setSf({...sf,date:e.target.value})}/></Field>
              <Field label="AUDIENCE"><select style={S.input} value={sf.who} onChange={e=>setSf({...sf,who:e.target.value})}>
                {["All participants",...org.divisions.map(d=>`${d.name} division`)].map(o=><option key={o}>{o}</option>)}</select></Field>
            </div>
            <Btn onClick={()=>{ if(!sf.title||!sf.date) return toast("Give it a title and a time");
              st.setSessions(xs=>[...xs,{id:genCode("S"),...sf}]); setModal(null); setSf({...sf,title:"",date:""}); toast("Session scheduled. Calendar invites queued."); }}>Schedule</Btn>
          </div>
        </Modal>)}

      {modal==="invite" && (
        <Modal title="Send invites" onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <Field label="WHO"><Seg small options={["Employees","Partners"]} value={inv.kind} onChange={v=>setInv({...inv,kind:v})}/></Field>
            {inv.kind==="Employees" ? (<>
              <Field label="EMAILS (COMMA-SEPARATED)">
                <textarea style={{...S.input,minHeight:74,resize:"vertical"}} placeholder="alex@northbound.com, jordan@northbound.com" value={inv.emails} onChange={e=>setInv({...inv,emails:e.target.value})}/></Field>
              <Field label="INVITE AS"><Seg small options={["Mentee","Mentor","Admin"]} value={inv.role} onChange={v=>setInv({...inv,role:v})}/></Field>
              {inv.role==="Mentor" && (
                <div style={{background:T.ttint,border:`1px solid ${T.teal}`,borderRadius:11,padding:"10px 12px"}}>
                  <div style={{...S.b(12,T.teal),fontWeight:600}}>Mentor invites send the branded invite form</div>
                  <div style={{...S.b(11,T.gray),marginTop:4}}>Each mentor gets a unique <b>RYZ-INV-2026-…</b> link to <b>/invite.html</b> — the page you shared — with their code pre-filled.</div>
                </div>
              )}
            </>) : (
              <Field label="PARTNER ORGANIZATION">
                <input style={S.input} placeholder="e.g. Fieldnote Design Co (their mentors join your programs)" value={inv.partner} onChange={e=>setInv({...inv,partner:e.target.value})}/>
              </Field>)}
            <Btn onClick={()=>{
              if(inv.kind==="Employees"){
                const emails = inv.emails.split(",").map(s=>s.trim()).filter(s=>s.includes("@"));
                if(!emails.length) return toast("Add at least one email");
                const rows = emails.map(em=>{
                  const code = inv.role==="Mentor" ? genMentorInviteCode() : genCode(inv.role==="Admin"?"AD":"NB");
                  const url = buildInviteUrl({ code, email:em, role:inv.role, orgName:org.name, adminName:org.admin });
                  return { email:em, role:inv.role, code, status:"Sent", url, sentAt:new Date().toISOString() };
                });
                st.setInvites(v=>[...v,...rows]);
                setModal(null); setInv({...inv,emails:""});
                if (inv.role==="Mentor" && rows[0]?.url) {
                  copyText(rows[0].url);
                  window.open(rows[0].url, "_blank", "noopener");
                  toast(`${rows.length} mentor invite${rows.length>1?"s":""} sent · form opened & first link copied`);
                } else {
                  toast(`${rows.length} invite${rows.length>1?"s":""} sent with single-use codes`);
                }
              } else {
                if(!inv.partner) return toast("Name the partner org");
                const code = genCode("PX");
                const url = buildInviteUrl({ code, email:inv.partner, role:"Partner", orgName:org.name, adminName:org.admin });
                st.setInvites(v=>[...v,{email:`${inv.partner} (partner)`,role:"Partner",code,status:"Sent",url,sentAt:new Date().toISOString()}]);
                setModal(null); setInv({...inv,partner:""}); toast(`Partner invite sent to ${inv.partner}`);
              }
            }}><Send size={14}/> Send</Btn>
            <div style={{...S.b(10.5,T.mute)}}>Every invite carries a single-use code tied to the recipient. Mentor invites open the invite form HTML; codes appear in the Invites list for tracking and resending.</div>
          </div>
        </Modal>)}
    </div>
  );
}

/* ================= ROOT ================= */
const now = () => new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
class Boundary extends React.Component {
  constructor(p){ super(p); this.state={err:null}; }
  static getDerivedStateFromError(e){ return {err:e}; }
  render(){
    if(this.state.err) return (
      <div style={{fontFamily:T.sans,minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
        <div style={{...S.card,maxWidth:380,textAlign:"center",padding:26}}>
          <div style={S.h(17)}>Something hiccuped</div>
          <div style={{...S.b(12.5),marginTop:8}}>The pilot build caught an error so you don't lose the demo. Use "New org" up top to reset, and tell the team what you tapped.</div>
          <div style={{...S.mono(7.5,T.mute),marginTop:12}}>{String(this.state.err).slice(0,120)}</div>
        </div>
      </div>);
    return this.props.children;
  }
}

export default function RyznTeams() {
  const defaultOrg = { name:"Northbound Bank", industry:"Financial services", size:"1,000-5,000", admin:"Priya Anand", program:"Northbound Mentors", divisions:SEED_DIVISIONS };
  const defaultSettings = { capMode:"Deep", capDeep:3, cohortCap:30, levelGate:true, crossDiv:true, leaderboard:"Department", digest:true, riskAlerts:true, badgeAnnounce:false, retention:"1 year", anonExports:true, twoFA:false };

  const seedInvitesWithUrls = (org) => SEED_INVITES.map(iv => ({
    ...iv,
    url: buildInviteUrl({ code: iv.code, email: iv.email, role: iv.role, orgName: org.name, adminName: org.admin }),
  }));

  const [phase, setPhase] = useState(() => loadPhase("onboarding"));
  const [org, setOrg] = useState(() => loadOrg(defaultOrg));
  const [role, setRole] = useState("admin");
  const [session, setSession] = useState(() => loadSession());
  const [authGate, setAuthGate] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [settings, setSettings] = useState(() => loadSettings(defaultSettings));
  const [stage1Done, setStage1Done] = useState([1,2]);
  const [xp, setXp] = useState(1240);
  const [requested, setRequested] = useState(true);
  const [atRisk, setAtRisk] = useState(AT_RISK_INIT);
  const [approvals, setApprovals] = useState([{ name:"Omar Haddad", role:"Staff Engineer", dept:"Engineering" }]);
  const [programs, setPrograms] = useState(() => loadPrograms(SEED_PROGRAMS));
  const [sessions, setSessions] = useState(() => loadSessions(SEED_SESSIONS));
  const [invites, setInvites] = useState(() => {
    const saved = loadInvites(null);
    if (saved) return saved;
    return seedInvitesWithUrls(loadOrg(defaultOrg));
  });
  const [chat, setChat] = useState(SEED_CHAT);
  const [requests, setRequests] = useState(SEED_REQUESTS);
  const [mentorProfile, setMentorProfile] = useState(MENTORS[0]);
  const [menteeProfile, setMenteeProfile] = useState({ name:"Maya Osei", photo:PHOTOS.maya, role:"Associate PM", division:"Product", goals:[...MENTEES[0].goals], skills:[...MENTEES[0].skills] });
  const [toastMsg, setToastMsg] = useState("");
  const toast = m => { setToastMsg(m); clearTimeout(window.__rt2); window.__rt2 = setTimeout(()=>setToastMsg(""), 2400); };
  const send = (thread, from, text) => setChat(c=>({ ...c, [thread]:[...(c[thread]||[]), {from, text, t:now()}] }));

  /* persist console-owned state */
  useEffect(() => { savePhase(phase); }, [phase]);
  useEffect(() => { saveOrg(org); }, [org]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveInvites(invites); }, [invites]);
  useEffect(() => { savePrograms(programs); }, [programs]);
  useEffect(() => { saveSessions(sessions); }, [sessions]);

  /* deep-link: /#/teams?join=CODE opens join preview after auth */
  useEffect(() => {
    const q = window.location.hash.split("?")[1] || "";
    const join = new URLSearchParams(q).get("join");
    if (join) {
      setPhase("app");
      setRole("admin");
      toast(`Invite ${join} ready — open Invites → Preview join, or switch to a seat`);
    }
  }, []);

  const st = { stage1Done, setStage1Done, requested, setRequested, atRisk, setAtRisk, approvals, setApprovals,
    programs, setPrograms, sessions, setSessions, invites, setInvites, chat, send, xp, setXp, requests, setRequests, mentorProfile, setMentorProfile, menteeProfile, setMenteeProfile };

  const requestSeat = (nextRole) => {
    /* After one successful sign-in, seat switching is free (demo chrome).
       Sign out returns to the credentials gate. */
    if (!session) { setPendingRole(nextRole); setAuthGate(true); return; }
    setRole(nextRole);
  };

  const signOut = () => {
    saveSession(null);
    setSession(null);
    setAuthGate(true);
    setPendingRole(role);
    toast("Signed out");
  };

  if (phase==="onboarding") return (<>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap'); *{box-sizing:border-box;margin:0}`}</style>
    <Onboarding toast={toast}
      onDone={{
        demo: ()=>{ setPhase("app"); setAuthGate(true); setPendingRole("admin"); toast("Welcome to the Northbound Bank demo org — sign in to open the console"); },
        custom: ({org:o, rules, program})=>{
          setOrg({ ...o, program:`${o.name.split(" ")[0]} Mentors` });
          setSettings(s=>({ ...s, ...rules }));
          setPrograms([{ id:"p1", name:program.name, division:"All", mode:rules.capMode, weeks:program.weeks, status:"Live", people:0 }]);
          setInvites([]); setPhase("app"); setRole("admin");
          setAuthGate(true); setPendingRole("admin");
          toast(`${o.name} is live. Sign in as admin, then send your first invites.`);
        },
      }}/>
    <Toast msg={toastMsg}/>
  </>);

  if (authGate || !session) {
    return (<>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap'); *{box-sizing:border-box;margin:0}`}</style>
      <SeatLogin
        expectedRole={pendingRole || role}
        org={org}
        toast={toast}
        onBack={session ? ()=>{ setAuthGate(false); setPendingRole(null); } : undefined}
        onSuccess={(s)=>{ setSession(s); setRole(s.role); setAuthGate(false); setPendingRole(null); }}
      />
      <Toast msg={toastMsg}/>
    </>);
  }

  const roles = [
    { id:"admin", name:org.admin?.split(" ")[0]||"Priya", sub:"HR console", init:(org.admin||"PA").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(), c:T.amber, photo:PHOTOS.priya },
    { id:"mentee", name:"Maya", sub:"Employee · mentee", init:"MO", c:T.purple, photo:PHOTOS.maya },
    { id:"mentor", name:"Ritwik", sub:"Employee · mentor", init:"RJ", c:T.deep, photo:PHOTOS.ritwik },
  ];

  return (
    <div style={{fontFamily:T.sans,background:T.surface,minHeight:"100vh",paddingBottom:56}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0} button:hover{filter:brightness(1.04)} @keyframes cardIn{from{opacity:0;transform:translateX(26px) rotate(2deg)}to{opacity:1;transform:none}} @keyframes frostIn{from{opacity:0}to{opacity:1}} @keyframes glassPop{0%{opacity:0;transform:scale(.86) translateY(22px)}60%{opacity:1;transform:scale(1.015) translateY(-3px)}100%{opacity:1;transform:none}} @keyframes dropIn{0%{opacity:0;transform:translateY(-16px) scale(.97)}60%{opacity:1;transform:translateY(3px)}100%{opacity:1;transform:none}} .noScroll::-webkit-scrollbar{display:none} .noScroll{scrollbar-width:none} .typing span{display:inline-block;width:6px;height:6px;border-radius:3px;background:#B5B3AE;margin-right:4px;animation:blink 1.2s infinite} .typing span:nth-child(2){animation-delay:.2s} .typing span:nth-child(3){animation-delay:.4s} @keyframes blink{0%,80%,100%{opacity:.25}40%{opacity:1}} @keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(216,90,48,.35)}50%{box-shadow:0 0 0 6px rgba(216,90,48,0)}} .glassPill{transition:transform .16s cubic-bezier(.22,1.4,.36,1), background .2s} .glassPill:active{transform:scale(.955)} .glassPill:hover{background:rgba(255,255,255,.24) !important} ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-thumb{background:#D5D4D0;border-radius:3px}`}</style>

      {/* top bar */}
      <div style={{position:"sticky",top:0,zIndex:40,background:"rgba(245,245,243,.94)",backdropFilter:"blur(8px)",borderBottom:`1px solid ${T.line}`}}>
        <div style={{maxWidth:1120,margin:"0 auto",padding:"10px 16px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:30,height:30,borderRadius:9,background:T.purple,display:"flex",alignItems:"center",justifyContent:"center"}}><Building2 size={15} color="#fff"/></div>
            <div>
              <div style={{...S.h(13.5)}}>{org.name}</div>
              <div style={S.mono(6.5,T.mute)}>RYZN FOR TEAMS · {session.name}</div>
            </div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:5,background:"#fff",border:`1px solid ${T.line}`,borderRadius:13,padding:4}}>
            {roles.map(r=>(
              <button key={r.id} onClick={()=>requestSeat(r.id)} style={{display:"flex",alignItems:"center",gap:8,border:"none",borderRadius:9,cursor:"pointer",
                padding:"6px 11px",background:role===r.id?T.ink:"transparent",transition:"all .15s"}}>
                <Ava init={r.init} c={r.c} s={22} fs={8} src={r.photo}/>
                <span style={{textAlign:"left"}}>
                  <span style={{display:"block",fontFamily:T.sans,fontWeight:700,fontSize:11.5,color:role===r.id?"#fff":T.ink}}>{r.name}</span>
                  <span style={{display:"block",...S.mono(6,role===r.id?T.lilac:T.mute)}}>{r.sub}</span>
                </span>
              </button>))}
          </div>
          <span style={{...S.mono(6.5,T.mute)}}>PILOT BUILD v0.9</span>
          <Btn small kind="ghost" onClick={()=>toast("Feedback logged for the pilot team ✓")}>Feedback</Btn>
          <Btn small kind="ghost" onClick={signOut}><LogOut size={13}/> Sign out</Btn>
          <Btn small kind="ghost" onClick={()=>{ clearTeamsStore(); setPhase("onboarding"); setSession(null); setAuthGate(false); toast("Org reset"); }}>New org</Btn>
        </div>
      </div>

      <div style={{maxWidth:1120,margin:"0 auto",padding:"16px 16px 0"}}>
        {/* contextual hint */}
        <div style={{background:T.ptint,border:"1px solid #DDD9F6",borderRadius:12,padding:"10px 14px",marginBottom:14,display:"flex",gap:9,alignItems:"center"}}>
          <Dia c={T.purple} s={8}/>
          <span style={S.b(12,T.deep)}>
            {role==="admin"
              ? <span><b>Console:</b> create a program, schedule a session, send mentor invites (opens /invite.html), click any person for their profile, then flip a Settings rule and switch seats to watch it apply.</span>
              : role==="mentee"
              ? <span><b>Maya:</b> finish Stage 1 on Home to unlock Chat with Ritwik. Tap the match card for his full profile. Rule chips update live from the console.</span>
              : <span><b>Ritwik:</b> tap a mentee for their full profile, then message them. Send Maya a reply here and switch to her seat to see it arrive.</span>}
          </span>
        </div>

        <Boundary>
        {role==="admin"
          ? <Console org={org} setOrg={setOrg} settings={settings} setSettings={setSettings} st={st} toast={toast}/>
          : <div style={{display:"flex",justifyContent:"center",padding:"6px 0 20px"}}>
              {role==="mentee"
                ? <MenteeApp org={org} settings={settings} st={st} toast={toast}/>
                : <MentorApp org={org} settings={settings} st={st} toast={toast}/>}
            </div>}
        </Boundary>
      </div>
      <Toast msg={toastMsg}/>
    </div>
  );
}
