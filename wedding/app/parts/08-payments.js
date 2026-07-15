/* ============ ZAFFA — CLIENT PAYMENT LAYER ============
   A thin, provider-agnostic checkout front-end. Secrets live only on the
   backend (see wedding/server/). This module chooses the right provider:
     • Apple In-App Purchase   — when running inside the native iOS app (StoreKit)
     • Bank Muscat SmartPay    — on the web, when a backend endpoint is configured
     • Demo                    — offline / hosted demo: simulates the unlock

   Configure once, here. Leaving `backendBase` empty keeps the app in demo mode
   so the standalone HTML and hosted preview still work end-to-end. */
const PAY_CONFIG = {
  backendBase: "",                        // e.g. "https://zaffa-backend.onrender.com"  (blank = demo)
  appleProducts: { monthly: "com.zaffa.premium.monthly", annual: "com.zaffa.premium.annual" },
  prices: { monthly: "$2.99", annual: "$24" },
};

/* Backend base: build-time constant, overridable at runtime via localStorage
   (lets us point an installed app at a new backend without rebuilding). */
function apiBase(){
  try{ const o=localStorage.getItem("zaffa.backend"); if(o) return o.replace(/\/$/,""); }catch{}
  return PAY_CONFIG.backendBase.replace(/\/$/,"");
}
async function api(path,{method="GET",body:payload}={}){
  const headers={"Content-Type":"application/json"};
  if(S.account&&S.account.token)headers.Authorization="Bearer "+S.account.token;
  const r=await fetch(apiBase()+path,{method,headers,body:payload?JSON.stringify(payload):undefined});
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(data.error||("Request failed ("+r.status+")"));
  return data;
}

/* ---- cloud sync: catalog down, entitlement down, admin catalog up ---- */
async function cloudInit(){
  if(!apiBase())return;
  try{
    const cat=await api("/api/catalog");
    let changed=false;
    if(Array.isArray(cat.categories)&&cat.categories.length){CATEGORIES.length=0;CATEGORIES.push(...cat.categories);changed=true;}
    if(Array.isArray(cat.vendors)&&cat.vendors.length){VENDORS.length=0;VENDORS.push(...cat.vendors);changed=true;}
    if(Array.isArray(cat.tips)&&cat.tips.length){TIPS.length=0;TIPS.push(...cat.tips);changed=true;}
    if(Array.isArray(cat.ads)){ADS.length=0;ADS.push(...cat.ads);changed=true;}
    if(S.account&&S.account.token){
      const me=await api("/api/me").catch(()=>null);
      if(me&&me.subscription){S.subscription={plan:me.subscription.plan,tier:me.subscription.tier||null,since:me.subscription.since||null};changed=true;}
      else if(me===null){S.account=null;} // token expired
    }
    if(changed){save();render();}
  }catch(e){/* offline or backend down — local data keeps working */}
}
async function publishCatalog(){
  await api("/api/admin/catalog",{method:"PUT",body:{categories:CATEGORIES,vendors:VENDORS,tips:TIPS,ads:ADS,version:Date.now()}});
}

/* ---- account sheet (register / sign in) ---- */
function openAccountSheet(onDone){
  let mode="login"; const d={name:"",email:"",password:""};
  let ref;
  ref=sheet({title:"Your account",body:(close)=>{
    const wrap=h("div.col.gap12",{style:{marginTop:"4px"}});
    function draw(){
      clear(wrap);
      const seg=h("div.seg");
      [["login","Sign in"],["register","Create account"]].forEach(([k,l])=>
        seg.appendChild(h("button"+(mode===k?".on":""),{onclick:()=>{mode=k;draw();}},l)));
      wrap.appendChild(seg);
      if(mode==="register")wrap.appendChild(h("div",[h("label.lbl","Your name"),
        h("input.field",{value:d.name,placeholder:"e.g. Sarah",oninput:e=>d.name=e.target.value})]));
      wrap.appendChild(h("div",[h("label.lbl","Email"),
        h("input.field",{type:"email",value:d.email,placeholder:"you@example.com",oninput:e=>d.email=e.target.value})]));
      wrap.appendChild(h("div",[h("label.lbl","Password"),
        h("input.field",{type:"password",value:d.password,placeholder:mode==="register"?"At least 6 characters":"Your password",oninput:e=>d.password=e.target.value})]));
      const btn=h("button.btn.btn-pri.btn-lg.btn-block",{onclick:async()=>{
        btn.disabled=true;btn.textContent="One moment…";
        try{
          const r=await api(mode==="register"?"/api/auth/register":"/api/auth/login",{method:"POST",body:d});
          S.account={email:r.user.email,name:r.user.name,role:r.user.role,token:r.token};
          if(r.user.name&&mode==="register"&&!S.bride.name)S.bride.name=r.user.name;
          save(); ref.close(); toast(mode==="register"?"Welcome to Zaffa 💗":"Signed in ✓");
          cloudInit(); onDone&&onDone(); render();
        }catch(e){toast(e.message,"⚠️");btn.disabled=false;btn.textContent=mode==="register"?"Create account":"Sign in";}
      }},mode==="register"?"Create account":"Sign in");
      wrap.appendChild(btn);
      wrap.appendChild(h("p.center.tiny.faint","Your plan and Premium follow your account on any device."));
    }
    draw(); return wrap;
  }});
  return ref;
}

