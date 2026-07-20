/* ============ ZAFFA — ADMIN DASHBOARD ============ */

/* Admin sign-in gate — shown for any /admin* route until an admin account is
   authenticated against the backend. This keeps the admin panel a separate,
   access-controlled area with no entry point from the customer app. */
function adminGateView(){
  const d={email:"",password:""};
  const app=h("div.app");
  const s=h("div.screen.no-tab",{style:{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",
    background:"linear-gradient(160deg,var(--gold-soft),var(--ground) 55%,var(--rose-tint))"}});
  const emailI=h("input.field",{type:"email",placeholder:"admin@…",value:d.email,oninput:e=>d.email=e.target.value});
  const passI=h("input.field",{type:"password",placeholder:"Password",oninput:e=>d.password=e.target.value,
    onkeydown:e=>{if(e.key==="Enter")submit();}});
  const btn=h("button.btn.btn-pri.btn-lg.btn-block",{style:{marginTop:"4px"},onclick:()=>submit()},"Sign in");
  async function submit(){
    if(!(typeof apiBase==="function" && apiBase())){toast("Backend not configured","⚠️");return;}
    btn.disabled=true;btn.textContent="Signing in…";
    try{
      const r=await api("/api/auth/login",{method:"POST",body:d});
      if(r.user.role!=="admin"){throw new Error("This account is not an administrator.");}
      S.account={id:r.user.id||r.user.email,email:r.user.email,name:r.user.name,role:r.user.role,token:r.token};
      S.role="admin"; save(); toast("Welcome back ✨"); go("/admin"); render();
    }catch(e){toast(e.message,"⚠️");btn.disabled=false;btn.textContent="Sign in";}
  }
  s.appendChild(h("div.stagger",{style:{textAlign:"center",maxWidth:"360px",margin:"0 auto",width:"100%"}},[
    h("div",{style:{fontSize:"46px",marginBottom:"6px"}},"🔐"),
    h("div.eyebrow",{style:{color:"var(--gold)",marginBottom:"8px"}},"Zaffa Admin"),
    h("h1",{style:{fontSize:"34px",marginBottom:"6px"}},"Control Center"),
    h("p.muted",{style:{marginBottom:"22px"}},"Sign in with your administrator account."),
    h("div.card.pad-l.col.gap12",{style:{textAlign:"left"}},[
      h("div",[h("label.lbl","Email"),emailI]),
      h("div",[h("label.lbl","Password"),passI]),
      btn,
    ]),
    h("button.btn.btn-quiet",{style:{margin:"14px auto 0",display:"flex"},onclick:()=>go("/home")},"← Back to app"),
  ]));
  app.appendChild(s);
  setTimeout(()=>emailI.focus(),200);
  return app;
}

function adminTop(title,right){
  return h("div.topbar",[
    h("div.grow",[h("div.eyebrow",{style:{color:"var(--gold)"}},"Admin"),h("h2",{style:{fontSize:"22px"}},title)]),
    right||null,
  ]);
}

/* ---------- OVERVIEW / ANALYTICS ---------- */
route("/admin",()=>{
  const activeVendors=VENDORS.filter(v=>v.approved).length;
  const pending=VENDORS.filter(v=>!v.approved).length;
  const featured=VENDORS.filter(v=>v.featured).length;
  const brides=USERS.filter(u=>u.role==="bride").length;
  const avgRating=(VENDORS.reduce((s,v)=>s+v.rating,0)/VENDORS.length).toFixed(2);

  const kids=[adminTop("Overview",h("button.icon-btn",{onclick:()=>adminSignOut()},icon("logout",20)))];

  // greeting
  kids.push(h("div.hero",{style:{background:"linear-gradient(140deg,#C6A469,#B76E79 60%,#9E5763)"}},[
    h("div.lbl2","Welcome back"),
    h("h2",{style:{fontSize:"26px",color:"#fff",margin:"4px 0 6px"}},"Zaffa Control Center"),
    h("p",{style:{color:"rgba(255,255,255,.9)",fontSize:"14px"}},`${activeVendors} vendors live · ${brides} brides planning`),
  ]));

  // KPI grid
  kids.push(h("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"11px",marginTop:"16px"}},[
    kpiCard(activeVendors,"Active vendors","tag",()=>go("/admin/vendors")),
    kpiCard(CATEGORIES.length,"Categories","grid",()=>go("/admin/categories")),
    kpiCard(brides,"Brides","users",()=>go("/admin/users")),
    kpiCard(featured,"Featured","star",()=>go("/admin/vendors")),
    kpiCard(pending,"Pending approval","clock",()=>go("/admin/vendors")),
    kpiCard(avgRating,"Avg rating","spark",null),
  ]));

  // vendors by category chart
  kids.push(h("h3",{style:{fontSize:"20px",margin:"26px 0 12px"}},"Vendors by category"));
  const top=CATEGORIES.map(c=>({c,n:vendorsInCat(c.id).length})).filter(x=>x.n).sort((a,b)=>b.n-a.n).slice(0,8);
  const max=Math.max(...top.map(x=>x.n),1);
  kids.push(h("div.card.pad.col.gap12",top.map(({c,n})=>h("div",[
    h("div.between.small",{style:{marginBottom:"5px"}},[h("span",[c.icon+" ",c.name]),h("b.faint",n)]),
    h("div.bar",h("i",{style:{width:(n/max*100)+"%"}})),
  ]))));

  // quick actions
  kids.push(h("h3",{style:{fontSize:"20px",margin:"26px 0 12px"}},"Quick actions"));
  kids.push(h("div",{style:{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:"11px"}},[
    quickAction("plus","Add vendor","var(--rose)",()=>openVendorForm()),
    quickAction("grid","Add category","var(--gold)",()=>openCategoryForm()),
    quickAction("megaphone","New notification","var(--rose)",()=>openBroadcastForm()),
    quickAction("tag","Manage ads","var(--gold)",()=>go("/admin/ads")),
  ]));

  return appFrame(h("div.stagger",kids),{tabs:adminTabs("/admin")});

  function kpiCard(v,k,ic,fn){return h("div.kpi",{style:{cursor:fn?"pointer":"default"},onclick:fn||undefined},[
    h("div.row.between",[h("div.v",{style:{color:"var(--ink)"}},v),h("span",{style:{color:"var(--rose)",opacity:.5}},icon(ic,20))]),
    h("div.k",k)]);}
  function quickAction(ic,label,col,fn){return h("button.card.pad",{style:{display:"flex",flexDirection:"column",gap:"10px",alignItems:"flex-start",cursor:"pointer"},onclick:fn},[
    h("span.icon-btn",{style:{width:"42px",height:"42px",background:col,color:"#fff",border:"0"}},icon(ic,20)),
    h("b.small",label)]);}
});

