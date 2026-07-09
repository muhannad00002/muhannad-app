/* ============ MERCHANT APP — shell, dashboard, POS, orders, products ============ */
(()=>{
const {DB, icon, esc, fmt, fmtK, pimg} = SG;

const NAV = [
  {sec:null, items:[
    {id:"dashboard", ic:"home", label:"Dashboard"},
    {id:"pos", ic:"scan", label:"POS Checkout", live:()=>DB.checkoutToken?1:0},
    {id:"orders", ic:"receipt", label:"Orders"},
  ]},
  {sec:"Catalog", items:[
    {id:"products", ic:"box", label:"Products"},
    {id:"inventory", ic:"layers", label:"Inventory", live:()=>SG.lowStockList().length},
    {id:"labels", ic:"qr", label:"QR Labels"},
  ]},
  {sec:"People", items:[
    {id:"vendors", ic:"users", label:"Vendors"},
    {id:"employees", ic:"user", label:"Employees"},
    {id:"branches", ic:"building", label:"Branches"},
  ]},
  {sec:"Intelligence", items:[
    {id:"reports", ic:"chart", label:"Reports"},
    {id:"insights", ic:"sparkle", label:"AI Insights"},
  ]},
];
const FOOT = [
  {id:"settings", ic:"settings", label:"Settings"},
  {id:"subscription", ic:"card", label:"Subscription"},
];
const TITLES = {dashboard:"Dashboard", pos:"POS Checkout", orders:"Orders", products:"Products", inventory:"Inventory",
  labels:"QR Labels", vendors:"Vendors", employees:"Employees", branches:"Branches", reports:"Reports",
  insights:"AI Insights", settings:"Settings", subscription:"Subscription", notifications:"Notifications", order:"Order"};

function shell(page, inner, {toolbar=""}={}) {
  const unread = DB.notifications.merchant.filter(n=>!n.read).length;
  const navHTML = g => g.items.map(n=>{
    const live = n.live? n.live() : 0;
    return '<button class="navlink'+(n.id===page?' active':'')+'" data-nav="#/merchant/'+n.id+'">'+icon(n.ic,18)+n.label+
      (live?'<span class="badge num">'+live+'</span>':'')+'</button>';}).join("");
  return SG.offlineBanner()+
  '<div class="shell"><aside class="sidebar">'+
    '<button class="brand" data-nav="#/" title="Back to launcher" style="text-align:left">'+
      '<div class="logo-mark">'+icon("scan",18)+'</div>'+
      '<div><b>'+esc(DB.storeName)+'</b><span>Business plan · 2 branches</span></div></button>'+
    NAV.map(g=>(g.sec?'<div class="nav-section eyebrow">'+g.sec+'</div>':'')+navHTML(g)).join("")+
    '<div class="sidebar-foot">'+FOOT.map(n=>'<button class="navlink'+(n.id===page?' active':'')+'" data-nav="#/merchant/'+n.id+'">'+icon(n.ic,18)+n.label+'</button>').join("")+
    '<div class="row" style="padding:8px 8px 0"><div class="avatar">NA</div><div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600">Noura Al-Fahad</div><div style="font-size:11px;color:var(--ink3)">Owner</div></div>'+
    '<button class="iconbtn" data-nav="#/" aria-label="Exit to launcher">'+icon("logout",16)+'</button></div></div>'+
  '</aside><div class="main">'+
    '<header class="topbar"><h1>'+ (TITLES[page]||"") +'</h1>'+toolbar+
      '<button class="iconbtn" data-act="'+(SG.offline.forced?'go-online':'go-offline')+'" title="Simulate offline" aria-label="Simulate offline">'+icon("wifiOff",17)+'</button>'+
      SG.themeBtn()+
      '<button class="iconbtn" data-nav="#/merchant/notifications" style="position:relative" aria-label="Notifications ('+unread+' unread)">'+icon("bell",18)+
      (unread?'<span style="position:absolute;top:6px;right:7px;min-width:8px;height:8px;border-radius:50%;background:var(--crit)"></span>':'')+'</button>'+
    '</header>'+
    '<div class="content"><div class="content-inner">'+inner+'</div></div>'+
    '<nav class="mobile-nav">'+["dashboard","pos","orders","products","reports"].map(id=>{
      const n = NAV.flatMap(g=>g.items).find(x=>x.id===id)||FOOT.find(x=>x.id===id);
      return '<button class="tab'+(id===page?' active':'')+'" data-nav="#/merchant/'+id+'">'+icon(n.ic,20)+'<span>'+n.label.split(" ")[0]+'</span></button>';}).join("")+
    '</nav></div></div>';
}

SG.mpages = {dashboard, pos, orders, order, products}; /* part B adds the rest */
SG.apps.merchant = (root, r)=>{
  document.title = "Sayr — "+(TITLES[r.page]||"Merchant");
  (SG.mpages[r.page]||dashboard)(root, r);
};
SG.merchantShell = shell; /* shared with part B */

/* ---------- DASHBOARD ---------- */
function dashboard(root){
  if(SG.loadOnce("m-dash")){ root.innerHTML = shell("dashboard", SG.skelDash()); return; }
  const range = SG.sess.mRange||30;
  const branch = SG.sess.mBranch||"";
  const os = SG.ordersSince(range, branch||null);
  const sales = SG.sumSales(os);
  const delta = SG.deltaPct(range, branch||null);
  const aov = os.length? sales/os.length : 0;
  const today = SG.ordersSince(1, branch||null);
  const low = SG.lowStockList();
  const top = SG.topProducts(range, 5);
  const activeCashiers = [...new Set(SG.ordersSince(1).map(o=>o.cashierId))].map(id=>SG.empById(id)).filter(Boolean);
  const byMethod = ["card","applepay","cash"].map(m=>({label:m==="applepay"?"Apple Pay":m==="card"?"Card":"Cash", v:os.filter(o=>o.method===m).length})).filter(d=>d.v);
  const kpi = (label,val,d,ic)=>'<div class="kpi"><span class="kpi-label">'+icon(ic,14)+label+'</span><span class="kpi-value num">'+val+'</span>'+
    (d!=null?'<span class="kpi-delta '+(d>=0?"up":"down")+'">'+icon(d>=0?"arrowUp":"chevD",13)+' '+Math.abs(d)+'% vs prev. period</span>':'<span class="kpi-delta muted">&nbsp;</span>')+'</div>';
  root.innerHTML = shell("dashboard",
    '<div class="row-between wrap"><div class="row wrap">'+
      '<div class="seg" role="tablist">'+[7,30,90].map(d=>'<button class="'+(range===d?'active':'')+'" data-act="m-range" data-arg="'+d+'" role="tab" aria-selected="'+(range===d)+'">'+d+'d</button>').join("")+'</div>'+
      '<select class="input" style="width:auto" data-sel="m-branch" aria-label="Branch filter">'+
        '<option value="">All branches</option>'+DB.branches.map(b=>'<option value="'+b.id+'"'+(branch===b.id?' selected':'')+'>'+esc(b.name)+'</option>').join("")+'</select></div>'+
      '<button class="btn btn-sec" data-nav="#/merchant/pos">'+icon("scan",16)+' Open cashier station</button></div>'+
    '<div class="kpis">'+
      kpi("Revenue ("+range+"d)", fmtK(sales), delta, "chart")+
      kpi("Orders", os.length.toLocaleString(), null, "receipt")+
      kpi("Avg. basket", fmt(aov), null, "cart")+
      kpi("Today", fmtK(SG.sumSales(today)), null, "zap")+
    '</div>'+
    '<div class="chart-card"><div class="chart-h"><h3>Revenue — last '+range+' days</h3>'+
      '<div class="chart-legend"><span class="lg"><span class="sw" style="background:var(--c1)"></span>Net sales (OMR)</span></div></div>'+
      '<div id="dash-line"></div></div>'+
    '<div class="grid2">'+
      '<div class="chart-card"><div class="chart-h"><h3>Top products</h3><button class="btn btn-ghost btn-sm" data-nav="#/merchant/reports">Full report</button></div>'+
        SG.barList(top.map(t=>({label:t.name, value:Math.round(t.revenue), sub:t.units+" units", img:pimg({emoji:t.emoji,grad:t.grad},34,9)})))+'</div>'+
      '<div class="col">'+
        '<div class="chart-card"><div class="chart-h"><h3>Payment mix</h3></div><div class="row" style="gap:18px;flex-wrap:wrap"><div id="dash-donut"></div>'+
          '<div class="chart-legend" style="flex-direction:column;align-items:flex-start;gap:8px">'+byMethod.map((d,i)=>'<span class="lg"><span class="sw" style="background:var(--c'+(i+1)+')"></span>'+d.label+' — <b class="num">'+d.v+'</b></span>').join("")+'</div></div></div>'+
        '<div class="card card-pad"><div class="row-between" style="margin-bottom:8px"><h3 style="font-size:15px">Cashiers active today</h3><button class="btn btn-ghost btn-sm" data-nav="#/merchant/employees">Manage</button></div>'+
        (activeCashiers.length? activeCashiers.map(e=>'<div class="listrow"><div class="avatar">'+esc(e.name.split(" ").map(w=>w[0]).join("").slice(0,2))+'</div>'+
          '<div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(e.name)+'</div><div class="small muted">'+esc(SG.branchById(e.branch).name)+'</div></div>'+
          '<span class="chip chip-good"><span class="dot" style="background:var(--good)"></span>On shift</span></div>').join("")
        : '<p class="small muted">No sales yet today.</p>')+'</div></div></div>'+
    (low.length?'<div class="card card-pad"><div class="row-between" style="margin-bottom:6px"><h3 style="font-size:15px">'+icon("alert",16)+' Low stock — needs a restock order</h3>'+
      '<button class="btn btn-ghost btn-sm" data-nav="#/merchant/inventory">Open inventory</button></div>'+
      '<div class="row wrap">'+low.slice(0,4).map(l=>'<span class="chip chip-warn">'+esc(l.p.name)+' · '+l.qty+' left · '+esc(l.branch.name.split("—")[0])+'</span>').join("")+'</div></div>':''));
  SG.lineChart("dash-line", {series:SG.seriesDaily(range, branch||null), height:230});
  SG.donut("dash-donut", {data:byMethod, size:140});
  wireSelect(root);
}
SG.actions["m-range"]=d=>{ SG.sess.mRange=+d; SG.saveSess(); SG.invalidate("m-dash"); SG.render(); };
function wireSelect(root){
  root.querySelectorAll("[data-sel]").forEach(s=>s.addEventListener("change",()=>{
    if(s.dataset.sel==="m-branch"){ SG.sess.mBranch=s.value; SG.saveSess(); SG.render(); }
  }));
}

/* ---------- POS ---------- */
function pos(root){
  const t = DB.posOrder ? SG.cartTotals({...DB.cart, posDisc:DB.posOrder.posDisc}) : null;
  let inner;
  if(!DB.posOrder){
    inner =
    '<div class="card" style="max-width:560px;margin:0 auto;width:100%"><div class="card-pad" style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;padding:34px 24px">'+
      '<div class="eyebrow">Cashier station · '+esc(SG.branchById(DB.cart.branch||"b1").name)+'</div>'+
      '<div class="scanner" style="width:100%;max-width:360px;min-height:240px;border-radius:18px;flex:none">'+
        '<div class="scan-reticle" style="width:150px;height:150px"><div class="scan-line"></div></div>'+
        (DB.checkoutToken?'<button class="scan-chip" style="position:absolute;bottom:14px" data-act="pos-scan">'+icon("qr",15)+' Scan customer code '+DB.checkoutToken.token+'</button>'
          :'<p style="color:#9FB5AB;font-size:12.5px;position:absolute;bottom:18px;padding:0 20px">Waiting for a customer checkout QR… none active right now.</p>')+
      '</div>'+
      '<h3 style="font-size:17px">'+(DB.checkoutToken?"Customer is ready to check out":"No active checkout")+'</h3>'+
      '<p class="muted small" style="max-width:340px">'+(DB.checkoutToken
        ?"A checkout code was generated "+SG.timeAgo(DB.checkoutToken.issued)+". Scan it to pull the cart onto this register."
        :"When a shopper taps “Checkout” in the customer app, their code appears here instantly. You can open the customer app from the launcher to create one.")+'</p>'+
      (DB.checkoutToken?'<button class="btn btn-pri btn-lg" data-act="pos-scan">'+icon("scan",18)+' Scan checkout QR</button>'
        :'<button class="btn btn-sec" data-nav="#/customer/cart">Open the customer app</button>')+
    '</div></div>';
  } else {
    inner =
    '<div class="grid2" style="align-items:start">'+
      '<div class="card"><div class="card-pad">'+
        '<div class="row-between"><h3 style="font-size:15px">Cart · '+DB.posOrder.token+'</h3><span class="chip chip-good"><span class="dot" style="background:var(--good)"></span>Cart locked</span></div>'+
        '<p class="small muted" style="margin:2px 0 10px">Customer: '+esc(DB.customer.name)+' · '+esc(DB.customer.tier)+' member</p>'+
        t.lines.map(l=>'<div class="listrow">'+pimg(l.p,42,10)+
          '<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:600">'+esc(l.p.name)+'</div><div class="small muted num">'+l.qty+' × '+fmt(l.p.price)+'</div></div>'+
          '<b class="num">'+fmt(l.p.price*l.qty)+'</b></div>').join("")+
      '</div></div>'+
      '<div class="card"><div class="card-pad col" style="gap:10px">'+
        '<h3 style="font-size:15px">Payment</h3>'+
        '<div class="row-between small muted"><span>Subtotal</span><span class="num">'+fmt(t.sub)+'</span></div>'+
        (t.coupon?'<div class="row-between small" style="color:var(--good)"><span>Coupon '+t.coupon.code+'</span><span class="num">−'+fmt(t.sub*t.coupon.pct/100)+'</span></div>':'')+
        '<div class="row-between small"><span class="muted">Cashier discount</span><span class="row" style="gap:6px">'+
          [0,5,10].map(p=>'<button class="btn btn-sm '+((DB.posOrder.discPct||0)===p?'btn-soft':'btn-ghost')+'" data-act="pos-disc" data-arg="'+p+'">'+p+'%</button>').join("")+'</span></div>'+
        '<div class="row-between small muted"><span>VAT '+DB.settings.taxRate+'%</span><span class="num">'+fmt(t.tax)+'</span></div>'+
        '<hr class="divider"><div class="row-between" style="font-size:19px;font-weight:700"><span>Total</span><span class="num">'+fmt(t.total)+'</span></div>'+
        '<div class="field"><label>Cashier</label><select class="input" id="pos-cashier">'+
          DB.employees.filter(e=>e.role==="cashier"&&e.status==="active").map(e=>'<option value="'+e.id+'">'+esc(e.name)+'</option>').join("")+'</select></div>'+
        '<div class="grid3" style="gap:8px">'+
          '<button class="btn btn-sec" data-act="pos-pay" data-arg="cash">'+icon("wallet",16)+' Cash</button>'+
          '<button class="btn btn-sec" data-act="pos-pay" data-arg="card">'+icon("card",16)+' Card</button>'+
          '<button class="btn btn-pri" data-act="pos-pay" data-arg="applepay">'+icon("phone",16)+' Apple&nbsp;Pay</button></div>'+
        '<button class="btn btn-ghost" data-act="pos-cancel" style="color:var(--crit)">Cancel — unlock customer cart</button>'+
      '</div></div></div>';
  }
  root.innerHTML = shell("pos", inner);
  /* live: token appearing/expiring while station open */
  const iv = setInterval(()=>{
    const hasBtn = !!document.querySelector('[data-act="pos-scan"]');
    if(!DB.posOrder && (!!DB.checkoutToken)!==hasBtn) SG.render();
  }, 900);
  SG.onCleanup(()=>clearInterval(iv));
}
SG.actions["pos-scan"]=()=>{
  const r = SG.posScanToken();
  if(!r.ok){ SG.toast(r.err,"err"); return; }
  SG.toast("Cart pulled onto register — customer cart locked");
  SG.render();
};
SG.actions["pos-disc"]=p=>{
  p=+p; const t=SG.cartTotals();
  DB.posOrder.discPct=p; DB.posOrder.posDisc = Math.round(t.sub*p)/100 * 1; DB.posOrder.posDisc = t.sub*p/100;
  SG.save(); SG.render();
};
SG.actions["pos-cancel"]=()=>{ SG.posCancel(); SG.toast("Checkout cancelled — cart unlocked","warn"); SG.render(); };
SG.actions["pos-pay"]=method=>{
  if(!SG.guardOnline("The register is offline — payments will resume when you reconnect.")) return;
  const sel=document.getElementById("pos-cashier");
  const res = SG.posComplete(method, sel?sel.value:"e3");
  if(!res.ok){ SG.toast(res.err,"err"); return; }
  SG.invalidate("m-dash"); SG.invalidate("m-orders"); SG.invalidate("cust-orders");
  SG.dialog({title:"Order "+res.order.id+" complete",
    body:'<div class="state" style="padding:10px 0"><div class="state-icon" style="background:var(--good-soft);color:var(--good)">'+icon("check",26)+'</div>'+
      '<h3 class="num">'+fmt(res.order.total)+' — '+(method==="applepay"?"Apple Pay":method)+'</h3>'+
      '<p>Inventory decremented, vendors notified, receipt sent to the customer (+'+res.points+' loyalty points).</p></div>',
    actions:'<button class="btn btn-sec" data-close>New checkout</button><button class="btn btn-pri" data-ok>View order</button>'})
    .querySelector("[data-ok]").onclick=function(){ this.closest(".overlay").remove(); SG.go("#/merchant/order/"+res.order.id); };
  SG.render();
};

/* ---------- ORDERS ---------- */
function orders(root){
  if(SG.loadOnce("m-orders")){ root.innerHTML = shell("orders", SG.skelRows(7,56)); return; }
  const q = (SG.sess.moQ||"").toLowerCase();
  const method = SG.sess.moMethod||"";
  let list = DB.orders.slice().reverse();
  if(q) list = list.filter(o=>(o.id+" "+o.customer).toLowerCase().includes(q));
  if(method) list = list.filter(o=>o.method===method);
  const page = Math.min(SG.sess.moPage||0, Math.max(0,Math.ceil(list.length/10)-1));
  const shown = list.slice(page*10,(page+1)*10);
  root.innerHTML = shell("orders",
    '<div class="row wrap">'+
      '<div class="searchbar" style="flex:1;min-width:200px">'+icon("search",16)+'<input class="input" id="mo-q" placeholder="Search order # or customer" value="'+esc(SG.sess.moQ||"")+'"></div>'+
      '<select class="input" style="width:auto" id="mo-method" aria-label="Payment filter"><option value="">All payments</option>'+
        ["card","applepay","cash"].map(m=>'<option value="'+m+'"'+(method===m?' selected':'')+'>'+(m==="applepay"?"Apple Pay":m[0].toUpperCase()+m.slice(1))+'</option>').join("")+'</select>'+
      '<button class="btn btn-sec" data-act="mo-export">'+icon("download",15)+' Export CSV</button></div>'+
    (shown.length? '<div class="tablewrap"><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Branch</th><th>Items</th><th>Payment</th><th class="r">Total</th></tr></thead><tbody>'+
      shown.map(o=>'<tr class="clickable" data-nav="#/merchant/order/'+o.id+'"><td><b>'+o.id+'</b>'+(o.live?' <span class="chip chip-accent">live</span>':'')+'</td>'+
        '<td class="muted small">'+SG.fmtDate(o.ts)+' '+SG.fmtTime(o.ts)+'</td><td>'+esc(o.customer)+'</td>'+
        '<td class="small muted">'+esc(SG.branchById(o.branch).name.split("—")[0])+'</td>'+
        '<td class="num">'+o.items.reduce((s,i)=>s+i.qty,0)+'</td>'+
        '<td><span class="chip chip-neutral">'+(o.method==="applepay"?"Apple Pay":o.method)+'</span></td>'+
        '<td class="r num" style="font-weight:600">'+fmt(o.total)+'</td></tr>').join("")+
      '</tbody></table><div class="pagination"><span class="num">'+(page*10+1)+'–'+Math.min(list.length,(page+1)*10)+' of '+list.length+'</span>'+
      '<button data-act="mo-page" data-arg="-1" '+(page===0?'disabled':'')+' aria-label="Previous page">'+icon("chevL",16)+'</button>'+
      '<button data-act="mo-page" data-arg="1" '+((page+1)*10>=list.length?'disabled':'')+' aria-label="Next page">'+icon("chevR",16)+'</button></div></div>'
    : SG.emptyState("receipt","No orders match","Adjust the search or payment filter.",'<button class="btn btn-sec" data-act="mo-clear">Clear filters</button>')));
  const inp=root.querySelector("#mo-q"); let t;
  inp.addEventListener("input",()=>{ clearTimeout(t); t=setTimeout(()=>{ SG.sess.moQ=inp.value; SG.sess.moPage=0; SG.saveSess(); SG.render();
    requestAnimationFrame(()=>{const i=document.getElementById("mo-q"); if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}}); },380); });
  root.querySelector("#mo-method").addEventListener("change",e=>{ SG.sess.moMethod=e.target.value; SG.sess.moPage=0; SG.saveSess(); SG.render(); });
}
SG.actions["mo-page"]=d=>{ SG.sess.moPage=Math.max(0,(SG.sess.moPage||0)+ +d); SG.saveSess(); SG.render(); };
SG.actions["mo-clear"]=()=>{ SG.sess.moQ=""; SG.sess.moMethod=""; SG.sess.moPage=0; SG.saveSess(); SG.render(); };
SG.actions["mo-export"]=()=>{
  SG.downloadCSV("orders.csv", [["Order","Date","Customer","Branch","Items","Payment","Total OMR"],
    ...DB.orders.map(o=>[o.id,new Date(o.ts).toISOString(),o.customer,SG.branchById(o.branch).name,o.items.reduce((s,i)=>s+i.qty,0),o.method,o.total.toFixed(2)])]);
  SG.toast("orders.csv downloaded");
};

function order(root, r){
  const o = DB.orders.find(x=>x.id===r.arg);
  if(!o){ root.innerHTML = shell("orders", SG.errorState("m-go-orders")); return; }
  const cash = SG.empById(o.cashierId);
  root.innerHTML = shell("order",
    '<button class="btn btn-ghost" data-nav="#/merchant/orders" style="align-self:flex-start">'+icon("chevL",16)+' All orders</button>'+
    '<div class="grid2" style="align-items:start">'+
      '<div class="card card-pad"><div class="row-between"><h3>'+o.id+'</h3><span class="chip chip-good">'+icon("check",13)+' Completed</span></div>'+
        '<p class="small muted" style="margin:4px 0 12px">'+SG.fmtDate(o.ts)+' at '+SG.fmtTime(o.ts)+' · '+esc(SG.branchById(o.branch).name)+' · Cashier: '+esc(cash?cash.name:"—")+'</p>'+
        o.items.map(it=>'<div class="listrow">'+pimg({emoji:it.emoji,grad:it.grad},40,10)+
          '<div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(it.name)+'</div><div class="small muted">'+it.sku+(it.vendorId?' · '+esc((SG.vendorById(it.vendorId)||{}).name||""):'')+'</div></div>'+
          '<span class="num small muted">'+it.qty+' × '+fmt(it.price)+'</span><b class="num" style="margin-left:12px">'+fmt(it.qty*it.price)+'</b></div>').join("")+
        '<hr class="divider" style="margin:10px 0">'+
        '<div class="row-between small muted"><span>Subtotal</span><span class="num">'+fmt(o.sub)+'</span></div>'+
        (o.disc?'<div class="row-between small" style="color:var(--good)"><span>Discount'+(o.coupon?" ("+o.coupon+")":"")+'</span><span class="num">−'+fmt(o.disc)+'</span></div>':'')+
        '<div class="row-between small muted"><span>VAT</span><span class="num">'+fmt(o.tax)+'</span></div>'+
        '<div class="row-between" style="font-weight:700;margin-top:4px"><span>Total ('+(o.method==="applepay"?"Apple Pay":o.method)+')</span><span class="num">'+fmt(o.total)+'</span></div></div>'+
      '<div class="col"><div class="card card-pad"><h3 style="font-size:15px;margin-bottom:10px">What this order triggered</h3><div class="timeline">'+
        [["check","Payment captured",fmt(o.total)+" via "+(o.method==="applepay"?"Apple Pay":o.method)],
         ["layers","Inventory decremented",o.items.reduce((s,i)=>s+i.qty,0)+" units across "+o.items.length+" SKUs"],
         ["users","Vendors notified",[...new Set(o.items.map(i=>i.vendorId).filter(Boolean))].map(v=>(SG.vendorById(v)||{}).name).join(", ")||"House products only"],
         ["gift","Loyalty points issued","+"+Math.round(o.total/10*1.5)+" pts to "+esc(o.customer)],
         ["receipt","Digital receipt delivered","In-app + email"]].map(x=>
        '<div class="tl-item"><div class="tl-dot"></div><div><div style="font-size:13.5px;font-weight:600">'+x[1]+'</div><div class="small muted">'+x[2]+'</div></div></div>').join("")+'</div></div>'+
      '<div class="row"><button class="btn btn-sec btn-block" data-act="receipt-print">'+icon("print",15)+' Print receipt</button>'+
      '<button class="btn btn-sec btn-block" data-act="m-refund" data-arg="'+o.id+'">'+icon("refresh",15)+' Refund</button></div></div></div>');
}
SG.actions["m-go-orders"]=()=>SG.go("#/merchant/orders");
SG.actions["m-refund"]=(oid)=> SG.confirm({title:"Refund "+oid+"?", danger:true, okLabel:"Issue refund",
  message:"The full amount is returned to the customer's payment method and stock is added back. This is recorded in the activity log.", cb:()=>{
    const o=DB.orders.find(x=>x.id===oid);
    o.items.forEach(it=>{ const p=SG.productById(it.productId); if(p&&p.stock[o.branch]!==undefined&&p.stock[o.branch]<900) p.stock[o.branch]+=it.qty; });
    o.status="refunded"; SG.logActivity("Noura Al-Fahad","Refunded "+oid); SG.save();
    SG.toast(oid+" refunded — stock restored"); SG.render();
  }});

/* ---------- PRODUCTS ---------- */
function products(root){
  if(SG.loadOnce("m-products")){ root.innerHTML = shell("products", SG.skelRows(8,54)); return; }
  const q=(SG.sess.mpQ||"").toLowerCase(), cat=SG.sess.mpCat||"", sort=SG.sess.mpSort||"name";
  let list = DB.products.slice();
  if(q) list=list.filter(p=>(p.name+" "+p.sku+" "+p.barcode).toLowerCase().includes(q));
  if(cat) list=list.filter(p=>p.cat===cat);
  const dir = SG.sess.mpDir===-1?-1:1;
  list.sort((a,b)=>{ const k=sort;
    const va = k==="stock"? (a.stock.b1||0)+(a.stock.b2||0) : a[k];
    const vb = k==="stock"? (b.stock.b1||0)+(b.stock.b2||0) : b[k];
    return (typeof va==="string"? va.localeCompare(vb) : va-vb)*dir; });
  const page=Math.min(SG.sess.mpPage||0, Math.max(0,Math.ceil(list.length/8)-1));
  const shown=list.slice(page*8,(page+1)*8);
  const th=(key,label)=>'<th class="sortable'+(key==="stock"||key==="price"?" r":"")+'" data-act="mp-sort" data-arg="'+key+'">'+label+(sort===key?(dir===1?" ↑":" ↓"):"")+'</th>';
  root.innerHTML = shell("products",
    '<div class="row wrap">'+
      '<div class="searchbar" style="flex:1;min-width:200px">'+icon("search",16)+'<input class="input" id="mp-q" placeholder="Search name, SKU or barcode" value="'+esc(SG.sess.mpQ||"")+'"></div>'+
      '<select class="input" style="width:auto" id="mp-cat" aria-label="Category filter"><option value="">All categories</option>'+
        [...new Set(DB.products.map(p=>p.cat))].map(c=>'<option'+(cat===c?' selected':'')+'>'+esc(c)+'</option>').join("")+'</select>'+
      '<button class="btn btn-sec" data-act="mp-import">'+icon("upload",15)+' Import</button>'+
      '<button class="btn btn-sec" data-act="mp-export">'+icon("download",15)+' Export</button>'+
      '<button class="btn btn-pri" data-act="mp-new">'+icon("plus",16)+' New product</button></div>'+
    (shown.length? '<div class="tablewrap"><table><thead><tr>'+th("name","Product")+'<th>SKU</th><th>Vendor</th>'+th("price","Price")+th("stock","Stock")+'<th>Status</th><th></th></tr></thead><tbody>'+
      shown.map(p=>{ const tot=(p.stock.b1||0)+(p.stock.b2||0); const v=p.vendorId?SG.vendorById(p.vendorId):null;
        return '<tr><td><div class="row">'+pimg(p,36,9)+'<div><b style="font-size:13.5px">'+esc(p.name)+'</b><div class="small muted">'+esc(p.cat)+'</div></div></div></td>'+
        '<td class="small num">'+p.sku+'</td><td class="small">'+(v?esc(v.name):'<span class="muted">House</span>')+'</td>'+
        '<td class="r num" style="font-weight:600">'+fmt(p.price)+'</td>'+
        '<td class="r num">'+(tot>900?"∞":tot)+(tot<=p.lowAt&&tot<900?' <span class="chip chip-warn">low</span>':'')+'</td>'+
        '<td>'+(!p.approved?'<span class="chip chip-warn">Pending approval</span>':p.active?'<span class="chip chip-good">Active</span>':'<span class="chip chip-neutral">Hidden</span>')+'</td>'+
        '<td class="r"><div class="row" style="gap:2px;justify-content:flex-end">'+
          '<button class="iconbtn" style="width:30px;height:30px" data-act="mp-edit" data-arg="'+p.id+'" aria-label="Edit '+esc(p.name)+'">'+icon("edit",15)+'</button>'+
          '<button class="iconbtn" style="width:30px;height:30px" data-act="mp-qr" data-arg="'+p.id+'" aria-label="QR label">'+icon("qr",15)+'</button>'+
          '<button class="iconbtn" style="width:30px;height:30px;color:var(--crit)" data-act="mp-del" data-arg="'+p.id+'" aria-label="Delete">'+icon("trash",15)+'</button></div></td></tr>';}).join("")+
      '</tbody></table><div class="pagination"><span class="num">'+(page*8+1)+'–'+Math.min(list.length,(page+1)*8)+' of '+list.length+'</span>'+
      '<button data-act="mp-page" data-arg="-1" '+(page===0?'disabled':'')+' aria-label="Previous page">'+icon("chevL",16)+'</button>'+
      '<button data-act="mp-page" data-arg="1" '+((page+1)*8>=list.length?'disabled':'')+' aria-label="Next page">'+icon("chevR",16)+'</button></div></div>'
    : SG.emptyState("box","No products found","Try clearing the search, or create your first product.",
        '<div class="row"><button class="btn btn-sec" data-act="mp-clear">Clear filters</button><button class="btn btn-pri" data-act="mp-new">'+icon("plus",15)+' New product</button></div>')));
  const inp=root.querySelector("#mp-q"); if(inp){ let t;
    inp.addEventListener("input",()=>{ clearTimeout(t); t=setTimeout(()=>{ SG.sess.mpQ=inp.value; SG.sess.mpPage=0; SG.saveSess(); SG.render();
      requestAnimationFrame(()=>{const i=document.getElementById("mp-q"); if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}}); },380); }); }
  const cs=root.querySelector("#mp-cat"); cs&&cs.addEventListener("change",e=>{ SG.sess.mpCat=e.target.value; SG.sess.mpPage=0; SG.saveSess(); SG.render(); });
}
SG.actions["mp-sort"]=k=>{ if(SG.sess.mpSort===k) SG.sess.mpDir=(SG.sess.mpDir===-1?1:-1); else {SG.sess.mpSort=k; SG.sess.mpDir=1;} SG.saveSess(); SG.render(); };
SG.actions["mp-page"]=d=>{ SG.sess.mpPage=Math.max(0,(SG.sess.mpPage||0)+ +d); SG.saveSess(); SG.render(); };
SG.actions["mp-clear"]=()=>{ SG.sess.mpQ=""; SG.sess.mpCat=""; SG.sess.mpPage=0; SG.saveSess(); SG.render(); };
SG.actions["mp-export"]=()=>{
  SG.downloadCSV("products.csv",[["Name","SKU","Barcode","Category","Vendor","Price","Stock Muscat","Stock Salalah"],
    ...DB.products.map(p=>[p.name,p.sku,p.barcode,p.cat,p.vendorId?(SG.vendorById(p.vendorId)||{}).name:"House",p.price,p.stock.b1||0,p.stock.b2||0])]);
  SG.toast("products.csv downloaded");
};
SG.actions["mp-import"]=()=>{
  const d = SG.dialog({title:"Bulk import products", body:
    '<div class="panel" style="border:1.5px dashed var(--line2);background:transparent;text-align:center;padding:26px">'+
    icon("upload",26)+'<p style="margin-top:8px;font-weight:600">Drop a CSV here or browse</p>'+
    '<p class="small muted">Columns: name, sku, category, price, stock per branch. <a href="#" data-tmpl>Download template</a></p></div>'+
    '<div id="imp-progress" style="display:none"><div class="row-between small" style="margin-bottom:6px"><span id="imp-label">Validating rows…</span><span class="num" id="imp-pct">0%</span></div><div class="progress"><i id="imp-bar" style="width:0%"></i></div></div>',
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-run>Simulate import (24 rows)</button>'});
  d.querySelector("[data-tmpl]").onclick=e=>{ e.preventDefault(); SG.downloadCSV("product-template.csv",[["name","sku","category","price","stock_b1","stock_b2"],["Example Abaya","NB-AB-200","Abayas","399","10","5"]]); };
  d.querySelector("[data-run]").onclick=function(){
    this.disabled=true; d.querySelector("#imp-progress").style.display="block";
    let pct=0; const iv=setInterval(()=>{ pct=Math.min(100,pct+7+Math.random()*10);
      d.querySelector("#imp-bar").style.width=pct+"%"; d.querySelector("#imp-pct").textContent=Math.round(pct)+"%";
      d.querySelector("#imp-label").textContent= pct<40?"Validating rows…":pct<80?"Matching SKUs & vendors…":"Writing catalog…";
      if(pct>=100){ clearInterval(iv); setTimeout(()=>{ d.close(); SG.toast("24 products imported — 24 ok, 0 skipped"); },300); }
    },160);
  };
};
SG.actions["mp-del"]=pid=>{ const p=SG.productById(pid);
  SG.confirm({title:"Delete “"+esc(p.name)+"”?", danger:true, okLabel:"Delete product",
    message:"The product is removed from the catalog and shelf QR codes for it stop resolving. Sales history is kept.", cb:()=>{
      SG.deleteProduct(pid); SG.toast("Deleted "+esc(p.name)); SG.render(); }});
};
SG.actions["mp-qr"]=pid=>{ const p=SG.productById(pid);
  SG.dialog({title:"Shelf label — "+esc(p.name), body:
    '<div style="display:flex;justify-content:center"><div style="background:#fff;color:#111;border-radius:14px;padding:18px;text-align:center;border:1px solid var(--line)">'+
    SG.qrSVG(p.sku,130)+'<div style="font-weight:700;margin-top:8px;font-size:13px">'+esc(p.name)+'</div>'+
    '<div class="num" style="font-size:15px;font-weight:700">'+fmt(p.price)+'</div><div class="num" style="font-size:10px;color:#666">'+p.sku+' · '+p.barcode+'</div></div></div>',
    actions:'<button class="btn btn-ghost" data-close>Close</button><button class="btn btn-pri" data-nav="#/merchant/labels">Batch print labels</button>'});
};
SG.actions["mp-new"]=()=>productEditor();
SG.actions["mp-edit"]=pid=>productEditor(SG.productById(pid));
function productEditor(p){
  const cats=[...new Set(DB.products.map(x=>x.cat))];
  const d=SG.dialog({title:p?"Edit product":"New product", wide:true, body:
    '<div class="grid2" style="gap:12px">'+
    '<div class="field"><label>Name</label><input class="input" id="pe-name" value="'+esc(p?p.name:"")+'" placeholder="e.g. Silk Kimono"></div>'+
    '<div class="field"><label>Category</label><select class="input" id="pe-cat">'+cats.map(c=>'<option'+(p&&p.cat===c?" selected":"")+'>'+esc(c)+'</option>').join("")+'</select></div>'+
    '<div class="field"><label>Price (OMR)</label><input class="input num" id="pe-price" type="number" min="1" step="0.5" value="'+(p?p.price:"")+'" placeholder="299"></div>'+
    '<div class="field"><label>Vendor</label><select class="input" id="pe-vendor"><option value="">House product</option>'+
      DB.vendors.filter(v=>v.status==="active").map(v=>'<option value="'+v.id+'"'+(p&&p.vendorId===v.id?" selected":"")+'>'+esc(v.name)+'</option>').join("")+'</select></div>'+
    '<div class="field"><label>Stock — Mall of Oman</label><input class="input num" id="pe-s1" type="number" min="0" value="'+(p?(p.stock.b1||0):"12")+'"></div>'+
    '<div class="field"><label>Stock — Salalah Grand Mall</label><input class="input num" id="pe-s2" type="number" min="0" value="'+(p?(p.stock.b2||0):"8")+'"></div>'+
    '</div>'+
    '<div class="field"><label>Emoji artwork <span class="muted" style="font-weight:400">(stands in for product photos in this demo)</span></label>'+
    '<input class="input" id="pe-emoji" value="'+(p?p.emoji:"🛍️")+'" maxlength="4" style="width:90px"></div>'+
    (p?'<p class="small muted">SKU '+p.sku+' · barcode '+p.barcode+' — QR labels keep working after edits.</p>':''),
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-save>'+(p?"Save changes":"Create product")+'</button>'});
  d.querySelector("[data-save]").onclick=()=>{
    const name=d.querySelector("#pe-name"), price=d.querySelector("#pe-price");
    if(!name.value.trim()){ name.classList.add("invalid"); name.focus(); SG.toast("Give the product a name","warn"); return; }
    if(!(+price.value>0)){ price.classList.add("invalid"); price.focus(); SG.toast("Price must be greater than zero","warn"); return; }
    const data={ name:name.value.trim(), cat:d.querySelector("#pe-cat").value, price:+price.value,
      vendorId:d.querySelector("#pe-vendor").value||null, emoji:d.querySelector("#pe-emoji").value||"🛍️",
      stockB1:+d.querySelector("#pe-s1").value||0, stockB2:+d.querySelector("#pe-s2").value||0 };
    if(p){ Object.assign(p,{name:data.name,cat:data.cat,price:data.price,vendorId:data.vendorId,emoji:data.emoji});
      p.stock.b1=data.stockB1; p.stock.b2=data.stockB2; SG.save(); SG.logActivity("Noura Al-Fahad","Updated product "+p.name); }
    else SG.upsertProduct(data);
    d.close(); SG.toast(p?"Product updated":"Product created — shelf label ready"); SG.render();
  };
}
})();
