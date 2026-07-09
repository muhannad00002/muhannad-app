/* ============ GUIDED INVESTOR DEMO + BOOT ============ */
(()=>{
const {DB, icon, esc, fmt} = SG;

/* pick demo products at runtime (survives catalog edits) */
const byName = n => DB.products.find(p=>p.name===n) || DB.products.find(p=>p.approved&&p.active);

const STEPS = [
  {route:"#/", title:"One platform, four seats", text:"Sayr connects shoppers, cashiers, store owners, brand vendors and the platform operator on one live data core. Watch a single purchase ripple through all of them."},
  {route:"#/customer/auth", title:"Customer app — sign in", text:"Native-feeling mobile experience. Validated forms, password reset, registration — the demo account is Muhannad, a Gold-tier loyalty member.",
    pre(){ SG.sess.custAuthed=false; SG.saveSess(); }},
  {route:"#/customer/entrance", title:"Scan the entrance QR", text:"Each branch has its own door code. Scanning it loads that store's catalog, prices and stock — no app store hunting, no account linking.",
    pre(){ SG.sess.custAuthed=true; SG.saveSess(); }},
  {route:"#/customer/home", title:"The store in your hand", text:"Categories, search and live recommendations from real sales data. Every product card shows branch-level stock.",
    pre(){ DB.cart.branch="b1"; DB.cart.items=[]; DB.cart.coupon=null; DB.cart.locked=false; DB.posOrder=null; SG.save(); }},
  {route:()=>"#/customer/product/"+byName("Royal Oud Attar 12ml").id, title:"Scan a shelf label", text:"Scanning a product QR opens details instantly: price, vendor brand, live stock (“only 4 left”), and cross-sell suggestions.",
    pre(){ SG.sess.pdQty=1; SG.saveSess(); }},
  {route:"#/customer/cart", title:"Cart builds itself", text:"We just scanned three products. The customer removes the scarf, bumps the abaya to two, and applies coupon SAVE10 — totals and VAT recompute live.",
    pre(){ DB.cart.items=[]; SG.cartAdd(byName("Royal Oud Attar 12ml").id,1); SG.cartAdd(byName("Midnight Silk Abaya").id,1); SG.cartAdd(byName("Sadu Weave Scarf").id,1);
      SG.cartSetQty(byName("Sadu Weave Scarf").id,0); SG.cartSetQty(byName("Midnight Silk Abaya").id,2); SG.applyCoupon("SAVE10"); }},
  {route:"#/customer/checkout", title:"Checkout = one QR", text:"A signed, single-use code that expires in five minutes. Nothing on the phone screen is trusted for pricing — the register pulls the live cart from the server.",
    pre(){ SG.issueCheckoutToken(); }},
  {route:"#/merchant/pos", title:"Cashier side — the code is already here", text:"The moment a shopper taps Checkout, their code lights up on the register. No hardware needed beyond a camera or USB scanner."},
  {route:"#/merchant/pos", title:"Scan → cart locks", text:"Scanning locks the customer's cart against mid-payment edits and pulls every line onto the register, coupon included. The cashier can add a discount or take cash, card or Apple Pay.",
    pre(){ SG.posScanToken(); }},
  {route:()=>"#/merchant/order/"+(DB.lastOrder?DB.lastOrder.id:""), title:"Payment done — watch the ripple", text:"One tap on Apple Pay and the transaction commits atomically: order, stock, vendor feeds, loyalty, receipts. This timeline is generated from what actually just happened.",
    pre(){ const r=SG.posComplete("applepay","e3"); if(r.ok){ ["m-dash","m-orders","cust-orders","m-inv","v-home","v-sales"].forEach(k=>SG.invalidate(k)); } }},
  {route:()=>"#/customer/receipt/"+(DB.lastOrder?DB.lastOrder.id:(DB.orders[DB.orders.length-1]||{}).id), title:"Customer walks out", text:"Digital receipt with ZATCA-style QR, VAT breakdown and +loyalty points — already in their purchase history and inbox."},
  {route:"#/merchant/dashboard", title:"Dashboard already knows", text:"The sale we just made is in “Today”, the revenue curve, payment mix and top products. No refresh, no batch job — same data core.",
    pre(){ SG.invalidate("m-dash"); SG.sess.mRange=30; SG.saveSess(); }},
  {route:"#/merchant/inventory", title:"Inventory moved by itself", text:"Every unit sold was decremented at the branch and logged as a movement. The attar just crossed its threshold — that's a live low-stock alert.",
    pre(){ SG.sess.invTab="history"; SG.saveSess(); SG.invalidate("m-inv"); }},
  {route:"#/vendor/alerts", title:"The brand vendor was told instantly", text:"Dune Atelier sees the sale seconds after it happened — and every night at 21:00 a digest with units, value, remaining stock and low-stock warnings goes out by email and WhatsApp automatically."},
  {route:"#/vendor/home", title:"Vendor portal — their data only", text:"Vendors see their own products, sales and pending settlements. Never another brand's numbers. This is the multi-brand boutique feature competitors don't have.",
    pre(){ SG.invalidate("v-home"); }},
  {route:"#/merchant/products", title:"Back office built for speed", text:"Full product management: search, category filters, column sorting, pagination, bulk CSV import/export, per-product shelf QR labels."},
  {route:"#/merchant/labels", title:"QR labels at scale", text:"Select any set of products and print a label sheet. Codes are permanent — reprint after price changes without re-tagging the shelf."},
  {route:"#/merchant/reports", title:"Reports that answer questions", text:"Daily to yearly ranges, weekday patterns, category and cashier performance — all exportable. VAT collected is always one glance away.",
    pre(){ SG.invalidate("m-reports"); }},
  {route:"#/merchant/insights", title:"AI insights from live data", text:"Generated from this store's actual sales: weekend concentration, restock predictions, bundle opportunities, vendor margin analysis.",
    pre(){ SG.invalidate("m-ai"); }},
  {route:"#/merchant/subscription", title:"SaaS engine built in", text:"Four tiers from Starter to Enterprise with live usage meters and invoices. Plan limits are enforced in-product — upgrades are self-serve."},
  {route:"#/admin/overview", title:"The operator's view", text:"Platform admin sees MRR, GMV across all tenants, health metrics and support. Six stores today — the model scales horizontally.",
    pre(){ SG.invalidate("a-over"); }},
  {route:"#/admin/tenants", title:"Multi-tenant by design", text:"Each store is an isolated tenant with its own catalog, staff and billing. Creating one takes ten seconds and starts a self-onboarding trial.",
    pre(){ SG.invalidate("a-ten"); }},
  {route:"#/", title:"That's Sayr", text:"A purchase became inventory, vendor payouts, loyalty, analytics and platform revenue — automatically. Explore any seat freely; the demo data is yours to play with."},
];

SG.demo = {on:false, i:0, auto:false, timer:null};
let bar=null;

function stopAuto(){ if(SG.demo.timer){ clearTimeout(SG.demo.timer); SG.demo.timer=null; } }
function scheduleAuto(){ stopAuto(); if(SG.demo.auto && SG.demo.on){ SG.demo.timer=setTimeout(()=>stepTo(SG.demo.i+1), 5200); } }

function stepTo(i){
  stopAuto();
  if(i>=STEPS.length || i<0){ endDemo(); return; }
  SG.demo.i=i;
  const s=STEPS[i];
  try{ s.pre && s.pre(); }catch(e){}
  const route = typeof s.route==="function"? s.route() : s.route;
  if(location.hash===route) SG.render(); else location.hash=route;
  scheduleAuto();
}
function endDemo(){
  stopAuto(); SG.demo.on=false;
  if(bar){ bar.remove(); bar=null; }
  if(location.hash!=="#/") location.hash="#/"; else SG.render();
  SG.toast("Demo finished — the whole platform is yours to explore");
}
function drawBar(){
  if(!SG.demo.on) return;
  const s=STEPS[SG.demo.i];
  if(!bar){ bar=document.createElement("div"); bar.className="demo-bar"; bar.setAttribute("role","region"); bar.setAttribute("aria-label","Guided demo"); document.body.appendChild(bar); }
  bar.innerHTML =
    '<div class="step-n num">'+(SG.demo.i+1)+'</div>'+
    '<div style="flex:1;min-width:0"><h4>'+esc(s.title)+'</h4><p>'+esc(s.text)+'</p>'+
      '<div class="row" style="gap:4px;margin-top:8px">'+STEPS.map((_,j)=>'<span style="width:'+(j===SG.demo.i?18:5)+'px;height:5px;border-radius:99px;background:'+(j<=SG.demo.i?"var(--accent)":"rgba(255,255,255,.25)")+';transition:width .3s"></span>').join("")+'</div></div>'+
    '<div class="demo-actions">'+
      '<button class="btn" data-demo="prev" '+(SG.demo.i===0?"disabled":"")+' aria-label="Previous step">'+icon("chevL",15)+'</button>'+
      '<button class="btn" data-demo="auto" aria-label="'+(SG.demo.auto?"Pause":"Autoplay")+'">'+(SG.demo.auto?'❚❚':icon("play",14))+'</button>'+
      '<button class="btn pri" data-demo="next">'+(SG.demo.i===STEPS.length-1?"Finish":"Next")+' '+icon("chevR",14)+'</button>'+
      '<button class="btn" data-demo="exit" aria-label="Exit demo">'+icon("x",15)+'</button></div>';
  bar.querySelectorAll("[data-demo]").forEach(b=>b.addEventListener("click",()=>{
    const k=b.dataset.demo;
    if(k==="next") { SG.demo.auto=false; stepTo(SG.demo.i+1); }
    else if(k==="prev"){ SG.demo.auto=false; stepTo(SG.demo.i-1); }
    else if(k==="auto"){ SG.demo.auto=!SG.demo.auto; scheduleAuto(); drawBar(); }
    else endDemo();
  }));
}
SG.demoTick = ()=>{ if(SG.demo.on) drawBar(); };
SG.actions["demo-start"] = ()=>{
  SG.demo.on=true; SG.demo.auto=false;
  /* clean slate for the story */
  DB.cart={items:[],coupon:null,branch:null,locked:false}; DB.checkoutToken=null; DB.posOrder=null; SG.save();
  stepTo(0);
  drawBar();
};

/* ---- keyboard shortcuts for demo ---- */
document.addEventListener("keydown", e=>{
  if(!SG.demo.on || e.target.matches("input,textarea,select")) return;
  if(e.key==="ArrowRight"){ stepTo(SG.demo.i+1); }
  if(e.key==="ArrowLeft"){ stepTo(SG.demo.i-1); }
  if(e.key==="Escape"){ endDemo(); }
});

/* ============ BOOT ============ */
const savedTheme = SG.getTheme();
if(savedTheme) SG.applyTheme(savedTheme);
if(!location.hash) location.hash="#/";
SG.render();
})();
