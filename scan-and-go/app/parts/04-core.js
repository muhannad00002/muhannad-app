/* ============ APP CORE: router, actions, launcher ============ */
(()=>{
const {icon, esc} = SG;

/* session (per-tab) */
let sess = {};
try{ sess = JSON.parse(sessionStorage.getItem("sayr_sess")||"{}"); }catch(e){}
SG.sess = sess;
SG.saveSess = ()=>{ try{sessionStorage.setItem("sayr_sess",JSON.stringify(SG.sess));}catch(e){} };

/* action registry + delegation */
SG.actions = {};
document.addEventListener("click", e=>{
  const nav = e.target.closest("[data-nav]");
  if(nav){ e.preventDefault(); SG.go(nav.dataset.nav); return; }
  const act = e.target.closest("[data-act]");
  if(act){ const fn = SG.actions[act.dataset.act]; if(fn){ e.preventDefault(); fn(act.dataset.arg, act, e); } }
});
SG.actions["theme"] = ()=> SG.toggleTheme();
SG.actions["go-online"] = ()=>{ SG.offline.forced=false; SG.toast("Back online — everything synced"); SG.render(); };
SG.actions["go-offline"] = ()=>{ SG.offline.forced=true; SG.render(); };
SG.actions["reset-demo"] = ()=> SG.confirm({title:"Reset demo data", danger:true, okLabel:"Reset everything",
  message:"This restores the original seeded catalog, orders and settings. Anything you created in this session will be removed.", cb:()=>SG.resetDB()});

/* router */
SG.go = h => { if(location.hash===h){ SG.render(); } else location.hash = h; };
SG.route = ()=> {
  const parts = location.hash.replace(/^#\/?/,"").split("/").filter(Boolean);
  return {app:parts[0]||"", page:parts[1]||"", arg:parts[2]||""};
};
const loaded = new Set();          /* routes that already "fetched" */
SG.loadOnce = (key, ms) => {       /* returns true if still loading; schedules re-render */
  if(loaded.has(key)) return false;
  setTimeout(()=>{ loaded.add(key); SG.render(); }, ms||(280+Math.random()*260));
  return true;
};
SG.invalidate = key => loaded.delete(key);

let mountCleanup = null;
SG.onCleanup = fn => { mountCleanup = fn; };
SG.render = ()=>{
  if(mountCleanup){ try{mountCleanup();}catch(e){} mountCleanup=null; }
  SG.hideTip();
  const r = SG.route();
  const root = document.getElementById("root");
  const app = SG.apps[r.app] || SG.apps.launcher;
  app(root, r);
  if(SG.demoTick) SG.demoTick(r);
};
addEventListener("hashchange", SG.render);
addEventListener("resize", (()=>{ let t; return ()=>{ clearTimeout(t); t=setTimeout(()=>{ const r=SG.route(); if(r.app) SG.render(); },200); }; })());

/* notification hook → toast when relevant app not focused */
SG.onNotify = (audience, title)=>{
  const cur = SG.route().app;
  const map = {customer:"customer", merchant:"merchant", vendor:"vendor"};
  if(map[audience]!==cur) return; /* toasts for in-app arrivals handled by flows */
};

/* ============ LAUNCHER ============ */
SG.apps = {};
SG.apps.launcher = (root)=>{
  document.title = "Sayr — Scan & Go Commerce Platform";
  const roles = [
    {id:"customer", ic:"phone", color:"var(--c1)", name:"Customer App", desc:"Scan the shelf, skip the line. Shop Nora Boutique as a customer.", go:"#/customer/splash"},
    {id:"merchant", ic:"store", color:"var(--c2)", name:"Merchant Back Office", desc:"Dashboard, POS checkout, products, inventory, vendors and reports.", go:"#/merchant/dashboard"},
    {id:"vendor",   ic:"layers", color:"var(--c3)", name:"Vendor Portal", desc:"Dune Atelier's view: their products, sales and daily digests.", go:"#/vendor/home"},
    {id:"admin",    ic:"globe", color:"var(--c4)", name:"Platform Admin", desc:"Tenants, MRR, platform health, support and API usage.", go:"#/admin/overview"},
  ];
  root.innerHTML = SG.offlineBanner()+
  '<div class="launcher">'+
    '<div style="position:absolute;top:18px;right:18px;display:flex;gap:6px">'+SG.themeBtn()+'</div>'+
    '<div class="wordmark"><div class="logo-mark">'+icon("scan",24)+'</div><h1>Sayr</h1></div>'+
    '<div class="eyebrow" style="margin-bottom:6px">Scan &amp; Go commerce platform</div>'+
    '<p class="tag">One platform connecting shoppers, cashiers, store owners, brand vendors and the platform itself — pick a seat and explore. Every role below shares the same live data.</p>'+
    '<div class="role-grid">'+roles.map(r=>
      '<button class="role-card" data-nav="'+r.go+'">'+
        '<div class="role-ic" style="background:color-mix(in oklab,'+r.color+' 16%,var(--surface));color:'+r.color+'">'+icon(r.ic,22)+'</div>'+
        '<h3>'+r.name+'</h3><p>'+r.desc+'</p>'+
        '<span class="go">Open '+icon("chevR",14)+'</span></button>').join("")+
    '</div>'+
    '<div class="launcher-foot">'+
      '<button class="btn btn-pri btn-lg" data-act="demo-start">'+icon("play",17)+' Play the guided demo</button>'+
      '<button class="btn btn-ghost" data-act="reset-demo">'+icon("refresh",15)+' Reset demo data</button>'+
    '</div>'+
    '<p class="small muted" style="margin-top:26px;max-width:520px;text-align:center">Simulated environment with seeded data for Nora Boutique, Riyadh &amp; Jeddah. A sale completed at the POS updates inventory, vendor feeds, loyalty and every report in real time.</p>'+
  '</div>';
};
})();
