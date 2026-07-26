export const T = {
  purple:"#5B4FCF", deep:"#2D2580", ink:"#1A1A1A", teal:"#0F6E56",
  coral:"#D85A30", amber:"#BA7517", gray:"#5F5E5A",
  ptint:"#EEF0FC", ttint:"#E1F5EE", ctint:"#FAECE7", atint:"#F7EEDD",
  surface:"#F5F5F3", line:"#E8E7E3", lilac:"#B7AFF2", mute:"#A5A39D",
  sans:"'Space Grotesk','Century Gothic',system-ui,sans-serif",
  mono:"'Space Mono','Consolas',monospace",
};
export const DIV_COLORS = [T.purple, T.teal, T.coral, T.amber, T.deep, "#7A6FF0"];
export const S = {
  mono:(s=9,c=T.mute)=>({fontFamily:T.mono,fontSize:s,letterSpacing:"0.12em",textTransform:"uppercase",color:c}),
  h:(s=18,c=T.ink)=>({fontFamily:T.sans,fontWeight:700,fontSize:s,letterSpacing:"-0.02em",color:c,lineHeight:1.18}),
  b:(s=13,c=T.gray)=>({fontFamily:T.sans,fontSize:s,color:c,lineHeight:1.5}),
  card:{background:"#fff",border:`1px solid ${T.line}`,borderRadius:16,padding:16},
  input:{fontFamily:T.sans,fontSize:13.5,padding:"12px 14px",borderRadius:11,border:`1.5px solid ${T.line}`,outline:"none",width:"100%",background:"#fff",color:T.ink},
};

/* ---------- data ---------- */