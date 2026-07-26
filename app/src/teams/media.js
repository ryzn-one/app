import { T } from "./theme.js";
export const face = ({skin,hair,style,beard,shirt,bg}) => {
  const back = style==="long" ? `<rect x="28" y="20" width="44" height="56" rx="19" fill="${hair}"/>`
    : style==="bob" ? `<rect x="30" y="21" width="40" height="36" rx="17" fill="${hair}"/>` : "";
  const top = style==="bun"
    ? `<ellipse cx="50" cy="29" rx="18" ry="10" fill="${hair}"/><circle cx="50" cy="15" r="7" fill="${hair}"/>`
    : style==="short" ? `<ellipse cx="50" cy="29" rx="18.5" ry="11" fill="${hair}"/>`
    : `<ellipse cx="50" cy="28" rx="17.5" ry="9.5" fill="${hair}"/>`;
  const brd = beard ? `<path d="M35 45 Q50 63 65 45 L65 51 Q50 69 35 51 Z" fill="${hair}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="${bg}"/>
    ${back}
    <rect x="20" y="72" width="60" height="32" rx="15" fill="${shirt}"/>
    <rect x="43" y="56" width="14" height="14" rx="4" fill="${skin}"/>
    <circle cx="50" cy="42" r="18" fill="${skin}"/>
    ${top}${brd}
    <circle cx="43.5" cy="42" r="1.9" fill="#1A1A1A"/><circle cx="56.5" cy="42" r="1.9" fill="#1A1A1A"/>
    <path d="M44 49 Q50 53.5 56 49" stroke="#1A1A1A" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};
/* lifelike royalty-free portraits (Pixabay CDN, no attribution required),
   each with a local SVG portrait fallback if the sandbox blocks remote images */
export const RAW = {
  p597178: "/avatars/p597178.jpg",
  p1274056: "/avatars/p1274056.jpg",
  p1274360: "/avatars/p1274360.jpg",
  p1283231: "/avatars/p1283231.jpg",
  p1845166: "/avatars/p1845166.jpg",
  p1845814: "/avatars/p1845814.jpg",
  p1866572: "/avatars/p1866572.jpg",
  p1867715: "/avatars/p1867715.jpg",
  p1869761: "/avatars/p1869761.jpg",
  p2072907: "/avatars/p2072907.jpg",
  p2178721: "/avatars/p2178721.jpg",
  p2442565: "/avatars/p2442565.jpg",
  p2562646: "/avatars/p2562646.jpg",
  p2563491: "/avatars/p2563491.jpg",
  p3083383: "/avatars/p3083383.jpg",
  p3096664: "/avatars/p3096664.jpg",
};
export const COVER = {
  ritwik: "/avatars/cover-ritwik.jpg",
  dana: "/avatars/cover-dana.jpg",
  sam: "/avatars/cover-sam.jpg",
  lena: "/avatars/cover-lena.jpg",
};
export const ph1 = p => Array.isArray(p)?p[0]:p;
export const MCOVER = {
  maya: "/avatars/mc-maya.jpg",
  arjun: "/avatars/mc-arjun.jpg",
  chloe: "/avatars/mc-chloe.jpg",
  tom: "/avatars/mc-tom.jpg",
  ivy: "/avatars/mc-ivy.jpg",
  dev: "/avatars/mc-dev.jpg",
  sofia: "/avatars/mc-sofia.jpg",
  marcus: "/avatars/mc-marcus.jpg",
  aisha: "/avatars/mc-aisha.jpg",
  leo: "/avatars/mc-leo.jpg",
};
export const PHOTOS = {
  maya:  [RAW.p1869761, face({skin:"#C68863",hair:"#2E1F1A",style:"long", beard:false,shirt:"#5B4FCF",bg:"#EEF0FC"})],
  ritwik:[RAW.p1845166,      face({skin:"#B97A56",hair:"#221B16",style:"short",beard:true, shirt:"#2D2580",bg:"#E1F5EE"})],
  dana:  [RAW.p3083383,      face({skin:"#E8B48F",hair:"#6B4A2F",style:"long", beard:false,shirt:"#0F6E56",bg:"#F7EEDD"})],
  sam:   [RAW.p2442565,        face({skin:"#E0A878",hair:"#14100E",style:"short",beard:false,shirt:"#D85A30",bg:"#EEF0FC"})],
  lena:  [RAW.p1274056,      face({skin:"#F0C49B",hair:"#2A1E14",style:"bun",  beard:false,shirt:"#BA7517",bg:"#E1F5EE"})],
  arjun: [RAW.p597178,   face({skin:"#A9714B",hair:"#191512",style:"short",beard:false,shirt:"#0F6E56",bg:"#FAECE7"})],
  chloe: [RAW.p2563491,      face({skin:"#F2C9A0",hair:"#241812",style:"bob",  beard:false,shirt:"#D85A30",bg:"#EEF0FC"})],
  tom:   [RAW.p2562646,     face({skin:"#D9A576",hair:"#3B2A1B",style:"short",beard:false,shirt:"#5F5E5A",bg:"#F7EEDD"})],
  ivy:   [RAW.p2072907,   face({skin:"#F2C9A0",hair:"#1E1410",style:"long",beard:false,shirt:"#0F6E56",bg:"#E1F5EE"})],
  dev:   [RAW.p1866572,     face({skin:"#B97A56",hair:"#171310",style:"short",beard:false,shirt:"#5B4FCF",bg:"#EEF0FC"})],
  sofia: [RAW.p1867715,   face({skin:"#E8B48F",hair:"#3A2415",style:"bob",beard:false,shirt:"#D85A30",bg:"#FAECE7"})],
  marcus:[RAW.p1283231,     face({skin:"#8A5A3B",hair:"#12100E",style:"short",beard:true,shirt:"#0F6E56",bg:"#E1F5EE"})],
  aisha: [RAW.p3096664,   face({skin:"#C68863",hair:"#241A12",style:"bun",beard:false,shirt:"#BA7517",bg:"#F7EEDD"})],
  leo:   [RAW.p1845814,     face({skin:"#E0A878",hair:"#191512",style:"short",beard:false,shirt:"#2D2580",bg:"#EEF0FC"})],
  priya: [RAW.p1274360,   face({skin:"#C68863",hair:"#2A1C12",style:"long",beard:false,shirt:"#BA7517",bg:"#F7EEDD"})],
  omar:  [RAW.p2178721,     face({skin:"#B97A56",hair:"#14100E",style:"short",beard:true,shirt:"#5F5E5A",bg:"#EEF0FC"})],
};
export const MAYA_PHOTO_OPTS = [
  PHOTOS.maya,
  face({skin:"#C68863",hair:"#2E1F1A",style:"long",beard:false,shirt:"#0F6E56",bg:"#E1F5EE"}),
  face({skin:"#C68863",hair:"#2E1F1A",style:"bun",beard:false,shirt:"#5B4FCF",bg:"#EEF0FC"}),
  face({skin:"#C68863",hair:"#2E1F1A",style:"bob",beard:false,shirt:"#D85A30",bg:"#FAECE7"}),
];
export const RITWIK_PHOTO_OPTS = [
  PHOTOS.ritwik,
  face({skin:"#B97A56",hair:"#221B16",style:"short",beard:true,shirt:"#5B4FCF",bg:"#EEF0FC"}),
  face({skin:"#B97A56",hair:"#221B16",style:"short",beard:false,shirt:"#0F6E56",bg:"#E1F5EE"}),
];
export const initsOf = n => n.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();