/* ---------- VENDORS MANAGEMENT ---------- */
route("/admin/vendors",()=>{
  let q="",tab="all";
  const kids=[adminTop("Vendors",h("button.icon-btn",{onclick:()=>openVendorForm()},icon("plus",22)))];
  const search=h("input.field",{placeholder:"Search vendors…",style:{marginBottom:"12px"},oninput:e=>{q=e.target.value;draw();}});
  kids.push(search);
  const seg=h("div.seg",{style:{marginBottom:"14px"}});
  [["all","All"],["featured","Featured"],["pending","Pending"]].forEach(([k,l])=>seg.appendChild(
    h("button"+(k==="all"?".on":""),{onclick:e=>{tab=k;[...seg.children].forEach(b=>b.classList.remove("on"));e.target.classList.add("on");draw();}},l)));
  kids.push(seg);
  const list=h("div.col.gap12");
  kids.push(list);
  function draw(){
    clear(list);
    let r=VENDORS.slice();
    if(tab==="featured")r=r.filter(v=>v.featured);
    if(tab==="pending")r=r.filter(v=>!v.approved);
    if(q){const s=q.toLowerCase();r=r.filter(v=>v.name.toLowerCase().includes(s)||catById(v.catId)?.name.toLowerCase().includes(s));}
    list.appendChild(h("div.small.faint",{style:{margin:"0 3px"}},r.length+" vendors"));
    r.forEach(v=>list.appendChild(adminVendorRow(v,draw)));
    if(!r.length)list.appendChild(h("div.empty",[h("div.em","📭"),h("h3","No vendors")]));
  }
  draw();
  return appFrame(kids,{tabs:adminTabs("/admin/vendors")});
});

function adminVendorRow(v,rerender){
  const cat=catById(v.catId);
  const cover=coverEl(v,""); cover.style.width="54px"; cover.style.height="54px";
  return h("div.card.pad-s",{style:{display:"flex",gap:"12px",alignItems:"center"}},[
    cover,
    h("div.grow",{style:{minWidth:0}},[
      h("div.row.gap6",[h("b",{style:{fontSize:"15px"}},v.name),
        !v.approved?h("span.tag.tag-warn","Pending"):null,
        v.featured?h("span.tag.tag-gold","★"):null]),
      h("div.tiny.faint",{style:{marginTop:"2px"}},[cat?.name," · ",v.city," · ★",v.rating.toFixed(1)]),
    ]),
    h("button.icon-btn.plain",{onclick:()=>openVendorActions(v,rerender)},icon("sliders",20)),
  ]);
}

