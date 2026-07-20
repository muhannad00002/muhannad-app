/* ================= ZAFFA — CORE (state · router · shell) ================= */

const LS_KEY="zaffa.v1";

/* Live collections (mutable; admin edits these) */
let CATEGORIES, VENDORS, TIPS, ADS, USERS;

/* Persistent app state */
let S;

function defaultState(){
  return {
    onboarded:false,
    role:"bride",                 // bride | admin
    theme:"light",                // day by default; user can switch in Profile
    bride:{name:"Sarah", date:null, budget:6000, currency:"OMR"},
    checklist:{},                 // taskId -> "todo"|"prog"|"done"
    selectedVendor:{},            // taskId -> vendorId (when a vendor completes a task)
    favorites:[],                 // vendorId[]
    notifs:[],
    dismissedTips:false,
    seenSuggest:[],               // suggestion task ids already surfaced
    subscription:{plan:"free",tier:null,since:null}, // free | premium
    account:null,                 // {email,name,role,token} when signed in to the cloud backend
    viewedCats:[],                // distinct category ids opened on free tier
    bookings:{},                  // taskId -> {vendorId,date,time,note}
    assistant:{msgs:[],used:0},   // chat history + free-message counter
    _catSeed:null,_vendorSeed:null,
  };
}

/* ---- Freemium model ---- */
const FREE_CATEGORY_VIEWS = 3;   // distinct categories a free user may open
const FREE_AI_MESSAGES    = 3;   // assistant messages before paywall
function isPremium(){ return S.subscription && S.subscription.plan==="premium"; }
function categoryViewable(id){
  if(isPremium())return true;
  if(S.viewedCats.includes(id))return true;         // already opened → stays open
  return S.viewedCats.length < FREE_CATEGORY_VIEWS; // still have free slots
}
function recordCategoryView(id){
  if(isPremium())return;
  if(!S.viewedCats.includes(id)){ S.viewedCats.push(id); save(); }
}
function freeCatsLeft(){ return Math.max(0, FREE_CATEGORY_VIEWS - S.viewedCats.length); }
function goPremium(tier){
  S.subscription={plan:"premium",tier:tier||"monthly",since:Date.now()};
  save();
}
function cancelPremium(){ S.subscription={plan:"free",tier:null,since:null}; save(); }

/* ---- Bookings / appointments ---- */
function saveBooking(taskId,vendorId,date,time,note){
  S.bookings[taskId]={vendorId,date,time:time||"",note:note||""}; save();
}
function upcomingBookings(){
  return Object.entries(S.bookings).map(([taskId,b])=>({taskId,...b,vendor:vendorById(b.vendorId),task:templateById(taskId)}))
    .filter(b=>b.vendor&&b.date)
    .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}

