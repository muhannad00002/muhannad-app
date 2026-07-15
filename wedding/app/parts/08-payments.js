/* ============ ZAFFA — CLIENT PAYMENT LAYER ============
   A thin, provider-agnostic checkout front-end. Secrets live only on the
   backend (see wedding/server/). This module chooses the right provider:
     • Apple In-App Purchase   — when running inside the native iOS app (StoreKit)
     • Bank Muscat SmartPay    — on the web, when a backend endpoint is configured
     • Demo                    — offline / hosted demo: simulates the unlock

   Configure once, here. Leaving `backendBase` empty keeps the app in demo mode
   so the standalone HTML and hosted preview still work end-to-end. */
const PAY_CONFIG = {
  backendBase: "",                        // e.g. "https://api.zaffa.app"  (blank = demo)
  appleProducts: { monthly: "com.zaffa.premium.monthly", annual: "com.zaffa.premium.annual" },
  prices: { monthly: "$2.99", annual: "$24" },
};

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
  if(PAY_CONFIG.backendBase) return "smartpay";
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
  if(PAY_CONFIG.backendBase){
    const v = await fetch(PAY_CONFIG.backendBase+"/api/payments/apple/verify",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({...proof,userId:currentUserId(),planId})}).then(r=>r.json());
    if(!v.ok) throw new Error(v.reason||"Receipt could not be verified");
  }
  goPremium(planId);
  return {ok:true,provider:"apple",plan:planId};
}

/* ---- Bank Muscat SmartPay (server creates session → we redirect) ---- */
async function checkoutSmartPay(planId){
  const session = await fetch(PAY_CONFIG.backendBase+"/api/payments/smartpay/session",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({planId,userId:currentUserId(),name:S.bride.name,email:S.bride.email||""})
  }).then(r=>r.json());
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

function currentUserId(){ return (S.bride && S.bride.name ? S.bride.name : "anon")+"|"+(S.bride.date||""); }

/* ---- Return handler: the SmartPay callback bounces here after payment ---- */
route("/premium/return",(q)=>{
  const success = q.status==="success";
  if(success){ const plan=q.plan||localStorage.getItem("zaffa.pendingPlan")||"monthly"; goPremium(plan); }
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