function openVendorActions(v,rerender){
  let ref;
  ref=sheet({title:v.name,body:(close)=>h("div.col.gap8",[
    actionRow("edit","Edit vendor",()=>{close();openVendorForm(v,rerender);}),
    actionRow("star",v.featured?"Remove from featured":"Mark as featured",()=>{v.featured=!v.featured;save();close();toast(v.featured?"Featured ★":"Unfeatured");rerender();}),
    actionRow("check",v.approved?"Unapprove":"Approve vendor",()=>{v.approved=!v.approved;save();close();toast(v.approved?"Approved ✓":"Set to pending");rerender();}),
    actionRow("gift",v.offer?"Remove offer":"Add offer",()=>{close();openOfferForm(v,rerender);}),
    actionRow("fwd","Preview as bride",()=>{close();go("/vendor/"+v.id);}),
    h("div",{style:{height:"1px",background:"var(--line)",margin:"4px 0"}}),
    actionRow("trash","Delete vendor",()=>{close();confirmSheet("Delete vendor?",`“${v.name}” will be permanently removed.`,"Delete",()=>{
      const i=VENDORS.indexOf(v);if(i>=0)VENDORS.splice(i,1);save();toast("Vendor deleted");rerender();},true);},true),
  ])});
  function actionRow(ic,label,fn,danger){return h("button.lrow",{style:{width:"100%",cursor:"pointer",padding:"13px 4px"},onclick:fn},[
    h("span.icon-btn",{style:{width:"38px",height:"38px",background:danger?"var(--crit-soft)":"var(--rose-soft)",color:danger?"var(--crit)":"var(--rose-deep)",border:"0"}},icon(ic,18)),
    h("span.grow",{style:{fontWeight:"600",textAlign:"left",color:danger?"var(--crit)":""}},label)]);}
}

function openVendorForm(v,rerender){
  const isNew=!v;
  const d=v?{...v}:{name:"",catId:CATEGORIES[0].id,city:CITIES[0],governorate:GOVERNORATES[0],rating:4.7,reviews:0,priceLevel:2,short:"",desc:"",
    services:["Consultation","Bespoke packages"],hours:"Sat–Thu · 10:00 AM – 9:00 PM",instagram:"",whatsapp:"+968 ",phone:"+968 ",
    maps:"",featured:false,approved:true,isNew:true,offer:null,packages:[],reviewsList:[],popularity:94};
  if(!d.governorate)d.governorate=govOfCity(d.city);
  let ref;
  ref=sheet({title:isNew?"Add vendor":"Edit vendor",body:(close)=>{
    const b=h("div.col.gap12",{style:{marginTop:"4px"}});
    const F=(label,el)=>h("div",[h("label.lbl",label),el]);
    const name=h("input.field",{value:d.name,placeholder:"Vendor name",oninput:e=>d.name=e.target.value});
    const catSel=h("select.field",CATEGORIES.map(c=>h("option",{value:c.id,selected:c.id===d.catId},c.icon+" "+c.name)));
    catSel.onchange=e=>d.catId=e.target.value;
    const govSel=h("select.field",GOVERNORATES.map(g=>h("option",{value:g,selected:g===d.governorate},g)));
    govSel.onchange=e=>d.governorate=e.target.value;
    const cityI=h("input.field",{value:d.city,placeholder:"City / area (e.g. Muscat)",oninput:e=>d.city=e.target.value});
    const priceSel=h("select.field",[1,2,3,4].map(p=>h("option",{value:p,selected:p===d.priceLevel},priceLabel(p))));
    priceSel.onchange=e=>d.priceLevel=+e.target.value;
    const rating=h("input.field",{type:"number",min:1,max:5,step:.1,value:d.rating,oninput:e=>d.rating=Math.min(5,Math.max(1,+e.target.value||0))});
    const reviews=h("input.field",{type:"number",min:0,value:d.reviews,oninput:e=>d.reviews=+e.target.value||0});
    const short=h("input.field",{value:d.short,placeholder:"One-line description",oninput:e=>d.short=e.target.value});
    const desc=h("textarea.field",{placeholder:"Full description (optional)",oninput:e=>d.desc=e.target.value},d.desc||"");
    const ig=h("input.field",{value:d.instagram,placeholder:"@handle",oninput:e=>d.instagram=e.target.value});
    const wa=h("input.field",{value:d.whatsapp,placeholder:"+968 …",oninput:e=>d.whatsapp=e.target.value});
    const phone=h("input.field",{value:d.phone,placeholder:"+968 …",oninput:e=>d.phone=e.target.value});
    const feat=toggle("Featured vendor",d.featured,x=>d.featured=x);
    const appr=toggle("Approved & visible",d.approved,x=>d.approved=x);
    b.append(
      F("Name",name),
      F("Category",catSel),
      h("div.row.gap8",[h("div.grow",F("Governorate",govSel)),h("div.grow",F("City / area",cityI))]),
      h("div.row.gap8",[h("div.grow",F("Price tier",priceSel)),h("div.grow",F("Rating",rating)),h("div.grow",F("Reviews",reviews))]),
      F("Short description",short),F("Full description",desc),
      h("div.row.gap8",[h("div.grow",F("Instagram",ig)),h("div.grow",F("WhatsApp",wa))]),
      F("Phone",phone),feat,appr,
    );
    return b;
  },actions:[
    h("button.btn.btn-sec.grow",{onclick:()=>ref.close()},"Cancel"),
    h("button.btn.btn-pri.grow",{onclick:()=>{
      if(!d.name.trim()){toast("Please enter a name","⚠️");return;}
      d.priceRange=d.priceRange||({1:"OMR 40–120",2:"OMR 120–350",3:"OMR 350–900",4:"OMR 900+"})[d.priceLevel];
      if(isNew){
        _vid++; d.id="v"+String(Date.now()).slice(-6);
        d.services=d.services||["Consultation"]; d.hours=d.hours||"Sat–Thu · 10:00 AM – 9:00 PM";
        d.maps=d.maps||d.city+", Oman"; d.popularity=d.rating*20+d.reviews/12;
        d.packages=d.packages&&d.packages.length?d.packages:[{name:"Signature",price:d.priceRange,items:["Full service","Consultation included"],popular:true}];
        d.reviewsList=d.reviewsList&&d.reviewsList.length?d.reviewsList:[{by:"Aisha K.",stars:5,text:"Wonderful experience!",when:"Recently"}];
        VENDORS.unshift(d); toast("Vendor added ✓","🎉");
      }else{
        Object.assign(v,d); toast("Vendor updated ✓");
      }
      save(); ref.close(); rerender?rerender():render();
    }},isNew?"Add vendor":"Save"),
  ]});
}