/* ---- Calendar export (offline, no backend) ---- */
function fmtICSDate(date,time){
  // date "YYYY-MM-DD", time "HH:MM" (optional) → local floating time
  const d=date.replace(/-/g,"");
  const t=(time||"10:00").replace(":","")+"00";
  return d+"T"+t;
}
function addHour(time){
  const [hh,mm]=(time||"10:00").split(":").map(Number);
  const h=(hh+1)%24; return String(h).padStart(2,"0")+":"+String(mm||0).padStart(2,"0");
}
function buildICS({title,date,time,desc,location}){
  const dt=fmtICSDate(date,time), dtEnd=fmtICSDate(date,addHour(time));
  const stamp=new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
  const esc=s=>String(s||"").replace(/([,;\\])/g,"\\$1").replace(/\n/g,"\\n");
  return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Zaffa//Wedding Planner//EN","CALSCALE:GREGORIAN","BEGIN:VEVENT",
    "UID:"+stamp+"-"+Math.random().toString(36).slice(2)+"@zaffa","DTSTAMP:"+stamp,
    "DTSTART:"+dt,"DTEND:"+dtEnd,"SUMMARY:"+esc(title),"DESCRIPTION:"+esc(desc),
    "LOCATION:"+esc(location),"BEGIN:VALARM","TRIGGER:-P1D","ACTION:DISPLAY","DESCRIPTION:"+esc(title),"END:VALARM",
    "END:VEVENT","END:VCALENDAR"].join("\r\n");
}
function downloadICS(opts){
  const blob=new Blob([buildICS(opts)],{type:"text/calendar"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=(opts.title||"appointment").replace(/[^\w]+/g,"-").toLowerCase()+".ics";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function gcalUrl({title,date,time,desc,location}){
  const dt=fmtICSDate(date,time), dtEnd=fmtICSDate(date,addHour(time));
  const q=new URLSearchParams({action:"TEMPLATE",text:title||"",dates:dt+"/"+dtEnd,details:desc||"",location:location||""});
  return "https://calendar.google.com/calendar/render?"+q.toString();
}

function load(){
  let raw=null;
  try{raw=JSON.parse(localStorage.getItem(LS_KEY));}catch{}
  // hydrate mutable collections (admin changes persist)
  CATEGORIES = raw?._categories || SEED_CATEGORIES.map(c=>({...c}));
  VENDORS    = raw?._vendors    || SEED_VENDORS.map(v=>({...v}));
  // ensure every vendor has a governorate (derive from city for older records)
  VENDORS.forEach(v=>{ if(!v.governorate) v.governorate = govOfCity(v.city); });
  TIPS       = raw?._tips       || SEED_TIPS.map(t=>({...t}));
  ADS        = raw?._ads        || SEED_ADS.map(a=>({...a}));
  USERS      = raw?._users      || SEED_USERS.map(u=>({...u}));
  S = raw?.state ? {...defaultState(), ...raw.state, bride:{...defaultState().bride, ...(raw.state.bride||{})}} : defaultState();
  if(!S.checklist||!Object.keys(S.checklist).length){
    S.checklist={}; CHECKLIST_TEMPLATE.forEach(t=>S.checklist[t.id]="todo");
  }
  if(!S.notifs||!S.notifs.length)S.notifs=SEED_NOTIFS.map(n=>({...n}));
}

function save(){
  try{localStorage.setItem(LS_KEY,JSON.stringify({
    state:S,_categories:CATEGORIES,_vendors:VENDORS,_tips:TIPS,_ads:ADS,_users:USERS,
  }));}catch(e){}
}

/* ---- derived data ---- */
function catById(id){return CATEGORIES.find(c=>c.id===id);}
function vendorById(id){return VENDORS.find(v=>v.id===id);}
function vendorsInCat(id){return VENDORS.filter(v=>v.catId===id && v.approved);}
function templateById(id){return CHECKLIST_TEMPLATE.find(t=>t.id===id);}

function progressPct(){
  const ids=CHECKLIST_TEMPLATE.map(t=>t.id);
  const done=ids.filter(id=>S.checklist[id]==="done").length;
  const prog=ids.filter(id=>S.checklist[id]==="prog").length;
  return Math.round((done + prog*0.4)/ids.length*100);
}
function counts(){
  const v=Object.values(S.checklist);
  return {done:v.filter(x=>x==="done").length,prog:v.filter(x=>x==="prog").length,
    todo:v.filter(x=>x==="todo").length,total:CHECKLIST_TEMPLATE.length};
}
function daysLeft(){
  if(!S.bride.date)return null;
  const d=new Date(S.bride.date+"T00:00:00"); const now=new Date(); now.setHours(0,0,0,0);
  return Math.max(0,Math.round((d-now)/86400000));
}

/* Suggested next tasks: incomplete items unlocked by recently completed ones,
   falling back to high-priority foundational tasks. */
function suggestedTasks(limit=3){
  const out=[]; const seen=new Set();
  // 1. relationship-driven: tasks suggested by completed tasks, still not done
  CHECKLIST_TEMPLATE.forEach(t=>{
    if(S.checklist[t.id]==="done" && t.suggests){
      t.suggests.forEach(sid=>{
        if(S.checklist[sid] && S.checklist[sid]!=="done" && !seen.has(sid)){seen.add(sid);out.push(sid);}
      });
    }
  });
  // 2. fill with earliest incomplete tasks
  for(const t of CHECKLIST_TEMPLATE){
    if(out.length>=limit*2)break;
    if(S.checklist[t.id]!=="done" && !seen.has(t.id)){seen.add(t.id);out.push(t.id);}
  }
  return out.slice(0,limit).map(templateById).filter(Boolean);
}

/* set task status + cascade notifications/suggestions */
function setTask(id,status,opts={}){
  const prev=S.checklist[id];
  S.checklist[id]=status;
  if(status!=="done") delete S.selectedVendor[id];
  save();
  if(status==="done" && prev!=="done" && !opts.silent){
    const t=templateById(id);
    // surface newly-unlocked suggestions as a gentle notification
    if(t&&t.suggests){
      const fresh=t.suggests.filter(sid=>S.checklist[sid]==="todo").map(templateById).filter(Boolean).slice(0,3);
      if(fresh.length){
        pushNotif({em:"💡",title:`Nice! What's next after “${t.title.replace(/^\w+\s/,"")}”`,
          body:"Suggested: "+fresh.map(f=>f.title.replace(/^(Book|Buy|Order|Choose|Arrange|Send|Set up|Reserve|Select|Consider|Prepare|Confirm|Draft|Print|Add|Plan) /,"")).join(", "),taskId:fresh[0].id});
      }
    }
  }
}

function selectVendorForTask(vendorId, taskId){
  S.selectedVendor[taskId]=vendorId;
  setTask(taskId,"done");
  save();
}

function toggleFav(vendorId){
  const i=S.favorites.indexOf(vendorId);
  if(i>=0){S.favorites.splice(i,1);toast("Removed from favourites","🤍");}
  else{S.favorites.unshift(vendorId);toast("Saved to favourites","💗");}
  save();
}

function pushNotif(n){
  S.notifs.unshift({id:"n"+Date.now()+Math.random().toString(36).slice(2,5),read:false,when:Date.now(),em:"🔔",...n});
  if(S.notifs.length>40)S.notifs.length=40;
  save();
}
function unreadNotifs(){return S.notifs.filter(n=>!n.read).length;}

/* theme */
function applyTheme(){
  const t=S.theme;
  if(t==="auto")document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme",t);
}

/* ================= ROUTER ================= */
const routes={};
function route(path,fn){routes[path]=fn;}
function go(path){location.hash="#"+path;}
function back(){if(history.length>1)history.back();else go("/home");}

function parseHash(){
  const raw=(location.hash||"#/home").slice(1);
  const [path,q]=raw.split("?");
  const query=Object.fromEntries(new URLSearchParams(q||""));
  return {path,query,raw};
}

let _scrollMem={};
function render(){
  const {path,query}=parseHash();
  // remember scroll of previous
  const root=document.getElementById("root");
  // find matching route: exact, then prefix with :param
  let fn=routes[path], params={};
  if(!fn){
    for(const r in routes){
      const rp=r.split("/"), pp=path.split("/");
      if(rp.length!==pp.length)continue;
      let ok=true,pm={};
      for(let i=0;i<rp.length;i++){
        if(rp[i].startsWith(":"))pm[rp[i].slice(1)]=decodeURIComponent(pp[i]);
        else if(rp[i]!==pp[i]){ok=false;break;}
      }
      if(ok){fn=routes[r];params=pm;break;}
    }
  }
  if(!fn)fn=routes["/home"];
  clear(root);
  applyTheme();
  // Admin area is access-controlled: every /admin* route requires a signed-in
  // admin account. Otherwise show the admin sign-in gate.
  let view;
  if(path.indexOf("/admin")===0 && !(S.account && S.account.role==="admin") && typeof adminGateView==="function"){
    view=adminGateView();
  }else{
    view=fn({...query},params);
  }
  root.appendChild(view);
  window.scrollTo(0,0);
}
function isAdmin(){ return !!(S.account && S.account.role==="admin"); }
window.addEventListener("hashchange",render);

/* ================= SHELL PIECES ================= */
function topbar(title,{back:showBack,right,large}={}){
  const bar=h("div.topbar");
  if(showBack)bar.appendChild(h("button.icon-btn",{onclick:()=>back(),"aria-label":"Back"},icon("back",22)));
  bar.appendChild(h("h2",title));
  if(right)bar.appendChild(right);
  else bar.appendChild(h("span",{style:{width:showBack?"0":"0"}}));
  return bar;
}

function brideTabs(active){
  const tabs=[
    ["/home","home","Home"],
    ["/categories","grid","Explore"],
    ["/checklist","list","Plan"],
    ["/favorites","heart","Saved"],
    ["/profile","user","You"],
  ];
  return h("nav.tabbar",tabs.map(([path,ic,label])=>
    h("button.tab"+(active===path?".on":""),{onclick:()=>go(path)},[
      icon(ic,23),h("span",label),
    ])
  ));
}
function adminTabs(active){
  const tabs=[
    ["/admin","chart","Overview"],
    ["/admin/vendors","tag","Vendors"],
    ["/admin/categories","grid","Categories"],
    ["/admin/users","users","Users"],
    ["/admin/more","settings","More"],
  ];
  return h("nav.tabbar",tabs.map(([path,ic,label])=>
    h("button.tab"+(active===path?".on":""),{onclick:()=>go(path)},[
      icon(ic,22),h("span",label),
    ])
  ));
}

/* wrap a screen in the phone app frame with optional tabbar */
function appFrame(children,{tabs,noTab}={}){
  const app=h("div.app");
  const screen=h("div.screen"+(noTab?".no-tab":""));
  (Array.isArray(children)?children:[children]).forEach(c=>c&&screen.appendChild(c));
  app.appendChild(screen);
  if(tabs)app.appendChild(tabs);
  return app;
}

/* vendor card (used in lists & horizontal rails) */
function vendorCard(v,{horizontal}={}){
  const cat=catById(v.catId);
  const fav=S.favorites.includes(v.id);
  const heart=h("button.icon-btn",{style:{position:"absolute",top:"10px",right:"10px",width:"38px",height:"38px",background:"rgba(255,255,255,.82)",backdropFilter:"blur(4px)"},
    onclick:e=>{e.stopPropagation();toggleFav(v.id);heart.querySelector(".ic").replaceWith(icon(S.favorites.includes(v.id)?"heartFill":"heart",20));heart.style.color=S.favorites.includes(v.id)?"var(--rose)":"var(--ink2)";},
    "aria-label":"Save"},icon(fav?"heartFill":"heart",20));
  heart.style.color=fav?"var(--rose)":"var(--ink2)";
  const cover=coverEl(v,"",0,true);
  cover.style.height=horizontal?"128px":"172px";
  cover.style.width="100%";
  cover.style.borderRadius="var(--r-l) var(--r-l) 0 0";
  cover.appendChild(heart);
  if(v.offer)cover.appendChild(h("span.tag.tag-gold",{style:{position:"absolute",left:"10px",top:"10px"}},["🎁 ",v.offer.label.length>18?"Offer":v.offer.label]));
  else if(v.isNew)cover.appendChild(h("span.tag.tag-rose",{style:{position:"absolute",left:"10px",top:"10px"}},"✦ New"));
  else if(v.featured)cover.appendChild(h("span.tag.tag-gold",{style:{position:"absolute",left:"10px",top:"10px"}},"★ Featured"));

  const card=h("div.card.card-2",{style:{overflow:"hidden",cursor:"pointer",width:horizontal?"244px":"auto",flex:horizontal?"none":"",scrollSnapAlign:"start"},
    onclick:()=>go("/vendor/"+v.id)},[
    cover,
    h("div.pad-s",[
      h("div.between",[h("h4",{style:{fontSize:"17px"}},v.name),
        h("span.row.gap6",{style:{flex:"none"}},[h("span",{style:{color:"var(--gold)",fontSize:"13px"}},"★"),h("b.small",v.rating.toFixed(1))])]),
      h("div.row.gap6",{style:{marginTop:"3px",color:"var(--ink2)"}},[icon("pin",13),h("span.small",v.city),h("span.faint",{style:{margin:"0 2px"}},"·"),h("span.small",cat?cat.name:"")]),
      h("p.small.muted",{style:{margin:"7px 0 0",display:"-webkit-box",WebkitLineClamp:"2",WebkitBoxOrient:"vertical",overflow:"hidden"}},v.short),
      h("div.between",{style:{marginTop:"10px"}},[
        h("b.small",{style:{color:"var(--rose-deep)"}},v.priceRange),
        h("span.tiny.faint",v.reviews+" reviews"),
      ]),
    ]),
  ]);
  return card;
}
