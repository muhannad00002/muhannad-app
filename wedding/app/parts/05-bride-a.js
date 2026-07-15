/* ============ ZAFFA — BRIDE SCREENS · A (onboarding · home · explore · checklist) ============ */

/* ---------- SPLASH / ROLE LAUNCHER ---------- */
route("/",()=>{ if(S.onboarded) return routes[S.role==="admin"?"/admin":"/home"](); return routes["/welcome"](); });

route("/welcome",()=>{
  const app=h("div.app");
  const s=h("div.screen.no-tab",{style:{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",
    background:"linear-gradient(160deg,var(--rose-tint),var(--ground) 55%,var(--gold-soft))"}});
  s.appendChild(h("div.stagger",{style:{textAlign:"center"}},[
    h("div",{style:{fontSize:"58px",marginBottom:"6px"}},"💍"),
    h("div.eyebrow",{style:{marginBottom:"10px"}},"Your personal wedding planner"),
    h("h1",{style:{fontSize:"52px",lineHeight:"1",marginBottom:"14px"}},"Zaffa"),
    h("p.muted",{style:{maxWidth:"320px",margin:"0 auto 30px",fontSize:"16px"}},
      "Every vendor, every task, every detail of your big day — beautifully in one place."),
    h("button.btn.btn-pri.btn-lg.btn-block",{style:{maxWidth:"300px",margin:"0 auto"},onclick:()=>go("/onboard")},["Start planning ",icon("fwd",18)]),
    h("button.btn.btn-quiet",{style:{margin:"14px auto 0",display:"flex"},onclick:()=>{S.role="admin";S.onboarded=true;save();go("/admin");}},"I'm an administrator"),
  ]));
  app.appendChild(s);
  return app;
});

/* ---------- ONBOARDING (name + date → generates checklist) ---------- */
route("/onboard",()=>{
  let step=0; const data={name:S.bride.name||"",date:S.bride.date||"",budget:S.bride.budget||6000};
  const app=h("div.app");
  const s=h("div.screen.no-tab",{style:{minHeight:"100vh",display:"flex",flexDirection:"column"}});
  app.appendChild(s);

  const steps=[
    {em:"🌸",h:"What's your name?",sub:"So we can make Zaffa truly yours.",field:()=>{
      const i=h("input.field",{placeholder:"e.g. Sarah",value:data.name,style:{fontSize:"18px",textAlign:"center"},
        oninput:e=>{data.name=e.target.value;next.disabled=!data.name.trim();}}); setTimeout(()=>i.focus(),200); return i;},
      valid:()=>data.name.trim()},
    {em:"📅",h:"When's the big day?",sub:"We'll count down and pace your plan for you.",field:()=>{
      const i=h("input.field",{type:"date",value:data.date,min:new Date().toISOString().slice(0,10),style:{fontSize:"17px",textAlign:"center"},
        oninput:e=>{data.date=e.target.value;next.disabled=!data.date;}}); return i;},
      valid:()=>!!data.date},
    {em:"💰",h:"Your budget?",sub:"A guide — you can change it anytime.",field:()=>{
      const wrap=h("div");
      const view=h("div.center",{style:{fontFamily:"var(--font-d)",fontSize:"40px",color:"var(--rose-deep)",margin:"6px 0 14px"}},money(data.budget));
      const r=h("input",{type:"range",min:1000,max:20000,step:500,value:data.budget,style:{width:"100%",accentColor:"var(--rose)"},
        oninput:e=>{data.budget=+e.target.value;view.textContent=money(data.budget);}});
      wrap.append(view,r,h("div.between.small.faint",{style:{marginTop:"6px"}},[h("span","OMR 1,000"),h("span","OMR 20,000")]));
      return wrap;},valid:()=>true},
  ];

  const dots=h("div.row",{style:{justifyContent:"center",gap:"7px",padding:"18px 0 8px"}});
  const body=h("div",{style:{flex:"1",display:"flex",flexDirection:"column",justifyContent:"center",padding:"0 6px"}});
  const next=h("button.btn.btn-pri.btn-lg.btn-block");
  const bar=h("div",{style:{padding:"10px 0 26px"}},next);
  const topRow=h("div.between",{style:{padding:"6px 0"}},[
    h("button.icon-btn.plain",{onclick:()=>{if(step===0)go("/welcome");else{step--;draw();}}},icon("back",22)),
    h("span.small.faint",{},()=>`${step+1} of ${steps.length}`),
  ]);
  s.append(topRow,dots,body,bar);

  function draw(){
    clear(dots); steps.forEach((_,i)=>dots.appendChild(h("span",{style:{width:i===step?"22px":"7px",height:"7px",borderRadius:"9px",
      background:i<=step?"var(--rose)":"var(--line2)",transition:"all .3s var(--ease)"}})));
    topRow.querySelector(".small").textContent=`${step+1} of ${steps.length}`;
    const st=steps[step]; clear(body);
    body.appendChild(h("div.stagger",{style:{textAlign:"center"}},[
      h("div",{style:{fontSize:"48px",marginBottom:"10px"}},st.em),
      h("h1",{style:{fontSize:"34px",marginBottom:"8px"}},st.h),
      h("p.muted",{style:{marginBottom:"26px"}},st.sub),
      st.field(),
    ]));
    next.textContent = step===steps.length-1?"Create my plan ✨":"Continue";
    next.disabled=!st.valid();
  }
  next.onclick=()=>{
    if(step<steps.length-1){step++;draw();return;}
    // finish
    S.bride.name=data.name.trim(); S.bride.date=data.date; S.bride.budget=data.budget;
    S.onboarded=true; S.role="bride";
    S.checklist={}; CHECKLIST_TEMPLATE.forEach(t=>S.checklist[t.id]="todo");
    // give the demo a realistic head-start so the app feels lived-in
    ["budget","date","guests","hall","planner"].forEach(id=>S.checklist[id]="done");
    ["photo","makeup","dress"].forEach(id=>S.checklist[id]="prog");
    S.selectedVendor={hall:"v011",planner:"v053"};
    save();
    go("/home"); setTimeout(confetti,250); setTimeout(()=>toast("Your wedding plan is ready 💗"),500);
  };
  draw();
  return app;
});