function openOfferForm(v,rerender){
  const d={label:v.offer?.label||"",until:v.offer?.until||""};
  let ref;
  ref=sheet({title:v.offer?"Edit offer":"Add offer",body:(close)=>h("div.col.gap12",[
    h("div",[h("label.lbl","Offer text"),h("input.field",{value:d.label,placeholder:"e.g. 15% off this month",oninput:e=>d.label=e.target.value})]),
    h("div",[h("label.lbl","Valid until"),h("input.field",{type:"date",value:d.until,oninput:e=>d.until=e.target.value})]),
  ]),actions:[
    v.offer?h("button.btn.btn-sec.grow",{style:{color:"var(--crit)"},onclick:()=>{v.offer=null;save();ref.close();toast("Offer removed");rerender();}},"Remove"):null,
    h("button.btn.btn-pri.grow",{onclick:()=>{if(!d.label.trim()){toast("Enter offer text","⚠️");return;}v.offer={label:d.label,until:d.until};save();ref.close();toast("Offer saved 🎁");rerender();}},"Save offer"),
  ].filter(Boolean)});
}

/* ---------- CATEGORIES MANAGEMENT ---------- */
route("/admin/categories",()=>{
  const kids=[adminTop("Categories",h("button.icon-btn",{onclick:()=>openCategoryForm()},icon("plus",22)))];
  kids.push(h("p.small.muted",{style:{margin:"0 3px 14px"}},"Create unlimited categories. Tap to edit or reorder."));
  const list=h("div.col.gap8");
  kids.push(list);
  function draw(){
    clear(list);
    CATEGORIES.slice().sort((a,b)=>a.order-b.order).forEach((c,i)=>{
      const n=vendorsInCat(c.id).length;
      list.appendChild(h("div.card.pad-s",{style:{display:"flex",gap:"12px",alignItems:"center"}},[
        h("span",{style:{fontSize:"24px",width:"40px",height:"40px",display:"grid",placeItems:"center",background:"var(--rose-soft)",borderRadius:"var(--r-m)"}},c.icon),
        h("div.grow",[h("b",c.name),h("div.tiny.faint",n+" vendors")]),
        h("button.icon-btn.plain",{onclick:()=>openCategoryForm(c,draw)},icon("edit",18)),
        h("button.icon-btn.plain",{style:{color:"var(--crit)"},onclick:()=>{
          if(n>0){toast("Move or delete its vendors first","⚠️");return;}
          confirmSheet("Delete category?",`“${c.name}” will be removed.`,"Delete",()=>{const idx=CATEGORIES.indexOf(c);CATEGORIES.splice(idx,1);save();toast("Category deleted");draw();},true);
        }},icon("trash",18)),
      ]));
    });
  }
  draw();
  return appFrame(kids,{tabs:adminTabs("/admin/categories")});
});

