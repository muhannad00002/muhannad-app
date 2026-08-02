/* ============ ZAFFA — BOOT ============ */
load();

/* The admin panel is web-only: it must never run inside the native iOS/Android
   app (the store build ships the bride app alone). The native bundle also has
   admin.html stripped at sync time — this is the belt-and-braces guard. */
if(window.ZAFFA_ADMIN && isNativeApp()){
  document.body.innerHTML='<div style="font-family:-apple-system,system-ui,sans-serif;display:grid;'+
    'place-items:center;min-height:100vh;padding:32px;text-align:center;color:#2B2B2F;background:#F4F3F1">'+
    '<div><div style="font-size:44px">🔒</div><h2 style="margin:12px 0 6px">Admin is web-only</h2>'+
    '<p style="color:#7A6A6E;max-width:300px;margin:0 auto">Manage vendors from a browser at '+
    'weddingandco.vercel.app/admin.html</p></div></div>';
  throw new Error("admin_web_only");
}

showSplash();             // admin-configurable launch splash (bride app only; no-op if none set)
if(window.ZAFFA_ADMIN){
  // dedicated admin page (admin.html) — always lands on the access-controlled panel
  document.body.classList.add("admin");   // enables the wider desktop layout (see CSS)
  if(!location.hash || location.hash==="#/" || location.hash==="#/welcome") location.hash = "#/admin";
}else if(!location.hash){
  location.hash = S.onboarded ? (S.role==="admin"?"#/admin":"#/home") : "#/welcome";
}
render();
cloudInit();              // pulls the live catalog + account entitlement when a backend is configured
startCatalogPolling();    // keeps open apps in sync with admin changes in near real-time

// keep theme in sync with system when in auto mode
if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme:dark)").addEventListener?.("change",()=>{if(S.theme==="auto")applyTheme();});
}
