/* ================= ZAFFA — UI TOOLKIT ================= */

/* Hyperscript-ish element builder.
   h("div.card", {onclick}, [children])  or  h("div", "text") */
function h(tag, props, kids){
  if(Array.isArray(props)||typeof props==="string"||typeof props==="number"||(props&&props.nodeType)){kids=props;props={};}
  props=props||{};
  let cls="", id="";
  const m=tag.match(/^([a-z0-9]+)?(#[\w-]+)?((?:\.[\w-]+)*)$/i);
  const name=(m&&m[1])||"div";
  if(m&&m[2])id=m[2].slice(1);
  if(m&&m[3])cls=m[3].replace(/\./g," ").trim();
  const e=document.createElement(name);
  if(id)e.id=id;
  if(cls)e.className=cls;
  for(const k in props){
    const v=props[k];
    if(v==null||v===false)continue;
    if(k==="class")e.className=(e.className+" "+v).trim();
    else if(k==="html")e.innerHTML=v;
    else if(k==="style"&&typeof v==="object")Object.assign(e.style,v);
    else if(k.startsWith("on")&&typeof v==="function")e.addEventListener(k.slice(2).toLowerCase(),v);
    else if(k==="dataset")Object.assign(e.dataset,v);
    else if(k in e && k!=="list")try{e[k]=v;}catch{e.setAttribute(k,v);}
    else e.setAttribute(k,v);
  }
  const add=(c)=>{
    if(c==null||c===false||c===true)return;
    if(Array.isArray(c)){c.forEach(add);return;}
    e.appendChild(c.nodeType?c:document.createTextNode(c));
  };
  add(kids);
  return e;
}
const frag=(kids)=>{const f=document.createDocumentFragment();(Array.isArray(kids)?kids:[kids]).forEach(c=>{if(c!=null&&c!==false)f.appendChild(c.nodeType?c:document.createTextNode(c));});return f;};
const clear=(el)=>{while(el.firstChild)el.removeChild(el.firstChild);return el;};

/* ---- SVG icon set (stroke, 24px) ---- */
const ICONS={
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  heart:'<path d="M12 20.5S3.5 14.7 3.5 8.9A4.4 4.4 0 0 1 12 6a4.4 4.4 0 0 1 8.5 2.9C20.5 14.7 12 20.5 12 20.5Z"/>',
  heartFill:'<path fill="currentColor" stroke="none" d="M12 20.5S3.5 14.7 3.5 8.9A4.4 4.4 0 0 1 12 6a4.4 4.4 0 0 1 8.5 2.9C20.5 14.7 12 20.5 12 20.5Z"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6"/>',
  bell:'<path d="M18 8a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 14 18 8Z"/><path d="M10.5 20a2 2 0 0 0 3 0"/>',
  back:'<path d="M15 18 9 12l6-6"/>',
  fwd:'<path d="m9 6 6 6-6 6"/>',
  close:'<path d="M18 6 6 18M6 6l12 12"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  filter:'<path d="M3 5h18M6 12h12M10 19h4"/>',
  star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L4.5 9.7l5.9-.9Z"/>',
  pin:'<path d="M12 21s-6.5-5.6-6.5-10.5A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.5C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10.5" r="2.2"/>',
  phone:'<path d="M6 3h3l1.5 5-2 1.2a12 12 0 0 0 6.3 6.3l1.2-2 5 1.5v3a2 2 0 0 1-2 2A17 17 0 0 1 4 5a2 2 0 0 1 2-2Z"/>',
  chat:'<path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.9-5A8 8 0 1 1 21 12Z"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.2 2"/>',
  cal:'<rect x="3.5" y="5" width="17" height="16" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
  ig:'<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1.2" fill="currentColor" stroke="none"/>',
  share:'<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M12 16V3M8 7l4-4 4 4"/>',
  edit:'<path d="M16.5 4.5 19.5 7.5 8 19H5v-3z"/><path d="M14 7l3 3"/>',
  trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  spark:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
  chevD:'<path d="m6 9 6 6 6-6"/>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.2 7l2.6 1.5M17.2 15.5 19.8 17M4.2 17l2.6-1.5M17.2 8.5 19.8 7"/>',
  logout:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 12H3M6 8l-4 4 4 4"/>',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14h2"/>',
  gift:'<rect x="3.5" y="8.5" width="17" height="12" rx="2"/><path d="M3.5 12.5h17M12 8.5v12M12 8.5S9 8.5 8 6.5 9 3.5 12 8.5Zm0 0s3 0 4-2-1-3-4 2Z"/>',
  megaphone:'<path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1Z"/><path d="M18 8a4 4 0 0 1 0 8"/>',
  chart:'<path d="M4 20V4M4 20h16M8 16v-4M12 16V8M16 16v-6"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5"/><path d="M16 5a3 3 0 0 1 0 6M17 14.3c2.4.6 4 2.3 4 4.7"/>',
  tag:'<path d="M3 12V4a1 1 0 0 1 1-1h8l8.5 8.5a1.5 1.5 0 0 1 0 2.1l-6 6a1.5 1.5 0 0 1-2.1 0L3 12Z"/><circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" stroke="none"/>',
  camera:'<rect x="3" y="7" width="18" height="13" rx="3"/><circle cx="12" cy="13.5" r="3.5"/><path d="M8 7l1.5-3h5L16 7"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h8M16 18h4"/><circle cx="15" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="14" cy="18" r="2"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  send:'<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/>',
};
function icon(name,size=22,extra=""){
  return h("span",{class:"ic "+extra,html:`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||""}</svg>`});
}

/* ---- Generated cover art (deterministic gradient + soft blobs) ----
   No external images → fully offline, always beautiful. */
function hashStr(s){let hnum=0;for(let i=0;i<s.length;i++){hnum=(hnum*31+s.charCodeAt(i))>>>0;}return hnum;}
function coverFor(vendorOrSeed, idx=0){
  let seed, hueBase=340, spread=24, emoji="🌸";
  if(typeof vendorOrSeed==="object"){
    const v=vendorOrSeed; seed=v.id+(idx||"");
    const ch=CAT_HUE[v.catId]||[340,24]; hueBase=ch[0]; spread=ch[1];
    const cat=(typeof CATEGORIES!=="undefined"?CATEGORIES:SEED_CATEGORIES).find(c=>c.id===v.catId);
    emoji=cat?cat.icon:"🌸";
  }else{seed=String(vendorOrSeed);}
  const hnum=hashStr(seed+idx);
  const hue=(hueBase + (hnum%(spread*2)) - spread + 360)%360;
  const hue2=(hue + 18 + (hnum>>3)%26)%360;
  const l1=88-(hnum%8), l2=80-(hnum>>4)%12;
  const x1=10+(hnum%70), y1=10+((hnum>>5)%70), x2=10+((hnum>>7)%70), y2=10+((hnum>>9)%70);
  const bg=`radial-gradient(circle at ${x1}% ${y1}%, hsl(${hue} 55% ${l1}%), transparent 55%),`+
           `radial-gradient(circle at ${x2}% ${y2}%, hsl(${hue2} 50% ${l2}%), transparent 60%),`+
           `linear-gradient(140deg, hsl(${hue} 45% ${l1-4}%), hsl(${hue2} 42% ${l2-6}%))`;
  return {bg,emoji,hue};
}
/* returns a thumb element with generated art + optional emoji watermark */
function coverEl(vendor, cls="", idx=0, showEmoji=true){
  const c=coverFor(vendor,idx);
  const el=h("div.thumb "+cls,{style:{background:c.bg}});
  if(showEmoji)el.appendChild(h("span",{style:{position:"absolute",right:"10px",bottom:"8px",fontSize:"22px",opacity:".55",filter:"saturate(1.2)"}},c.emoji));
  return el;
}

/* ---- Stars ---- */
function starsEl(rating){
  return h("span.stars",{style:{"--v":rating}},h("i"));
}

/* ---- Progress ring (SVG) ---- */
function ringEl(pct, size=120, label="Complete"){
  const r=(size-16)/2, c=2*Math.PI*r, off=c*(1-pct/100);
  const wrap=h("div.ring-wrap",{style:{width:size+"px",height:size+"px"}});
  wrap.innerHTML=`<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs><linearGradient id="rg${size}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="var(--rose)"/><stop offset="1" stop-color="var(--gold)"/></linearGradient></defs>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--surface3)" stroke-width="9"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="url(#rg${size})" stroke-width="9"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c}"
      transform="rotate(-90 ${size/2} ${size/2})" style="transition:stroke-dashoffset 1.1s var(--ease)"/>
  </svg>`;
  const val=h("div.ring-c",[h("div.v",{style:{fontSize:(size*0.26)+"px",color:"var(--rose-deep)"}},pct+"%"),
    label?h("div.tiny.muted",{style:{marginTop:"2px",fontWeight:"600"}},label):null]);
  wrap.appendChild(val);
  requestAnimationFrame(()=>{const circ=wrap.querySelectorAll("circle")[1];if(circ)circ.style.strokeDashoffset=off;});
  return wrap;
}

/* ---- Toast ---- */
let _toastWrap;
function toast(msg, em="✨"){
  if(!_toastWrap){_toastWrap=h("div#toast-wrap");document.body.appendChild(_toastWrap);}
  const t=h("div.toast",[em?h("span.em",em):null,h("span",msg)]);
  _toastWrap.appendChild(t);
  setTimeout(()=>{t.classList.add("out");setTimeout(()=>t.remove(),320);},2400);
}

/* ---- Modal / bottom sheet ---- */
function sheet({title,body,actions,onClose,maxWidth}){
  const scrim=h("div.scrim",{onclick:e=>{if(e.target===scrim)close();}});
  const s=h("div.sheet",maxWidth?{style:{maxWidth}}:{});
  s.appendChild(h("div.sheet-grab"));
  if(title)s.appendChild(h("div.sheet-h",[h("h3",title),h("button.icon-btn.plain",{onclick:()=>close(),"aria-label":"Close"},icon("close",22))]));
  const content=h("div",{style:{padding:"6px 20px 22px"}});
  content.appendChild(typeof body==="function"?body(close):body);
  s.appendChild(content);
  if(actions)s.appendChild(h("div",{style:{padding:"0 20px 22px",display:"flex",gap:"10px"}},actions));
  scrim.appendChild(s);
  document.body.appendChild(scrim);
  document.body.style.overflow="hidden";
  function close(){s.style.animation="sheetUp .3s var(--ease) reverse";scrim.style.animation="fade .3s reverse";
    setTimeout(()=>{scrim.remove();document.body.style.overflow="";},260);onClose&&onClose();}
  return {close,el:s};
}
function confirmSheet(title,text,confirmLabel,onOk,danger){
  let ref;
  ref=sheet({title,body:h("p.muted",{style:{margin:"4px 3px 6px"}},text),
    actions:[
      h("button.btn.btn-sec.grow",{onclick:()=>ref.close()},"Cancel"),
      h("button.btn.grow "+(danger?"":"btn-pri"),{style:danger?{background:"var(--crit)",color:"#fff"}:{},onclick:()=>{ref.close();onOk();}},confirmLabel),
    ]});
  return ref;
}

/* ---- Confetti (rose/gold) ---- */
function confetti(){
  let cv=document.getElementById("confetti");
  if(!cv){cv=h("canvas#confetti");document.body.appendChild(cv);}
  const ctx=cv.getContext("2d"), W=cv.width=innerWidth, H=cv.height=innerHeight;
  const cols=["#B76E79","#C6A469","#E7D3BE","#F7E3E6","#9E5763","#E8D5C4"];
  const P=Array.from({length:140},()=>({x:Math.random()*W,y:-20-Math.random()*H*0.4,
    r:4+Math.random()*6,c:cols[(Math.random()*cols.length)|0],
    vx:(Math.random()-.5)*3,vy:2+Math.random()*4,a:Math.random()*6,va:(Math.random()-.5)*.3,sh:Math.random()<.5}));
  let t=0;
  (function frame(){t++;ctx.clearRect(0,0,W,H);
    P.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.03;p.a+=p.va;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.c;
      if(p.sh)ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*1.6);else{ctx.beginPath();ctx.ellipse(0,0,p.r,p.r*.6,0,0,7);ctx.fill();}
      ctx.restore();});
    if(t<150)requestAnimationFrame(frame);else ctx.clearRect(0,0,W,H);
  })();
}