function openCategoryForm(c,rerender){
  const isNew=!c;
  const emojis=["💍","👰","💐","🌸","💄","💇‍♀️","📸","🎥","🍰","🎂","🎀","✨","🚗","💌","🎁","💎","🌷","✈️","🍫","☕","🎧","🎻","🏛️","🏨","🧵","🛍️","🌿","🍽️","🖼️","🤍","🎉","👜","💃","🎺","🖨️","🔥","🕊️","🥂"];
  const d=c?{...c}:{id:"",name:"",icon:"🌸",order:(Math.max(0,...CATEGORIES.map(x=>x.order))+1)};
  let picked=d.icon;
  let ref;
  ref=sheet({title:isNew?"New category":"Edit category",body:(close)=>{
    const b=h("div.col.gap16",{style:{marginTop:"4px"}});
    const name=h("input.field",{value:d.name,placeholder:"Category name",oninput:e=>d.name=e.target.value});
    const grid=h("div",{style:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"8px"}});
    emojis.forEach(em=>{
      const btn=h("button",{style:{fontSize:"22px",padding:"9px 0",borderRadius:"var(--r-m)",background:em===picked?"var(--rose-soft)":"var(--surface2)",
        border:em===picked?"1.5px solid var(--rose)":"1.5px solid transparent"},onclick:()=>{picked=em;d.icon=em;[...grid.children].forEach(x=>{x.style.background="var(--surface2)";x.style.border="1.5px solid transparent";});btn.style.background="var(--rose-soft)";btn.style.border="1.5px solid var(--rose)";}},em);
      grid.appendChild(btn);
    });
    b.append(h("div",[h("label.lbl","Name"),name]),h("div",[h("label.lbl","Icon"),grid]));
    return b;
  },actions:[
    h("button.btn.btn-sec.grow",{onclick:()=>ref.close()},"Cancel"),
    h("button.btn.btn-pri.grow",{onclick:()=>{
      if(!d.name.trim()){toast("Enter a name","⚠️");return;}
      d.icon=picked;
      if(isNew){d.id="c"+Date.now().toString(36);CATEGORIES.push(d);toast("Category created ✓","🎉");}
      else{Object.assign(c,d);toast("Category updated ✓");}
      save();ref.close();rerender?rerender():render();
    }},isNew?"Create":"Save"),
  ]});
}

/* ---------- USERS ---------- */
route("/admin/users",()=>{
  const kids=[adminTop("Users")];
  const brides=USERS.filter(u=>u.role==="bride");
  kids.push(h("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"11px",marginBottom:"16px"}},[
    h("div.kpi.center",[h("div.v",{style:{color:"var(--rose-deep)"}},USERS.length),h("div.k","Total")]),
    h("div.kpi.center",[h("div.v",{style:{color:"var(--rose-deep)"}},brides.length),h("div.k","Brides")]),
    h("div.kpi.center",[h("div.v",{style:{color:"var(--rose-deep)"}},USERS.filter(u=>u.status==="active").length),h("div.k","Active")]),
  ]));
  kids.push(h("div.col.gap12",USERS.map(u=>h("div.card.pad-s",{style:{display:"flex",gap:"12px",alignItems:"center"}},[
    h("span.avatar",{style:{width:"44px",height:"44px",fontSize:"15px",background:u.role==="admin"?"linear-gradient(135deg,var(--gold),var(--rose-deep))":"linear-gradient(135deg,var(--rose),var(--gold))"}},initials(u.name)),
    h("div.grow",{style:{minWidth:0}},[h("div.row.gap6",[h("b",u.name),u.role==="admin"?h("span.tag.tag-gold","Admin"):null]),
      h("div.tiny.faint",{style:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}},u.email),
      u.date?h("div.tiny.faint",["💍 ",new Date(u.date+"T00:00:00").toLocaleDateString("en",{day:"numeric",month:"short",year:"numeric"})]):null]),
    h("button.icon-btn.plain",{onclick:()=>{
      let ref;ref=sheet({title:u.name,body:(close)=>h("div.col.gap8",[
        h("div.lrow",[h("span.grow.muted","Email"),h("b.small",u.email)]),
        h("div.lrow",[h("span.grow.muted","Role"),h("b.small",u.role)]),
        h("div.lrow",[h("span.grow.muted","Joined"),h("b.small",u.joined)]),
        h("div.lrow",[h("span.grow.muted","Status"),h("span.tag "+(u.status==="active"?"tag-done":"tag-todo"),u.status)]),
        h("button.btn.btn-sec.btn-block",{style:{marginTop:"8px"},onclick:()=>{u.status=u.status==="active"?"suspended":"active";save();ref.close();toast("User "+u.status);render();}},u.status==="active"?"Suspend user":"Reactivate user"),
        h("button.btn.btn-block",{style:{background:"var(--rose-soft)",color:"var(--rose-deep)"},onclick:()=>{close();openBroadcastForm(u);}},"Send notification"),
      ])});
    }},icon("sliders",20)),
  ]))));
  return appFrame(kids,{tabs:adminTabs("/admin/users")});
});

