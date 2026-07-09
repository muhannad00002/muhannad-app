/* ============ SAYR SIMULATED BACKEND ============
   Single source of truth. Every mutation flows through here so that a
   checkout updates inventory, vendor feeds, notifications, loyalty,
   reports and dashboards in one transaction. */
"use strict";
const SG = window.SG = {};

/* ---- deterministic rng for seed data ---- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const uid = (p="id") => p + "_" + Math.random().toString(36).slice(2,9);
const DAY = 864e5;
const dayKey = d => new Date(d).toISOString().slice(0,10);
/* Official Omani rial symbol (Central Bank of Oman, 2025), inlined so it
   inherits text color. Standalone asset: ../assets/omani-rial-symbol.svg */
const RIAL = '<svg class="rial" role="img" aria-label="OMR" viewBox="1898.6 336.7 355 232.8" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M2044.8,451.3c-6.5-11.2-11.8-23.3-14.1-36.1-1.6-9-1.4-18.5.3-27.7,6.8-5,14.8-8.3,23.6-9.5,8.7-1.2,17.1-.4,25.2,3,8.5,3.5,16,9.1,22.8,15.1,7.6,6.8,20.8,22.4,20.8,22.4l23.5-40.7c-8.8-11-18.4-21.6-29.9-29.8-5.7-4.1-12-7.6-18.8-9.6-6.4-1.9-12.9-2.1-19.4-1.3-11.4,1.4-22.2,6.3-30.2,14.5-6.5,6.6-32.9,50-37.4,63.4-3.7,11-5.6,23.1-4.7,34.6,0,.5,0,1,.2,1.5h-39.8l-23.5,40.7h77.9c7.8,13.5,17.6,26,28.7,37h-127.9l-23.5,40.7h286.7l23.5-40.7h-62.5c-26.1-3.5-50.1-19.2-68.9-37h152.7l23.5-40.7h-208.7v.2Z"/></svg>';
/* OMR is subdivided into 1000 baisa → 3 decimals. fmt embeds the symbol and
   is for innerHTML contexts only; fmtT is plain text for strings that get
   escaped or stored (notifications, activity log, CSV). */
