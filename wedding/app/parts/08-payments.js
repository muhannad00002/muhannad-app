/* ============ ZAFFA — CLIENT PAYMENT LAYER ============
   A thin, provider-agnostic checkout front-end. Secrets live only on the
   backend (see wedding/server/). This module chooses the right provider:
     • Apple In-App Purchase   — when running inside the native iOS app (StoreKit)
     • Bank Muscat SmartPay    — on the web, when a backend endpoint is configured
     • Demo                    — offline / hosted demo: simulates the unlock

   Configure once, here. Leaving `backendBase` empty keeps the app in demo mode
   so the standalone HTML and hosted preview still work end-to-end. */
const PAY_CONFIG = {
  // Blank = call the API on the SAME origin (Vercel hosts app + /api together).
  // Set an absolute URL only if the API lives on a different domain.
  backendBase: "",
  appleProducts: { monthly: "com.zaffa.premium.monthly", annual: "com.zaffa.premium.annual" },
  prices: { monthly: "$2.99", annual: "$24" },
};

/* Backend base:
   1) a runtime override in localStorage("zaffa.backend"), else
   2) PAY_CONFIG.backendBase (absolute URL for a separate API domain), else
   3) same-origin when the app is actually served over http(s) — the Vercel
      case where /api lives on this domain. file:// (offline demo) → no backend. */