/* ---------- MORE (notifications · ads · tips · featured · templates) ---------- */
route("/admin/more",()=>{
  const kids=[adminTop("Manage",h("button.icon-btn",{onclick:()=>adminSignOut()},icon("logout",20)))];
  const items=[];
  // cloud publishing (when a backend is configured)
  if(typeof apiBase==="function" && apiBase()){
    if(S.account&&S.account.role==="admin"){
      items.push(["share","Sync status: auto","Changes publish automatically · tap to force-sync now",async()=>{
        toast("Syncing…","☁️");
        try{await publishCatalog();toast("Everything is live for customers ✓","🎉");}
        catch(e){toast(e.message,"⚠️");}
      }]);
    }else{
      items.push(["user","Admin sign in","Required to publish changes to the cloud",()=>openAdminSignInSheet()]);
    }
  }
  items.push(
    ["wallet","Bank Muscat payments","Merchant ID, access code & working key",()=>go("/admin/payments")],
    ["megaphone","Send notification","Broadcast to brides",()=>openBroadcastForm()],
    ["tag","Advertisements",ADS.filter(a=>a.active).length+" active",()=>go("/admin/ads")],
    ["spark","Wedding tips",TIPS.length+" tips",()=>go("/admin/tips")],
    ["star","Featured vendors",VENDORS.filter(v=>v.featured).length+" featured",()=>go("/admin/vendors")],
    ["list","Checklist template",CHECKLIST_TEMPLATE.length+" default tasks",()=>go("/admin/template")],
    ["chart","Analytics","View overview",()=>go("/admin")],
  );
  kids.push(h("div.card",{style:{overflow:"hidden"}},items.map(([ic,label,meta,fn])=>
    h("button.lrow",{style:{width:"100%",padding:"16px",cursor:"pointer"},onclick:fn},[
      h("span.icon-btn",{style:{width:"40px",height:"40px",background:"var(--rose-soft)",color:"var(--rose-deep)",border:"0"}},icon(ic,19)),
      h("div.grow",{style:{textAlign:"left"}},[h("b",label),h("div.tiny.faint",meta)]),
      icon("fwd",18,"faint"),
    ]))));
  if(S.account)kids.push(h("div.card.pad-s.row.gap12",{style:{marginTop:"16px"}},[
    h("span.icon-btn",{style:{width:"36px",height:"36px",background:"var(--good-soft)",color:"var(--good)",border:"0"}},icon("check",18)),
    h("div.grow",[h("b.small","Signed in as admin"),h("div.tiny.faint",S.account.email||"")])]));
  kids.push(h("button.btn.btn-sec.btn-block",{style:{marginTop:"12px",color:"var(--crit)"},onclick:()=>adminSignOut()},[icon("logout",18),"Sign out"]));
  return appFrame(kids,{tabs:adminTabs("/admin/more")});
});

/* Sign out of the admin account → the /admin gate re-appears */
function adminSignOut(){
  S.account=null; S.role="bride"; save();
  toast("Signed out"); render();
}

/* ---------- BANK MUSCAT / SMARTPAY SETTINGS ---------- */
route("/admin/payments",()=>{
  const kids=[adminTop("Bank Muscat")];
  const status=h("div.card.pad-s",{style:{marginBottom:"14px"}},h("div.small.muted","Loading current settings…"));
  kids.push(status);
  const form=h("div.card.pad.col.gap12");
  const d={merchantId:"",accessCode:"",workingKey:"",txnUrl:"",currency:"OMR"};
  const midI=h("input.field",{placeholder:"e.g. 249",oninput:e=>d.merchantId=e.target.value});
  const acI=h("input.field",{placeholder:"Access code",oninput:e=>d.accessCode=e.target.value});
  const wkI=h("input.field",{type:"password",placeholder:"Leave blank to keep current",oninput:e=>d.workingKey=e.target.value});
  const urlI=h("input.field",{placeholder:"Transaction URL",oninput:e=>d.txnUrl=e.target.value});
  const curI=h("input.field",{value:"OMR",oninput:e=>d.currency=e.target.value});
  form.append(
    h("div",[h("label.lbl","Merchant ID (MID)"),midI]),
    h("div",[h("label.lbl","Access code"),acI]),
    h("div",[h("label.lbl","Working key"),wkI]),
    h("div",[h("label.lbl","Transaction URL"),urlI]),
    h("div",[h("label.lbl","Currency"),curI]),
  );
  const saveBtn=h("button.btn.btn-pri.btn-lg.btn-block",{style:{marginTop:"14px"},onclick:async()=>{
    if(!d.merchantId.trim()||!d.accessCode.trim()){toast("Enter MID and access code","⚠️");return;}
    saveBtn.disabled=true;saveBtn.textContent="Saving…";
    try{
      const r=await api("/api/admin/config/smartpay",{method:"PUT",body:d});
      toast("Bank Muscat settings saved ✓","🏦"); paint(r);
      d.workingKey=""; wkI.value="";
    }catch(e){toast(e.message,"⚠️");}
    saveBtn.disabled=false;saveBtn.textContent="Save settings";
  }},"Save settings");
  kids.push(form);
  kids.push(saveBtn);
  kids.push(h("p.tiny.faint",{style:{margin:"14px 3px"}},
    "The working key is stored securely on the server and never shown in full. After saving, use the test link below to confirm the credentials with Bank Muscat."));
  const testBtn=h("button.btn.btn-sec.btn-block",{onclick:()=>openLink(apiBase()+"/api/payments/smartpay/testpage")},
    [icon("fwd",16),"Open credential test page"]);
  kids.push(testBtn);

  function paint(cfg){
    clear(status);
    const ok=cfg.configured;
    status.appendChild(h("div.row.gap10",{style:{alignItems:"center"}},[
      h("span.icon-btn",{style:{width:"38px",height:"38px",background:ok?"var(--good-soft)":"var(--warn-soft)",color:ok?"var(--good)":"var(--warn)",border:"0"}},icon(ok?"check":"info",18)),
      h("div.grow",[h("b.small",ok?"Connected to Bank Muscat":"Not fully configured"),
        h("div.tiny.faint",cfg.merchantId?("MID "+cfg.merchantId+(cfg.workingKeySet?" · key "+cfg.workingKeyMasked:"")):"No credentials yet")]),
    ]));
    midI.value=cfg.merchantId||""; d.merchantId=cfg.merchantId||"";
    acI.value=cfg.accessCode||""; d.accessCode=cfg.accessCode||"";
    urlI.value=cfg.txnUrl||""; d.txnUrl=cfg.txnUrl||"";
    curI.value=cfg.currency||"OMR"; d.currency=cfg.currency||"OMR";
    wkI.placeholder=cfg.workingKeySet?"•••• set — blank keeps it":"Enter working key";
  }
  api("/api/admin/config/smartpay").then(paint).catch(e=>{clear(status);status.appendChild(h("div.small.muted","Couldn't load settings: "+e.message));});
  return appFrame(kids,{tabs:adminTabs("/admin/more")});
});

