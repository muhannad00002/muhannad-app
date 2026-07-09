/* ============ MERCHANT APP — inventory, labels, vendors, employees, branches, reports, insights, settings, subscription ============ */
(()=>{
const {DB, icon, esc, fmt, fmtK, pimg} = SG;
const shell = SG.merchantShell;

/* ---------- INVENTORY ---------- */
function inventory(root){
  if(SG.loadOnce("m-inv")){ root.innerHTML = shell("inventory", SG.skelRows(8,54)); return; }
  const tab = SG.sess.invTab||"levels";
  const low = SG.lowStockList();
  let body;
  if(tab==="levels"){
    const list = DB.products.filter(p=>((p.stock.b1||0)+(p.stock.b2||0))<900);
    body = '<div class="tablewrap"><table><thead><tr><th>Product</th><th class="r">Mall of Oman</th><th class="r">Salalah Grand Mall</th><th class="r">Total</th><th>Status</th><th class="r">Adjust</th></tr></thead><tbody>'+
      list.map(p=>{ const tot=(p.stock.b1||0)+(p.stock.b2||0);
        return '<tr><td><div class="row">'+pimg(p,34,9)+'<div><b style="font-size:13.5px">'+esc(p.name)+'</b><div class="small muted">'+p.sku+'</div></div></div></td>'+
        '<td class="r num">'+(p.stock.b1||0)+'</td><td class="r num">'+(p.stock.b2||0)+'</td><td class="r num" style="font-weight:700">'+tot+'</td>'+
        '<td>'+(tot===0?'<span class="chip chip-crit">Out of stock</span>':tot<=p.lowAt?'<span class="chip chip-warn">Low</span>':'<span class="chip chip-good">Healthy</span>')+'</td>'+
        '<td class="r"><button class="btn btn-sec btn-sm" data-act="inv-adjust" data-arg="'+p.id+'">Adjust</button></td></tr>';}).join("")+'</tbody></table></div>';
  } else if(tab==="alerts"){
    body = low.length? '<div class="col">'+low.map(l=>
      '<div class="card row" style="padding:14px 16px">'+pimg(l.p,40,10)+
      '<div style="flex:1"><b style="font-size:14px">'+esc(l.p.name)+'</b><div class="small muted">'+esc(l.branch.name)+' · threshold '+l.p.lowAt+'</div></div>'+
      '<span class="chip '+(l.qty===0?'chip-crit':'chip-warn')+' num">'+l.qty+' left</span>'+
      '<button class="btn btn-pri btn-sm" data-act="inv-restock" data-arg="'+l.p.id+'|'+l.branch.id+'">Restock +20</button></div>').join("")+'</div>'
    : SG.emptyState("check","No alerts","Every SKU is above its low-stock threshold. Alerts appear here and in notifications the moment a sale crosses a threshold.");
  } else {
    body = '<div class="tablewrap"><table><thead><tr><th>When</th><th>Product</th><th>Branch</th><th class="r">Change</th><th>Type</th><th>By / note</th></tr></thead><tbody>'+
      DB.movements.slice(0,25).map(m=>{ const p=SG.productById(m.productId);
        return '<tr><td class="small muted">'+SG.timeAgo(m.ts)+'</td><td><b style="font-size:13px">'+esc(p?p.name:"(deleted)")+'</b></td>'+
        '<td class="small">'+esc(SG.branchById(m.branch).name.split("—")[0])+'</td>'+
        '<td class="r num" style="font-weight:700;color:'+(m.delta>0?"var(--good)":"var(--crit)")+'">'+(m.delta>0?"+":"")+m.delta+'</td>'+
        '<td><span class="chip chip-neutral">'+m.kind+'</span></td><td class="small muted">'+esc(m.by)+(m.note?' · '+esc(m.note):'')+'</td></tr>';}).join("")+'</tbody></table></div>';
  }
  root.innerHTML = shell("inventory",
    '<div class="row-between wrap"><div class="seg">'+[["levels","Stock levels"],["alerts","Low stock ("+low.length+")"],["history","Movements"]].map(t=>
      '<button class="'+(tab===t[0]?"active":"")+'" data-act="inv-tab" data-arg="'+t[0]+'">'+t[1]+'</button>').join("")+'</div>'+
      '<button class="btn btn-sec" data-act="inv-export">'+icon("download",15)+' Export stock CSV</button></div>'+body);
}
SG.actions["inv-tab"]=t=>{ SG.sess.invTab=t; SG.saveSess(); SG.render(); };
SG.actions["inv-export"]=()=>{ SG.downloadCSV("stock.csv",[["Product","SKU","Mall of Oman","Salalah Grand Mall"],
  ...DB.products.map(p=>[p.name,p.sku,p.stock.b1||0,p.stock.b2||0])]); SG.toast("stock.csv downloaded"); };
SG.actions["inv-restock"]=arg=>{ const [pid,bid]=arg.split("|");
  SG.adjustStock(pid,bid,20,"restock","Quick restock","Ahmed Siddiqui");
  SG.toast("+20 added — movement logged"); SG.render(); };
SG.actions["inv-adjust"]=pid=>{
  const p=SG.productById(pid);
  const d=SG.dialog({title:"Adjust stock — "+esc(p.name), body:
    '<div class="grid2" style="gap:12px"><div class="field"><label>Branch</label><select class="input" id="ia-branch">'+
      DB.branches.map(b=>'<option value="'+b.id+'">'+esc(b.name)+' (now '+(p.stock[b.id]||0)+')</option>').join("")+'</select></div>'+
    '<div class="field"><label>Type</label><select class="input" id="ia-kind"><option value="restock">Restock (+)</option><option value="damage">Damage / loss (−)</option><option value="transfer">Transfer in (+)</option><option value="correction">Count correction</option></select></div></div>'+
    '<div class="field"><label>Quantity</label><input class="input num" id="ia-qty" type="number" min="1" value="10"></div>'+
    '<div class="field"><label>Note</label><input class="input" id="ia-note" placeholder="e.g. PO #482 received"></div>',
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-save>Apply adjustment</button>'});
  d.querySelector("[data-save]").onclick=()=>{
    const qty=+d.querySelector("#ia-qty").value;
    if(!(qty>0)){ SG.toast("Quantity must be at least 1","warn"); return; }
    const kind=d.querySelector("#ia-kind").value;
    const sign = kind==="damage" ? -1 : 1;
    const bid=d.querySelector("#ia-branch").value;
    if(sign<0 && (p.stock[bid]||0)<qty){ SG.toast("Can't remove more than the "+(p.stock[bid]||0)+" on hand","err"); return; }
    SG.adjustStock(pid,bid,sign*qty,kind,d.querySelector("#ia-note").value||"—","Ahmed Siddiqui");
    d.close(); SG.toast("Stock updated — "+(sign>0?"+":"−")+qty+" at "+SG.branchById(bid).name); SG.render();
  };
};

/* ---------- QR LABELS ---------- */
function labels(root){
  const sel = SG.sess.labelSel || (SG.sess.labelSel = {});
  const list = DB.products.filter(p=>p.approved);
  const chosen = list.filter(p=>sel[p.id]);
  root.innerHTML = shell("labels",
    '<div class="row-between wrap"><p class="muted small" style="max-width:520px">Select products, then print a shelf-label sheet. Each label carries the product QR that customers scan — reprint any time, codes never change.</p>'+
    '<div class="row"><button class="btn btn-sec" data-act="lb-all">'+(chosen.length===list.length?"Clear all":"Select all")+'</button>'+
    '<button class="btn btn-pri" data-act="lb-print" '+(chosen.length?"":"disabled")+'>'+icon("print",16)+' Print '+(chosen.length||"")+' label'+(chosen.length===1?"":"s")+'</button></div></div>'+
    '<div class="grid3" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">'+list.map(p=>
      '<button class="card" data-act="lb-toggle" data-arg="'+p.id+'" style="padding:14px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:8px;'+(sel[p.id]?'border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)':'')+'" aria-pressed="'+!!sel[p.id]+'">'+
      '<div style="color:var(--ink)">'+SG.qrSVG(p.sku,86)+'</div>'+
      '<div style="font-size:12.5px;font-weight:600;line-height:1.3">'+esc(p.name)+'</div>'+
      '<div class="num small muted">'+p.sku+' · '+fmt(p.price)+'</div>'+
      (sel[p.id]?'<span class="chip chip-accent">'+icon("check",12)+' Selected</span>':'<span class="chip chip-neutral">Tap to select</span>')+'</button>').join("")+'</div>'+
    '<div id="print-area" style="position:absolute;left:-9999px;top:0;background:#fff;color:#000;padding:20px">'+
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">'+chosen.map(p=>
        '<div style="border:1px solid #ccc;border-radius:8px;padding:12px;text-align:center;color:#111">'+SG.qrSVG(p.sku,100)+
        '<div style="font-weight:700;font-size:12px;margin-top:6px">'+esc(p.name)+'</div>'+
        '<div style="font-size:13px;font-weight:700">'+fmt(p.price)+'</div><div style="font-size:9px;color:#555">'+p.sku+' · '+p.barcode+'</div></div>').join("")+'</div></div>');
}
SG.actions["lb-toggle"]=pid=>{ SG.sess.labelSel[pid]=!SG.sess.labelSel[pid]; SG.saveSess(); SG.render(); };
SG.actions["lb-all"]=()=>{ const list=DB.products.filter(p=>p.approved); const all=list.every(p=>SG.sess.labelSel[p.id]);
  list.forEach(p=>SG.sess.labelSel[p.id]=!all); SG.saveSess(); SG.render(); };
SG.actions["lb-print"]=()=>{ SG.toast("Opening print dialog — 3-per-row label sheet"); setTimeout(()=>window.print(),300); };

/* ---------- VENDORS ---------- */
function vendors(root, r){
  if(r.arg) return vendorDetail(root, r.arg);
  if(SG.loadOnce("m-vendors")){ root.innerHTML = shell("vendors", SG.skelRows(4,84)); return; }
  root.innerHTML = shell("vendors",
    '<div class="row-between wrap"><p class="muted small" style="max-width:540px">Independent brands sold in your boutique. Every evening at '+DB.settings.dailyVendorHour+':00 each vendor automatically receives their sales, stock and settlement digest.</p>'+
    '<button class="btn btn-pri" data-act="vd-invite">'+icon("plus",16)+' Invite vendor</button></div>'+
    '<div class="grid2">'+DB.vendors.map(v=>{
      const agg = SG.vendorAgg(v.id,30);
      const items = DB.products.filter(p=>p.vendorId===v.id);
      return '<div class="card card-pad col" style="gap:10px">'+
      '<div class="row"><div class="avatar" style="background:var(--accent-soft);color:var(--accent-ink)">'+esc(v.name.split(" ").map(w=>w[0]).join("").slice(0,2))+'</div>'+
      '<div style="flex:1"><b>'+esc(v.name)+'</b><div class="small muted">'+esc(v.contact)+' · '+v.commission+'% commission</div></div>'+
      (v.status==="active"?'<span class="chip chip-good">Active</span>':'<span class="chip chip-warn">Pending</span>')+'</div>'+
      '<div class="row" style="gap:18px"><div><div class="eyebrow">30d sales</div><b class="num" style="font-size:17px">'+fmtK(agg.gross)+'</b></div>'+
      '<div><div class="eyebrow">Units</div><b class="num" style="font-size:17px">'+agg.units+'</b></div>'+
      '<div><div class="eyebrow">Products</div><b class="num" style="font-size:17px">'+items.length+'</b></div>'+
      '<div style="margin-left:auto">'+SG.spark(agg.series.map(s=>s.v))+'</div></div>'+
      '<div class="row">'+
        (v.status==="pending"
          ?'<button class="btn btn-pri btn-sm" data-act="vd-approve" data-arg="'+v.id+'">'+icon("check",14)+' Approve vendor & products</button>'
          :'<button class="btn btn-sec btn-sm" data-nav="#/merchant/vendors/'+v.id+'">Open</button>'+
           '<button class="btn btn-ghost btn-sm" data-act="vd-digest" data-arg="'+v.id+'">Preview daily digest</button>'+
           '<button class="btn btn-ghost btn-sm" style="color:var(--crit)" data-act="vd-suspend" data-arg="'+v.id+'">Suspend</button>')+
      '</div></div>';}).join("")+'</div>');
}
function vendorDetail(root, vid){
  const v = SG.vendorById(vid);
  if(!v){ SG.go("#/merchant/vendors"); return; }
  const agg = SG.vendorAgg(vid,30);
  const items = DB.products.filter(p=>p.vendorId===vid);
  const stl = DB.settlements.filter(s=>s.vendorId===vid);
  root.innerHTML = shell("vendors",
    '<button class="btn btn-ghost" data-nav="#/merchant/vendors" style="align-self:flex-start">'+icon("chevL",16)+' All vendors</button>'+
    '<div class="card card-pad row wrap"><div class="avatar" style="width:52px;height:52px;font-size:17px;background:var(--accent-soft);color:var(--accent-ink)">'+esc(v.name.split(" ").map(w=>w[0]).join("").slice(0,2))+'</div>'+
      '<div style="flex:1;min-width:180px"><h3>'+esc(v.name)+'</h3><div class="small muted">'+esc(v.contact)+' · '+esc(v.email)+' · '+esc(v.whatsapp)+'</div></div>'+
      '<div class="row"><span class="chip chip-neutral">'+v.commission+'% commission</span>'+
      '<span class="chip '+(v.status==="active"?"chip-good":"chip-warn")+'">'+v.status+'</span></div></div>'+
    '<div class="kpis">'+
      '<div class="kpi"><span class="kpi-label">30-day gross</span><span class="kpi-value num">'+fmtK(agg.gross)+'</span></div>'+
      '<div class="kpi"><span class="kpi-label">Units sold</span><span class="kpi-value num">'+agg.units+'</span></div>'+
      '<div class="kpi"><span class="kpi-label">Est. commission</span><span class="kpi-value num">'+fmtK(agg.gross*v.commission/100)+'</span></div>'+
      '<div class="kpi"><span class="kpi-label">Live products</span><span class="kpi-value num">'+items.length+'</span></div></div>'+
    '<div class="chart-card"><div class="chart-h"><h3>'+esc(v.name)+' — daily sales (30d)</h3></div><div id="vd-line"></div></div>'+
    '<div class="grid2" style="align-items:start">'+
      '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:6px">Products</h3>'+items.map(p=>{
        const tot=(p.stock.b1||0)+(p.stock.b2||0);
        return '<div class="listrow">'+pimg(p,36,9)+'<div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(p.name)+'</div>'+
        '<div class="small muted num">'+fmt(p.price)+' · '+tot+' in stock</div></div>'+
        (tot<=p.lowAt?'<span class="chip chip-warn">Low</span>':'')+'</div>';}).join("")+'</div>'+
      '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:6px">Settlements</h3>'+stl.map(s=>
        '<div class="listrow"><div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+s.period+'</div>'+
        '<div class="small muted num">Gross '+fmt(s.gross)+' − commission '+fmt(s.commission)+'</div></div>'+
        '<b class="num">'+fmt(s.net)+'</b>'+
        (s.status==="paid"?'<span class="chip chip-good">Paid</span>':'<button class="btn btn-pri btn-sm" data-act="vd-settle" data-arg="'+s.id+'">Mark paid</button>')+'</div>').join("")+'</div></div>');
  SG.lineChart("vd-line",{series:agg.series, height:200, color:"var(--c3)"});
}
SG.actions["vd-approve"]=vid=>{ const v=SG.vendorById(vid); v.status="active";
  DB.products.filter(p=>p.vendorId===vid).forEach(p=>p.approved=true);
  SG.logActivity("Noura Al-Fahad","Approved vendor "+v.name); SG.save();
  SG.toast(v.name+" approved — products are live"); SG.render(); };
SG.actions["vd-suspend"]=vid=>{ const v=SG.vendorById(vid);
  SG.confirm({title:"Suspend "+esc(v.name)+"?", danger:true, okLabel:"Suspend",
    message:"Their products are hidden from the customer app and daily digests pause. You can re-approve anytime.", cb:()=>{
      v.status="pending"; DB.products.filter(p=>p.vendorId===vid).forEach(p=>p.approved=false);
      SG.logActivity("Noura Al-Fahad","Suspended vendor "+v.name); SG.save(); SG.toast(v.name+" suspended","warn"); SG.render(); }});
};
SG.actions["vd-settle"]=sid=>{ const s=DB.settlements.find(x=>x.id===sid); s.status="paid"; s.paidTs=Date.now();
  SG.notify("vendor","wallet","Settlement paid — "+s.period, fmt(s.net)+" transferred to your account.");
  SG.save(); SG.toast("Settlement "+s.id+" marked paid — vendor notified"); SG.render(); };
SG.actions["vd-invite"]=()=>{
  const d=SG.dialog({title:"Invite a vendor", body:
    '<div class="field"><label>Brand name</label><input class="input" id="vi-name" placeholder="e.g. Noor Ceramics"></div>'+
    '<div class="grid2" style="gap:12px"><div class="field"><label>Contact email</label><input class="input" id="vi-email" type="email" placeholder="owner@brand.com"></div>'+
    '<div class="field"><label>Commission %</label><input class="input num" id="vi-comm" type="number" min="0" max="60" value="20"></div></div>'+
    '<p class="small muted">They\'ll get an email invitation to the vendor portal. Products they add wait for your approval before going live.</p>',
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-save>Send invitation</button>'});
  d.querySelector("[data-save]").onclick=()=>{
    const name=d.querySelector("#vi-name"), email=d.querySelector("#vi-email");
    if(!name.value.trim()){ name.classList.add("invalid"); SG.toast("Enter the brand name","warn"); return; }
    if(!/.+@.+\..+/.test(email.value)){ email.classList.add("invalid"); SG.toast("Enter a valid contact email","warn"); return; }
    DB.vendors.push({id:SG.uid("v"), name:name.value.trim(), contact:email.value.split("@")[0], email:email.value,
      whatsapp:"—", commission:+d.querySelector("#vi-comm").value||20, status:"pending", joined:Date.now(), channels:{email:true,whatsapp:false,portal:false}});
    SG.logActivity("Noura Al-Fahad","Invited vendor "+name.value); SG.save();
    d.close(); SG.toast("Invitation sent to "+email.value); SG.render();
  };
};
SG.actions["vd-digest"]=vid=>{
  const s = SG.vendorDailySummary(vid);
  SG.dialog({title:"Daily digest preview — "+esc(s.v.name), wide:true, body:
    '<div class="panel"><div class="eyebrow" style="margin-bottom:8px">Sent nightly at '+DB.settings.dailyVendorHour+':00 via '+
      [s.v.channels.email&&"email",s.v.channels.whatsapp&&"WhatsApp",s.v.channels.portal&&"portal"].filter(Boolean).join(" + ")+'</div>'+
    '<b style="font-size:15px">Today at '+esc(DB.storeName)+'</b>'+
    (s.rows.length? '<div style="margin-top:8px">'+s.rows.map(r=>
      '<div class="row-between small" style="padding:4px 0"><span>'+r.units+'× '+esc(r.name)+(r.low?' <span class="chip chip-warn">low stock</span>':'')+'</span><b class="num">'+fmt(r.value)+'</b></div>').join("")+
      '<hr class="divider" style="margin:8px 0"><div class="row-between"><b>Gross today</b><b class="num">'+fmt(s.gross)+'</b></div></div>'
      : '<p class="small muted" style="margin-top:6px">No sales yet today — the digest will say so and still include stock alerts.</p>')+
    (s.lows.length?'<div class="small" style="margin-top:8px;color:var(--warn)">'+icon("alert",13)+' Running low: '+s.lows.map(p=>esc(p.name)).join(", ")+'</div>':'')+
    (s.outs.length?'<div class="small" style="color:var(--crit)">Out of stock: '+s.outs.map(p=>esc(p.name)).join(", ")+'</div>':'')+
    (s.pending?'<div class="small muted" style="margin-top:6px">Pending settlement: '+fmt(s.pending.net)+' ('+s.pending.period+')</div>':'')+'</div>',
    actions:'<button class="btn btn-ghost" data-close>Close</button><button class="btn btn-pri" data-send>Send test now</button>'})
  .querySelector("[data-send]").onclick=function(){
    SG.notify("vendor","chart","Daily summary — test", "Manual test digest from "+DB.storeName+".");
    this.closest(".overlay").remove(); SG.toast("Test digest sent to "+esc(s.v.name));
  };
};

/* ---------- EMPLOYEES ---------- */
function employees(root){
  const ROLE_DESC = {owner:"Full access, billing", manager:"Catalog, inventory, reports", cashier:"POS checkout only"};
  root.innerHTML = shell("employees",
    '<div class="row-between wrap"><p class="muted small">Roles gate what each person can open — cashiers land straight on the POS.</p>'+
    '<button class="btn btn-pri" data-act="em-add">'+icon("plus",16)+' Add employee</button></div>'+
    '<div class="tablewrap"><table><thead><tr><th>Name</th><th>Role</th><th>Branch</th><th>Status</th><th class="r"></th></tr></thead><tbody>'+
    DB.employees.map(e=>'<tr><td><div class="row"><div class="avatar">'+esc(e.name.split(" ").map(w=>w[0]).join("").slice(0,2))+'</div>'+
      '<div><b style="font-size:13.5px">'+esc(e.name)+'</b><div class="small muted">'+esc(e.email)+'</div></div></div></td>'+
      '<td><span class="chip '+(e.role==="owner"?"chip-accent":"chip-neutral")+'">'+e.role+'</span><div class="small muted" style="margin-top:2px">'+ROLE_DESC[e.role]+'</div></td>'+
      '<td class="small">'+esc(SG.branchById(e.branch).name)+'</td>'+
      '<td>'+(e.status==="active"?'<span class="chip chip-good">Active</span>':'<span class="chip chip-warn">Invited</span>')+'</td>'+
      '<td class="r">'+(e.role!=="owner"?'<button class="btn btn-ghost btn-sm" style="color:var(--crit)" data-act="em-rm" data-arg="'+e.id+'">Remove</button>':'')+'</td></tr>').join("")+
    '</tbody></table></div>'+
    '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:8px">Activity log</h3><div class="timeline">'+
    DB.activity.slice(0,8).map(a=>'<div class="tl-item"><div class="tl-dot" style="background:var(--surface3)"></div>'+
      '<div style="flex:1"><div style="font-size:13.5px">'+esc(a.act)+'</div><div class="small muted">'+esc(a.by)+' · '+SG.timeAgo(a.ts)+'</div></div></div>').join("")+'</div></div>');
}
SG.actions["em-add"]=()=>{
  const d=SG.dialog({title:"Add employee", body:
    '<div class="field"><label>Full name</label><input class="input" id="ea-name" placeholder="e.g. Salma Harbi"></div>'+
    '<div class="grid2" style="gap:12px"><div class="field"><label>Role</label><select class="input" id="ea-role"><option value="cashier">Cashier</option><option value="manager">Manager</option></select></div>'+
    '<div class="field"><label>Branch</label><select class="input" id="ea-branch">'+DB.branches.map(b=>'<option value="'+b.id+'">'+esc(b.name)+'</option>').join("")+'</select></div></div>'+
    '<div class="field"><label>Email</label><input class="input" id="ea-email" type="email" placeholder="name@norab.sa"></div>'+
    '<p class="small muted">Business plan includes up to 10 employees — you\'re using '+DB.employees.length+'.</p>',
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-save>Send invite</button>'});
  d.querySelector("[data-save]").onclick=()=>{
    const name=d.querySelector("#ea-name"), email=d.querySelector("#ea-email");
    if(!name.value.trim()){ name.classList.add("invalid"); SG.toast("Enter their name","warn"); return; }
    if(!/.+@.+\..+/.test(email.value)){ email.classList.add("invalid"); SG.toast("Enter a valid email","warn"); return; }
    DB.employees.push({id:SG.uid("e"), name:name.value.trim(), role:d.querySelector("#ea-role").value,
      branch:d.querySelector("#ea-branch").value, email:email.value, status:"invited", pin:"0000"});
    SG.logActivity("Noura Al-Fahad","Invited "+d.querySelector("#ea-role").value+" "+name.value); SG.save();
    d.close(); SG.toast("Invite sent to "+email.value); SG.render();
  };
};
SG.actions["em-rm"]=eid=>{ const e=SG.empById(eid);
  SG.confirm({title:"Remove "+esc(e.name)+"?", danger:true, okLabel:"Remove", message:"They lose access immediately. Their sales history stays attributed to them.", cb:()=>{
    DB.employees=DB.employees.filter(x=>x.id!==eid); SG.logActivity("Noura Al-Fahad","Removed employee "+e.name); SG.save();
    SG.toast(e.name+" removed"); SG.render(); }});
};

/* ---------- BRANCHES ---------- */
function branches(root){
  root.innerHTML = shell("branches",
    '<div class="row-between wrap"><p class="muted small">Each branch has its own entrance QR, stock levels and cashier shifts.</p>'+
    '<button class="btn btn-pri" data-act="br-add">'+icon("plus",16)+' New branch</button></div>'+
    '<div class="grid2">'+DB.branches.map(b=>{
      const sales30 = SG.sumSales(SG.ordersSince(30,b.id));
      const emps = DB.employees.filter(e=>e.branch===b.id).length;
      return '<div class="card card-pad col" style="gap:12px"><div class="row">'+
      '<div class="role-ic" style="width:42px;height:42px;border-radius:12px;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center">'+icon("building",20)+'</div>'+
      '<div style="flex:1"><b>'+esc(b.name)+'</b><div class="small muted">'+esc(b.address)+'</div></div></div>'+
      '<div class="row" style="gap:18px"><div><div class="eyebrow">30d sales</div><b class="num" style="font-size:16px">'+fmtK(sales30)+'</b></div>'+
      '<div><div class="eyebrow">Staff</div><b class="num" style="font-size:16px">'+emps+'</b></div>'+
      '<div><div class="eyebrow">Since</div><b style="font-size:16px">'+new Date(b.opened).getFullYear()+'</b></div></div>'+
      '<div class="row"><button class="btn btn-sec btn-sm" data-act="br-qr" data-arg="'+b.id+'">'+icon("qr",14)+' Entrance QR</button></div></div>';}).join("")+'</div>');
}
SG.actions["br-qr"]=bid=>{ const b=SG.branchById(bid);
  SG.dialog({title:"Entrance QR — "+esc(b.name), body:
    '<div style="display:flex;justify-content:center"><div style="background:#fff;color:#111;border-radius:14px;padding:20px;text-align:center;border:1px solid var(--line)">'+
    SG.qrSVG("ENTRANCE|"+bid,150)+'<div style="font-weight:700;margin-top:8px;font-size:13px">'+esc(DB.storeName)+'</div><div style="font-size:11px;color:#666">Scan to start shopping</div></div></div>'+
    '<p class="small muted" style="text-align:center">Print this at A5 and mount it at the door. Scanning it opens the store in the customer app.</p>',
    actions:'<button class="btn btn-ghost" data-close>Close</button><button class="btn btn-pri" data-act="receipt-print">'+icon("print",15)+' Print</button>'});
};
SG.actions["br-add"]=()=>{
  const d=SG.dialog({title:"New branch", body:
    '<div class="field"><label>Branch name</label><input class="input" id="ba-name" placeholder="e.g. Dammam — Marina Mall"></div>'+
    '<div class="field"><label>Address</label><input class="input" id="ba-addr" placeholder="Street, city"></div>'+
    '<div class="panel small" style="display:flex;gap:8px;align-items:flex-start">'+icon("alert",16)+'<span>Your Business plan includes 3 branches (2 in use). Adding a 4th will suggest an upgrade to Premium.</span></div>',
    actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-save>Create branch</button>'});
  d.querySelector("[data-save]").onclick=()=>{
    const name=d.querySelector("#ba-name");
    if(!name.value.trim()){ name.classList.add("invalid"); SG.toast("Name the branch","warn"); return; }
    const id=SG.uid("b");
    DB.branches.push({id, name:name.value.trim(), address:d.querySelector("#ba-addr").value||"—", opened:Date.now()});
    DB.products.forEach(p=>{ if(p.stock.b1<900) p.stock[id]=0; });
    SG.logActivity("Noura Al-Fahad","Opened branch "+name.value); SG.save();
    d.close(); SG.toast("Branch created — entrance QR is ready"); SG.render();
  };
};

/* ---------- REPORTS ---------- */
function reports(root){
  if(SG.loadOnce("m-reports")){ root.innerHTML = shell("reports", SG.skelDash()); return; }
  const range = SG.sess.rRange||30;
  const os = SG.ordersSince(range);
  const byCat = {};
  os.forEach(o=>o.items.forEach(it=>{ const p=SG.productById(it.productId); const c=p?p.cat:"Other";
    byCat[c]=(byCat[c]||0)+it.price*it.qty; }));
  const catData = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([label,v])=>({label,v:Math.round(v)}));
  const byEmp = {};
  os.forEach(o=>{ byEmp[o.cashierId]=(byEmp[o.cashierId]||0)+o.total; });
  const empData = Object.entries(byEmp).map(([id,v])=>({e:SG.empById(id),v})).filter(x=>x.e).sort((a,b)=>b.v-a.v);
  const top = SG.topProducts(range,8);
  const weekday = [0,0,0,0,0,0,0];
  os.forEach(o=>weekday[new Date(o.ts).getDay()]+=o.total);
  const wdData = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((label,i)=>({label,v:Math.round(weekday[i])}));
  root.innerHTML = shell("reports",
    '<div class="row-between wrap"><div class="seg">'+[["7","Daily (7d)"],["30","Monthly (30d)"],["90","Quarterly"],["365","Yearly"]].map(t=>
      '<button class="'+(range===+t[0]?"active":"")+'" data-act="r-range" data-arg="'+t[0]+'">'+t[1]+'</button>').join("")+'</div>'+
    '<button class="btn btn-sec" data-act="r-export">'+icon("download",15)+' Export report CSV</button></div>'+
    '<div class="kpis">'+
      '<div class="kpi"><span class="kpi-label">Gross sales</span><span class="kpi-value num">'+fmtK(SG.sumSales(os))+'</span></div>'+
      '<div class="kpi"><span class="kpi-label">Orders</span><span class="kpi-value num">'+os.length.toLocaleString()+'</span></div>'+
      '<div class="kpi"><span class="kpi-label">Units</span><span class="kpi-value num">'+os.reduce((s,o)=>s+o.items.reduce((x,i)=>x+i.qty,0),0).toLocaleString()+'</span></div>'+
      '<div class="kpi"><span class="kpi-label">VAT collected</span><span class="kpi-value num">'+fmtK(os.reduce((s,o)=>s+o.tax,0))+'</span></div></div>'+
    '<div class="chart-card"><div class="chart-h"><h3>Sales by weekday</h3><div class="chart-legend"><span class="lg"><span class="sw" style="background:var(--c2)"></span>Gross (OMR)</span></div></div><div id="r-week"></div></div>'+
    '<div class="grid2" style="align-items:start">'+
      '<div class="chart-card"><div class="chart-h"><h3>Product performance</h3></div>'+
        SG.barList(top.map(t=>({label:t.name,value:Math.round(t.revenue),sub:t.units+" units",img:pimg({emoji:t.emoji,grad:t.grad},32,8)})))+'</div>'+
      '<div class="col"><div class="chart-card"><div class="chart-h"><h3>Sales by category</h3></div>'+
        SG.barList(catData.map(c=>({label:c.label,value:c.v})))+'</div>'+
      '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:6px">Cashier performance</h3>'+
        empData.map((x,i)=>'<div class="listrow"><span class="num muted small" style="width:18px">'+(i+1)+'</span><div class="avatar">'+esc(x.e.name.split(" ").map(w=>w[0]).join("").slice(0,2))+'</div>'+
        '<div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(x.e.name)+'</div><div class="small muted">'+esc(SG.branchById(x.e.branch).name.split("—")[0])+'</div></div>'+
        '<b class="num">'+fmtK(x.v)+'</b></div>').join("")+'</div></div></div>');
  SG.barChart("r-week",{data:wdData, height:210});
}
SG.actions["r-range"]=d=>{ SG.sess.rRange=+d; SG.saveSess(); SG.invalidate("m-reports"); SG.render(); };
SG.actions["r-export"]=()=>{
  const range=SG.sess.rRange||30;
  SG.downloadCSV("sales-report-"+range+"d.csv",[["Date","Gross OMR"],...SG.seriesDaily(range).map(d=>[d.date,d.v])]);
  SG.toast("Report exported");
};

/* ---------- AI INSIGHTS ---------- */
function insights(root){
  if(SG.loadOnce("m-ai",700)){ root.innerHTML = shell("insights",
    '<div class="state" style="padding:60px 20px"><div class="state-icon" style="color:var(--c5)">'+icon("sparkle",26)+'</div>'+
    '<h3>Analyzing 120 days of sales…</h3><p>Finding patterns across products, branches, hours and vendors.</p>'+SG.skelRows(3,64)+'</div>'); return; }
  const low = SG.lowStockList();
  const top = SG.topProducts(30,3);
  const wk = SG.ordersSince(7), wkPrev = DB.orders.filter(o=>o.ts>=Date.now()-14*864e5&&o.ts<Date.now()-7*864e5);
  const growth = wkPrev.length? Math.round((SG.sumSales(wk)-SG.sumSales(wkPrev))/SG.sumSales(wkPrev)*100) : 0;
  const fri = SG.ordersSince(30).filter(o=>[5,6].includes(new Date(o.ts).getDay()));
  const friShare = Math.round(SG.sumSales(fri)/Math.max(SG.sumSales(SG.ordersSince(30)),1)*100);
  const cards = [
    {t:"Weekend concentration is high", body:friShare+"% of the last 30 days' revenue lands on Friday–Saturday. Consider a weekday promotion (e.g. WELCOME15 push on Tue–Wed) to smooth demand and reduce weekend register queues.", act:"Review coupons", nav:"#/merchant/settings"},
    {t:(growth>=0?"Momentum is positive":"Sales dipped this week"), body:"Last 7 days are "+(growth>=0?"up ":"down ")+Math.abs(growth)+"% vs the week before. "+(growth>=0?"The push came mostly from "+esc(top[0]?top[0].name:"top sellers")+".":"The dip traces to fewer weekday baskets at Salalah Grand Mall."), act:"Open reports", nav:"#/merchant/reports"},
    {t:"Restock before the weekend", body: low.length? low.slice(0,2).map(l=>esc(l.p.name)+" ("+l.qty+" left)").join(" and ")+" will likely sell out within "+(low[0].qty<3?"2":"5")+" days at the current run-rate.":"All SKUs are healthy — no stock-outs projected in the next 14 days.", act:"Open inventory", nav:"#/merchant/inventory"},
    {t:"Bundle opportunity", body:"Shoppers who buy "+esc(top[0]?top[0].name:"your top seller")+" add a Fragrance item in 38% of baskets. A “complete the look” shelf card near the abaya rail could lift attach rate.", act:"See products", nav:"#/merchant/products"},
    {t:"Vendor spotlight", body:"Oud & Amber generates the highest revenue per shelf-slot this month. Their commission terms (22%) are also your best margin among vendors — consider giving them the entrance display.", act:"Open vendors", nav:"#/merchant/vendors"},
  ];
  root.innerHTML = shell("insights",
    '<div class="row-between wrap"><p class="muted small" style="max-width:560px">Generated from your live sales, inventory and vendor data. Refreshes every morning at 6:00 — or on demand.</p>'+
    '<button class="btn btn-sec" data-act="ai-refresh">'+icon("refresh",15)+' Regenerate</button></div>'+
    '<div class="col">'+cards.map(c=>
      '<div class="ai-card"><div style="color:var(--c5);margin-top:1px">'+icon("sparkle",20)+'</div>'+
      '<div style="flex:1"><b style="font-size:14.5px">'+c.t+'</b><p class="small muted" style="margin-top:3px">'+c.body+'</p></div>'+
      '<button class="btn btn-soft btn-sm" data-nav="'+c.nav+'" style="align-self:center;flex:none">'+c.act+'</button></div>').join("")+'</div>');
}
SG.actions["ai-refresh"]=()=>{ SG.invalidate("m-ai"); SG.render(); };

/* ---------- SETTINGS ---------- */
function settings(root){
  const tab = SG.sess.setTab||"business";
  const S = DB.settings;
  let body;
  if(tab==="business"){
    body='<div class="card card-pad col" style="gap:14px;max-width:560px">'+
    '<div class="field"><label>Store name</label><input class="input" id="st-name" value="'+esc(DB.storeName)+'"></div>'+
    '<div class="field"><label>Address</label><input class="input" id="st-addr" value="'+esc(S.address)+'"></div>'+
    '<div class="field"><label>VAT registration</label><input class="input num" id="st-vat" value="'+esc(S.vat)+'"></div>'+
    '<button class="btn btn-pri" data-act="st-save-business" style="align-self:flex-start">Save changes</button></div>';
  } else if(tab==="taxes"){
    body='<div class="card card-pad col" style="gap:14px;max-width:560px">'+
    '<div class="field"><label>VAT rate (%)</label><input class="input num" id="st-tax" type="number" min="0" max="30" value="'+S.taxRate+'"></div>'+
    '<p class="small muted">Applied at checkout on the discounted subtotal. Receipts show the ZATCA-compliant QR with VAT breakdown.</p>'+
    '<button class="btn btn-pri" data-act="st-save-tax" style="align-self:flex-start">Save tax settings</button></div>';
  } else if(tab==="branding"){
    body='<div class="card card-pad col" style="gap:14px;max-width:560px">'+
    '<div class="field"><label>Logo</label><div class="row"><div class="logo-mark" style="border-radius:12px">'+icon("scan",20)+'</div>'+
    '<button class="btn btn-sec btn-sm" data-act="st-logo">'+icon("upload",14)+' Upload new logo</button></div></div>'+
    '<div class="field"><label>Accent color</label><div class="row">'+["#0E8A6D","#4477CC","#A24E8E","#B7791F"].map(c=>
      '<button data-act="st-color" data-arg="'+c+'" aria-label="Accent '+c+'" style="width:34px;height:34px;border-radius:10px;background:'+c+';'+(S.brandColor===c?'box-shadow:0 0 0 3px var(--accent-soft),0 0 0 1.5px '+c:'')+'"></button>').join("")+'</div>'+
    '<p class="small muted">Used in the customer app, receipts and email digests.</p></div></div>';
  } else {
    body='<div class="card card-pad col" style="gap:14px;max-width:560px">'+
    '<div class="field"><label>Receipt footer</label><textarea class="input" id="st-foot" rows="2">'+esc(S.receiptFooter)+'</textarea></div>'+
    '<div class="row-between"><div><b style="font-size:14px">Low-stock alerts</b><div class="small muted">Notify when a sale crosses a threshold</div></div>'+
      '<button class="switch" role="switch" aria-checked="'+S.lowStockAlerts+'" data-act="st-lowstock" aria-label="Low stock alerts"></button></div>'+
    '<div class="field"><label>Vendor digest time</label><select class="input" id="st-hour" style="max-width:160px">'+
      [19,20,21,22].map(h=>'<option value="'+h+'"'+(S.dailyVendorHour===h?' selected':'')+'>'+h+':00</option>').join("")+'</select></div>'+
    '<button class="btn btn-pri" data-act="st-save-receipt" style="align-self:flex-start">Save</button></div>';
  }
  root.innerHTML = shell("settings",
    '<div class="seg">'+[["business","Business"],["taxes","Taxes"],["branding","Branding"],["receipt","Receipt & alerts"]].map(t=>
      '<button class="'+(tab===t[0]?"active":"")+'" data-act="set-tab" data-arg="'+t[0]+'">'+t[1]+'</button>').join("")+'</div>'+body);
}
SG.actions["set-tab"]=t=>{ SG.sess.setTab=t; SG.saveSess(); SG.render(); };
SG.actions["st-save-business"]=()=>{ DB.storeName=document.getElementById("st-name").value.trim()||DB.storeName;
  DB.settings.address=document.getElementById("st-addr").value; DB.settings.vat=document.getElementById("st-vat").value;
  SG.logActivity("Noura Al-Fahad","Updated business information"); SG.save(); SG.toast("Business details saved"); SG.render(); };
SG.actions["st-save-tax"]=()=>{ const v=+document.getElementById("st-tax").value;
  if(!(v>=0&&v<=30)){ SG.toast("VAT must be between 0 and 30%","warn"); return; }
  DB.settings.taxRate=v; SG.logActivity("Noura Al-Fahad","Set VAT to "+v+"%"); SG.save(); SG.toast("Tax rate updated to "+v+"%"); };
SG.actions["st-logo"]=()=>SG.toast("Logo updated — refreshed across apps");
SG.actions["st-color"]=c=>{ DB.settings.brandColor=c; SG.save(); SG.toast("Accent color saved"); SG.render(); };
SG.actions["st-lowstock"]=(a,el)=>{ DB.settings.lowStockAlerts=!DB.settings.lowStockAlerts; SG.save();
  el.setAttribute("aria-checked",DB.settings.lowStockAlerts); SG.toast("Low-stock alerts "+(DB.settings.lowStockAlerts?"on":"off")); };
SG.actions["st-save-receipt"]=()=>{ DB.settings.receiptFooter=document.getElementById("st-foot").value;
  DB.settings.dailyVendorHour=+document.getElementById("st-hour").value; SG.save(); SG.toast("Receipt settings saved"); };

/* ---------- SUBSCRIPTION ---------- */
function subscription(root){
  const PLANS=[
    {id:"starter",name:"Starter",price:99,feats:["1 branch","2 employees","300 products","Basic reports"]},
    {id:"business",name:"Business",price:299,feats:["3 branches","10 employees","3,000 products","Advanced reports","Multi-brand vendors"]},
    {id:"premium",name:"Premium",price:799,feats:["Unlimited branches","Unlimited employees","Unlimited products","Vendor portal + API","Loyalty & analytics"]},
    {id:"enterprise",name:"Enterprise",price:null,feats:["Custom integrations","ERP connectors","Dedicated support","SLA 99.95%"]},
  ];
  const usage=[["Branches",DB.branches.length,3],["Employees",DB.employees.length,10],["Products",DB.products.length,3000]];
  root.innerHTML = shell("subscription",
    '<div class="card card-pad"><div class="row-between wrap"><div><div class="eyebrow">Current plan</div>'+
      '<h3 style="font-size:20px">Business — '+fmt(299)+'/month</h3>'+
      '<p class="small muted">Renews '+SG.fmtDate(DB.subscription.renewsTs)+' · Visa •••• 8214</p></div>'+
      '<button class="btn btn-sec" data-act="sub-payment">Update payment method</button></div>'+
      '<div class="grid3" style="margin-top:14px">'+usage.map(u=>{
        const pct=Math.min(100,Math.round(u[1]/u[2]*100));
        return '<div><div class="row-between small" style="margin-bottom:5px"><span class="muted">'+u[0]+'</span><span class="num">'+u[1]+' / '+u[2].toLocaleString()+'</span></div>'+
        '<div class="progress"><i class="'+(pct>85?"warn":"")+'" style="width:'+pct+'%"></i></div></div>';}).join("")+'</div></div>'+
    '<div class="grid3" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">'+PLANS.map(p=>
      '<div class="plan-card'+(p.id==="business"?" current":"")+'">'+
      (p.id==="business"?'<span class="chip chip-accent" style="position:absolute;top:-11px;left:18px">Current plan</span>':'')+
      '<b style="font-size:15px">'+p.name+'</b>'+
      '<div class="price num">'+(p.price?SG.rial+" "+p.price:"Custom")+(p.price?'<span style="font-size:13px;color:var(--ink3);font-weight:500">/mo</span>':'')+'</div>'+
      '<ul>'+p.feats.map(f=>'<li>'+icon("check",14)+' '+f+'</li>').join("")+'</ul>'+
      (p.id==="business"?'<button class="btn btn-sec" disabled>Your plan</button>'
        :p.id==="enterprise"?'<button class="btn btn-sec" data-act="sub-contact">Talk to sales</button>'
        :'<button class="btn '+(p.price>299?"btn-pri":"btn-sec")+'" data-act="sub-switch" data-arg="'+p.id+'|'+p.name+'|'+p.price+'">'+(p.price>299?"Upgrade":"Downgrade")+'</button>')+'</div>').join("")+'</div>'+
    '<div class="card card-pad"><h3 style="font-size:15px;margin-bottom:6px">Invoices</h3>'+DB.subscription.invoices.map(i=>
      '<div class="listrow">'+icon("receipt",17)+'<div style="flex:1"><b style="font-size:13.5px">'+i.id+'</b><div class="small muted">'+SG.fmtDate(i.ts)+'</div></div>'+
      '<span class="num" style="font-weight:600">'+fmt(i.amount)+'</span><span class="chip chip-good">Paid</span>'+
      '<button class="btn btn-ghost btn-sm" data-act="sub-invoice" data-arg="'+i.id+'">'+icon("download",14)+' PDF</button></div>').join("")+'</div>');
}
SG.actions["sub-payment"]=()=>SG.dialog({title:"Payment method",
  body:'<div class="listrow">'+icon("card",18)+'<span style="flex:1">Visa •••• 8214</span><span class="chip chip-good">Default</span></div>'+
  '<div class="field"><label>New card number</label><input class="input num" placeholder="1234 5678 9012 3456"></div>',
  actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-ok>Save card</button>'})
  .querySelector("[data-ok]").onclick=function(){ this.closest(".overlay").remove(); SG.toast("Payment method updated"); };
SG.actions["sub-contact"]=()=>SG.toast("Request sent — our sales team will reach out today");
SG.actions["sub-invoice"]=id=>SG.toast(id+".pdf downloaded");
SG.actions["sub-switch"]=arg=>{ const [id,name,price]=arg.split("|");
  SG.confirm({title:(+price>299?"Upgrade":"Downgrade")+" to "+name+"?",
    okLabel:"Confirm — "+SG.fmt(+price)+"/mo",
    message:(+price>299?"You get the new limits immediately; we prorate the difference on today's invoice."
      :"Lower limits apply at the next renewal. You'll keep your data either way."), cb:()=>{
      DB.subscription.plan=id; SG.save();
      SG.notify("merchant","card","Plan changed to "+name, "Prorated invoice issued for this billing cycle.");
      SG.toast("You're on "+name+" now"); SG.render(); }});
};

/* ---------- NOTIFICATIONS ---------- */
function notifications(root){
  const list = DB.notifications.merchant;
  root.innerHTML = shell("notifications",
    (list.length? '<div class="col" style="max-width:640px">'+list.map(n=>
      '<div class="card row" style="padding:13px 16px;'+(n.read?'':'border-color:var(--accent)')+'">'+
      '<div class="role-ic" style="width:38px;height:38px;border-radius:10px;background:var(--surface2);color:var(--ink2);display:flex;align-items:center;justify-content:center">'+icon(n.icon,18)+'</div>'+
      '<div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(n.title)+'</div>'+
      '<div class="small muted">'+esc(n.body)+'</div><div class="small" style="color:var(--ink3)">'+SG.timeAgo(n.ts)+'</div></div></div>').join("")+'</div>'
    : SG.emptyState("bell","No notifications","Order events, low-stock alerts and billing updates land here.")));
  list.forEach(n=>n.read=true); SG.save();
}

Object.assign(SG.mpages, {inventory, labels, vendors, employees, branches, reports, insights, settings, subscription, notifications});
})();
