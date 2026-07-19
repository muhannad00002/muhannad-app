/* ============ ZAFFA — BOOT ============ */
load();
if(window.ZAFFA_ADMIN){
  // dedicated admin page (admin.html) — always lands on the access-controlled panel
  if(!location.hash || location.hash==="#/" || location.hash==="#/welcome") location.hash = "#/admin";
}else if(!location.hash){
  location.hash = S.onboarded ? (S.role==="admin"?"#/admin":"#/home") : "#/welcome";
}
render();
cloudInit();   // pulls the live catalog + account entitlement when a backend is configured

// keep theme in sync with system when in auto mode
if(window.matchMedia){
  window.matchMedia("(prefers-color-scheme:dark)").addEventListener?.("change",()=>{if(S.theme==="auto")applyTheme();});
}