function openBroadcastForm(user){
  const d={em:"💌",title:"",body:""};
  const emojis=["💌","🔔","🎁","💄","📸","🎂","🏛️","✨","💗"];
  let ref;
  ref=sheet({title:user?("Notify "+user.name):"Send notification",body:(close)=>{
    const emRow=h("div.row.wrap.gap8");
    emojis.forEach(em=>{const b=h("button.chip"+(em===d.em?".on":""),{onclick:()=>{d.em=em;[...emRow.children].forEach(x=>x.classList.remove("on"));b.classList.add("on");}},em);emRow.appendChild(b);});
    return h("div.col.gap12",[
      h("div",[h("label.lbl","Icon"),emRow]),
      h("div",[h("label.lbl","Title"),h("input.field",{placeholder:"Notification title",oninput:e=>d.title=e.target.value})]),
      h("div",[h("label.lbl","Message"),h("textarea.field",{placeholder:"Message to brides…",oninput:e=>d.body=e.target.value})]),
    ]);
  },actions:[
    h("button.btn.btn-sec.grow",{onclick:()=>ref.close()},"Cancel"),
    h("button.btn.btn-pri.grow",{onclick:()=>{if(!d.title.trim()){toast("Enter a title","⚠️");return;}
      pushNotif({em:d.em,title:d.title,body:d.body}); ref.close(); toast("Notification sent 📨");}},[icon("send",16),"Send"]),
  ]});
}

/* ---------- ADS ---------- */
route("/admin/ads",()=>{
  const kids=[adminTop("Advertisements",h("button.icon-btn",{onclick:()=>openAdForm()},icon("plus",22)))];
  const list=h("div.col.gap12"); kids.push(list);
  function draw(){clear(list);
    if(!ADS.length)list.appendChild(h("div.empty",[h("div.em","📢"),h("h3","No ads"),h("p.muted","Create a promoted banner for the home screen.")]));
    ADS.forEach(a=>{const av=vendorById(a.vendorId);
      list.appendChild(h("div.card.pad-s",[
        h("div.between",[h("div.row.gap8",[h("span.tag "+(a.active?"tag-gold":"tag-todo"),a.active?"Active":"Paused"),h("b",a.title)]),
          h("button.icon-btn.plain",{onclick:()=>{
            let ref;ref=sheet({title:a.title,body:(close)=>h("div.col.gap8",[
              h("button.lrow",{style:{width:"100%",cursor:"pointer"},onclick:()=>{a.active=!a.active;save();ref.close();toast(a.active?"Ad activated":"Ad paused");draw();}},[icon("check",18,"faint"),h("span.grow",{style:{fontWeight:600}},a.active?"Pause ad":"Activate ad")]),
              h("button.lrow",{style:{width:"100%",cursor:"pointer"},onclick:()=>{ref.close();openAdForm(a,draw);}},[icon("edit",18,"faint"),h("span.grow",{style:{fontWeight:600}},"Edit ad")]),
              h("button.lrow",{style:{width:"100%",cursor:"pointer",color:"var(--crit)"},onclick:()=>{const i=ADS.indexOf(a);ADS.splice(i,1);save();ref.close();toast("Ad deleted");draw();}},[icon("trash",18),h("span.grow",{style:{fontWeight:600}},"Delete ad")]),
            ])});
          }},icon("sliders",20))]),
        h("p.small.muted",{style:{marginTop:"6px"}},a.body),
        av?h("div.tiny.faint",{style:{marginTop:"4px"}},["Links to: ",av.name]):null,
      ]));
    });
  }
  draw();
  return appFrame(kids,{tabs:adminTabs("/admin/more")});
});
function openAdForm(a,rerender){
  const isNew=!a; const d=a?{...a}:{title:"",body:"",vendorId:VENDORS[0].id,active:true,placement:"home"};
  let ref;
  ref=sheet({title:isNew?"New ad":"Edit ad",body:(close)=>{
    const vSel=h("select.field",VENDORS.map(v=>h("option",{value:v.id,selected:v.id===d.vendorId},v.name)));
    vSel.onchange=e=>d.vendorId=e.target.value;
    return h("div.col.gap12",[
      h("div",[h("label.lbl","Title"),h("input.field",{value:d.title,oninput:e=>d.title=e.target.value})]),
      h("div",[h("label.lbl","Body"),h("input.field",{value:d.body,oninput:e=>d.body=e.target.value})]),
      h("div",[h("label.lbl","Links to vendor"),vSel]),
    ]);
  },actions:[
    h("button.btn.btn-sec.grow",{onclick:()=>ref.close()},"Cancel"),
    h("button.btn.btn-pri.grow",{onclick:()=>{if(!d.title.trim()){toast("Enter a title","⚠️");return;}
      if(isNew){d.id="ad"+Date.now().toString(36);ADS.push(d);toast("Ad created ✓");}else{Object.assign(a,d);toast("Ad updated ✓");}
      save();ref.close();rerender?rerender():render();}},isNew?"Create":"Save"),
  ]});
}

