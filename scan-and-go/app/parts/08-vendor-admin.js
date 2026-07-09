/* ============ VENDOR PORTAL + PLATFORM ADMIN ============ */
(()=>{
const {DB, icon, esc, fmt, fmtK, pimg} = SG;
const VENDOR_ID = "v1"; /* portal is scoped: Dune Atelier's login */

/* ---------- VENDOR PORTAL ---------- */
const VNAV = [
  {id:"home", ic:"home", label:"Overview"},
  {id:"products", ic:"box", label:"My products"},
  {id:"sales", ic:"chart", label:"Sales"},
  {id:"reports", ic:"download", label:"Reports"},
  {id:"alerts", ic:"bell", label:"Notifications", live:()=>DB.notifications.vendor.filter(n=>!n.read).length},
];
function vshell(page, inner){
  const v = SG.vendorById(VENDOR_ID);
  return SG.offlineBanner()+
  '<div class="shell"><aside class="sidebar">'+
    '<button class="brand" data-nav="#/" title="Back to launcher" style="text-align:left">'+
      '<div class="logo-mark" style="background:var(--c3)">'+icon("layers",18)+'</div>'+
      '<div><b>'+esc(v.name)+'</b><span>Vendor portal · '+esc(DB.storeName)+'</span></div></button>'+
    VNAV.map(n=>{ const live=n.live?n.live():0;
      return '<button class="navlink'+(n.id===page?' active':'')+'" data-nav="#/vendor/'+n.id+'">'+icon(n.ic,18)+n.label+
      (live?'<span class="badge num">'+live+'</span>':'')+'</button>';}).join("")+
    '<div class="sidebar-foot"><div class="panel small" style="line-height:1.5">Daily digest arrives at '+DB.settings.dailyVendorHour+':00 via email + WhatsApp. <a href="#/vendor/alerts" data-nav="#/vendor/alerts">Preferences</a></div>'+
    '<div class="row" style="padding:8px 8px 0"><div class="avatar" style="background:var(--warn-soft);color:var(--warn)">LH</div>'+
    '<div style="flex:1"><div style="font-size:12.5px;font-weight:600">'+esc(v.contact)+'</div><div style="font-size:11px;color:var(--ink3)">'+esc(v.name)+'</div></div>'+
    '<button class="iconbtn" data-nav="#/" aria-label="Exit">'+icon("logout",16)+'</button></div></div></aside>'+
  '<div class="main"><header class="topbar"><h1>'+(VNAV.find(n=>n.id===page)||{}).label+'</h1>'+
    '<span class="chip chip-neutral">Read-only: your brand\'s data only</span>'+SG.themeBtn()+'</header>'+
  '<div class="content"><div class="content-inner">'+inner+'</div></div>'+
  '<nav class="mobile-nav">'+VNAV.map(n=>'<button class="tab'+(n.id===page?' active':'')+'" data-nav="#/vendor/'+n.id+'">'+icon(n.ic,20)+'<span>'+n.label.split(" ")[0]+'</span></button>').join("")+'</nav>'+
  '</div></div>';
}
SG.apps.vendor = (root, r)=>{
  document.title = "Sayr — Vendor Portal";
  const pages = {home:vhome, products:vproducts, sales:vsales, reports:vreports, alerts:valerts};
  (pages[r.page]||vhome)(root, r);
};

function vhome(root){
  if(SG.loadOnce("v-home")){ root.innerHTML = vshell("home", SG.skelDash()); return; }
  const agg = SG.vendorAgg(VENDOR_ID,30);
  const aggToday = SG.vendorAgg(VENDOR_ID,1);
  const v = SG.vendorById(VENDOR_ID);
  const mine = DB.products.filter(p=>p.vendorId===VENDOR_ID);
  const lows = mine.filter(p=>((p.stock.b1||0)+(p.stock.b2||0))<=p.lowAt);
  const pending = DB.settlements.find(s=>s.vendorId===VENDOR_ID&&s.status==="pending");
  root.innerHTML = vshell("home",
    '<div class="kpis">'+
      '<div class="kpi"><span class="kpi-label">Today</span><span class="kpi-value num">'+fmtK(aggToday.gross)+'</span><span class="kpi-delta muted">'+aggToday.units+' units</span></div>'+
      '<div class="kpi"><span class="kpi-label">Last 30 days</span><span class="kpi-value num">'+fmtK(agg.gross)+'</span><span class="kpi-delta muted">'+agg.units+' units</span></div>'+
      '<div class="kpi"><span class="kpi-label">Your payout (est.)</span><span class="kpi-value num">'+fmtK(agg.gross*(1-v.commission/100))+'</span><span class="kpi-delta muted">after '+v.commission+'% commission</span></div>'+
      '<div class="kpi"><span class="kpi-label">Pending settlement</span><span class="kpi-value num">'+(pending?fmtK(pending.net):"—")+'</span><span class="kpi-delta muted">'+(pending?pending.period:"all settled")+'</span></div></div>'+
    '<div class="chart-card"><div class="chart-h"><h3>Your daily sales at '+esc(DB.storeName)+'</h3>'+
      '<div class="chart-legend"><span class="lg"><span class="sw" style="background:var(--c3)"></span>Gross (OMR)</span></div></div><div id="v-line"></div></div>'+
    '<div class="grid2">'+
      '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:8px">Stock health</h3>'+
        (lows.length? lows.map(p=>'<div class="listrow">'+pimg(p,36,9)+'<div style="flex:1"><b style="font-size:13.5px">'+esc(p.name)+'</b>'+
          '<div class="small muted">Send stock to the boutique soon</div></div><span class="chip chip-warn num">'+((p.stock.b1||0)+(p.stock.b2||0))+' left</span></div>').join("")
        : '<p class="small muted">All your products are comfortably stocked.</p>')+'</div>'+
      '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:8px">Latest digest</h3>'+
        '<div class="panel small" style="line-height:1.6"><b>Yesterday at '+esc(DB.storeName)+'</b><br>'+
        'Units sold: <b class="num">'+Math.max(agg.series[agg.series.length-2]?Math.round(agg.series[agg.series.length-2].v/180):3,1)+'</b> · Gross: <b class="num">'+fmt(agg.series[agg.series.length-2]?agg.series[agg.series.length-2].v:0)+'</b><br>'+
        (lows.length?'Low stock: '+lows.map(p=>esc(p.name)).join(", "):"No low-stock items")+'<br>'+
        (pending?'Pending settlement: '+fmt(pending.net)+' ('+pending.period+')':'No pending settlements')+'</div>'+
        '<button class="btn btn-sec btn-sm" style="margin-top:10px" data-nav="#/vendor/reports">'+icon("download",14)+' Download full report</button></div></div>');
  SG.lineChart("v-line",{series:agg.series, height:220, color:"var(--c3)"});
}
function vproducts(root){
  const mine = DB.products.filter(p=>p.vendorId===VENDOR_ID);
  root.innerHTML = vshell("products",
    '<div class="row-between wrap"><p class="muted small">Price and inventory changes are proposed to the store owner for approval.</p>'+
    '<button class="btn btn-pri" data-act="v-propose">'+icon("plus",15)+' Propose new product</button></div>'+
    '<div class="tablewrap"><table><thead><tr><th>Product</th><th class="r">Retail price</th><th class="r">In stock</th><th class="r">30d units</th><th>Status</th><th class="r"></th></tr></thead><tbody>'+
    mine.map(p=>{ const tot=(p.stock.b1||0)+(p.stock.b2||0);
      const sold = SG.topProducts(30,99,VENDOR_ID).find(t=>t.productId===p.id);
      return '<tr><td><div class="row">'+pimg(p,36,9)+'<div><b style="font-size:13.5px">'+esc(p.name)+'</b><div class="small muted">'+p.sku+'</div></div></div></td>'+
      '<td class="r num" style="font-weight:600">'+fmt(p.price)+'</td>'+
      '<td class="r num">'+tot+(tot<=p.lowAt?' <span class="chip chip-warn">low</span>':'')+'</td>'+
      '<td class="r num">'+(sold?sold.units:0)+'</td>'+
      '<td>'+(p.approved?'<span class="chip chip-good">Live</span>':'<span class="chip chip-warn">Awaiting approval</span>')+'</td>'+
      '<td class="r"><button class="btn btn-ghost btn-sm" data-act="v-edit" data-arg="'+p.id+'">Propose edit</button></td></tr>';}).join("")+
    '</tbody></table></div>');
}
SG.actions["v-propose"]=()=>SG.dialog({title:"Propose a new product",
  body:'<div class="field"><label>Product name</label><input class="input" id="vp-name" placeholder="e.g. Desert Rose Kimono"></div>'+
  '<div class="grid2" style="gap:12px"><div class="field"><label>Suggested price</label><input class="input num" id="vp-price" type="number" placeholder="399"></div>'+
  '<div class="field"><label>Initial stock</label><input class="input num" type="number" value="10"></div></div>'+
  '<p class="small muted">'+esc(DB.storeName)+' reviews proposals within 2 business days.</p>',
  actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-ok>Submit for approval</button>'})
  .querySelector("[data-ok]").onclick=function(){
    const name=document.getElementById("vp-name");
    if(!name.value.trim()){ name.classList.add("invalid"); SG.toast("Name the product","warn"); return; }
    this.closest(".overlay").remove();
    SG.notify("merchant","box","Vendor proposal: "+name.value,"Dune Atelier proposed a new product for approval.");
    SG.toast("Submitted — the boutique has been notified"); };
SG.actions["v-edit"]=pid=>{ const p=SG.productById(pid);
  SG.dialog({title:"Propose edit — "+esc(p.name),
    body:'<div class="field"><label>New retail price (current '+fmt(p.price)+')</label><input class="input num" id="ve-price" type="number" value="'+p.price+'"></div>'+
    '<div class="field"><label>Reason</label><input class="input" placeholder="e.g. new season pricing"></div>',
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-ok>Send proposal</button>'})
  .querySelector("[data-ok]").onclick=function(){ this.closest(".overlay").remove();
    SG.notify("merchant","tag","Price change proposed: "+esc(p.name),"Dune Atelier suggests "+fmt(+document.getElementById("ve-price").value||p.price)+".");
    SG.toast("Proposal sent to "+esc(DB.storeName)); };
};
function vsales(root){
  if(SG.loadOnce("v-sales")){ root.innerHTML = vshell("sales", SG.skelRows(6,54)); return; }
  const rows = [];
  SG.ordersSince(30).slice().reverse().forEach(o=>o.items.forEach(it=>{
    if(it.vendorId===VENDOR_ID) rows.push({o,it});
  }));
  const top = SG.topProducts(30,5,VENDOR_ID);
  root.innerHTML = vshell("sales",
    '<div class="grid2" style="align-items:start"><div class="chart-card"><div class="chart-h"><h3>Best sellers (30d)</h3></div>'+
      SG.barList(top.map(t=>({label:t.name,value:Math.round(t.revenue),sub:t.units+" units",img:pimg({emoji:t.emoji,grad:t.grad},32,8)})))+'</div>'+
    '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:6px">Recent sale lines</h3>'+
      (rows.length? rows.slice(0,10).map(({o,it})=>'<div class="listrow">'+pimg({emoji:it.emoji,grad:it.grad},34,9)+
        '<div style="flex:1"><div style="font-size:13px;font-weight:600">'+it.qty+'× '+esc(it.name)+'</div>'+
        '<div class="small muted">'+o.id+' · '+SG.fmtDate(o.ts)+' · '+esc(SG.branchById(o.branch).name.split("—")[0])+'</div></div>'+
        '<b class="num small">'+fmt(it.price*it.qty)+'</b></div>').join("")
      : SG.emptyState("chart","No sales in this window","Your products haven't sold in the last 30 days."))+'</div></div>');
}
function vreports(root){
  const v = SG.vendorById(VENDOR_ID);
  const reports = [
    {name:"Daily sales digest", desc:"Yesterday's units, value and stock alerts", file:"dune-atelier-daily.csv", rows:()=>[["Product","Units","Gross OMR"],...SG.topProducts(1,99,VENDOR_ID).map(t=>[t.name,t.units,t.revenue.toFixed(2)])]},
    {name:"30-day sales detail", desc:"Every sale line for the month", file:"dune-atelier-30d.csv", rows:()=>[["Date","Product","Units","Gross OMR"],...SG.topProducts(30,99,VENDOR_ID).map(t=>[new Date().toISOString().slice(0,10),t.name,t.units,t.revenue.toFixed(2)])]},
    {name:"Inventory snapshot", desc:"Current stock by branch", file:"dune-atelier-stock.csv", rows:()=>[["Product","Mall of Oman","Salalah Grand Mall"],...DB.products.filter(p=>p.vendorId===VENDOR_ID).map(p=>[p.name,p.stock.b1||0,p.stock.b2||0])]},
    {name:"Settlement statement", desc:"Gross, commission and net by period", file:"dune-atelier-settlements.csv", rows:()=>[["Period","Gross","Commission","Net","Status"],...DB.settlements.filter(s=>s.vendorId===VENDOR_ID).map(s=>[s.period,s.gross,s.commission,s.net,s.status])]},
  ];
  root.innerHTML = vshell("reports",
    '<div class="col" style="max-width:640px">'+reports.map((r,i)=>
      '<div class="card row" style="padding:15px 18px">'+
      '<div class="role-ic" style="width:40px;height:40px;border-radius:11px;background:var(--warn-soft);color:var(--warn);display:flex;align-items:center;justify-content:center">'+icon("download",18)+'</div>'+
      '<div style="flex:1"><b style="font-size:14px">'+r.name+'</b><div class="small muted">'+r.desc+'</div></div>'+
      '<button class="btn btn-sec btn-sm" data-act="v-dl" data-arg="'+i+'">Download CSV</button></div>').join("")+'</div>'+
    '<p class="small muted">Reports contain only '+esc(v.name)+' data — other vendors\' numbers are never visible to you.</p>');
  SG.vendorReports = reports;
}
SG.actions["v-dl"]=i=>{ const r=SG.vendorReports[+i]; SG.downloadCSV(r.file, r.rows()); SG.toast(r.file+" downloaded"); };
function valerts(root){
  const list = DB.notifications.vendor;
  const v = SG.vendorById(VENDOR_ID);
  root.innerHTML = vshell("alerts",
    '<div class="grid2" style="align-items:start"><div class="col">'+
    (list.length? list.map(n=>'<div class="card row" style="padding:13px 16px;'+(n.read?'':'border-color:var(--accent)')+'">'+
      '<div class="role-ic" style="width:38px;height:38px;border-radius:10px;background:var(--surface2);color:var(--ink2);display:flex;align-items:center;justify-content:center">'+icon(n.icon,18)+'</div>'+
      '<div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(n.title)+'</div>'+
      '<div class="small muted">'+esc(n.body)+'</div><div class="small" style="color:var(--ink3)">'+SG.timeAgo(n.ts)+'</div></div></div>').join("")
    : SG.emptyState("bell","Nothing yet","Sales events and daily digests appear here."))+'</div>'+
    '<div class="card card-pad col" style="gap:12px"><h3 style="font-size:15px">Delivery preferences</h3>'+
      [["email","Email — "+v.email],["whatsapp","WhatsApp — "+v.whatsapp],["portal","Portal notifications"]].map(c=>
      '<div class="row-between"><span style="font-size:13.5px">'+esc(c[1])+'</span>'+
      '<button class="switch" role="switch" aria-checked="'+!!v.channels[c[0]]+'" data-act="v-chan" data-arg="'+c[0]+'" aria-label="'+c[0]+'"></button></div>').join("")+
      '<p class="small muted">The nightly digest goes to every enabled channel at '+DB.settings.dailyVendorHour+':00.</p></div></div>');
  list.forEach(n=>n.read=true); SG.save();
}
SG.actions["v-chan"]=(ch,el)=>{ const v=SG.vendorById(VENDOR_ID); v.channels[ch]=!v.channels[ch]; SG.save();
  el.setAttribute("aria-checked",v.channels[ch]); SG.toast((ch==="email"?"Email":ch==="whatsapp"?"WhatsApp":"Portal")+" digest "+(v.channels[ch]?"enabled":"disabled")); };

/* ---------- PLATFORM ADMIN ---------- */
const ANAV = [
  {id:"overview", ic:"home", label:"Overview"},
  {id:"tenants", ic:"store", label:"Tenants"},
  {id:"revenue", ic:"chart", label:"Revenue"},
  {id:"tickets", ic:"ticket", label:"Support", live:()=>DB.tickets.filter(t=>t.status==="open").length},
  {id:"api", ic:"key", label:"API usage"},
];
function ashell(page, inner){
  return SG.offlineBanner()+
  '<div class="shell"><aside class="sidebar">'+
    '<button class="brand" data-nav="#/" title="Back to launcher" style="text-align:left">'+
      '<div class="logo-mark" style="background:var(--c4)">'+icon("globe",18)+'</div>'+
      '<div><b>Sayr Platform</b><span>Admin console</span></div></button>'+
    ANAV.map(n=>{ const live=n.live?n.live():0;
      return '<button class="navlink'+(n.id===page?' active':'')+'" data-nav="#/admin/'+n.id+'">'+icon(n.ic,18)+n.label+
      (live?'<span class="badge num">'+live+'</span>':'')+'</button>';}).join("")+
    '<div class="sidebar-foot"><div class="row" style="padding:8px 8px 0"><div class="avatar" style="background:var(--crit-soft);color:var(--crit)">SA</div>'+
    '<div style="flex:1"><div style="font-size:12.5px;font-weight:600">Sayr Admin</div><div style="font-size:11px;color:var(--ink3)">superuser</div></div>'+
    '<button class="iconbtn" data-nav="#/" aria-label="Exit">'+icon("logout",16)+'</button></div></div></aside>'+
  '<div class="main"><header class="topbar"><h1>'+(ANAV.find(n=>n.id===page)||{}).label+'</h1>'+SG.themeBtn()+'</header>'+
  '<div class="content"><div class="content-inner">'+inner+'</div></div>'+
  '<nav class="mobile-nav">'+ANAV.map(n=>'<button class="tab'+(n.id===page?' active':'')+'" data-nav="#/admin/'+n.id+'">'+icon(n.ic,20)+'<span>'+n.label.split(" ")[0]+'</span></button>').join("")+'</nav>'+
  '</div></div>';
}
SG.apps.admin = (root, r)=>{
  document.title = "Sayr — Platform Admin";
  const pages = {overview:aover, tenants:atenants, revenue:arevenue, tickets:atickets, api:aapi};
  (pages[r.page]||aover)(root, r);
};
const mrrSeries = ()=>{ /* 12 months of platform MRR growth to today's sum */
  const total = DB.tenants.reduce((s,t)=>s+t.mrr,0);
  const out=[]; for(let m=11;m>=0;m--){ const d=new Date(); d.setMonth(d.getMonth()-m);
    out.push({date:d.toISOString().slice(0,10), v:Math.round(total*Math.pow(.88,m))}); } return out;
};
function aover(root){
  if(SG.loadOnce("a-over")){ root.innerHTML = ashell("overview", SG.skelDash()); return; }
  const mrr = DB.tenants.reduce((s,t)=>s+t.mrr,0);
  const gmv = DB.tenants.reduce((s,t)=>s+t.gmv30,0);
  const users = DB.tenants.reduce((s,t)=>s+t.users,0);
  root.innerHTML = ashell("overview",
    '<div class="kpis">'+
      '<div class="kpi"><span class="kpi-label">MRR</span><span class="kpi-value num">'+fmtK(mrr)+'</span><span class="kpi-delta up">'+icon("arrowUp",13)+' 12% MoM</span></div>'+
      '<div class="kpi"><span class="kpi-label">Active tenants</span><span class="kpi-value num">'+DB.tenants.filter(t=>t.status==="active").length+'</span><span class="kpi-delta muted">'+DB.tenants.filter(t=>t.status==="trial").length+' in trial</span></div>'+
      '<div class="kpi"><span class="kpi-label">Platform GMV (30d)</span><span class="kpi-value num">'+fmtK(gmv)+'</span><span class="kpi-delta up">'+icon("arrowUp",13)+' 9%</span></div>'+
      '<div class="kpi"><span class="kpi-label">Active users</span><span class="kpi-value num">'+users+'</span><span class="kpi-delta muted">across all stores</span></div></div>'+
    '<div class="chart-card"><div class="chart-h"><h3>MRR — trailing 12 months</h3>'+
      '<div class="chart-legend"><span class="lg"><span class="sw" style="background:var(--c4)"></span>MRR (OMR)</span></div></div><div id="a-mrr"></div></div>'+
    '<div class="grid2">'+
      '<div class="card card-pad"><div class="row-between" style="margin-bottom:6px"><h3 style="font-size:15px">Largest tenants by GMV</h3><button class="btn btn-ghost btn-sm" data-nav="#/admin/tenants">All tenants</button></div>'+
        SG.barList(DB.tenants.slice().sort((a,b)=>b.gmv30-a.gmv30).slice(0,5).map(t=>({label:t.name,value:t.gmv30,sub:t.plan+" · "+t.branches+" branches"})))+'</div>'+
      '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:8px">Platform health</h3>'+
        [["API uptime (30d)","99.98%","good"],["p95 checkout latency","240 ms","good"],["Digest delivery success","99.4%","good"],["Open incidents","0","good"]].map(x=>
        '<div class="listrow"><span style="flex:1;font-size:13.5px">'+x[0]+'</span><span class="chip chip-'+x[2]+' num">'+x[1]+'</span></div>').join("")+'</div></div>');
  SG.lineChart("a-mrr",{series:mrrSeries(), height:220, color:"var(--c4)"});
}
function atenants(root){
  if(SG.loadOnce("a-ten")){ root.innerHTML = ashell("tenants", SG.skelRows(6,54)); return; }
  root.innerHTML = ashell("tenants",
    '<div class="row-between wrap"><p class="muted small">Every store on the platform. Nora Boutique is the tenant you\'re exploring in the merchant app.</p>'+
    '<button class="btn btn-pri" data-act="a-newtenant">'+icon("plus",16)+' Create tenant</button></div>'+
    '<div class="tablewrap"><table><thead><tr><th>Store</th><th>Plan</th><th class="r">MRR</th><th class="r">GMV 30d</th><th class="r">Users</th><th>Health</th><th>Status</th></tr></thead><tbody>'+
    DB.tenants.map(t=>'<tr><td><b style="font-size:13.5px">'+esc(t.name)+'</b><div class="small muted">Since '+SG.fmtDate(t.created)+' · '+t.branches+' branch'+(t.branches>1?"es":"")+'</div></td>'+
      '<td><span class="chip '+(t.plan==="premium"?"chip-accent":"chip-neutral")+'">'+t.plan+'</span></td>'+
      '<td class="r num">'+fmt(t.mrr)+'</td><td class="r num">'+fmtK(t.gmv30)+'</td><td class="r num">'+t.users+'</td>'+
      '<td><div class="row" style="gap:8px"><div class="progress" style="width:70px"><i class="'+(t.health<70?"crit":t.health<85?"warn":"")+'" style="width:'+t.health+'%"></i></div><span class="num small">'+t.health+'</span></div></td>'+
      '<td>'+(t.status==="active"?'<span class="chip chip-good">Active</span>':'<span class="chip chip-warn">Trial</span>')+'</td></tr>').join("")+
    '</tbody></table></div>');
}
SG.actions["a-newtenant"]=()=>{
  const d=SG.dialog({title:"Create tenant", body:
    '<div class="field"><label>Store name</label><input class="input" id="at-name" placeholder="e.g. Layali Home"></div>'+
    '<div class="grid2" style="gap:12px"><div class="field"><label>Plan</label><select class="input" id="at-plan"><option value="starter">Starter — OMR 99</option><option value="business">Business — OMR 299</option><option value="premium">Premium — OMR 799</option></select></div>'+
    '<div class="field"><label>Owner email</label><input class="input" id="at-email" type="email" placeholder="owner@store.com"></div></div>'+
    '<p class="small muted">The owner receives onboarding instructions and a 14-day trial starts immediately.</p>',
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-save>Create & send invite</button>'});
  d.querySelector("[data-save]").onclick=()=>{
    const name=d.querySelector("#at-name"), email=d.querySelector("#at-email");
    if(!name.value.trim()){ name.classList.add("invalid"); SG.toast("Name the store","warn"); return; }
    if(!/.+@.+\..+/.test(email.value)){ email.classList.add("invalid"); SG.toast("Enter a valid owner email","warn"); return; }
    const plan=d.querySelector("#at-plan").value;
    DB.tenants.unshift({id:SG.uid("t"), name:name.value.trim(), plan, mrr:plan==="starter"?99:plan==="business"?299:799,
      branches:1, users:1, products:0, gmv30:0, created:Date.now(), status:"trial", health:70});
    SG.save(); d.close(); SG.toast("Tenant created — trial subscription active"); SG.render();
  };
};
function arevenue(root){
  if(SG.loadOnce("a-rev")){ root.innerHTML = ashell("revenue", SG.skelDash()); return; }
  const byPlan = ["starter","business","premium"].map((p,i)=>({label:p[0].toUpperCase()+p.slice(1), v:DB.tenants.filter(t=>t.plan===p).reduce((s,t)=>s+t.mrr,0)}));
  const arr = DB.tenants.reduce((s,t)=>s+t.mrr,0)*12;
  root.innerHTML = ashell("revenue",
    '<div class="kpis">'+
      '<div class="kpi"><span class="kpi-label">ARR run-rate</span><span class="kpi-value num">'+fmtK(arr)+'</span></div>'+
      '<div class="kpi"><span class="kpi-label">Net revenue retention</span><span class="kpi-value num">117%</span></div>'+
      '<div class="kpi"><span class="kpi-label">Gross churn</span><span class="kpi-value num">1.8%</span></div>'+
      '<div class="kpi"><span class="kpi-label">CAC payback</span><span class="kpi-value num">7.2 mo</span></div></div>'+
    '<div class="grid2">'+
      '<div class="chart-card"><div class="chart-h"><h3>MRR by plan</h3></div><div id="a-plan"></div></div>'+
      '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:8px">Latest subscription invoices</h3>'+
        DB.tenants.slice(0,6).map(t=>'<div class="listrow">'+icon("receipt",16)+
        '<div style="flex:1"><b style="font-size:13.5px">'+esc(t.name)+'</b><div class="small muted">'+t.plan+' · monthly</div></div>'+
        '<b class="num">'+fmt(t.mrr)+'</b><span class="chip '+(t.status==="active"?"chip-good":"chip-warn")+'">'+(t.status==="active"?"Paid":"Trial")+'</span></div>').join("")+'</div></div>');
  SG.barChart("a-plan",{data:byPlan, height:220, color:"var(--c4)"});
}
function atickets(root){
  const st = {open:"chip-crit", pending:"chip-warn", resolved:"chip-good"};
  root.innerHTML = ashell("tickets",
    '<div class="col" style="max-width:760px">'+DB.tickets.map(t=>
      '<div class="card row wrap" style="padding:15px 18px">'+
      '<div style="flex:1;min-width:220px"><div class="row" style="gap:8px"><b style="font-size:14px">'+esc(t.subject)+'</b>'+
      '<span class="chip chip-neutral">'+t.priority+'</span></div>'+
      '<div class="small muted">'+t.id+' · '+esc(t.tenant)+' · '+SG.timeAgo(t.ts)+' · assigned to '+esc(t.assignee)+'</div></div>'+
      '<span class="chip '+st[t.status]+'">'+t.status+'</span>'+
      (t.status!=="resolved"?'<button class="btn btn-sec btn-sm" data-act="a-resolve" data-arg="'+t.id+'">Resolve</button>':'')+'</div>').join("")+'</div>');
}
SG.actions["a-resolve"]=id=>{ const t=DB.tickets.find(x=>x.id===id); t.status="resolved"; SG.save();
  SG.toast(id+" resolved — tenant notified"); SG.render(); };
function aapi(root){
  if(SG.loadOnce("a-api")){ root.innerHTML = ashell("api", SG.skelDash()); return; }
  const calls = Array.from({length:14},(_,i)=>({date:new Date(Date.now()-(13-i)*864e5).toISOString().slice(0,10), v:Math.round(42000+i*2600+(i%3)*3100)}));
  root.innerHTML = ashell("api",
    '<div class="kpis">'+
      '<div class="kpi"><span class="kpi-label">Calls (24h)</span><span class="kpi-value num">'+calls[13].v.toLocaleString()+'</span></div>'+
      '<div class="kpi"><span class="kpi-label">Error rate</span><span class="kpi-value num">0.21%</span></div>'+
      '<div class="kpi"><span class="kpi-label">p95 latency</span><span class="kpi-value num">184 ms</span></div>'+
      '<div class="kpi"><span class="kpi-label">Active API keys</span><span class="kpi-value num">9</span></div></div>'+
    '<div class="chart-card"><div class="chart-h"><h3>API calls per day</h3>'+
      '<div class="chart-legend"><span class="lg"><span class="sw" style="background:var(--c4)"></span>Requests</span></div></div><div id="a-calls"></div></div>'+
    '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:8px">Top consumers (Premium API)</h3>'+
      SG.barList([{label:"Coastline Sports — ERP sync",value:31200,sub:"inventory + orders"},
        {label:"Sultan Perfumes — BI pipeline",value:18400,sub:"reports export"},
        {label:"GreenGrocer Oman — price sync",value:9100,sub:"products"}],{money:false})+'</div>');
  SG.lineChart("a-calls",{series:calls, height:220, money:false, color:"var(--c4)"});
}
})();
