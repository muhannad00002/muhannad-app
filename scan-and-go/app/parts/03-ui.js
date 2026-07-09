/* ============ UI KIT ============ */
(()=>{
const {esc} = SG;

/* ---- icon set (lucide-style, stroke 1.8) ---- */
const paths = {
  home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  scan:'<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/>',
  cart:'<circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/><path d="M3 4h2l2.5 11.5a1 1 0 0 0 1 .8h8.6a1 1 0 0 0 1-.8L20 8H6"/>',
  receipt:'<path d="M6 3h12v18l-2-1.4L14 21l-2-1.4L10 21l-2-1.4L6 21z"/><path d="M9.5 8h5"/><path d="M9.5 12h5"/>',
  user:'<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.2 3.8-4.8 7-4.8s5.8 1.6 7 4.8"/>',
  grid:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
  box:'<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="M4 7l8 4 8-4"/><path d="M12 11v10"/>',
  tag:'<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="8" cy="8" r="1.4"/>',
  qr:'<rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.2"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.2"/><path d="M14 14h3v3h-3z"/><path d="M20.5 14v2"/><path d="M14 20.5h2"/><path d="M18.5 18.5h2v2h-2z"/>',
  chart:'<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-5"/><path d="M13 16V8"/><path d="M18 16v-8.5"/>',
  users:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c1-2.8 3-4.2 5.5-4.2s4.5 1.4 5.5 4.2"/><path d="M16 6a3 3 0 0 1 0 5.7"/><path d="M17.5 15.6c1.6.5 2.7 1.7 3.3 3.4"/>',
  store:'<path d="M4 9 5.5 4h13L20 9"/><path d="M4 9a2.4 2.4 0 0 0 4.6.9A2.4 2.4 0 0 0 13.2 10 2.4 2.4 0 0 0 17.7 9.9 2.4 2.4 0 0 0 20 9"/><path d="M5.5 12.5V20h13v-7.5"/><path d="M10 20v-4.5h4V20"/>',
  settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2.8 13.4 5h2.7l1.3 2.3 2.4.9-.3 2.6 1.7 2.2-1.7 2.2.3 2.6-2.4.9L16.1 21h-2.7L12 23.2 10.6 21H7.9l-1.3-2.3-2.4-.9.3-2.6L2.8 13l1.7-2.2-.3-2.6 2.4-.9L7.9 5h2.7z" transform="scale(.92) translate(1,0)"/>',
  bell:'<path d="M6 9.5a6 6 0 0 1 12 0c0 5 1.8 6 1.8 6H4.2S6 14.5 6 9.5"/><path d="M10 19a2.2 2.2 0 0 0 4 0"/>',
  search:'<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  plus:'<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus:'<path d="M5 12h14"/>',
  trash:'<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6.5 7 7.5 20h9L17.5 7"/>',
  x:'<path d="m6 6 12 12"/><path d="m18 6-12 12"/>',
  check:'<path d="m4.5 12.5 5 5L19.5 7"/>',
  chevR:'<path d="m9 5 7 7-7 7"/>', chevL:'<path d="m15 5-7 7 7 7"/>', chevD:'<path d="m5 9 7 7 7-7"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5"/><path d="M12 19v2.5"/><path d="M2.5 12h2.5"/><path d="M19 12h2.5"/><path d="m5 5 1.8 1.8"/><path d="m17.2 17.2 1.8 1.8"/><path d="m19 5-1.8 1.8"/><path d="m6.8 17.2-1.8 1.8"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5"/>',
  logout:'<path d="M9 4H5v16h4"/><path d="M14 8l4 4-4 4"/><path d="M18 12H9"/>',
  download:'<path d="M12 4v11"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  upload:'<path d="M12 15V4"/><path d="m7 8 5-5 5 5"/><path d="M4 20h16"/>',
  print:'<path d="M7 8V3h10v5"/><rect x="4" y="8" width="16" height="8" rx="1.5"/><path d="M7 13h10v8H7z"/>',
  alert:'<path d="M12 3 2.5 20h19z"/><path d="M12 10v4"/><path d="M12 17.2v.1"/>',
  wifiOff:'<path d="m3 3 18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.5a10 10 0 0 1 3-2"/><path d="M12 8a10 10 0 0 1 7 4.5" opacity=".5"/><path d="M12 20h.1"/>',
  sparkle:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  card:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h4"/>',
  building:'<rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M9 8h2"/><path d="M13 8h2"/><path d="M9 12h2"/><path d="M13 12h2"/><path d="M10.5 20v-3.5h3V20"/>',
  ticket:'<path d="M4 7h16v3.5a2 2 0 0 0 0 3V17H4v-3.5a2 2 0 0 0 0-3z"/><path d="M13.5 7v10" stroke-dasharray="2.5 2.5"/>',
  key:'<circle cx="8" cy="14" r="4.2"/><path d="m11.5 10.5 8-8"/><path d="M16 6l2.5 2.5"/><path d="M13 9l2 2"/>',
  eye:'<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12"/><circle cx="12" cy="12" r="2.8"/>',
  refresh:'<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 3.5V7h-3.5"/>',
  filter:'<path d="M4 5h16l-6.2 7.4V19l-3.6-2v-4.6z"/>',
  arrowUp:'<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  edit:'<path d="M15.5 4.5 19.5 8.5 8 20H4v-4z"/><path d="m13.5 6.5 4 4"/>',
  more:'<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  play:'<path d="M7 4.5v15l12-7.5z"/>',
  gift:'<rect x="4" y="10" width="16" height="10.5" rx="1.5"/><path d="M3.5 6.5h17V10h-17z"/><path d="M12 6.5v14"/><path d="M12 6.5C12 4 10.5 2.8 9 3.2S7.5 6 9.5 6.5z"/><path d="M12 6.5c0-2.5 1.5-3.7 3-3.3s1.5 2.8-.5 3.3z"/>',
  zap:'<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  globe:'<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5"/>',
  phone:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  wallet:'<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M4 5v14a2 2 0 0 0 2 2h14V7"/><path d="M16 13.5h2.5"/>',
  history:'<path d="M4 12a8 8 0 1 1 2.3 5.6"/><path d="M4 20.5V17h3.5"/><path d="M12 8v4l2.8 1.8"/>',
  camera:'<path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.2"/>',
  layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m4.5 12.5 7.5 4.2 7.5-4.2" opacity=".6"/><path d="m4.5 16.5 7.5 4.2 7.5-4.2" opacity=".35"/>',
};
const icon = (name,size=20)=>'<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.box)+'</svg>';
SG.icon = icon;

/* product tile visual (deterministic gradient + emoji) */
SG.pimg = (p, size=48, radius) => {
  const [h1,h2] = p.grad||[150,170];
  return '<div class="pimg" style="width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*.44)+'px;'+(radius?'border-radius:'+radius+'px;':'')+
    'background:linear-gradient(135deg,hsl('+h1+' 42% 52%),hsl('+h2+' 48% 38%))" aria-hidden="true">'+(p.emoji||"🛍️")+'</div>';
};

/* ---- toasts ---- */
SG.toast = (msg, type="ok") => {
  let host = document.getElementById("toasts");
  if(!host){ host = document.createElement("div"); host.id="toasts"; document.body.appendChild(host); }
  const t = document.createElement("div");
  t.className = "toast"+(type==="err"?" t-err":type==="warn"?" t-warn":"");
  t.setAttribute("role","status");
  t.innerHTML = icon(type==="err"?"alert":type==="warn"?"alert":"check",17)+"<span>"+msg+"</span>";
  host.appendChild(t);
  setTimeout(()=>{ t.classList.add("out"); setTimeout(()=>t.remove(),260); }, 3400);
};

/* ---- dialog ---- */
SG.dialog = ({title, body, actions, wide, onClose}) => {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = '<div class="dialog'+(wide?' wide':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'">'+
    '<div class="dialog-h"><h3>'+title+'</h3><button class="iconbtn" data-close aria-label="Close">'+icon("x",18)+'</button></div>'+
    '<div class="dialog-b">'+body+'</div>'+
    (actions?'<div class="dialog-f">'+actions+'</div>':'')+'</div>';
  const close = ()=>{ ov.remove(); document.removeEventListener("keydown",onKey); onClose&&onClose(); };
  const onKey = e=>{ if(e.key==="Escape") close(); };
  ov.addEventListener("click", e=>{ if(e.target===ov || e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(ov);
  const f = ov.querySelector("input,select,textarea,button:not([data-close])"); f&&f.focus();
  ov.close = close;
  return ov;
};
SG.confirm = ({title, message, danger, okLabel, cb}) => {
  const d = SG.dialog({title, body:'<p class="muted" style="font-size:14px">'+message+'</p>',
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn '+(danger?'btn-danger':'btn-pri')+'" data-ok>'+(okLabel||"Confirm")+'</button>'});
  d.querySelector("[data-ok]").onclick = ()=>{ d.close(); cb(); };
};

/* ---- states ---- */
SG.emptyState = (ic,title,desc,action) =>
  '<div class="state"><div class="state-icon">'+icon(ic,26)+'</div><h3>'+title+'</h3><p>'+desc+'</p>'+(action||"")+'</div>';
SG.errorState = (retryAct) =>
  '<div class="state"><div class="state-icon" style="color:var(--crit)">'+icon("alert",26)+'</div><h3>Something went wrong</h3><p>We couldn\'t load this view. Check your connection and try again.</p><button class="btn btn-sec" data-act="'+retryAct+'">'+icon("refresh",16)+' Retry</button></div>';
SG.skelRows = (n=4,h=52) => Array.from({length:n},()=>'<div class="skel" style="height:'+h+'px;margin-bottom:10px"></div>').join("");
SG.skelDash = () =>
  '<div class="kpis">'+Array.from({length:4},()=>'<div class="skel" style="height:96px"></div>').join("")+'</div>'+
  '<div class="skel" style="height:280px"></div><div class="skel" style="height:200px"></div>';

/* ---- fake QR matrix (visual simulation of a checkout token) ---- */
SG.qrSVG = (seedStr, size=200) => {
  let h = 2166136261;
  for(const c of seedStr){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  const rng = mulberry32ish(h);
  const N = 25, cell = size/N;
  let rects = "";
  const finder = (x,y)=>{
    rects += '<rect x="'+(x*cell)+'" y="'+(y*cell)+'" width="'+(7*cell)+'" height="'+(7*cell)+'" rx="'+cell+'" fill="none" stroke="currentColor" stroke-width="'+cell+'"/>' +
             '<rect x="'+((x+2)*cell)+'" y="'+((y+2)*cell)+'" width="'+(3*cell)+'" height="'+(3*cell)+'" rx="'+(cell*.6)+'" fill="currentColor"/>';
  };
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
    const inFinder = (x<8&&y<8)||(x>=N-8&&y<8)||(x<8&&y>=N-8);
    if(inFinder) continue;
    if(rng()<.46) rects+='<rect x="'+(x*cell+cell*.08)+'" y="'+(y*cell+cell*.08)+'" width="'+(cell*.84)+'" height="'+(cell*.84)+'" rx="'+(cell*.28)+'" fill="currentColor"/>';
  }
  finder(0.5,0.5); finder(N-7.5,0.5); finder(0.5,N-7.5);
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'" role="img" aria-label="QR code">'+rects+'</svg>';
  function mulberry32ish(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
};

/* ============ CHARTS (hand-rolled SVG, hover layer included) ============ */
let tipEl = null;
function tip(){ if(!tipEl){ tipEl=document.createElement("div"); tipEl.className="chart-tip"; document.body.appendChild(tipEl);} return tipEl; }
function showTip(html,x,y){ const t=tip(); t.innerHTML=html; t.style.display="block";
  const r=t.getBoundingClientRect();
  t.style.left=Math.min(innerWidth-r.width-10, Math.max(8,x+14))+"px";
  t.style.top=Math.max(8,y-r.height-12)+"px"; }
function hideTip(){ if(tipEl) tipEl.style.display="none"; }
SG.hideTip = hideTip;

const tickFmt = n => n>=1e6?(n/1e6).toFixed(1)+"M" : n>=1000?(n/1000).toFixed(1)+"k" : String(Math.round(n));
const short = d => { const dt=new Date(d); return dt.toLocaleDateString("en-GB",{day:"numeric",month:"short"}); };

/* line/area chart: data=[{date,v}] or series list */
SG.lineChart = (host, {series, height=220, money=true, color="var(--c1)"}) => {
  const el = typeof host==="string"? document.getElementById(host) : host;
  if(!el) return;
  const data = series;
  const W = Math.max(el.clientWidth||600, 280), H = height, padL=44, padR=10, padT=12, padB=24;
  const max = Math.max(...data.map(d=>d.v), 1)*1.12;
  const x = i => padL + i*(W-padL-padR)/Math.max(data.length-1,1);
  const y = v => padT + (H-padT-padB)*(1-v/max);
  let path="", area="";
  data.forEach((d,i)=>{ const c=(i?"L":"M")+x(i).toFixed(1)+" "+y(d.v).toFixed(1); path+=c; area+=c; });
  area += "L"+x(data.length-1).toFixed(1)+" "+(H-padB)+"L"+x(0).toFixed(1)+" "+(H-padB)+"Z";
  const ticks = [0,.5,1].map(f=>Math.round(max*f));
  const gid = "g"+Math.random().toString(36).slice(2,7);
  let svg = '<svg width="100%" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="display:block">'+
    '<defs><linearGradient id="'+gid+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+color+'" stop-opacity=".18"/><stop offset="100%" stop-color="'+color+'" stop-opacity="0"/></linearGradient></defs>';
  ticks.forEach(t=>{ svg+='<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)" stroke-width="1"/>'+
    '<text x="'+(padL-7)+'" y="'+(y(t)+4)+'" text-anchor="end" font-size="10.5" fill="var(--ink3)" class="num">'+tickFmt(t)+'</text>'; });
  svg += '<path d="'+area+'" fill="url(#'+gid+')"/>';
  svg += '<path d="'+path+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  const last = data[data.length-1];
  svg += '<circle cx="'+x(data.length-1)+'" cy="'+y(last.v)+'" r="4" fill="'+color+'" stroke="var(--surface)" stroke-width="2"/>';
  const step = Math.ceil(data.length/6);
  data.forEach((d,i)=>{ if(i%step===0) svg+='<text x="'+x(i)+'" y="'+(H-7)+'" text-anchor="middle" font-size="10.5" fill="var(--ink3)">'+short(d.date)+'</text>'; });
  svg += '<line id="xh" x1="0" x2="0" y1="'+padT+'" y2="'+(H-padB)+'" stroke="var(--ink3)" stroke-width="1" stroke-dasharray="3 3" style="display:none"/>';
  svg += '<circle id="xhd" r="4.5" fill="'+color+'" stroke="var(--surface)" stroke-width="2" style="display:none"/>';
  svg += '<rect x="'+padL+'" y="'+padT+'" width="'+(W-padL-padR)+'" height="'+(H-padT-padB)+'" fill="transparent"/></svg>';
  el.innerHTML = svg;
  const s = el.querySelector("svg"), xh=s.querySelector("#xh"), xhd=s.querySelector("#xhd");
  s.addEventListener("pointermove", ev=>{
    const r = s.getBoundingClientRect();
    const px = (ev.clientX-r.left)*(W/r.width);
    const i = Math.max(0,Math.min(data.length-1,Math.round((px-padL)/((W-padL-padR)/Math.max(data.length-1,1)))));
    const d = data[i];
    xh.style.display="block"; xh.setAttribute("x1",x(i)); xh.setAttribute("x2",x(i));
    xhd.style.display="block"; xhd.setAttribute("cx",x(i)); xhd.setAttribute("cy",y(d.v));
    showTip("<b>"+short(d.date)+"</b><div class='row' style='gap:6px'><span class='dot' style='background:"+color+"'></span>"+(money?SG.fmt(d.v):d.v)+"</div>", ev.clientX, ev.clientY);
  });
  s.addEventListener("pointerleave", ()=>{ xh.style.display="none"; xhd.style.display="none"; hideTip(); });
};

/* horizontal bar list (top products etc.) */
SG.barList = (items, {money=true}={}) => {
  const max = Math.max(...items.map(i=>i.value),1);
  return items.map((it,idx)=>
    '<div class="listrow" data-tip="'+esc(it.label)+'">'+
      (it.img||'')+
      '<div style="flex:1;min-width:0"><div class="row-between" style="margin-bottom:5px"><span style="font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(it.label)+'</span>'+
      '<span class="num" style="font-size:13px;font-weight:600">'+(money?SG.fmtK(it.value):it.value)+'</span></div>'+
      '<div class="progress" role="img" aria-label="'+esc(it.label)+': '+it.value+'"><i style="width:'+Math.round(it.value/max*100)+'%;background:var(--c'+((idx%5)+1)+')"></i></div>'+
      (it.sub?'<div class="small muted" style="margin-top:3px">'+it.sub+'</div>':'')+
      '</div></div>').join("");
};

/* vertical bars */
SG.barChart = (host, {data, height=200, money=true, color="var(--c2)"}) => {
  const el = typeof host==="string"? document.getElementById(host) : host;
  if(!el) return;
  const W=Math.max(el.clientWidth||600,280), H=height, padL=44,padR=8,padT=10,padB=24;
  const max=Math.max(...data.map(d=>d.v),1)*1.15;
  const bw=(W-padL-padR)/data.length;
  const y=v=>padT+(H-padT-padB)*(1-v/max);
  let svg='<svg width="100%" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none" style="display:block">';
  [0,.5,1].forEach(f=>{ const t=Math.round(max*f); svg+='<line x1="'+padL+'" x2="'+(W-padR)+'" y1="'+y(t)+'" y2="'+y(t)+'" stroke="var(--line)"/>'+
    '<text x="'+(padL-7)+'" y="'+(y(t)+4)+'" text-anchor="end" font-size="10.5" fill="var(--ink3)" class="num">'+tickFmt(t)+'</text>'; });
  data.forEach((d,i)=>{
    const bx=padL+i*bw+bw*.18, bwid=bw*.64, by=y(d.v), bh=H-padB-by;
    svg+='<rect data-i="'+i+'" x="'+bx.toFixed(1)+'" y="'+by.toFixed(1)+'" width="'+bwid.toFixed(1)+'" height="'+Math.max(bh,2).toFixed(1)+'" rx="4" fill="'+color+'" style="cursor:pointer"/>';
    svg+='<text x="'+(bx+bwid/2)+'" y="'+(H-7)+'" text-anchor="middle" font-size="10.5" fill="var(--ink3)">'+esc(d.label)+'</text>';
  });
  svg+='</svg>';
  el.innerHTML=svg;
  el.querySelectorAll("rect[data-i]").forEach(r=>{
    r.addEventListener("pointermove",ev=>{ const d=data[+r.dataset.i];
      showTip("<b>"+esc(d.label)+"</b>"+(money?SG.fmt(d.v):d.v), ev.clientX, ev.clientY); r.setAttribute("opacity",".8"); });
    r.addEventListener("pointerleave",()=>{ hideTip(); r.removeAttribute("opacity"); });
  });
};

/* donut */
SG.donut = (host, {data, size=150}) => {
  const el=typeof host==="string"?document.getElementById(host):host; if(!el) return;
  const total=data.reduce((s,d)=>s+d.v,0)||1, R=size/2-8, C=size/2;
  let a=-90, svg='<svg width="'+size+'" height="'+size+'" viewBox="0 0 '+size+' '+size+'">';
  data.forEach((d,i)=>{
    const frac=d.v/total, a2=a+frac*360;
    const large=frac>.5?1:0;
    const p1=[C+R*Math.cos(a*Math.PI/180),C+R*Math.sin(a*Math.PI/180)];
    const p2=[C+R*Math.cos(a2*Math.PI/180),C+R*Math.sin(a2*Math.PI/180)];
    if(frac>0.001) svg+='<path data-i="'+i+'" d="M'+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+' A'+R+' '+R+' 0 '+large+' 1 '+p2[0].toFixed(1)+' '+p2[1].toFixed(1)+'" fill="none" stroke="var(--c'+((i%5)+1)+')" stroke-width="15" stroke-linecap="butt" style="cursor:pointer"/>';
    a=a2+1.5;
  });
  svg+='<text x="'+C+'" y="'+(C-2)+'" text-anchor="middle" font-size="17" font-weight="700" fill="var(--ink)" class="num">'+total.toLocaleString()+'</text>';
  svg+='<text x="'+C+'" y="'+(C+15)+'" text-anchor="middle" font-size="10" fill="var(--ink3)">orders</text></svg>';
  el.innerHTML=svg;
  el.querySelectorAll("path[data-i]").forEach(p=>{
    p.addEventListener("pointermove",ev=>{ const d=data[+p.dataset.i];
      showTip("<b>"+esc(d.label)+"</b>"+d.v+" · "+Math.round(d.v/total*100)+"%",ev.clientX,ev.clientY); });
    p.addEventListener("pointerleave",hideTip);
  });
};

SG.spark = (data, w=90, h=28, color="var(--c1)") => {
  const max=Math.max(...data,1), min=Math.min(...data,0);
  const pts=data.map((v,i)=>(i*(w-4)/(data.length-1)+2).toFixed(1)+","+(h-3-(v-min)/(max-min||1)*(h-6)).toFixed(1)).join(" ");
  return '<svg width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
};

/* ---- theme ---- */
SG.getTheme = ()=>{ try{return localStorage.getItem("sayr_theme");}catch(e){return null;} };
SG.applyTheme = t => { if(t) document.documentElement.dataset.theme=t; else delete document.documentElement.dataset.theme; };
SG.toggleTheme = ()=>{
  const cur = document.documentElement.dataset.theme ||
    (matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
  const next = cur==="dark"?"light":"dark";
  document.documentElement.dataset.theme = next;
  try{localStorage.setItem("sayr_theme",next);}catch(e){}
  SG.render && SG.render();
};
SG.themeBtn = ()=>{
  const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");
  return '<button class="iconbtn" data-act="theme" aria-label="Switch to '+(cur==="dark"?"light":"dark")+' mode" title="Toggle theme">'+icon(cur==="dark"?"sun":"moon",18)+'</button>';
};

/* ---- offline handling ---- */
SG.offline = { forced:false };
SG.isOffline = ()=> SG.offline.forced || !navigator.onLine;
addEventListener("online", ()=>{ SG.render&&SG.render(); SG.toast("Back online — everything synced","ok"); });
addEventListener("offline", ()=>{ SG.render&&SG.render(); });
SG.offlineBanner = ()=> SG.isOffline()
  ? '<div class="offline-banner" role="alert">'+icon("wifiOff",15)+' You\'re offline — showing cached data. Changes will sync when you reconnect.'+
    (SG.offline.forced?' <button style="text-decoration:underline;color:#fff;font-weight:700" data-act="go-online">Go online</button>':'')+'</div>'
  : "";
SG.guardOnline = (msg)=>{ if(SG.isOffline()){ SG.toast(msg||"You're offline. This action will be available when you reconnect.","warn"); return false;} return true; };
})();