const money = n => (Math.round(n*1000)/1000).toLocaleString("en-US",{minimumFractionDigits:3,maximumFractionDigits:3});
const fmt = n => RIAL + " " + money(n);
const fmtT = n => "OMR " + money(n);
const fmtK = n => n>=1e6 ? RIAL+" "+(n/1e6).toFixed(2)+"M" : n>=1e4 ? RIAL+" "+(n/1e3).toFixed(1)+"k" : fmt(n);
const timeAgo = ts => {const s=(Date.now()-ts)/1e3; if(s<60)return"just now"; if(s<3600)return Math.floor(s/60)+"m ago"; if(s<86400)return Math.floor(s/3600)+"h ago"; return Math.floor(s/86400)+"d ago";};
const fmtDate = ts => new Date(ts).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
const fmtTime = ts => new Date(ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
Object.assign(SG,{uid,fmt,fmtT,fmtK,rial:RIAL,timeAgo,fmtDate,fmtTime,esc,dayKey});

/* ---- seed ---- */
function seedDB(){
  const rnd = mulberry32(20260709);
  const pick = a => a[Math.floor(rnd()*a.length)];
  const now = Date.now();

  const vendors = [
    {id:"v1", name:"Dune Atelier",   contact:"Layla Hassan",  email:"layla@duneatelier.om",  whatsapp:"+968 9111 2233", commission:18, status:"active",  joined:now-210*DAY, channels:{email:true,whatsapp:true,portal:true}},
    {id:"v2", name:"Oud & Amber",    contact:"Faisal Rahim",  email:"faisal@oudamber.com",   whatsapp:"+968 9244 8899", commission:22, status:"active",  joined:now-150*DAY, channels:{email:true,whatsapp:false,portal:true}},
    {id:"v3", name:"Mirage Studio",  contact:"Sara Aldawsari",email:"sara@miragestudio.co",  whatsapp:"+968 9477 1122", commission:15, status:"active",  joined:now-95*DAY,  channels:{email:true,whatsapp:true,portal:true}},
    {id:"v4", name:"Cedar House",    contact:"Omar Khalidi",  email:"omar@cedarhouse.me",    whatsapp:"+968 9633 5566", commission:20, status:"pending", joined:now-6*DAY,   channels:{email:true,whatsapp:false,portal:false}},
  ];
  const cats = ["Abayas","Fragrance","Accessories","Home","Kids"];
  const P = (name,cat,vendorId,price,emoji,hueA,hueB,s1,s2,cost) => ({
    id:uid("p"), name, cat, vendorId, price, cost:cost??Math.round(price*.55), emoji,
    grad:[hueA,hueB], sku:"", barcode:"629"+String(Math.floor(rnd()*1e10)).padStart(10,"0"),
    stock:{b1:s1,b2:s2}, lowAt:8, active:true, approved:vendorId!=="v4",
    created:now-Math.floor(rnd()*200)*DAY
  });
  const products = [
    P("Midnight Silk Abaya","Abayas","v1",489,"🥻",158,190,14,9),
    P("Sand Dune Kimono","Abayas","v1",349,"🧥",35,20,22,11),
    P("Pearl Trim Abaya","Abayas","v1",559,"✨",210,240,6,4),
    P("Amber Musk Parfum 50ml","Fragrance","v2",320,"🫙",28,45,31,18),
    P("Royal Oud Attar 12ml","Fragrance","v2",480,"🪵",22,10,4,7),
    P("Rose Taif Mist","Fragrance","v2",180,"🌹",340,320,44,25),
    P("Saffron Candle 220g","Home","v2",95,"🕯️",40,25,58,30),
    P("Hammered Brass Cuff","Accessories","v3",145,"⚜️",45,38,26,14),
    P("Palm Leaf Clutch","Accessories","v3",230,"👝",90,120,12,6),
    P("Turquoise Bead Necklace","Accessories","v3",195,"📿",180,200,17,9),
    P("Sadu Weave Scarf","Accessories","v3",120,"🧣",0,25,38,20),
    P("Ceramic Dallah Set","Home","v3",275,"🫖",25,15,9,5),
    P("Linen Cushion — Palm","Home","v1",85,"🌴",140,160,41,22),
    P("Mini Abaya (Girls 6-8)","Kids","v1",210,"🎀",320,340,13,8),
    P("Kids Oud Splash","Kids","v2",90,"🧴",200,220,27,15),
    P("Gift Wrap Service","Accessories",null,25,"🎁",150,170,999,999),
  ];
  products.forEach((p,i)=>p.sku = "NB-"+p.cat.slice(0,2).toUpperCase()+"-"+String(101+i));

  const branches = [
    {id:"b1", name:"Muscat — Mall of Oman", address:"Mall of Oman, Muscat", opened:now-400*DAY},
    {id:"b2", name:"Salalah — Grand Mall", address:"Salalah Grand Mall, Salalah", opened:now-160*DAY},
  ];
  const employees = [
    {id:"e1", name:"Noura Al-Fahad", role:"owner",   branch:"b1", email:"noura@norab.om",  status:"active", pin:"1111"},
    {id:"e2", name:"Ahmed Siddiqui", role:"manager", branch:"b1", email:"ahmed@norab.om",  status:"active", pin:"2222"},
    {id:"e3", name:"Reem Otaibi",    role:"cashier", branch:"b1", email:"reem@norab.om",   status:"active", pin:"3333"},
    {id:"e4", name:"Yousef Hariri",  role:"cashier", branch:"b1", email:"yousef@norab.om", status:"active", pin:"4444"},
    {id:"e5", name:"Dana Qahtani",   role:"cashier", branch:"b2", email:"dana@norab.om",   status:"invited", pin:"5555"},
  ];
  const customerNames = ["Muhannad A.","Hala M.","Tariq B.","Jood S.","Lina K.","Fahad R.","Maya T.","Ziyad N.","Aisha P.","Salem D."];

  /* order history: ~120 days, weekend-weighted, growing trend */
  const orders = [];
  const sellable = products.filter(p=>p.approved);
  for(let d=119; d>=0; d--){
    const date = new Date(now - d*DAY);
    const dow = date.getDay();
    const weekend = (dow===5||dow===6) ? 1.7 : 1;
    const trend = 1 + (119-d)/119*.9;
    const n = Math.max(1, Math.round((3+rnd()*4)*weekend*trend));
    for(let i=0;i<n;i++){
      const itemCount = 1+Math.floor(rnd()*3.2);
      const items=[]; const used=new Set();
      for(let k=0;k<itemCount;k++){
        const p = pick(sellable); if(used.has(p.id)) continue; used.add(p.id);
        items.push({productId:p.id,name:p.name,sku:p.sku,price:p.price,qty:1+(rnd()<.25?1:0),tax:5,vendorId:p.vendorId,emoji:p.emoji,grad:p.grad});
      }
      const sub = items.reduce((s,it)=>s+it.price*it.qty,0);
      const disc = rnd()<.12 ? Math.round(sub*.1) : 0;
      const tax = (sub-disc)*.05;
      const ts = date.getTime() - Math.floor(rnd()*10*36e5) - 2*36e5;
      orders.push({
        id:"SO-"+String(9000+orders.length), ts, branch:rnd()<.62?"b1":"b2",
        customer:pick(customerNames), cashierId:pick(["e3","e4","e5"]),
        items, sub, disc, coupon:disc?"SAVE10":null, tax, total:sub-disc+tax,
        method:pick(["card","card","applepay","cash"]), status:"completed"
      });
    }
  }
  orders.sort((a,b)=>a.ts-b.ts);

  const movements = [
    {id:uid("m"), ts:now-3*DAY, productId:products[4].id, branch:"b1", delta:+20, kind:"restock", by:"Ahmed Siddiqui", note:"PO #481 received"},
    {id:uid("m"), ts:now-2*DAY, productId:products[2].id, branch:"b1", delta:-2,  kind:"damage",  by:"Reem Otaibi",   note:"Display damage"},
    {id:uid("m"), ts:now-1*DAY, productId:products[7].id, branch:"b2", delta:+10, kind:"transfer",by:"Ahmed Siddiqui",note:"From Mall of Oman"},
  ];

  const tickets = [
    {id:"TK-1042", tenant:"Nora Boutique", subject:"WhatsApp summary not delivered to one vendor", priority:"high",   status:"open",       ts:now-4*36e5, assignee:"Platform Support"},
    {id:"TK-1041", tenant:"Sultan Perfumes", subject:"Bulk import: SKU column mapping", priority:"medium", status:"pending",    ts:now-26*36e5, assignee:"Onboarding"},
    {id:"TK-1038", tenant:"GreenGrocer Oman", subject:"Request: Arabic receipt template", priority:"low",    status:"resolved",   ts:now-3*DAY, assignee:"Product"},
    {id:"TK-1035", tenant:"Blossom Kids", subject:"Card terminal pairing at branch 2", priority:"high",  status:"resolved",   ts:now-5*DAY, assignee:"Payments"},
  ];
  const tenants = [
    {id:"t1", name:"Nora Boutique",   plan:"business",  mrr:299, branches:2, users:5, products:16, gmv30:184000, created:now-400*DAY, status:"active", health:96},
    {id:"t2", name:"Sultan Perfumes", plan:"premium",   mrr:799, branches:4, users:14, products:640, gmv30:1220000, created:now-310*DAY, status:"active", health:92},
    {id:"t3", name:"GreenGrocer Oman", plan:"business",  mrr:299, branches:3, users:9, products:1900, gmv30:760000, created:now-230*DAY, status:"active", health:88},
    {id:"t4", name:"Blossom Kids",    plan:"starter",   mrr:99,  branches:1, users:2, products:210, gmv30:96000,  created:now-120*DAY, status:"active", health:74},
    {id:"t5", name:"Coastline Sports",plan:"premium",   mrr:799, branches:6, users:22, products:2900, gmv30:2100000, created:now-80*DAY, status:"active", health:97},
    {id:"t6", name:"Al Waha Books",   plan:"starter",   mrr:99,  branches:1, users:3, products:410, gmv30:41000,  created:now-30*DAY, status:"trial",  health:61},
  ];

  return {
    v:7, storeName:"Nora Boutique", storeLogo:"NB",
    settings:{taxRate:5, currency:"OMR", receiptFooter:"Thank you for shopping with us ♥", brandColor:"#0E8A6D",
      address:"Mall of Oman, Muscat 138", vat:"OM1100198765", lowStockAlerts:true, dailyVendorHour:21},
    branches, vendors, products, employees, orders, movements, tickets, tenants,
    coupons:[{code:"SAVE10",pct:10,active:true},{code:"WELCOME15",pct:15,active:true}],
    customer:{id:"cu1", name:"Muhannad", email:"muhannad00002@gmail.com", points:340, tier:"Gold", joined:now-90*DAY},
    cart:{items:[], coupon:null, branch:null, locked:false},
    checkoutToken:null,
    posOrder:null,
    notifications:{customer:[
      {id:uid("n"),ts:now-2*DAY,icon:"gift",title:"You reached Gold tier",body:"Enjoy 1.5× points on every purchase.",read:true},
      {id:uid("n"),ts:now-6*DAY,icon:"tag",title:"Weekend offer at Nora Boutique",body:"Use SAVE10 for 10% off your basket.",read:true},
    ], merchant:[
      {id:uid("n"),ts:now-5*36e5,icon:"alert",title:"Low stock: Royal Oud Attar 12ml",body:"4 left at Muscat — Mall of Oman (threshold 8).",read:false},
      {id:uid("n"),ts:now-26*36e5,icon:"users",title:"Vendor daily summaries sent",body:"3 vendors received yesterday's sales digest.",read:true},
    ], vendor:[
      {id:uid("n"),ts:now-26*36e5,icon:"chart",title:"Daily summary — yesterday",body:"9 units sold · OMR 2,140 gross · 1 low-stock item.",read:false},
    ]},
    activity:[
      {ts:now-3*36e5, by:"Reem Otaibi", act:"Completed order SO-"+String(9000+orders.length-1)+" (POS)"},
      {ts:now-5*36e5, by:"Ahmed Siddiqui", act:"Adjusted stock: Royal Oud Attar +20 (restock)"},
      {ts:now-30*36e5, by:"Noura Al-Fahad", act:"Updated receipt footer text"},
      {ts:now-2*DAY, by:"Noura Al-Fahad", act:"Invited cashier Dana Qahtani (Salalah)"},
    ],
    settlements:[
      {id:"ST-204", vendorId:"v1", period:"June 2026", gross:38420, commission:6916, net:31504, status:"paid",   paidTs:now-8*DAY},
      {id:"ST-205", vendorId:"v2", period:"June 2026", gross:45110, commission:9924, net:35186, status:"paid",   paidTs:now-8*DAY},
      {id:"ST-206", vendorId:"v3", period:"June 2026", gross:21050, commission:3158, net:17892, status:"paid",   paidTs:now-7*DAY},
      {id:"ST-207", vendorId:"v1", period:"July 2026 (MTD)", gross:9840, commission:1771, net:8069, status:"pending"},
      {id:"ST-208", vendorId:"v2", period:"July 2026 (MTD)", gross:11930, commission:2625, net:9305, status:"pending"},
      {id:"ST-209", vendorId:"v3", period:"July 2026 (MTD)", gross:5410, commission:812, net:4598, status:"pending"},
    ],
    subscription:{plan:"business", renewsTs:now+19*DAY, invoices:[
      {id:"INV-2026-07", ts:now-11*DAY, amount:299, status:"paid"},
      {id:"INV-2026-06", ts:now-41*DAY, amount:299, status:"paid"},
      {id:"INV-2026-05", ts:now-72*DAY, amount:299, status:"paid"},
    ]},
    demoSeen:false
  };
}

/* ---- persistence ---- */
const DB_KEY = "sayr_db_v7";
let DB;
try{ const raw = localStorage.getItem(DB_KEY); DB = raw ? JSON.parse(raw) : null; if(!DB || DB.v!==7) DB = null; }catch(e){ DB = null; }
if(!DB) DB = seedDB();
let saveT = null;
function save(){ clearTimeout(saveT); saveT = setTimeout(()=>{ try{localStorage.setItem(DB_KEY, JSON.stringify(DB));}catch(e){} }, 250); }
function resetDB(){ try{localStorage.removeItem(DB_KEY);}catch(e){} location.hash=""; location.reload(); }
SG.DB = DB; SG.save = save; SG.resetDB = resetDB;

/* ---- lookups ---- */
const productById = id => DB.products.find(p=>p.id===id);
const vendorById  = id => DB.vendors.find(v=>v.id===id);
const branchById  = id => DB.branches.find(b=>b.id===id);
const empById     = id => DB.employees.find(e=>e.id===id);
SG.productById=productById; SG.vendorById=vendorById; SG.branchById=branchById; SG.empById=empById;

/* ---- aggregations ---- */
function ordersSince(days, branch){
  const cut = Date.now()-days*DAY;
  return DB.orders.filter(o=>o.ts>=cut && (!branch||o.branch===branch));
}
function sumSales(os){ return os.reduce((s,o)=>s+o.total,0); }
function seriesDaily(days, branch){
  const map = {};
  for(let d=days-1; d>=0; d--) map[dayKey(Date.now()-d*DAY)] = 0;
  ordersSince(days,branch).forEach(o=>{ const k=dayKey(o.ts); if(k in map) map[k]+=o.total; });
  return Object.entries(map).map(([date,v])=>({date,v:Math.round(v)}));
}
function topProducts(days, n=5, vendorId){
  const agg={};
  ordersSince(days).forEach(o=>o.items.forEach(it=>{
    if(vendorId && it.vendorId!==vendorId) return;
    agg[it.productId] = agg[it.productId]||{name:it.name,units:0,revenue:0,emoji:it.emoji,grad:it.grad,productId:it.productId};
    agg[it.productId].units+=it.qty; agg[it.productId].revenue+=it.price*it.qty;
  }));
  return Object.values(agg).sort((a,b)=>b.revenue-a.revenue).slice(0,n);
}
function lowStockList(){
  return DB.products.filter(p=>p.approved&&p.active&&p.id!=="gift").flatMap(p=>
    DB.branches.filter(b=>p.stock[b.id]!==undefined && p.stock[b.id]<=p.lowAt && p.stock[b.id]<900)
      .map(b=>({p,branch:b,qty:p.stock[b.id]}))
  ).sort((a,b)=>a.qty-b.qty);
}
function vendorAgg(vendorId, days){
  const os = ordersSince(days);
  let units=0, gross=0; const perDay={};
  for(let d=days-1;d>=0;d--) perDay[dayKey(Date.now()-d*DAY)]=0;
  os.forEach(o=>o.items.forEach(it=>{ if(it.vendorId===vendorId){ units+=it.qty; gross+=it.price*it.qty; const k=dayKey(o.ts); if(k in perDay) perDay[k]+=it.price*it.qty; }}));
  return {units, gross, series:Object.entries(perDay).map(([date,v])=>({date,v:Math.round(v)}))};
}
function deltaPct(days, branch){
  const cur = sumSales(ordersSince(days,branch));
  const prevOs = DB.orders.filter(o=>o.ts>=Date.now()-2*days*DAY && o.ts<Date.now()-days*DAY && (!branch||o.branch===branch));
  const prev = sumSales(prevOs);
  if(!prev) return null;
  return Math.round((cur-prev)/prev*100);
}
SG.ordersSince=ordersSince; SG.sumSales=sumSales; SG.seriesDaily=seriesDaily;
SG.topProducts=topProducts; SG.lowStockList=lowStockList; SG.vendorAgg=vendorAgg; SG.deltaPct=deltaPct;

/* ---- notifications ---- */
function notify(audience, icon, title, body){
  DB.notifications[audience].unshift({id:uid("n"), ts:Date.now(), icon, title, body, read:false});
  DB.notifications[audience] = DB.notifications[audience].slice(0,40);
  save();
  if(SG.onNotify) SG.onNotify(audience,title);
}
function logActivity(by, act){ DB.activity.unshift({ts:Date.now(), by, act}); DB.activity=DB.activity.slice(0,60); save(); }
SG.notify=notify; SG.logActivity=logActivity;

/* ---- cart & checkout transaction ---- */
function cartAdd(productId, qty=1){
  if(DB.cart.locked) return {ok:false, err:"Cart is locked while the cashier completes your checkout."};
  const p = productById(productId);
  if(!p) return {ok:false, err:"Product not found."};
  const branch = DB.cart.branch || "b1";
  const line = DB.cart.items.find(i=>i.productId===productId);
  const inCart = line? line.qty : 0;
  if(p.stock[branch]!==undefined && p.stock[branch] < inCart+qty) return {ok:false, err:"Only "+p.stock[branch]+" in stock at this branch."};
  if(line) line.qty+=qty; else DB.cart.items.push({productId, qty});
  save(); return {ok:true, p};
}
function cartSetQty(productId, qty){
  if(DB.cart.locked) return {ok:false};
  const i = DB.cart.items.findIndex(x=>x.productId===productId);
  if(i<0) return {ok:false};
  if(qty<=0) DB.cart.items.splice(i,1); else {
    const p=productById(productId); const branch=DB.cart.branch||"b1";
    if(p.stock[branch]!==undefined && qty>p.stock[branch]) return {ok:false, err:"Only "+p.stock[branch]+" in stock."};
    DB.cart.items[i].qty=qty;
  }
  save(); return {ok:true};
}
function cartTotals(cart){
  cart = cart||DB.cart;
  const lines = cart.items.map(i=>({...i, p:productById(i.productId)})).filter(l=>l.p);
  const sub = lines.reduce((s,l)=>s+l.p.price*l.qty,0);
  const coupon = cart.coupon ? DB.coupons.find(c=>c.code===cart.coupon&&c.active) : null;
  const extraDisc = cart.posDisc||0;
  const disc = (coupon? sub*coupon.pct/100 : 0) + extraDisc;
  const tax = Math.max(0,(sub-disc))*DB.settings.taxRate/100;
  return {lines, sub, disc, tax, total:Math.max(0,sub-disc)+tax, coupon};
}
function applyCoupon(code){
  const c = DB.coupons.find(c=>c.code===code.toUpperCase()&&c.active);
  if(!c) return {ok:false, err:"That code isn't valid or has expired."};
  DB.cart.coupon = c.code; save(); return {ok:true, c};
}
function issueCheckoutToken(){
  const t = {token:"CHK-"+Math.random().toString(36).slice(2,8).toUpperCase(), issued:Date.now(), ttl:5*60e3, cartSnapshot:null};
  DB.checkoutToken = t; DB.cart.locked = false; save(); return t;
}
function posScanToken(){
  const t = DB.checkoutToken;
  if(!t) return {ok:false, err:"No active checkout QR. Ask the customer to open their checkout code."};
  if(Date.now()-t.issued>t.ttl) return {ok:false, err:"Checkout code expired. Ask the customer to regenerate it."};
  if(!DB.cart.items.length) return {ok:false, err:"The customer's cart is empty."};
  DB.cart.locked = true;
  DB.posOrder = {token:t.token, scannedTs:Date.now(), posDisc:0};
  save(); return {ok:true};
}
function posComplete(method, cashierId){
  if(!DB.posOrder) return {ok:false, err:"No checkout in progress."};
  const cash = empById(cashierId)||DB.employees[2];
  const t = cartTotals({...DB.cart, posDisc:DB.posOrder.posDisc});
  if(!t.lines.length) return {ok:false, err:"Cart is empty."};
  const branch = DB.cart.branch||"b1";
  /* stock check then atomic-ish decrement */
  for(const l of t.lines){
    if(l.p.stock[branch]!==undefined && l.p.stock[branch]<l.qty) return {ok:false, err:"Insufficient stock for "+l.p.name+"."};
  }
  const order = {
    id:"SO-"+String(9000+DB.orders.length), ts:Date.now(), branch,
    customer:DB.customer.name, cashierId:cash.id,
    items:t.lines.map(l=>({productId:l.p.id,name:l.p.name,sku:l.p.sku,price:l.p.price,qty:l.qty,tax:DB.settings.taxRate,vendorId:l.p.vendorId,emoji:l.p.emoji,grad:l.p.grad})),
    sub:t.sub, disc:Math.round(t.disc*100)/100, coupon:DB.cart.coupon, posDisc:DB.posOrder.posDisc||0,
    tax:Math.round(t.tax*100)/100, total:Math.round(t.total*100)/100, method, status:"completed", live:true
  };
  const touchedVendors = new Set();
  t.lines.forEach(l=>{
    if(l.p.stock[branch]!==undefined && l.p.stock[branch]<900){
      l.p.stock[branch]-=l.qty;
      DB.movements.unshift({id:uid("m"),ts:Date.now(),productId:l.p.id,branch,delta:-l.qty,kind:"sale",by:cash.name,note:order.id});
      if(l.p.stock[branch]<=l.p.lowAt && DB.settings.lowStockAlerts)
        notify("merchant","alert","Low stock: "+l.p.name, l.p.stock[branch]+" left at "+branchById(branch).name+" (threshold "+l.p.lowAt+").");
    }
    if(l.p.vendorId) touchedVendors.add(l.p.vendorId);
  });
  DB.orders.push(order);
  const points = Math.round(order.total/10 * 1.5);
  DB.customer.points += points;
  touchedVendors.forEach(vid=>{
    const v=vendorById(vid); if(!v) return;
    const sold = order.items.filter(i=>i.vendorId===vid);
    notify("vendor","cart","New sale — "+sold.reduce((s,i)=>s+i.qty,0)+" unit(s)",
      sold.map(i=>i.qty+"× "+i.name).join(", ")+" · "+fmtT(sold.reduce((s,i)=>s+i.price*i.qty,0))+" gross.");
  });
  notify("customer","receipt","Receipt — "+order.id, fmtT(order.total)+" at "+DB.storeName+". +"+points+" loyalty points.");
  notify("merchant","cart","Order "+order.id+" completed", fmtT(order.total)+" · "+order.items.length+" item(s) · "+cash.name+" · "+(method==="applepay"?"Apple Pay":method));
  logActivity(cash.name, "Completed order "+order.id+" ("+fmtT(order.total)+")");
  DB.lastOrder = order;
  DB.cart = {items:[], coupon:null, branch:DB.cart.branch, locked:false};
  DB.checkoutToken = null; DB.posOrder = null;
  save();
  if(SG.onOrder) SG.onOrder(order);
  return {ok:true, order, points};
}
function posCancel(){ DB.cart.locked=false; DB.posOrder=null; save(); }
SG.cartAdd=cartAdd; SG.cartSetQty=cartSetQty; SG.cartTotals=cartTotals; SG.applyCoupon=applyCoupon;
SG.issueCheckoutToken=issueCheckoutToken; SG.posScanToken=posScanToken; SG.posComplete=posComplete; SG.posCancel=posCancel;

/* ---- inventory / product mutations ---- */
function adjustStock(productId, branch, delta, kind, note, by){
  const p=productById(productId); if(!p) return;
  p.stock[branch]=(p.stock[branch]||0)+delta;
  DB.movements.unshift({id:uid("m"),ts:Date.now(),productId,branch,delta,kind,by,note});
  logActivity(by, (delta>0?"Added ":"Removed ")+Math.abs(delta)+" × "+p.name+" ("+kind+")");
  save();
}
function upsertProduct(data){
  if(data.id){ const p=productById(data.id); Object.assign(p,data); logActivity("Noura Al-Fahad","Updated product "+p.name); save(); return p; }
  const rnd=Math.random;
  const p={id:uid("p"), name:data.name, cat:data.cat, vendorId:data.vendorId||null, price:+data.price, cost:Math.round(+data.price*.55),
    emoji:data.emoji||"🛍️", grad:[Math.floor(rnd()*360),Math.floor(rnd()*360)],
    sku:data.sku||("NB-"+data.cat.slice(0,2).toUpperCase()+"-"+String(100+DB.products.length+1)),
    barcode:"629"+String(Math.floor(rnd()*1e10)).padStart(10,"0"),
    stock:{b1:+data.stockB1||0,b2:+data.stockB2||0}, lowAt:8, active:true, approved:true, created:Date.now()};
  DB.products.push(p); logActivity("Noura Al-Fahad","Created product "+p.name); save(); return p;
}
function deleteProduct(id){ const i=DB.products.findIndex(p=>p.id===id); if(i>=0){ logActivity("Noura Al-Fahad","Deleted product "+DB.products[i].name); DB.products.splice(i,1); save(); } }
SG.adjustStock=adjustStock; SG.upsertProduct=upsertProduct; SG.deleteProduct=deleteProduct;

/* ---- vendor daily summary generator ---- */
function vendorDailySummary(vendorId){
  const v = vendorById(vendorId);
  const today = ordersSince(1);
  const per = {};
  today.forEach(o=>o.items.forEach(it=>{ if(it.vendorId===vendorId){ per[it.productId]=per[it.productId]||{name:it.name,units:0,value:0}; per[it.productId].units+=it.qty; per[it.productId].value+=it.price*it.qty; }}));
  const rows = Object.entries(per).map(([pid,r])=>{ const p=productById(pid); return {...r, remaining:p? (p.stock.b1||0)+(p.stock.b2||0) : 0, low:p? ((p.stock.b1||0)+(p.stock.b2||0))<=p.lowAt : false}; });
  const own = DB.products.filter(p=>p.vendorId===vendorId);
  const lows = own.filter(p=>((p.stock.b1||0)+(p.stock.b2||0))<=p.lowAt);
  const outs = own.filter(p=>((p.stock.b1||0)+(p.stock.b2||0))===0);
  const gross = rows.reduce((s,r)=>s+r.value,0);
  const pending = DB.settlements.find(s=>s.vendorId===vendorId&&s.status==="pending");
  return {v, rows, gross, lows, outs, pending};
}
SG.vendorDailySummary = vendorDailySummary;

/* ---- CSV export helper ---- */
function downloadCSV(filename, rows){
  const csv = rows.map(r=>r.map(c=>{ c=String(c??""); return /[",\n]/.test(c) ? '"'+c.replace(/"/g,'""')+'"' : c; }).join(",")).join("\n");
  const a=document.createElement("a");
  a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);
  a.download=filename; document.body.appendChild(a); a.click(); a.remove();
}
SG.downloadCSV = downloadCSV;