function apiBase(){
  try{ const o=localStorage.getItem("zaffa.backend"); if(o!==null && o!=="") return o.replace(/\/$/,""); }catch{}
  if(PAY_CONFIG.backendBase) return PAY_CONFIG.backendBase.replace(/\/$/,"");
  if(location.protocol==="http:"||location.protocol==="https:") return location.origin;
  return "";
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
let _applyingRemote=false;
async function cloudInit(opts){
  if(!apiBase())return;
  opts=opts||{};
  _applyingRemote=true;               // suppress auto-publish while applying server data
  try{
    const cat=await api("/api/catalog");
    let changed=false;
    if(Array.isArray(cat.categories)&&cat.categories.length){CATEGORIES.length=0;CATEGORIES.push(...cat.categories);changed=true;}
    if(Array.isArray(cat.vendors)&&cat.vendors.length){VENDORS.length=0;VENDORS.push(...cat.vendors);VENDORS.forEach(v=>{if(!v.governorate)v.governorate=govOfCity(v.city);});changed=true;}
    if(Array.isArray(cat.tips)&&cat.tips.length){TIPS.length=0;TIPS.push(...cat.tips);changed=true;}
    if(Array.isArray(cat.ads)){ADS.length=0;ADS.push(...cat.ads);changed=true;}
    if(cat.version){S._catalogVersion=cat.version;}
    if(S.account&&S.account.token && !opts.catalogOnly){
      // refresh profile + entitlement; only sign out on an explicit auth
      // failure (401), never on a transient network/backend error
      try{
        const me=await api("/api/me");
        if(me&&me.user){S.account={...S.account,...me.user,token:S.account.token};changed=true;}
        if(me&&me.subscription){S.subscription={plan:me.subscription.plan,tier:me.subscription.tier||null,since:me.subscription.since||null};changed=true;}
      }catch(e){
        if(/\(401\)|not_signed_in|unauthor/i.test(e.message||"")){S.account=null;changed=true;}
      }
    }
    if(changed){save(); if(!opts.silent) render();}
  }catch(e){/* offline or backend down — local data keeps working */}
  finally{ _applyingRemote=false; }
}

/* Publish the current catalog to the backend. Called automatically (debounced)
   whenever an admin makes a change, so edits go live for customers with no
   manual "publish" step. */
async function publishCatalog(){
  const r=await api("/api/admin/catalog",{method:"PUT",body:{categories:CATEGORIES,vendors:VENDORS,tips:TIPS,ads:ADS}});
  if(r&&r.version){S._catalogVersion=r.version; save();}
  return r;
}
let _pubTimer=null, _pubPending=false;
function autoPublish(){
  if(_applyingRemote || !(isAdmin() && apiBase()))return;
  _pubPending=true;
  clearTimeout(_pubTimer);
  _pubTimer=setTimeout(async()=>{
    _pubPending=false;
    try{ await publishCatalog(); syncDot("ok"); }
    catch(e){ syncDot("err"); }
  },900); // debounce rapid edits into one publish
  syncDot("pending");
}
/* tiny live "saving…/saved" indicator for the admin */
function syncDot(state){
  let el=document.getElementById("sync-dot");
  if(!el){el=h("div#sync-dot",{style:{position:"fixed",top:"10px",left:"50%",transform:"translateX(-50%)",zIndex:"120",
    padding:"5px 12px",borderRadius:"999px",fontSize:"12px",fontWeight:"600",boxShadow:"var(--shadow-2)",transition:"opacity .3s",pointerEvents:"none"}});
    document.body.appendChild(el);}
  const map={pending:["Saving…","var(--surface)","var(--ink2)"],ok:["✓ Saved & live","var(--good-soft)","var(--good)"],err:["⚠ Offline — will retry","var(--warn-soft)","var(--warn)"]};
  const [txt,bg,col]=map[state]||map.ok;
  el.textContent=txt; el.style.background=bg; el.style.color=col; el.style.opacity="1";
  if(state!=="pending"){clearTimeout(el._t); el._t=setTimeout(()=>{el.style.opacity="0";},1800);}
}

/* ---- Real-time polling: pull admin changes into open customer apps ---- */
let _pollTimer=null;
function startCatalogPolling(){
  if(!apiBase()||_pollTimer)return;
  const tick=async()=>{
    // don't disturb an admin mid-edit or anyone with a sheet/modal open
    if(_pubPending || document.querySelector(".scrim")) return;
    try{
      const meta=await api("/api/catalog/meta");
      if(meta && meta.version && meta.version!==S._catalogVersion){
        await cloudInit({catalogOnly:true}); // pull latest, re-render
      }
    }catch(e){/* backend asleep/offline — try again next tick */}
  };
  _pollTimer=setInterval(tick,15000);              // every 15s
  document.addEventListener("visibilitychange",()=>{ if(!document.hidden) tick(); });
  window.addEventListener("focus",tick);
}

/* ---- account sheet: WhatsApp OTP sign-up / sign-in ----
   Step 1: phone → we send a 6-digit code to WhatsApp.
   Step 2: code (+ name, age, city for first-time users) → signed in. */
function openAccountSheet(onDone){
  let step="phone", existing=false, devCode="", timer=null;
  const d={phone:"",code:"",name:S.bride.name||"",age:"",governorate:GOVERNORATES[0]};
  let ref;
  ref=sheet({title:"Your account",onClose:()=>timer&&clearInterval(timer),body:(close)=>{
    const wrap=h("div.col.gap12",{style:{marginTop:"4px"}});
    function draw(){
      clear(wrap); if(timer){clearInterval(timer);timer=null;}
      if(step==="phone"){
        wrap.appendChild(h("div.row.gap12",{style:{alignItems:"center",padding:"2px 2px 6px"}},[
          h("span",{style:{fontSize:"30px"}},"💬"),
          h("p.small.muted","Sign in with WhatsApp — we'll send a 6-digit code to your number."),
        ]));
        const phoneI=h("input.field",{type:"tel",value:d.phone,placeholder:"9X XXX XXX",style:{fontSize:"17px"},
          oninput:e=>d.phone=e.target.value});
        wrap.appendChild(h("div",[h("label.lbl","WhatsApp number"),
          h("div.row.gap8",[h("span.chip",{style:{flex:"none",fontSize:"14px",padding:"12px 14px"}},"🇴🇲 +968"),h("div.grow",phoneI)])]));
        const btn=h("button.btn.btn-pri.btn-lg.btn-block",{onclick:async()=>{
          btn.disabled=true;btn.textContent="Sending code…";
          try{
            const r=await api("/api/auth/otp/start",{method:"POST",body:{phone:d.phone}});
            existing=!!r.existing; devCode=r.devCode||""; d.phone=r.phone||d.phone;
            step="verify"; draw();
          }catch(e){toast(e.message,"⚠️");btn.disabled=false;btn.textContent="Send code on WhatsApp";}
        }},"Send code on WhatsApp");
        wrap.appendChild(btn);
        setTimeout(()=>phoneI.focus(),200);
      }else{
        wrap.appendChild(h("p.small.muted",{style:{padding:"0 2px"}},
          ["We sent a code to your WhatsApp ",h("b",d.phone),". ",existing?"Welcome back!":"Fill in your details to finish signing up."]));
        if(!existing){
          wrap.appendChild(h("div",[h("label.lbl","Your name"),
            h("input.field",{value:d.name,placeholder:"e.g. Sarah",oninput:e=>d.name=e.target.value})]));
          const govSel=h("select.field",GOVERNORATES.map(c=>h("option",{value:c,selected:c===d.governorate},c)));
          govSel.onchange=e=>d.governorate=e.target.value;
          wrap.appendChild(h("div.row.gap8",[
            h("div",{style:{width:"110px"}},[h("label.lbl","Age"),
              h("input.field",{type:"number",min:18,max:100,value:d.age,placeholder:"e.g. 26",oninput:e=>d.age=e.target.value})]),
            h("div.grow",[h("label.lbl","Governorate"),govSel]),
          ]));
        }
        const codeI=h("input.field",{type:"tel",maxLength:6,inputmode:"numeric",value:d.code,placeholder:"6-digit code",
          style:{fontSize:"22px",textAlign:"center",letterSpacing:".35em"},oninput:e=>d.code=e.target.value});
        wrap.appendChild(h("div",[h("label.lbl","Verification code"),codeI]));
        if(devCode)wrap.appendChild(h("p.center.tiny.faint","Test mode — your code is "+devCode));
        const btn=h("button.btn.btn-pri.btn-lg.btn-block",{onclick:async()=>{
          btn.disabled=true;btn.textContent="Verifying…";
          try{
            const r=await api("/api/auth/otp/verify",{method:"POST",
              body:{phone:d.phone,code:d.code,name:d.name,age:d.age,governorate:d.governorate}});
            S.account={id:r.user.id,phone:r.user.phone,email:r.user.email,name:r.user.name,governorate:r.user.governorate,age:r.user.age,role:r.user.role,token:r.token};
            if(r.user.name&&!existing)S.bride.name=r.user.name;
            save(); ref.close(); toast(existing?"Welcome back 💗":"Welcome to Wedding & Co 💗");
            cloudInit(); onDone&&onDone(); render();
          }catch(e){toast(e.message,"⚠️");btn.disabled=false;btn.textContent="Verify & continue";}
        }},"Verify & continue");
        wrap.appendChild(btn);
        // resend with 60s countdown
        let left=60;
        const resend=h("button.btn.btn-quiet.btn-block",{disabled:true},"Resend code (60s)");
        timer=setInterval(()=>{left--;
          if(left<=0){clearInterval(timer);timer=null;resend.disabled=false;resend.textContent="Resend code";}
          else resend.textContent="Resend code ("+left+"s)";},1000);
        resend.onclick=async()=>{try{const r=await api("/api/auth/otp/start",{method:"POST",body:{phone:d.phone}});
          devCode=r.devCode||"";toast("New code sent","💬");draw();}catch(e){toast(e.message,"⚠️");}};
        wrap.appendChild(resend);
        wrap.appendChild(h("button.btn.btn-quiet.btn-block",{onclick:()=>{step="phone";draw();}},"Change number"));
        setTimeout(()=>codeI.focus(),200);
      }
    }
    draw(); return wrap;
  }});
  return ref;
}

/* ---- Redeem a voucher code for full access ---- */
function openRedeemSheet(onDone){
  const d={code:""};
  let ref;
  ref=sheet({title:"Redeem a code",body:(close)=>{
    const b=h("div.col.gap12",{style:{marginTop:"4px"}});
    b.appendChild(h("div.row.gap12",{style:{alignItems:"center"}},[h("span",{style:{fontSize:"30px"}},"🎟️"),
      h("p.small.muted","Enter the code from your planner to unlock full access — no payment needed.")]));
    const codeI=h("input.field",{value:d.code,placeholder:"WED-XXXX-XXXX",style:{fontSize:"18px",textAlign:"center",letterSpacing:".08em",textTransform:"uppercase",fontFamily:"var(--font-m)"},oninput:e=>d.code=e.target.value});
    b.appendChild(h("div",[h("label.lbl","Voucher code"),codeI]));
    const btn=h("button.btn.btn-pri.btn-lg.btn-block",{onclick:async()=>{
      if(!d.code.trim()){toast("Enter a code","⚠️");return;}
      if(!S.account){ ref.close(); await new Promise(res=>openAccountSheet(res)); if(!S.account){return;} ref=openRedeemSheet(onDone); return; }
      btn.disabled=true;btn.textContent="Checking…";
      try{
        const r=await api("/api/redeem",{method:"POST",body:{code:d.code}});
        goPremium(r.plan==="annual"?"annual":"voucher"); save();
        ref.close(); confetti(); toast("Unlocked — enjoy full access 💛","🎉");
        cloudInit(); onDone&&onDone(); setTimeout(render,120);
      }catch(e){toast(e.message,"⚠️");btn.disabled=false;btn.textContent="Redeem";}
    }},"Redeem");
    b.appendChild(btn);
    setTimeout(()=>codeI.focus(),200);
    return b;
  }});
  return ref;
}

/* ---- admin sign-in (email + password; accounts are seeded, not self-serve) ---- */
function openAdminSignInSheet(onDone){
  const d={email:"",password:""};
  let ref;
  ref=sheet({title:"Admin sign in",body:(close)=>h("div.col.gap12",{style:{marginTop:"4px"}},[
    h("div",[h("label.lbl","Email"),h("input.field",{type:"email",placeholder:"admin@…",oninput:e=>d.email=e.target.value})]),
    h("div",[h("label.lbl","Password"),h("input.field",{type:"password",oninput:e=>d.password=e.target.value})]),
    (()=>{const btn=h("button.btn.btn-pri.btn-lg.btn-block",{onclick:async()=>{
      btn.disabled=true;btn.textContent="Signing in…";
      try{
        const r=await api("/api/auth/login",{method:"POST",body:d});
        S.account={id:r.user.id||r.user.email,email:r.user.email,name:r.user.name,role:r.user.role,token:r.token};
        save(); ref.close(); toast("Signed in ✓"); onDone&&onDone(); render();
      }catch(e){toast(e.message,"⚠️");btn.disabled=false;btn.textContent="Sign in";}
    }},"Sign in");return btn;})(),
  ])});
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
  if(S.account&&(S.account.id||S.account.phone||S.account.email))return S.account.id||S.account.phone||S.account.email;
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