/* ---------- TIPS ---------- */
route("/admin/tips",()=>{
  const kids=[adminTop("Wedding tips",h("button.icon-btn",{onclick:()=>openTipForm()},icon("plus",22)))];
  const list=h("div.col.gap12"); kids.push(list);
  function draw(){clear(list);
    TIPS.forEach((t,i)=>list.appendChild(h("div.card.pad-s",[
      h("div.between",[h("div.row.gap8",[h("span",{style:{fontSize:"22px"}},t.em),h("b",t.t)]),
        h("div.row.gap6",[h("button.icon-btn.plain",{onclick:()=>openTipForm(t,draw)},icon("edit",18)),
          h("button.icon-btn.plain",{style:{color:"var(--crit)"},onclick:()=>{TIPS.splice(i,1);save();toast("Tip removed");draw();}},icon("trash",18))])]),
      h("p.small.muted",{style:{marginTop:"6px"}},t.b),
    ])));
  }
  draw();
  return appFrame(kids,{tabs:adminTabs("/admin/more")});
});
function openTipForm(t,rerender){
  const isNew=!t; const d=t?{...t}:{em:"💡",t:"",b:""};
  let ref;
  ref=sheet({title:isNew?"New tip":"Edit tip",body:(close)=>h("div.col.gap12",[
    h("div",[h("label.lbl","Emoji"),h("input.field",{value:d.em,maxlength:2,oninput:e=>d.em=e.target.value})]),
    h("div",[h("label.lbl","Title"),h("input.field",{value:d.t,oninput:e=>d.t=e.target.value})]),
    h("div",[h("label.lbl","Body"),h("textarea.field",{oninput:e=>d.b=e.target.value},d.b||"")]),
  ]),actions:[
    h("button.btn.btn-sec.grow",{onclick:()=>ref.close()},"Cancel"),
    h("button.btn.btn-pri.grow",{onclick:()=>{if(!d.t.trim()){toast("Enter a title","⚠️");return;}
      if(isNew)TIPS.push(d);else Object.assign(t,d);save();ref.close();toast("Tip saved ✓");rerender?rerender():render();}},isNew?"Add":"Save"),
  ]});
}

/* ---------- CHECKLIST TEMPLATE (read-only overview) ---------- */
route("/admin/template",()=>{
  const kids=[adminTop("Checklist template")];
  kids.push(h("p.small.muted",{style:{margin:"0 3px 16px"}},"The default plan generated for every new bride, grouped by phase. "+CHECKLIST_TEMPLATE.length+" tasks."));
  const phases=[...new Set(CHECKLIST_TEMPLATE.map(t=>t.phase))];
  phases.forEach(ph=>{
    kids.push(h("div.eyebrow",{style:{margin:"18px 3px 10px"}},ph));
    kids.push(h("div.card",{style:{overflow:"hidden"}},CHECKLIST_TEMPLATE.filter(t=>t.phase===ph).map(t=>{
      const cat=t.catId?catById(t.catId):null;
      return h("div.lrow",{style:{padding:"13px 14px"}},[
        h("span",{style:{fontSize:"18px",width:"28px"}},cat?cat.icon:"📝"),
        h("div.grow",[h("b.small",t.title),t.suggests&&t.suggests.length?h("div.tiny.faint",{style:{marginTop:"2px"}},"→ unlocks "+t.suggests.map(s=>shortTask(templateById(s).title)).join(", ")):null]),
        cat?h("span.tag.tag-rose",{style:{flex:"none"}},cat.name):h("span.tag.tag-todo",{style:{flex:"none"}},"Personal"),
      ]);
    })));
  });
  return appFrame(kids,{tabs:adminTabs("/admin/more")});
});