/* ---------- HOME ---------- */
route("/home",()=>{
  const d=daysLeft(), pct=progressPct(), c=counts();
  const hour=new Date().getHours();
  const greet=hour<12?"Good morning":hour<18?"Good afternoon":"Good evening";
  const feat=VENDORS.filter(v=>v.featured&&v.approved).slice(0,8);
  const homeCats=CATEGORIES.slice(0,7);

  const kids=[];
  // header
  kids.push(h("div.between",{style:{padding:"18px 0 10px"}},[
    h("div",[
      h("div.small.muted",greet),
      h("h1",{style:{fontSize:"27px",marginTop:"2px"}},[S.bride.name+" ",h("span",{style:{fontSize:"20px"}},"🌸")]),
    ]),
    h("div.row.gap8",[
      h("button.icon-btn",{onclick:()=>go("/assistant"),"aria-label":"AI assistant",style:{color:"var(--rose-deep)",background:"var(--rose-soft)",border:"0"}},icon("spark",21)),
      h("button.icon-btn",{onclick:()=>go("/notifications"),"aria-label":"Notifications",style:{position:"relative"}},
        [icon("bell",21), unreadNotifs()?h("span.badge-dot"):null]),
    ]),
  ]));

  // countdown hero
  const hero=h("div.hero",{style:{cursor:"pointer"},onclick:()=>go("/checklist")});
  if(d===null){
    hero.append(h("div.lbl2","Set your date"),h("h2",{style:{fontSize:"30px",margin:"6px 0 10px",color:"#fff"}},"When's the big day?"),
      h("button.btn.btn-sec.btn-sm",{onclick:e=>{e.stopPropagation();go("/profile/edit");}},"Add wedding date"));
  }else{
    const wk=Math.floor(d/7), mo=Math.floor(d/30.4);
    hero.append(
      h("div.lbl2","Your wedding is in"),
      h("div.row",{style:{alignItems:"baseline",gap:"10px",margin:"4px 0 2px"}},[
        h("span",{style:{fontFamily:"var(--font-d)",fontSize:"64px",fontWeight:"600",color:"#fff",lineHeight:"1"}},d),
        h("span",{style:{fontSize:"20px",color:"rgba(255,255,255,.9)"}},d===1?"day":"days"),
      ]),
      h("div.row",{style:{gap:"16px",marginTop:"12px",position:"relative"}},[
        countChip(mo,"months"),countChip(wk,"weeks"),countChip(d,"days"),
      ]),
    );
  }
  kids.push(hero);

  // progress ring + suggested tasks card
  const suggest=suggestedTasks(3);
  const planCard=h("div.card.pad",{style:{marginTop:"16px",display:"flex",gap:"18px",alignItems:"center",cursor:"pointer"},onclick:()=>go("/checklist")},[
    ringEl(pct,104,""),
    h("div.grow",[
      h("div.eyebrow","Wedding progress"),
      h("div.row",{style:{alignItems:"baseline",gap:"7px",margin:"3px 0 6px"}},[
        h("span",{style:{fontFamily:"var(--font-d)",fontSize:"30px",fontWeight:"600"}},pct+"%"),
        h("span.small.muted","complete")]),
      h("div.row.wrap.gap6",[
        h("span.tag.tag-done",[c.done+" done"]),
        h("span.tag.tag-prog",[c.prog+" in progress"]),
        h("span.tag.tag-todo",[c.todo+" to do"]),
      ]),
    ]),
  ]);
  kids.push(planCard);

  // Upcoming appointments (from booked vendors)
  const ups=upcomingBookings().slice(0,2);
  if(ups.length){
    kids.push(h("div.sec-h",{style:{marginTop:"26px"}},[h("h3","Upcoming"),h("span.link",{onclick:()=>go("/appointments")},"All")]));
    kids.push(h("div.col.gap8",ups.map(b=>{
      const dt=new Date(b.date+"T"+(b.time||"11:00")+":00");
      return h("div.check",{style:{cursor:"pointer"},onclick:()=>go("/appointments")},[
        h("div",{style:{width:"42px",textAlign:"center",flex:"none"}},[
          h("div",{style:{fontFamily:"var(--font-d)",fontSize:"20px",fontWeight:"600",color:"var(--rose-deep)",lineHeight:"1"}},dt.getDate()),
          h("div.tiny.faint",{style:{textTransform:"uppercase"}},dt.toLocaleDateString("en",{month:"short"}))]),
        h("div.grow",{style:{borderLeft:"1px solid var(--line)",paddingLeft:"12px"}},[
          h("div",{style:{fontWeight:"600"}},b.vendor.name),
          h("div.tiny.faint",[b.task?shortTask(b.task.title):"Appointment",b.time?(" · "+b.time):""])]),
        icon("cal",18,"faint"),
      ]);
    })));
  }

  // Ask Aya banner
  kids.push(h("div.card.pad",{style:{marginTop:ups.length?"16px":"26px",display:"flex",gap:"14px",alignItems:"center",cursor:"pointer",
    background:"linear-gradient(135deg,var(--rose-soft),var(--gold-soft))",border:"0"},onclick:()=>go("/assistant")},[
    h("span.avatar",{style:{width:"48px",height:"48px",fontSize:"20px",background:"linear-gradient(135deg,var(--rose),var(--gold))",flex:"none"}},"A"),
    h("div.grow",[h("b",{style:{fontSize:"16px"}},"Ask Aya, your AI assistant"),
      h("div.small.muted","Advice on vendors, budget & what to do next")]),
    icon("fwd",18,"faint"),
  ]));

  // Today's suggested tasks
  if(suggest.length){
    kids.push(h("div.sec-h",{style:{marginTop:"26px"}},[h("h3","Suggested for you"),h("span.link",{onclick:()=>go("/checklist")},"See plan")]));
    kids.push(h("div.col.gap8",suggest.map(t=>{
      const cat=t.catId?catById(t.catId):null;
      return h("div.check",{onclick:()=>openTaskSheet(t.id),style:{cursor:"pointer"}},[
        h("span",{style:{fontSize:"22px",width:"34px",textAlign:"center"}},cat?cat.icon:"📝"),
        h("div.grow",[h("div",{style:{fontWeight:"600"}},t.title),
          h("div.tiny.faint",t.catId?"Tap to browse "+cat.name.toLowerCase():"Tap to update")]),
        icon("fwd",18,"faint"),
      ]);
    })));
  }

  // Vendor categories grid
  kids.push(h("div.sec-h",{style:{marginTop:"26px"}},[h("h3","Browse vendors"),h("span.link",{onclick:()=>go("/categories")},"All categories")]));
  const grid=h("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"11px"}});
  homeCats.forEach(cat=>grid.appendChild(catTile(cat)));
  grid.appendChild(h("button.cat",{onclick:()=>go("/categories")},[
    h("span.em",{style:{background:"var(--gold-soft)"}},icon("grid",22)),h("span.nm","More")]));
  kids.push(grid);

  // Featured vendors rail
  kids.push(h("div.sec-h",{style:{marginTop:"26px"}},[h("h3","Featured vendors"),h("span.link",{onclick:()=>go("/search")},"See all")]));
  kids.push(h("div.scroll-x",{style:{display:"flex",gap:"14px",padding:"2px 0 4px",margin:"0 -20px",paddingLeft:"20px",paddingRight:"20px"}},
    feat.map(v=>vendorCard(v,{horizontal:true}))));

  // Ad banner
  const ad=ADS.find(a=>a.active&&a.placement==="home");
  if(ad){
    const av=vendorById(ad.vendorId);
    kids.push(h("div.card.card-2",{style:{marginTop:"24px",overflow:"hidden",display:"flex",cursor:"pointer",alignItems:"stretch"},
      onclick:()=>av&&go("/vendor/"+av.id)},[
      (()=>{const c=coverEl(av||"ad",""); c.style.width="96px"; c.style.borderRadius="0"; return c;})(),
      h("div.pad-s.grow",[h("span.tag.tag-gold","Sponsored"),
        h("h4",{style:{fontSize:"17px",margin:"6px 0 2px"}},ad.title),
        h("p.small.muted",ad.body)]),
    ]));
  }

  // Wedding tips carousel
  kids.push(h("div.sec-h",{style:{marginTop:"26px"}},[h("h3","Wedding tips"),h("span.faint.small","Swipe →")]));
  kids.push(h("div.scroll-x",{style:{display:"flex",gap:"12px",margin:"0 -20px",padding:"2px 20px 4px"}},
    TIPS.map((t,i)=>h("div.card.pad",{style:{minWidth:"270px",maxWidth:"270px",scrollSnapAlign:"start",
      background:i%2?"linear-gradient(145deg,var(--gold-soft),var(--surface))":"linear-gradient(145deg,var(--rose-soft),var(--surface))"}},[
      h("div",{style:{fontSize:"28px",marginBottom:"8px"}},t.em),
      h("h4",{style:{fontSize:"18px",marginBottom:"6px"}},t.t),
      h("p.small.muted",t.b),
    ]))));

  kids.push(h("div",{style:{textAlign:"center",padding:"30px 0 6px"}},
    h("span.faint.tiny","Made with 💗 for your big day")));

  const app=appFrame(h("div.stagger",kids),{tabs:brideTabs("/home")});
  app.appendChild(assistantFab());
  return app;

  function countChip(n,l){return h("div",{style:{flex:"1",background:"rgba(255,255,255,.16)",borderRadius:"var(--r-m)",padding:"9px 4px",textAlign:"center"}},
    [h("div",{style:{fontFamily:"var(--font-d)",fontSize:"22px",fontWeight:"600",color:"#fff"}},n),
     h("div",{style:{fontSize:"10.5px",color:"rgba(255,255,255,.85)",letterSpacing:".06em",textTransform:"uppercase"}},l)]);}
});

function catTile(cat){
  const locked=!categoryViewable(cat.id);
  const em=h("span.em",cat.icon);
  if(locked)em.appendChild(h("span",{style:{position:"absolute",top:"-2px",right:"-2px",fontSize:"13px",background:"var(--gold)",color:"#fff",width:"20px",height:"20px",borderRadius:"50%",display:"grid",placeItems:"center"}},"🔒"));
  em.style.position="relative";
  return h("button.cat",{onclick:()=>go("/category/"+cat.id)},[em,h("span.nm",cat.name)]);
}

/* ---------- CATEGORIES (all) ---------- */
route("/categories",()=>{
  const kids=[topbar("Explore",{right:h("button.icon-btn",{onclick:()=>go("/search")},icon("search",21))})];
  const search=h("input.field",{placeholder:"Search vendors, categories, cities…",style:{marginBottom:"18px"},
    onfocus:()=>go("/search")});
  kids.push(h("div",{style:{padding:"0 0 4px"}},search));
  // freemium banner
  if(!isPremium()){
    const left=freeCatsLeft();
    kids.push(h("div.card.pad-s",{style:{marginBottom:"14px",display:"flex",gap:"10px",alignItems:"center",cursor:"pointer",
      background:left>0?"var(--rose-tint)":"var(--gold-soft)",border:"0"},onclick:()=>openPaywall(left>0?"default":"category")},[
      h("span",{style:{fontSize:"20px"}},left>0?"🌸":"🔒"),
      h("div.grow",[h("b.small",left>0?`${left} free categor${left>1?"ies":"y"} left`:"Free categories used"),
        h("div.tiny.faint",left>0?"Go Premium to browse them all":"Unlock all categories with Premium")]),
      h("span.tag.tag-gold","Premium"),
    ]));
  }
  kids.push(h("div.eyebrow",{style:{margin:"4px 3px 12px"}},CATEGORIES.length+" categories"));
  const grid=h("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"12px"}});
  CATEGORIES.forEach(cat=>{
    const n=vendorsInCat(cat.id).length;
    const locked=!categoryViewable(cat.id);
    const em=h("span.em",{style:{width:"56px",height:"56px",fontSize:"27px",position:"relative"}},cat.icon);
    if(locked)em.appendChild(h("span",{style:{position:"absolute",top:"-3px",right:"-3px",fontSize:"12px",background:"var(--gold)",color:"#fff",width:"21px",height:"21px",borderRadius:"50%",display:"grid",placeItems:"center"}},"🔒"));
    grid.appendChild(h("button.cat",{onclick:()=>go("/category/"+cat.id),style:{padding:"18px 8px",gap:"9px"}},[
      em, h("span.nm",cat.name), h("span.tiny.faint",n+(n===1?" vendor":" vendors")),
    ]));
  });
  kids.push(grid);
  return appFrame(h("div.stagger",kids),{tabs:brideTabs("/categories")});
});

/* ---------- CHECKLIST (core feature) ---------- */
route("/checklist",()=>{
  const c=counts(), pct=progressPct();
  const kids=[];
  kids.push(topbar("Your plan",{right:h("button.icon-btn",{onclick:()=>go("/notifications"),style:{position:"relative"}},
    [icon("bell",21),unreadNotifs()?h("span.badge-dot"):null])}));

  // progress summary card
  kids.push(h("div.card.pad",{style:{display:"flex",gap:"16px",alignItems:"center"}},[
    ringEl(pct,96,""),
    h("div.grow",[
      h("h3",{style:{fontSize:"20px"}},pct<25?"Just getting started":pct<60?"You're making progress":pct<90?"Almost there!":"So close! ✨"),
      h("p.small.muted",{style:{margin:"4px 0 8px"}},`${c.done} of ${c.total} tasks complete`),
      h("div.bar",h("i",{style:{width:pct+"%"}})),
    ]),
  ]));

  // filter segmented
  let filter="all";
  const seg=h("div.seg",{style:{margin:"16px 0 4px"}});
  const listWrap=h("div.col.gap16",{style:{marginTop:"14px"}});
  [["all","All"],["todo","To do"],["prog","In progress"],["done","Done"]].forEach(([k,l])=>{
    seg.appendChild(h("button"+(k==="all"?".on":""),{onclick:e=>{filter=k;[...seg.children].forEach(b=>b.classList.remove("on"));e.target.classList.add("on");drawList();}},l));
  });
  kids.push(seg); kids.push(listWrap);

  function drawList(){
    clear(listWrap);
    // group by phase
    const phases=[...new Set(CHECKLIST_TEMPLATE.map(t=>t.phase))];
    phases.forEach(phase=>{
      const items=CHECKLIST_TEMPLATE.filter(t=>t.phase===phase && (filter==="all"||S.checklist[t.id]===filter));
      if(!items.length)return;
      const doneN=CHECKLIST_TEMPLATE.filter(t=>t.phase===phase&&S.checklist[t.id]==="done").length;
      const totN=CHECKLIST_TEMPLATE.filter(t=>t.phase===phase).length;
      const grp=h("div");
      grp.appendChild(h("div.between",{style:{margin:"2px 3px 10px"}},[
        h("div.eyebrow",phase),h("span.tiny.faint",doneN+"/"+totN)]));
      const col=h("div.col.gap8");
      items.forEach(t=>col.appendChild(checkRow(t,drawList)));
      grp.appendChild(col);
      listWrap.appendChild(grp);
    });
    if(!listWrap.children.length)listWrap.appendChild(h("div.empty",[h("div.em","🎉"),h("h3","Nothing here"),h("p.muted","No tasks match this filter.")]));
  }
  drawList();
  return appFrame(kids,{tabs:brideTabs("/checklist")});
});

function checkRow(t,rerender){
  const st=S.checklist[t.id]||"todo";
  const cat=t.catId?catById(t.catId):null;
  const sv=S.selectedVendor[t.id]?vendorById(S.selectedVendor[t.id]):null;
  const box=h("button.cbox"+(st==="done"?".done":st==="prog"?".prog":""),{"aria-label":"Toggle status",
    onclick:e=>{e.stopPropagation();
      const nxt= st==="todo"?"prog":st==="prog"?"done":"todo";
      setTask(t.id,nxt);
      if(nxt==="done")confetti();
      rerender();
    }},st==="done"?icon("check",17):st==="prog"?h("span",{style:{fontSize:"11px",fontWeight:"800"}},"~"):null);
  return h("div.check"+(st==="done"?".done":""),{onclick:()=>openTaskSheet(t.id,rerender),style:{cursor:"pointer"}},[
    box,
    h("div.grow",[
      h("div.ct",{style:{fontWeight:"600"}},t.title),
      h("div.tiny.faint",{style:{marginTop:"2px"}}, sv?("✓ "+sv.name) : cat?("Browse "+cat.name.toLowerCase()) : statusLabel(st)),
    ]),
    st!=="done"&&cat ? h("span.tag.tag-rose",{style:{flex:"none"},onclick:e=>{e.stopPropagation();go("/category/"+cat.id);}},"Browse") : h("span.tag "+statusTag(st),{style:{flex:"none"}},statusLabel(st)),
  ]);
}
const statusLabel=s=>({todo:"Not started",prog:"In progress",done:"Done"})[s]||s;
const statusTag=s=>({todo:"tag-todo",prog:"tag-prog",done:"tag-done"})[s]||"tag-todo";

/* task detail sheet: change status, jump to vendors, see suggestions */
function openTaskSheet(taskId,rerender){
  const t=templateById(taskId); if(!t)return;
  const cat=t.catId?catById(t.catId):null;
  const sv=S.selectedVendor[taskId]?vendorById(S.selectedVendor[taskId]):null;
  let ref;
  ref=sheet({title:t.title, body:(close)=>{
    const b=h("div.col.gap16");
    b.appendChild(h("div.row.gap8",[cat?h("span",{style:{fontSize:"26px"}},cat.icon):h("span",{style:{fontSize:"26px"}},"📝"),
      h("div",[h("div.eyebrow",t.phase),h("div.small.muted",cat?("Category · "+cat.name):"Personal task")])]));
    // status control
    const cur=S.checklist[taskId];
    const stat=h("div.stat3");
    [["todo","Not started","on-todo"],["prog","In progress","on-prog"],["done","Done","on-done"]].forEach(([k,l,onc])=>{
      stat.appendChild(h("button"+(cur===k?"."+onc:""),{onclick:()=>{
        setTask(taskId,k); if(k==="done")confetti();
        [...stat.children].forEach(x=>x.className="");
        stat.children[k==="todo"?0:k==="prog"?1:2].className=onc.replace("on-","on-"); // reflect
        [...stat.children].forEach((x,i)=>{x.className=(["todo","prog","done"][i]===k)?onc:"";});
        rerender&&rerender();
      }},l));
    });
    b.appendChild(h("div",[h("div.lbl","Status"),stat]));
    if(sv){
      b.appendChild(h("div.card.pad-s",{style:{display:"flex",gap:"12px",alignItems:"center",background:"var(--good-soft)"},onclick:()=>{close();go("/vendor/"+sv.id);}},[
        (()=>{const cv=coverEl(sv,""); cv.style.width="52px";cv.style.height="52px"; return cv;})(),
        h("div.grow",[h("div.small",{style:{fontWeight:"700"}},"Selected vendor"),h("div",{style:{fontWeight:"600"}},sv.name)]),
        icon("fwd",18,"faint"),
      ]));
    }
    if(cat){
      b.appendChild(h("button.btn.btn-pri.btn-block",{onclick:()=>{close();go("/category/"+cat.id);}},["Browse "+cat.name," ",icon("fwd",16)]));
    }
    // suggestions unlocked
    if(t.suggests&&t.suggests.length){
      const nexts=t.suggests.map(templateById).filter(Boolean);
      b.appendChild(h("div",[h("div.lbl","💡 What comes next"),
        h("div.col.gap8",nexts.map(n=>h("button.lrow",{style:{cursor:"pointer",width:"100%",textAlign:"left"},onclick:()=>{close();setTimeout(()=>openTaskSheet(n.id,rerender),260);}},[
          h("span",{style:{fontSize:"18px"}},n.catId?catById(n.catId).icon:"📝"),
          h("span.grow.small",{style:{fontWeight:"600"}},n.title),
          h("span.tag "+statusTag(S.checklist[n.id]),statusLabel(S.checklist[n.id])),
        ])))]));
    }
    return b;
  }});
}
