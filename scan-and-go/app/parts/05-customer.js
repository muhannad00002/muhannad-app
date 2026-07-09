/* ============ CUSTOMER APP ============ */
(()=>{
const {DB, icon, esc, fmt, pimg} = SG;

const tabs = [
  {id:"home", ic:"home", label:"Shop"},
  {id:"scan", ic:"scan", label:"Scan"},
  {id:"cart", ic:"cart", label:"Cart"},
  {id:"orders", ic:"receipt", label:"Orders"},
  {id:"profile", ic:"user", label:"Profile"},
];
const cartCount = ()=> DB.cart.items.reduce((s,i)=>s+i.qty,0);

function frame(page, inner, {tabbar=true, header=""}={}) {
  const badge = cartCount();
  return SG.offlineBanner()+
  '<div class="phone-stage"><div class="stage-side">'+SG.themeBtn()+
    '<button class="iconbtn" data-nav="#/" aria-label="Back to launcher" title="Back to launcher">'+icon("grid",18)+'</button>'+
    '<button class="iconbtn" data-act="'+(SG.offline.forced?'go-online':'go-offline')+'" aria-label="Toggle offline simulation" title="Simulate offline">'+icon("wifiOff",18)+'</button>'+
  '</div>'+
  '<div class="phone"><div class="phone-screen" id="screen">'+header+
    '<div class="screen-body screen-enter">'+inner+'</div></div>'+
  (tabbar?'<nav class="tabbar" aria-label="Main">'+tabs.map(t=>
    '<button class="tab'+(t.id===page?' active':'')+'" data-nav="#/customer/'+t.id+'" aria-label="'+t.label+'">'+
    icon(t.ic,21)+'<span>'+t.label+'</span>'+
    (t.id==="cart"&&badge?'<span class="badge num">'+badge+'</span>':'')+'</button>').join("")+'</nav>':'')+
  '</div></div>';
}
const head = (title, extra)=>'<div class="phone-header"><h2>'+title+'</h2>'+(extra||"")+'</div>';
const backHead = (title, to)=>'<div class="phone-header"><button class="iconbtn" data-nav="'+to+'" aria-label="Back">'+icon("chevL",19)+'</button><h2>'+title+'</h2></div>';

function guard(r){
  if(!SG.sess.custAuthed && !["splash","auth"].includes(r.page)) { SG.go("#/customer/auth"); return true; }
  if(SG.sess.custAuthed && !DB.cart.branch && !["splash","auth","entrance","profile","orders","notifications","receipt"].includes(r.page)){ SG.go("#/customer/entrance"); return true; }
  return false;
}

SG.apps.customer = (root, r)=>{
  document.title = "Sayr — Shop";
  if(guard(r)) return;
  const pages = {splash, auth, entrance, home, scan, product, cart, coupon:cart, checkout, pay, receipt, orders, profile, notifications};
  (pages[r.page]||home)(root, r);
};

/* ---- splash ---- */
function splash(root){
  root.innerHTML = frame("", '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;min-height:420px">'+
    '<div class="logo-mark" style="width:76px;height:76px;border-radius:24px;animation:screenIn .5s var(--ease)">'+icon("scan",38)+'</div>'+
    '<h2 style="font-size:30px;letter-spacing:-.02em">Sayr</h2>'+
    '<p class="muted" style="text-align:center">Scan the shelf.<br>Skip the line.</p>'+
    '<div class="skel" style="width:120px;height:5px;border-radius:99px;margin-top:16px"></div></div>', {tabbar:false});
  const t = setTimeout(()=> SG.go(SG.sess.custAuthed ? (DB.cart.branch?"#/customer/home":"#/customer/entrance") : "#/customer/auth"), 1300);
  SG.onCleanup(()=>clearTimeout(t));
}

/* ---- auth ---- */
function auth(root){
  root.innerHTML = frame("", '<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:18px;min-height:420px">'+
    '<div class="logo-mark" style="width:52px;height:52px;border-radius:16px">'+icon("scan",26)+'</div>'+
    '<div><h2 style="font-size:26px;letter-spacing:-.02em">Welcome back</h2>'+
    '<p class="muted">Sign in to start shopping with your phone.</p></div>'+
    '<form id="authform" class="col" novalidate>'+
      '<div class="field" id="f-email"><label for="email">Email</label>'+
        '<input class="input" id="email" type="email" autocomplete="email" placeholder="you@example.com" value="'+esc(DB.customer.email)+'">'+
        '<span class="err">Enter a valid email address.</span></div>'+
      '<div class="field" id="f-pass"><label for="pass">Password</label>'+
        '<input class="input" id="pass" type="password" autocomplete="current-password" placeholder="••••••••">'+
        '<span class="err">Password must be at least 6 characters.</span></div>'+
      '<button class="btn btn-pri btn-lg btn-block" type="submit">Sign in</button>'+
      '<button class="btn btn-ghost btn-block" type="button" data-act="cust-forgot">Forgot password?</button>'+
    '</form>'+
    '<p class="small muted" style="text-align:center">New here? <a href="#" data-act="cust-register">Create an account</a></p></div>', {tabbar:false});
  const form = root.querySelector("#authform");
  form.addEventListener("submit", e=>{
    e.preventDefault();
    const email = form.querySelector("#email"), pass = form.querySelector("#pass");
    let ok = true;
    root.querySelector("#f-email").classList.toggle("show-err", !(ok = /.+@.+\..+/.test(email.value)) ); email.classList.toggle("invalid",!ok);
    let ok2 = pass.value.length>=6 || pass.value.length===0; /* empty = demo shortcut */
    root.querySelector("#f-pass").classList.toggle("show-err", !ok2); pass.classList.toggle("invalid",!ok2);
    if(!ok||!ok2) return;
    const btn = form.querySelector("[type=submit]");
    btn.disabled = true; btn.textContent = "Signing in…";
    setTimeout(()=>{ SG.sess.custAuthed = true; SG.saveSess(); SG.toast("Welcome back, "+DB.customer.name+"!");
      SG.go(DB.cart.branch?"#/customer/home":"#/customer/entrance"); }, 600);
  });
}
SG.actions["cust-forgot"] = ()=> SG.dialog({title:"Reset password",
  body:'<div class="field"><label>Email</label><input class="input" id="rp-email" type="email" value="'+esc(DB.customer.email)+'"></div><p class="small muted">We\'ll send a reset link if this address has an account.</p>',
  actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-ok>Send reset link</button>'})
  .querySelector("[data-ok]").onclick = function(){ this.closest(".overlay").remove(); SG.toast("Reset link sent — check your inbox"); };
SG.actions["cust-register"] = ()=> SG.dialog({title:"Create account",
  body:'<div class="field"><label>Full name</label><input class="input" id="rg-name" placeholder="Your name"></div>'+
       '<div class="field"><label>Email</label><input class="input" id="rg-email" type="email" placeholder="you@example.com"></div>'+
       '<p class="small muted">For this demo you\'ll continue as '+esc(DB.customer.name)+' — the seeded account with purchase history and Gold-tier loyalty.</p>',
  actions:'<button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-pri" data-ok>Create account</button>'})
  .querySelector("[data-ok]").onclick = function(){ this.closest(".overlay").remove(); SG.sess.custAuthed=true; SG.saveSess(); SG.toast("Account ready — welcome!"); SG.go("#/customer/entrance"); };

/* ---- entrance scan ---- */
function entrance(root){
  root.innerHTML = frame("", head("Find your store")+
    '<p class="muted small" style="margin-top:-8px">Scan the QR at the store entrance to load its catalog and prices.</p>'+
    '<div class="scanner" style="border-radius:22px">'+
      '<div class="scan-reticle"><div class="scan-line"></div></div>'+
      '<p style="color:#9FB5AB;font-size:13px;margin-top:18px">Point your camera at the entrance code</p>'+
      '<div class="scan-chips">'+DB.branches.map(b=>
        '<button class="scan-chip" data-act="enter-store" data-arg="'+b.id+'">'+icon("store",15)+' '+esc(DB.storeName)+' · '+esc(b.name.split("—")[1]||b.name)+'</button>').join("")+
      '</div></div>'+
    '<p class="small muted" style="text-align:center">This demo simulates the camera — tap a store above to “scan” it.</p>', {tabbar:false});
}
SG.actions["enter-store"] = (bid)=>{
  DB.cart.branch = bid; SG.save();
  SG.toast("Welcome to "+DB.storeName+" — "+SG.branchById(bid).name);
  SG.go("#/customer/home");
};

/* ---- home / catalog ---- */
function home(root){
  if(SG.loadOnce("cust-home")){ root.innerHTML = frame("home", '<div class="skel" style="height:44px"></div><div class="skel" style="height:120px"></div><div class="skel" style="height:300px"></div>'); return; }
  const branch = SG.branchById(DB.cart.branch);
  const q = (SG.sess.custQ||"").toLowerCase();
  const cat = SG.sess.custCat||"All";
  const cats = ["All",...new Set(DB.products.filter(p=>p.approved&&p.active).map(p=>p.cat))];
  let list = DB.products.filter(p=>p.approved&&p.active);
  if(cat!=="All") list = list.filter(p=>p.cat===cat);
  if(q) list = list.filter(p=>(p.name+" "+p.cat+" "+p.sku).toLowerCase().includes(q));
  const recs = SG.topProducts(30,4);
  const unread = DB.notifications.customer.filter(n=>!n.read).length;
  root.innerHTML = frame("home",
    '<div class="row-between" style="margin-top:6px"><div><div class="eyebrow">'+esc(DB.storeName)+'</div>'+
      '<h2 style="font-size:21px">'+esc(branch.name)+'</h2></div>'+
      '<button class="iconbtn" data-nav="#/customer/notifications" aria-label="Notifications ('+unread+' unread)" style="position:relative">'+icon("bell",20)+
      (unread?'<span style="position:absolute;top:5px;right:6px;width:8px;height:8px;border-radius:50%;background:var(--crit)"></span>':'')+'</button></div>'+
    '<div class="searchbar">'+icon("search",17)+'<input class="input" id="csearch" placeholder="Search products or scan the shelf" value="'+esc(SG.sess.custQ||"")+'" aria-label="Search products"></div>'+
    '<div class="row" style="overflow-x:auto;scrollbar-width:none;margin:0 -18px;padding:0 18px" role="tablist">'+cats.map(c=>
      '<button class="chip '+(c===cat?'chip-accent':'chip-neutral')+'" style="flex:none;padding:7px 14px;font-size:13px" data-act="cust-cat" data-arg="'+esc(c)+'" role="tab" aria-selected="'+(c===cat)+'">'+esc(c)+'</button>').join("")+'</div>'+
    (q||cat!=="All" ? "" :
      '<button class="card" data-nav="#/customer/scan" style="display:flex;align-items:center;gap:14px;padding:16px;background:linear-gradient(120deg,var(--accent),var(--accent-ink));color:var(--on-accent);border:0;text-align:left">'+
      '<div style="background:rgba(255,255,255,.18);border-radius:12px;padding:9px">'+icon("scan",24)+'</div>'+
      '<div style="flex:1"><b style="font-size:15px">Scan a shelf label</b><div style="font-size:12.5px;opacity:.85">Get details, stock and reviews instantly</div></div>'+icon("chevR",18)+'</button>'+
      '<div><div class="row-between"><h3 style="font-size:15px">Popular this month</h3></div>'+
      '<div class="row" style="overflow-x:auto;scrollbar-width:none;margin:8px -18px 0;padding:0 18px;align-items:stretch">'+recs.map(t=>{
        const p = SG.productById(t.productId); if(!p) return "";
        return '<button class="card" data-nav="#/customer/product/'+p.id+'" style="flex:none;width:132px;padding:10px;text-align:left;display:flex;flex-direction:column;gap:8px">'+
          pimg(p,110,12).replace('width:110px','width:100%').replace("height:110px","height:84px")+
          '<div style="font-size:12.5px;font-weight:600;line-height:1.3">'+esc(p.name)+'</div>'+
          '<div class="num" style="font-size:13px;font-weight:700;margin-top:auto">'+fmt(p.price)+'</div></button>';}).join("")+'</div></div>')+
    '<div><h3 style="font-size:15px;margin-bottom:8px">'+(q?'Results for “'+esc(q)+'”':cat==="All"?"All products":esc(cat))+' <span class="muted small">('+list.length+')</span></h3>'+
    (list.length? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+list.map(p=>{
        const stock = p.stock[DB.cart.branch]??99;
        return '<button class="card" data-nav="#/customer/product/'+p.id+'" style="padding:10px;text-align:left;display:flex;flex-direction:column;gap:8px">'+
        pimg(p,110,12).replace('width:110px','width:100%').replace("height:110px","height:96px")+
        '<div style="font-size:13px;font-weight:600;line-height:1.3">'+esc(p.name)+'</div>'+
        '<div class="row-between" style="margin-top:auto"><span class="num" style="font-weight:700">'+fmt(p.price)+'</span>'+
        (stock===0?'<span class="chip chip-crit">Out</span>':stock<=p.lowAt?'<span class="chip chip-warn">'+stock+' left</span>':'')+'</div></button>';
      }).join("")+'</div>'
      : SG.emptyState("search","Nothing matches","Try a different word, or scan the shelf label directly.",'<button class="btn btn-sec" data-act="cust-clear-search">Clear search</button>'))+'</div>');
  const inp = root.querySelector("#csearch");
  let t; inp.addEventListener("input", ()=>{ clearTimeout(t); t=setTimeout(()=>{ SG.sess.custQ=inp.value; SG.saveSess(); SG.render();
    requestAnimationFrame(()=>{const i=document.getElementById("csearch"); if(i){i.focus(); i.setSelectionRange(i.value.length,i.value.length);}}); },380); });
}
SG.actions["cust-cat"] = c => { SG.sess.custCat=c; SG.saveSess(); SG.render(); };
SG.actions["cust-clear-search"] = ()=>{ SG.sess.custQ=""; SG.sess.custCat="All"; SG.saveSess(); SG.render(); };

/* ---- product scanner ---- */
function scan(root){
  const sellable = DB.products.filter(p=>p.approved&&p.active);
  root.innerHTML = frame("scan", backHead("Scan a product","#/customer/home")+
    '<div class="scanner" style="border-radius:22px;flex:1">'+
      '<div class="scan-reticle"><div class="scan-line"></div></div>'+
      '<p style="color:#9FB5AB;font-size:13px;margin-top:16px">Center the label\'s QR in the frame</p>'+
      '<div class="scan-chips">'+sellable.slice(0,10).map(p=>
        '<button class="scan-chip" data-act="scan-product" data-arg="'+p.id+'">'+p.emoji+' '+esc(p.name)+'</button>').join("")+'</div></div>'+
    '<p class="small muted" style="text-align:center">Camera is simulated — tap a label chip to scan it.</p>');
}
SG.actions["scan-product"] = pid => {
  SG.toast("Label recognized");
  SG.go("#/customer/product/"+pid);
};

/* ---- product detail ---- */
function product(root, r){
  const p = SG.productById(r.arg);
  if(!p){ root.innerHTML = frame("home", SG.errorState("cust-back-home")); return; }
  const v = p.vendorId? SG.vendorById(p.vendorId) : null;
  const stock = p.stock[DB.cart.branch]??99;
  const inCart = DB.cart.items.find(i=>i.productId===p.id);
  const others = DB.products.filter(x=>x.cat===p.cat&&x.id!==p.id&&x.approved&&x.active).slice(0,3);
  root.innerHTML = frame("home", backHead("", "#/customer/home")+
    '<div style="margin-top:-46px">'+pimg(p,110,20).replace('width:110px','width:100%').replace("height:110px","height:190px")+'</div>'+
    '<div class="row-between"><div><h2 style="font-size:20px">'+esc(p.name)+'</h2>'+
      '<div class="small muted">'+esc(p.cat)+(v?' · by '+esc(v.name):'')+' · SKU '+p.sku+'</div></div>'+
      '<div class="num" style="font-family:var(--font-d);font-size:22px;font-weight:700">'+fmt(p.price)+'</div></div>'+
    '<div class="row wrap">'+
      (stock===0?'<span class="chip chip-crit">Out of stock here</span>'
        :stock<=p.lowAt?'<span class="chip chip-warn">Only '+stock+' left at this branch</span>'
        :'<span class="chip chip-good">'+icon("check",13)+' In stock · '+stock+' available</span>')+
      '<span class="chip chip-neutral">VAT '+DB.settings.taxRate+'% incl. at checkout</span></div>'+
    '<p class="muted" style="font-size:14px">'+esc(desc(p))+'</p>'+
    '<div class="card card-pad row-between" style="padding:14px 16px"><div class="row">'+
      '<button class="iconbtn" data-act="pd-minus" aria-label="Decrease quantity" style="background:var(--surface2)">'+icon("minus",17)+'</button>'+
      '<b class="num" id="pd-qty" style="min-width:26px;text-align:center;font-size:16px">'+(SG.sess.pdQty||1)+'</b>'+
      '<button class="iconbtn" data-act="pd-plus" aria-label="Increase quantity" style="background:var(--surface2)">'+icon("plus",17)+'</button></div>'+
      '<button class="btn btn-pri" data-act="pd-add" data-arg="'+p.id+'" '+(stock===0?'disabled':'')+'>'+icon("cart",17)+' Add to cart</button></div>'+
    (inCart?'<p class="small" style="color:var(--accent-ink);text-align:center;font-weight:600">'+inCart.qty+' already in your cart</p>':'')+
    (others.length?'<div><h3 style="font-size:15px;margin-bottom:8px">Goes well with</h3><div class="col" style="gap:8px">'+others.map(o=>
      '<button class="card row" data-nav="#/customer/product/'+o.id+'" style="padding:10px;text-align:left">'+pimg(o,46,10)+
      '<div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(o.name)+'</div><div class="small muted">'+esc(o.cat)+'</div></div>'+
      '<b class="num small">'+fmt(o.price)+'</b></button>').join("")+'</div></div>':''));
  function desc(p){
    const d = {Abayas:"Cut from breathable premium fabric with hand-finished seams. Ships with a care pouch.",
      Fragrance:"Small-batch blend, bottled in Muscat. Long-lasting sillage with warm oriental base notes.",
      Accessories:"Handcrafted by the brand's artisans. Each piece is unique with natural variations.",
      Home:"Designed to bring warm Najdi character into modern spaces.",
      Kids:"Playful, durable and machine-washable — made for everyday adventures."};
    return d[p.cat]||"Curated by "+DB.storeName+".";
  }
}
SG.actions["pd-minus"]=()=>{ SG.sess.pdQty=Math.max(1,(SG.sess.pdQty||1)-1); SG.saveSess(); document.getElementById("pd-qty").textContent=SG.sess.pdQty; };
SG.actions["pd-plus"]=()=>{ SG.sess.pdQty=Math.min(9,(SG.sess.pdQty||1)+1); SG.saveSess(); document.getElementById("pd-qty").textContent=SG.sess.pdQty; };
SG.actions["pd-add"]=pid=>{
  const res = SG.cartAdd(pid, SG.sess.pdQty||1);
  if(!res.ok){ SG.toast(res.err,"err"); return; }
  SG.sess.pdQty=1; SG.saveSess();
  SG.toast("Added to cart — "+esc(res.p.name));
  SG.render();
};
SG.actions["cust-back-home"]=()=>SG.go("#/customer/home");

/* ---- cart ---- */
function cart(root){
  const t = SG.cartTotals();
  if(!t.lines.length){
    root.innerHTML = frame("cart", head("Your cart")+
      SG.emptyState("cart","Your cart is empty","Walk the aisles and scan any shelf label to add products.",
        '<button class="btn btn-pri" data-nav="#/customer/scan">'+icon("scan",16)+' Start scanning</button>'));
    return;
  }
  root.innerHTML = frame("cart", head("Your cart", '<span class="chip chip-neutral num">'+cartCount()+' items</span>')+
    '<div class="col" style="gap:10px">'+t.lines.map(l=>
      '<div class="card row" style="padding:12px">'+pimg(l.p,54,12)+
        '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:600">'+esc(l.p.name)+'</div>'+
        '<div class="num small muted">'+fmt(l.p.price)+' each</div></div>'+
        '<div class="row" style="gap:6px">'+
          '<button class="iconbtn" style="width:30px;height:30px;background:var(--surface2)" data-act="cart-dec" data-arg="'+l.p.id+'" aria-label="Decrease">'+icon("minus",15)+'</button>'+
          '<b class="num" style="min-width:20px;text-align:center">'+l.qty+'</b>'+
          '<button class="iconbtn" style="width:30px;height:30px;background:var(--surface2)" data-act="cart-inc" data-arg="'+l.p.id+'" aria-label="Increase">'+icon("plus",15)+'</button>'+
          '<button class="iconbtn" style="width:30px;height:30px;color:var(--crit)" data-act="cart-rm" data-arg="'+l.p.id+'" aria-label="Remove '+esc(l.p.name)+'">'+icon("trash",15)+'</button>'+
        '</div></div>').join("")+'</div>'+
    '<div class="card card-pad col" style="gap:8px">'+
      (t.coupon? '<div class="row-between"><span class="chip chip-good">'+icon("tag",13)+' '+t.coupon.code+' — '+t.coupon.pct+'% off</span>'+
        '<button class="btn btn-ghost btn-sm" data-act="coupon-rm">Remove</button></div>'
      : '<div class="row"><input class="input" id="coupon-in" placeholder="Promo code (try SAVE10)" aria-label="Promo code" style="flex:1">'+
        '<button class="btn btn-sec" data-act="coupon-apply">Apply</button></div>')+
      '<div class="row-between small muted"><span>Subtotal</span><span class="num">'+fmt(t.sub)+'</span></div>'+
      (t.disc?'<div class="row-between small" style="color:var(--good)"><span>Discount</span><span class="num">−'+fmt(t.disc)+'</span></div>':'')+
      '<div class="row-between small muted"><span>VAT ('+DB.settings.taxRate+'%)</span><span class="num">'+fmt(t.tax)+'</span></div>'+
      '<hr class="divider"><div class="row-between" style="font-weight:700;font-size:16px"><span>Total</span><span class="num">'+fmt(t.total)+'</span></div>'+
    '</div>'+
    '<button class="btn btn-pri btn-lg btn-block" data-act="cart-checkout">'+icon("qr",18)+' Checkout — show QR at the till</button>'+
    '<button class="btn btn-ghost btn-block" data-nav="#/customer/home">Continue shopping</button>');
}
SG.actions["cart-inc"]=pid=>{ const l=DB.cart.items.find(i=>i.productId===pid); const r=SG.cartSetQty(pid,l.qty+1); if(!r.ok&&r.err)SG.toast(r.err,"warn"); SG.render(); };
SG.actions["cart-dec"]=pid=>{ const l=DB.cart.items.find(i=>i.productId===pid); SG.cartSetQty(pid,l.qty-1); SG.render(); };
SG.actions["cart-rm"]=pid=>{ const p=SG.productById(pid); SG.cartSetQty(pid,0); SG.toast("Removed "+esc(p.name)); SG.render(); };
SG.actions["coupon-apply"]=()=>{
  const v=document.getElementById("coupon-in").value.trim();
  if(!v){ SG.toast("Enter a promo code first","warn"); return; }
  const r=SG.applyCoupon(v);
  if(r.ok){ SG.toast(r.c.code+" applied — "+r.c.pct+"% off"); SG.render(); } else SG.toast(r.err,"err");
};
SG.actions["coupon-rm"]=()=>{ DB.cart.coupon=null; SG.save(); SG.render(); };
SG.actions["cart-checkout"]=()=>{
  if(!SG.guardOnline("Checkout needs a connection — your cart is saved and will be ready when you're back online.")) return;
  SG.issueCheckoutToken(); SG.go("#/customer/checkout");
};

/* ---- checkout QR ---- */
function checkout(root){
  if(!DB.cart.items.length && DB.lastOrder){ SG.go("#/customer/receipt/"+DB.lastOrder.id); return; }
  if(!DB.checkoutToken){ SG.go("#/customer/cart"); return; }
  const t = SG.cartTotals();
  root.innerHTML = frame("cart", backHead("Checkout","#/customer/cart")+
    '<div class="card card-pad" style="display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center">'+
      '<div class="eyebrow">Show this to the cashier</div>'+
      '<div style="color:var(--ink);background:var(--surface);padding:6px;border-radius:14px" id="chk-qr">'+SG.qrSVG(DB.checkoutToken.token,190)+'</div>'+
      '<div class="num" style="font-family:var(--font-m);font-size:13px;color:var(--ink2)">'+DB.checkoutToken.token+'</div>'+
      '<div class="row" style="justify-content:center"><span class="chip chip-accent" id="chk-timer">'+icon("clock",13)+' expires in 5:00</span>'+
      '<span class="chip chip-neutral num">'+fmt(t.total)+'</span></div>'+
      '<div class="row" style="color:var(--ink3);font-size:12.5px;gap:6px" id="chk-wait"><span class="skel" style="width:8px;height:8px;border-radius:50%"></span> Waiting for the cashier to scan…</div>'+
    '</div>'+
    '<div class="card card-pad col" style="gap:10px"><b style="font-size:14px">In a hurry? Pay in the app</b>'+
      '<p class="small muted" style="margin-top:-6px">Pay now and show your receipt at the exit gate instead.</p>'+
      '<button class="btn btn-pri btn-block" data-act="pay-inapp">'+icon("wallet",17)+' Pay '+fmt(t.total)+' now</button></div>'+
    '<p class="small muted" style="text-align:center">Tip: open the <a data-nav="#/merchant/pos" href="#/merchant/pos">cashier station</a> in the Merchant app to scan this code.</p>');
  const start = DB.checkoutToken.issued;
  const iv = setInterval(()=>{
    if(!document.getElementById("chk-timer")){ clearInterval(iv); return; }
    if(!DB.checkoutToken){ clearInterval(iv); if(DB.lastOrder) SG.go("#/customer/receipt/"+DB.lastOrder.id); return; }
    const left = Math.max(0, 5*60 - Math.floor((Date.now()-start)/1e3));
    document.getElementById("chk-timer").innerHTML = icon("clock",13)+" expires in "+Math.floor(left/60)+":"+String(left%60).padStart(2,"0");
    if(DB.posOrder) document.getElementById("chk-wait").innerHTML = icon("check",14)+' <span style="color:var(--good);font-weight:600">Cashier connected — completing your payment…</span>';
    if(left===0){ clearInterval(iv); SG.toast("Checkout code expired — generate a fresh one","warn"); SG.issueCheckoutToken(); SG.render(); }
  }, 500);
  SG.onCleanup(()=>clearInterval(iv));
}
SG.actions["pay-inapp"]=()=> SG.go("#/customer/pay");

/* ---- in-app payment ---- */
function pay(root){
  if(!DB.cart.items.length){ SG.go("#/customer/cart"); return; }
  const t = SG.cartTotals();
  root.innerHTML = frame("cart", backHead("Payment","#/customer/checkout")+
    '<div class="card card-pad col" id="pay-box" style="gap:12px">'+
      '<div class="row-between"><b>Total to pay</b><b class="num" style="font-size:18px">'+fmt(t.total)+'</b></div><hr class="divider">'+
      '<button class="btn btn-lg btn-block" style="background:#000;color:#fff" data-act="pay-method" data-arg="applepay">'+icon("phone",18)+'  Pay</button>'+
      '<div class="row" style="gap:8px;color:var(--ink3);font-size:12px"><hr class="divider" style="flex:1">or card<hr class="divider" style="flex:1"></div>'+
      '<div class="field"><label for="cc-num">Card number</label><input class="input num" id="cc-num" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19"></div>'+
      '<div class="row"><div class="field" style="flex:1"><label for="cc-exp">Expiry</label><input class="input num" id="cc-exp" placeholder="12/28" maxlength="5"></div>'+
      '<div class="field" style="flex:1"><label for="cc-cvc">CVC</label><input class="input num" id="cc-cvc" placeholder="123" maxlength="4"></div></div>'+
      '<button class="btn btn-pri btn-lg btn-block" data-act="pay-method" data-arg="card">'+icon("card",18)+' Pay '+fmt(t.total)+'</button>'+
      '<p class="small muted" style="text-align:center">Test cards: 4242… succeeds · 4000… is declined</p>'+
    '</div>');
  const num=root.querySelector("#cc-num"), exp=root.querySelector("#cc-exp");
  num.addEventListener("input",()=>{ num.value=num.value.replace(/\D/g,"").slice(0,16).replace(/(.{4})/g,"$1 ").trim(); });
  exp.addEventListener("input",()=>{ let v=exp.value.replace(/\D/g,"").slice(0,4); if(v.length>2)v=v.slice(0,2)+"/"+v.slice(2); exp.value=v; });
}
SG.actions["pay-method"]=(method)=>{
  if(!SG.guardOnline("Payment needs a connection.")) return;
  const box=document.getElementById("pay-box");
  if(method==="card"){
    const numEl=document.getElementById("cc-num");
    const num=numEl.value.replace(/\s/g,"");
    if(num.length<16){ numEl.classList.add("invalid"); SG.toast("Enter a full 16-digit card number","warn"); return; }
    if(num.startsWith("4000")){
      box.innerHTML='<div class="state" style="padding:28px 10px"><div class="state-icon" style="color:var(--crit);background:var(--crit-soft)">'+icon("alert",26)+'</div>'+
        '<h3>Card declined</h3><p>Your bank declined this payment (code: insufficient_funds). No charge was made — try another card or pay at the till.</p>'+
        '<button class="btn btn-pri" data-nav="#/customer/pay">Try again</button></div>';
      return;
    }
  }
  box.innerHTML='<div class="state" style="padding:40px 10px"><div class="skel" style="width:44px;height:44px;border-radius:50%"></div><h3 style="margin-top:12px">Processing payment…</h3><p>Talking to your bank. Don\'t close the app.</p></div>';
  setTimeout(()=>{
    const res = SG.posComplete(method==="applepay"?"applepay":"card", "e3");
    if(!res.ok){ SG.toast(res.err,"err"); SG.go("#/customer/cart"); return; }
    SG.toast("Payment successful — +"+res.points+" points");
    SG.go("#/customer/receipt/"+res.order.id);
  }, 1400);
};

/* ---- receipt ---- */
function receipt(root, r){
  const o = DB.orders.find(x=>x.id===r.arg) || DB.lastOrder;
  if(!o){ root.innerHTML = frame("orders", SG.errorState("cust-back-home")); return; }
  const br = SG.branchById(o.branch);
  root.innerHTML = frame("orders", backHead("Receipt","#/customer/orders")+
    (o.live?'<div class="state" style="padding:8px 0 2px"><div class="state-icon" style="background:var(--good-soft);color:var(--good);animation:screenIn .5s var(--ease)">'+icon("check",28)+'</div>'+
      '<h3>Payment complete</h3><p>You\'re free to go — gates will read this receipt.</p></div>':'')+
    '<div class="receipt-paper" id="print-area">'+
      '<div style="text-align:center;margin-bottom:12px"><b style="font-size:15px;letter-spacing:.06em">'+esc(DB.storeName.toUpperCase())+'</b>'+
      '<div style="opacity:.7">'+esc(br?br.name:"")+'<br>VAT '+DB.settings.vat+'</div></div>'+
      '<div class="rrow"><span>'+o.id+'</span><span>'+SG.fmtDate(o.ts)+' '+SG.fmtTime(o.ts)+'</span></div>'+
      '<div class="rrow"><span>Cashier</span><span>'+esc((SG.empById(o.cashierId)||{}).name||"—")+'</span></div>'+
      '<div style="border-top:1px dashed var(--line2);margin:8px 0"></div>'+
      o.items.map(it=>'<div class="rrow"><span>'+it.qty+' × '+esc(it.name)+'</span><span>'+fmt(it.price*it.qty)+'</span></div>').join("")+
      '<div style="border-top:1px dashed var(--line2);margin:8px 0"></div>'+
      '<div class="rrow"><span>Subtotal</span><span>'+fmt(o.sub)+'</span></div>'+
      (o.disc?'<div class="rrow"><span>Discount'+(o.coupon?' ('+o.coupon+')':'')+'</span><span>−'+fmt(o.disc)+'</span></div>':'')+
      '<div class="rrow"><span>VAT '+DB.settings.taxRate+'%</span><span>'+fmt(o.tax)+'</span></div>'+
      '<div class="rrow" style="font-weight:700;font-size:14px"><span>TOTAL</span><span>'+fmt(o.total)+'</span></div>'+
      '<div class="rrow"><span>Paid via</span><span>'+(o.method==="applepay"?"Apple Pay":o.method.toUpperCase())+'</span></div>'+
      '<div style="display:flex;justify-content:center;margin:14px 0 6px;color:var(--ink)">'+SG.qrSVG("ZATCA|"+o.id+"|"+o.total,92)+'</div>'+
      '<div style="text-align:center;opacity:.7">'+esc(DB.settings.receiptFooter)+'</div>'+
    '</div>'+
    '<div class="row"><button class="btn btn-sec btn-block" data-act="receipt-print">'+icon("print",16)+' Print</button>'+
    '<button class="btn btn-sec btn-block" data-act="receipt-share">'+icon("upload",16)+' Share</button></div>'+
    '<button class="btn btn-ghost btn-block" data-nav="#/customer/home">Done</button>');
}
SG.actions["receipt-print"]=()=>window.print();
SG.actions["receipt-share"]=()=>SG.toast("Receipt link copied to clipboard");

/* ---- order history ---- */
function orders(root){
  if(SG.loadOnce("cust-orders")){ root.innerHTML = frame("orders", head("Purchases")+SG.skelRows(5,74)); return; }
  const mine = DB.orders.filter(o=>o.customer===DB.customer.name).sort((a,b)=>b.ts-a.ts).slice(0,20);
  root.innerHTML = frame("orders", head("Purchases")+
    (mine.length? '<div class="col" style="gap:10px">'+mine.map(o=>
      '<button class="card row" data-nav="#/customer/receipt/'+o.id+'" style="padding:13px;text-align:left">'+
      '<div class="role-ic" style="width:40px;height:40px;border-radius:11px;background:var(--accent-soft);color:var(--accent-ink);display:flex;align-items:center;justify-content:center">'+icon("receipt",19)+'</div>'+
      '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:14px">'+esc(DB.storeName)+' <span class="muted small">· '+o.id+'</span></div>'+
      '<div class="small muted">'+SG.fmtDate(o.ts)+' · '+o.items.reduce((s,i)=>s+i.qty,0)+' items</div></div>'+
      '<div style="text-align:right"><b class="num">'+fmt(o.total)+'</b><div class="small" style="color:var(--good)">+'+Math.round(o.total/10*1.5)+' pts</div></div></button>').join("")+'</div>'
    : SG.emptyState("receipt","No purchases yet","Your receipts will live here after your first checkout.",
      '<button class="btn btn-pri" data-nav="#/customer/home">Start shopping</button>')));
}

/* ---- notifications ---- */
function notifications(root){
  const list = DB.notifications.customer;
  root.innerHTML = frame("home", backHead("Notifications","#/customer/home")+
    (list.length?'<div class="col" style="gap:8px">'+list.map(n=>
      '<div class="card row" style="padding:12px;'+(n.read?'':'border-color:var(--accent)')+'">'+
      '<div class="role-ic" style="width:38px;height:38px;border-radius:10px;background:var(--surface2);color:var(--ink2);display:flex;align-items:center;justify-content:center">'+icon(n.icon,18)+'</div>'+
      '<div style="flex:1"><div style="font-size:13.5px;font-weight:600">'+esc(n.title)+'</div>'+
      '<div class="small muted">'+esc(n.body)+'</div><div class="small" style="color:var(--ink3);margin-top:2px">'+SG.timeAgo(n.ts)+'</div></div></div>').join("")+'</div>'
    : SG.emptyState("bell","All caught up","Offers and receipts will appear here.")));
  list.forEach(n=>n.read=true); SG.save();
}

/* ---- profile ---- */
function profile(root){
  const c = DB.customer;
  const nextTier = 500;
  root.innerHTML = frame("profile", head("Profile", SG.themeBtn())+
    '<div class="card card-pad row"><div class="avatar" style="width:52px;height:52px;font-size:18px;background:var(--accent-soft);color:var(--accent-ink)">'+esc(c.name[0])+'</div>'+
    '<div style="flex:1"><b style="font-size:16px">'+esc(c.name)+'</b><div class="small muted">'+esc(c.email)+'</div></div></div>'+
    '<div class="card card-pad" style="background:linear-gradient(120deg,var(--accent),var(--accent-ink));color:var(--on-accent);border:0">'+
      '<div class="row-between"><div><div style="font-size:12px;opacity:.8;letter-spacing:.06em;text-transform:uppercase">Sayr Loyalty · '+esc(c.tier)+'</div>'+
      '<div style="font-family:var(--font-d);font-size:30px;font-weight:700" class="num">'+c.points.toLocaleString()+' pts</div></div>'+icon("gift",30)+'</div>'+
      '<div class="progress" style="background:rgba(255,255,255,.25);margin-top:12px"><i style="width:'+Math.min(100,Math.round(c.points/nextTier*100))+'%;background:#fff"></i></div>'+
      '<div style="font-size:12px;opacity:.85;margin-top:6px">'+(c.points>=nextTier?"You've unlocked Platinum rewards":(nextTier-c.points)+" pts to Platinum")+'</div></div>'+
    '<div class="card">'+[
      {ic:"receipt",label:"Purchase history",nav:"#/customer/orders"},
      {ic:"bell",label:"Notifications",nav:"#/customer/notifications"},
      {ic:"store",label:"Switch store / branch",nav:"#/customer/entrance"},
      {ic:"card",label:"Payment methods",act:"cust-paymethods"},
    ].map(i=>'<button class="listrow" style="width:100%;text-align:left;padding:13px 16px" '+(i.nav?'data-nav="'+i.nav+'"':'data-act="'+i.act+'"')+'>'+
      icon(i.ic,19)+'<span style="flex:1;font-size:14px;font-weight:500">'+i.label+'</span>'+icon("chevR",16)+'</button>').join("")+'</div>'+
    '<button class="btn btn-ghost btn-block" data-act="cust-logout" style="color:var(--crit)">'+icon("logout",16)+' Sign out</button>');
}
SG.actions["cust-paymethods"]=()=> SG.dialog({title:"Payment methods",
  body:'<div class="listrow">'+icon("phone",18)+'<span style="flex:1">Apple Pay</span><span class="chip chip-good">Default</span></div>'+
       '<div class="listrow">'+icon("card",18)+'<span style="flex:1">Visa •••• 4242</span><span class="chip chip-neutral">12/28</span></div>'+
       '<button class="btn btn-sec btn-block" data-close>'+icon("plus",15)+' Add a card</button>',
  actions:'<button class="btn btn-pri" data-close>Done</button>'});
SG.actions["cust-logout"]=()=> SG.confirm({title:"Sign out?", okLabel:"Sign out", message:"Your cart and points are saved to your account.", cb:()=>{
  SG.sess.custAuthed=false; SG.saveSess(); SG.go("#/customer/auth");
}});
})();