/* ---- Toggle switch (labeled) ---- */
function toggle(label,on,onChange){
  let state=!!on;
  const knob=h("span",{style:{position:"absolute",top:"3px",left:state?"23px":"3px",width:"20px",height:"20px",borderRadius:"50%",
    background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.25)",transition:"left var(--dur) var(--ease)"}});
  const track=h("button",{style:{position:"relative",width:"46px",height:"26px",borderRadius:"999px",flex:"none",
    background:state?"var(--rose)":"var(--line2)",transition:"background var(--dur)"},"aria-label":label,
    onclick:()=>{state=!state;track.style.background=state?"var(--rose)":"var(--line2)";knob.style.left=state?"23px":"3px";onChange&&onChange(state);}},knob);
  return h("div.between",{style:{padding:"6px 2px"}},[h("span",{style:{fontWeight:"600"}},label),track]);
}

/* ---- misc helpers ---- */
const money=(n)=>"OMR "+Number(n).toLocaleString("en",{minimumFractionDigits:0});
const priceDots=(lvl)=>"·".repeat(0)+"OMR".slice(0,0)+ Array.from({length:4},(_,i)=>i<lvl?"$":"").join("");
function priceLabel(lvl){return ["","Budget","Mid-range","Premium","Luxury"][lvl]||"";}
function timeAgo(ts){const d=(Date.now()-ts)/1000;if(d<3600)return Math.max(1,d/60|0)+"m ago";if(d<86400)return (d/3600|0)+"h ago";return (d/86400|0)+"d ago";}
function initials(name){return name.split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();}