/* Detect the native iOS wrapper + a StoreKit purchase bridge, if present. */
function nativeIAP(){
  const cap = window.Capacitor;
  if(!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
  // Support either a custom bridge (window.ZaffaIAP) or a Capacitor IAP plugin.
  if(window.ZaffaIAP && window.ZaffaIAP.purchase) return window.ZaffaIAP;
  const plugin = cap.Plugins && (cap.Plugins.InAppPurchase || cap.Plugins.Purchases || cap.Plugins.CdvPurchase);
  return plugin || null;
}

function paymentProvider(){
  if(nativeIAP()) return "apple";
  if(apiBase()) return "smartpay";
  return "demo";
}
function providerLabel(){
  return {apple:"Apple", smartpay:"Bank Muscat SmartPay", demo:"Demo"}[paymentProvider()];
}

/* Main entry: returns a promise that resolves when Premium is granted. */
async function payCheckout(planId){
  const provider = paymentProvider();
  try{
    if(provider === "apple")    return await checkoutApple(planId);
    if(provider === "smartpay") return await checkoutSmartPay(planId);
    return await checkoutDemo(planId);
  }catch(e){
    toast(e && e.message ? e.message : "Payment could not be completed","⚠️");
    throw e;
  }
}

/* ---- Demo: no real charge, unlock immediately (labelled in the paywall) ---- */
function checkoutDemo(planId){
  return new Promise(resolve=>{
    goPremium(planId);
    resolve({ok:true,provider:"demo",plan:planId});
  });
}

/* ---- Apple In-App Purchase (StoreKit via the native bridge) ---- */
async function checkoutApple(planId){
  const iap = nativeIAP();
  const productId = PAY_CONFIG.appleProducts[planId];
  const result = await iap.purchase({ productId });      // native bridge resolves on success
  // Verify the receipt/transaction server-side before granting entitlement.
  const proof = result.jws ? {jws:result.jws} : {receipt:result.receipt};
  if(apiBase()){
    const v = await api("/api/payments/apple/verify",{method:"POST",body:{...proof,userId:currentUserId(),planId}});
    if(!v.ok) throw new Error(v.reason||"Receipt could not be verified");
  }
  goPremium(planId);
  return {ok:true,provider:"apple",plan:planId};
}

/* ---- Bank Muscat SmartPay (server creates session → we redirect) ---- */
async function checkoutSmartPay(planId){
  // paying is nicer with an account: Premium then follows the user anywhere
  if(!S.account)await new Promise(res=>openAccountSheet(res));
  if(!S.account)throw new Error("Sign in to continue");
  const session = await api("/api/payments/smartpay/session",{method:"POST",
    body:{planId,userId:currentUserId(),name:S.bride.name}});
  if(!session || !session.action) throw new Error("Could not start payment");
  // remember intent so /premium/return can confirm after the redirect bounce
  try{ localStorage.setItem("zaffa.pendingPlan", planId); }catch{}
  // auto-submit the encrypted redirect form to the Bank-hosted page
  const form=document.createElement("form");
  form.method="POST"; form.action=session.action; form.style.display="none";
  Object.entries(session.fields).forEach(([k,v])=>{
    const i=document.createElement("input"); i.type="hidden"; i.name=k; i.value=v; form.appendChild(i);
  });
  document.body.appendChild(form); form.submit();
  return new Promise(()=>{}); // navigation leaves the page
}

function currentUserId(){
  if(S.account&&S.account.email)return S.account.email;
  return (S.bride && S.bride.name ? S.bride.name : "anon")+"|"+(S.bride.date||"");
}

/* ---- Return handler: the SmartPay callback bounces here after payment ---- */
route("/premium/return",(q)=>{
  const success = q.status==="success";
  if(success){ const plan=q.plan||localStorage.getItem("zaffa.pendingPlan")||"monthly"; goPremium(plan); cloudInit(); }
  try{ localStorage.removeItem("zaffa.pendingPlan"); }catch{}
  const kids=[h("div",{style:{height:"14px"}}),
    h("div.card.pad-l.center",{style:{marginTop:"40px"}},[
      h("div",{style:{fontSize:"52px",marginBottom:"10px"}},success?"🎉":"😔"),
      h("h2",{style:{fontSize:"26px"}},success?"You're Premium!":"Payment not completed"),
      h("p.muted",{style:{margin:"8px auto 20px",maxWidth:"300px"}},
        success?"Everything is unlocked — unlimited categories, unlimited AI assistant and calendar sync. Enjoy planning 💗"
               :"No charge was made. You can try again whenever you're ready."),
      h("button.btn.btn-pri.btn-lg",{onclick:()=>go("/home")},success?"Start planning":"Back to app"),
      !success?h("button.btn.btn-quiet",{style:{marginTop:"8px"},onclick:()=>openPaywall("default")},"Try again"):null,
    ])];
  if(success)setTimeout(confetti,200);
  return appFrame(kids,{noTab:true});
});
