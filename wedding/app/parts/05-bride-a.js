/* ============ ZAFFA — BRIDE SCREENS · A (onboarding · home · explore · checklist) ============ */

/* ---------- SPLASH / ROLE LAUNCHER ---------- */
route("/",()=>{ if(S.onboarded) return routes[S.role==="admin"?"/admin":"/home"](); return routes["/welcome"](); });

route("/welcome",()=>{
  const app=h("div.app");
  const s=h("div.screen.no-tab",{style:{minHeight:"100vh",display:"flex",flexDirection:"column",justifyContent:"center",
    background:"linear-gradient(160deg,var(--rose-tint),var(--ground) 55%,var(--gold-soft))"}});
  s.appendChild(h("div.stagger",{style:{textAlign:"center"}},[
    h("div",{style:{marginBottom:"14px"}},logoMark(76)),
    h("div.eyebrow",{style:{marginBottom:"10px"}},"Wedding Planner"),
    h("h1",{style:{fontSize:"46px",lineHeight:"1.02",marginBottom:"14px",letterSpacing:".01em"}},"Wedding & Co"),
    h("p.muted",{style:{maxWidth:"320px",margin:"0 auto 30px",fontSize:"16px"}},
      "Every vendor, every task, every detail of your big day — beautifully in one place."),
    h("button.btn.btn-pri.btn-lg.btn-block",{style:{maxWidth:"300px",margin:"0 auto"},onclick:()=>go("/onboard")},["Start planning ",icon("fwd",18)]),
  ]));
  app.appendChild(s);
  return app;
});

/* ---------- ONBOARDING (name + date → generates checklist) ---------- */
route("/onboard",()=>{
  let step=0; const data={name:S.bride.name||"",age:S.bride.age||"",governorate:S.bride.governorate||(S.account&&S.account.governorate)||GOVERNORATES[0],date:S.bride.date||"",budget:S.bride.budget||6000};
  const app=h("div.app");
  const s=h("div.screen.no-tab",{style:{minHeight:"100vh",display:"flex",flexDirection:"column"}});
  app.appendChild(s);
  const refreshNext=()=>{ next.disabled=!steps[step].valid(); };

  const steps=[
    {em:"🌸",h:"What's your name?",sub:"So we can make Wedding & Co truly yours.",field:()=>{
      const i=h("input.field",{placeholder:"e.g. Sarah",value:data.name,style:{fontSize:"18px",textAlign:"center"},
        oninput:e=>{data.name=e.target.value;refreshNext();}}); setTimeout(()=>i.focus(),200); return i;},
      valid:()=>!!data.name.trim()},
    {em:"🎂",h:"How old are you?",sub:"Helps us tailor advice to you.",field:()=>{
      const i=h("input.field",{type:"number",min:18,max:100,inputmode:"numeric",placeholder:"e.g. 26",value:data.age,style:{fontSize:"18px",textAlign:"center"},
        oninput:e=>{data.age=e.target.value;refreshNext();}}); setTimeout(()=>i.focus(),200); return i;},
      valid:()=>{const a=parseInt(data.age,10);return a>=18&&a<=100;}},
    {em:"📍",h:"Where's your wedding?",sub:"Your governorate — we'll show local vendors first.",field:()=>{
      const sel=h("select.field",{style:{fontSize:"17px"}},GOVERNORATES.map(g=>h("option",{value:g,selected:g===data.governorate},g)));
      sel.onchange=e=>{data.governorate=e.target.value;refreshNext();}; return sel;},
      valid:()=>!!data.governorate},
    {em:"📅",h:"When's the big day?",sub:"We'll count down and pace your plan for you.",field:()=>{
      const i=h("input.field",{type:"date",value:data.date,min:new Date().toISOString().slice(0,10),style:{fontSize:"17px",textAlign:"center"},
        oninput:e=>{data.date=e.target.value;refreshNext();}}); return i;},
      valid:()=>!!data.date},
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
    // finish — save profile + generate the checklist
    S.bride.name=data.name.trim(); S.bride.date=data.date; S.bride.budget=data.budget;
    S.bride.age=parseInt(data.age,10)||null; S.bride.governorate=data.governorate;
    S.onboarded=true; S.role="bride";
    S.checklist={}; CHECKLIST_TEMPLATE.forEach(t=>S.checklist[t.id]="todo");
    // the date + budget steps are genuinely completed during onboarding
    S.checklist.date="done"; S.checklist.budget="done";
    S.selectedVendor={}; S.bookings={};
    save();
    go("/home"); setTimeout(confetti,250);
    // then ask to register a phone number — fully skippable
    setTimeout(()=>{
      if(typeof openAccountSheet==="function" && apiBase() && !(S.account&&S.account.token)){
        openAccountSheet(()=>{}, {skippable:true, prefill:{name:data.name.trim(),age:data.age,governorate:data.governorate}});
      }else{
        toast("Your wedding plan is ready 💗");
      }
    },650);
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

  // Featured vendors
  const mineGov=(typeof myGovernorate==="function")?myGovernorate():"";
  const featuredV=VENDORS.filter(v=>v.featured&&v.approved)
    .sort((a,b)=>((b.governorate===mineGov)-(a.governorate===mineGov)) || ((typeof viewCount==="function"?viewCount(b)-viewCount(a):0)))
    .slice(0,10);
  if(featuredV.length){
    kids.push(h("div.sec-h",{style:{marginTop:"26px"}},[h("h3","Featured vendors"),h("span.link",{onclick:()=>go("/categories")},"See all")]));
    kids.push(h("div.scroll-x",{style:{display:"flex",gap:"13px",margin:"0 -20px",padding:"2px 20px 6px",scrollSnapType:"x mandatory"}},
      featuredV.map(v=>vendorCard(v,{horizontal:true}))));
  }

  // Vendor categories grid
  kids.push(h("div.sec-h",{style:{marginTop:"26px"}},[h("h3","Browse vendors"),h("span.link",{onclick:()=>go("/categories")},"All categories")]));
  const grid=h("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"11px"}});
  homeCats.forEach(cat=>grid.appendChild(catTile(cat)));
  grid.appendChild(h("button.cat",{onclick:()=>go("/categories")},[
    h("span.em",{style:{background:"var(--gold-soft)"}},icon("grid",22)),h("span.nm","More")]));
  kids.push(grid);

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

  // expense tracker — total spent across booked vendors vs budget
  let expCard=expenseCard();
  kids.push(expCard);

  // filter segmented
  let filter="all";
  const seg=h("div.seg",{style:{margin:"16px 0 4px"}});
  const listWrap=h("div.col.gap16",{style:{marginTop:"14px"}});
  [["all","All"],["todo","To do"],["prog","In progress"],["done","Done"]].forEach(([k,l])=>{
    seg.appendChild(h("button"+(k==="all"?".on":""),{onclick:e=>{filter=k;[...seg.children].forEach(b=>b.classList.remove("on"));e.target.classList.add("on");drawList();}},l));
  });
  kids.push(seg); kids.push(listWrap);

  function drawList(){
    // keep the expense summary in sync with any newly-booked prices
    // (only once it's mounted — the first call happens before appFrame renders)
    if(expCard.isConnected){const nc=expenseCard(); expCard.replaceWith(nc); expCard=nc;}
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

/* expense tracker card for the plan screen */
function expenseCard(){
  const spent=totalSpent();
  const budget=+S.bride.budget||0;
  const over=budget&&spent>budget;
  const pct=budget?Math.min(100,Math.round(spent/budget*100)):0;
  // booked line items that carry a price (vendor-linked or a personal task)
  const items=Object.entries(S.bookings)
    .map(([taskId,b])=>({taskId,b,vendor:b&&b.vendorId?vendorById(b.vendorId):null,task:templateById(taskId)}))
    .filter(x=>x.b&&x.b.price)
    .sort((a,b)=>(+b.b.price)-(+a.b.price));
  const card=h("div.card.pad",{style:{marginTop:"14px"}});
  card.append(
    h("div.between",{style:{alignItems:"flex-end"}},[
      h("div",[h("div.eyebrow","Expenses"),
        h("div",{style:{fontFamily:"var(--font-d)",fontSize:"24px",color:over?"var(--crit)":"var(--rose-deep)",marginTop:"2px"}},money(spent))]),
      h("div",{style:{textAlign:"right"}},[h("div.tiny.faint","of budget"),h("b.small",money(budget))]),
    ]),
    h("div.bar",{style:{marginTop:"10px"}},h("i",{style:{width:pct+"%",background:over?"var(--crit)":undefined}})),
  );
  if(budget)card.append(h("div.tiny.faint",{style:{marginTop:"6px"}},
    over?("You're "+money(spent-budget)+" over budget"):(money(budget-spent)+" left to spend")));
  if(items.length){
    const list=h("div.col.gap8",{style:{marginTop:"12px"}});
    items.forEach(({taskId,b,vendor,task})=>list.appendChild(
      h("button.lrow",{style:{cursor:"pointer",width:"100%",textAlign:"left"},onclick:()=>openBookedSheet(taskId,()=>go("/checklist"))},[
        h("div.grow",{style:{minWidth:0}},[h("b.small",bookingVendorName(b)||(task?shortTask(task.title):"Booking")),
          h("div.tiny.faint",[task?shortTask(task.title):"Booked",b.date?(" · "+new Date(b.date+"T00:00:00").toLocaleDateString("en",{day:"numeric",month:"short"})):""])]),
        h("b.small",{style:{flex:"none",color:"var(--rose-deep)"}},money(+b.price)),
      ])));
    card.append(list);
  }else{
    card.append(h("p.tiny.faint",{style:{margin:"10px 2px 0"}},"Book a vendor and add the agreed price to start tracking your spending here."));
  }
  return card;
}

function checkRow(t,rerender){
  const st=S.checklist[t.id]||"todo";
  const cat=t.catId?catById(t.catId):null;
  const sv=S.selectedVendor[t.id]?vendorById(S.selectedVendor[t.id]):null;
  const bk=S.bookings[t.id];
  const box=h("button.cbox"+(st==="done"?".done":st==="prog"?".prog":""),{"aria-label":"Toggle status",
    onclick:e=>{e.stopPropagation();
      const nxt= st==="todo"?"prog":st==="prog"?"done":"todo";
      // checking an item off → capture booking date + price so she can track expenses
      if(nxt==="done"){ openBookedSheet(t.id,rerender); return; }
      setTask(t.id,nxt);
      rerender();
    }},st==="done"?icon("check",17):st==="prog"?h("span",{style:{fontSize:"11px",fontWeight:"800"}},"~"):null);
  return h("div.check"+(st==="done"?".done":""),{onclick:()=>openTaskSheet(t.id,rerender),style:{cursor:"pointer"}},[
    box,
    h("div.grow",[
      h("div.ct",{style:{fontWeight:"600"}},t.title),
      h("div.tiny.faint",{style:{marginTop:"2px"}}, bookingSubtitle(bk,sv,cat,st)),
    ]),
    st!=="done"&&cat ? h("span.tag.tag-rose",{style:{flex:"none"},onclick:e=>{e.stopPropagation();go("/category/"+cat.id);}},"Browse") : h("span.tag "+statusTag(st),{style:{flex:"none"}},statusLabel(st)),
  ]);
}
/* row subtitle: prefer booked date + price, then vendor, then a hint */
function bookingSubtitle(bk,sv,cat,st){
  const vn=bookingVendorName(bk)||(sv?sv.name:"");
  if(bk&&(bk.date||bk.price||vn)){
    const parts=[];
    parts.push(vn?("✓ "+vn):"✓ Booked");
    if(bk.date)parts.push(new Date(bk.date+"T00:00:00").toLocaleDateString("en",{day:"numeric",month:"short"}));
    if(bk.price)parts.push(money(+bk.price));
    return parts.join(" · ");
  }
  if(sv)return "✓ "+sv.name;
  if(cat)return "Browse "+cat.name.toLowerCase();
  return statusLabel(st);
}
/* sheet shown when a bride checks a task off: capture booking date + price */
function openBookedSheet(taskId,rerender){
  const t=templateById(taskId);
  const ex=S.bookings[taskId]||{};
  const sv=S.selectedVendor[taskId]?vendorById(S.selectedVendor[taskId]):null;
  const d={date:ex.date||"",price:ex.price!=null?ex.price:"",
    vendorName:bookingVendorName(ex)||(sv?sv.name:"")};
  let ref;
  ref=sheet({title:"Booked",body:(close)=>{
    const b=h("div.col.gap16",{style:{marginTop:"4px"}});
    b.appendChild(h("div.row.gap8",[h("span",{style:{fontSize:"24px"}},"✅"),
      h("div",[h("b",t?shortTask(t.title):"Task"),h("div.tiny.faint","Add your booking details")])]));
    const vendorI=h("input.field",{value:d.vendorName,placeholder:"e.g. Rose & Ivory",oninput:e=>d.vendorName=e.target.value});
    const dateI=h("input.field",{type:"date",value:d.date,max:S.bride.date||undefined,oninput:e=>d.date=e.target.value});
    const priceI=h("input.field",{type:"number",min:"0",inputmode:"decimal",value:d.price,placeholder:"e.g. 350",oninput:e=>d.price=e.target.value});
    b.append(
      h("div",[h("label.lbl","Vendor name"),vendorI]),
      h("div",[h("label.lbl","Booking date"),dateI]),
      h("div",[h("label.lbl","Amount (OMR)"),priceI]),
      h("p.tiny.faint",{style:{margin:"0 2px"}},"These show on your plan and add to your expense tracker."),
    );
    return b;
  },actions:[
    h("button.btn.btn-sec.grow",{onclick:()=>ref.close()},"Cancel"),
    h("button.btn.btn-pri.grow",{onclick:()=>{
      saveBooking(taskId,(sv&&sv.id)||(S.bookings[taskId]&&S.bookings[taskId].vendorId)||null,
        d.date,ex.time||"",ex.note||"",d.price===""?null:d.price,d.vendorName);
      setTask(taskId,"done"); confetti();
      ref.close(); rerender&&rerender();
    }},[icon("check",17),"Save booking"]),
  ]});
  return ref;
}
const statusLabel=s=>({todo:"Not started",prog:"In progress",done:"Booked"})[s]||s;
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
    // status control — two choices only: In progress, or Booked
    const cur=S.checklist[taskId];
    const stat=h("div.stat3");
    const OPTS=[["prog","In progress","on-prog"],["done","Booked","on-done"]];
    OPTS.forEach(([k,l,onc])=>{
      stat.appendChild(h("button"+(cur===k?"."+onc:""),{onclick:()=>{
        // "Booked" captures the vendor, date and amount so the plan + expenses update
        if(k==="done"){ close(); openBookedSheet(taskId,rerender); return; }
        setTask(taskId,k);
        [...stat.children].forEach((x,i)=>{x.className=(OPTS[i][0]===k)?onc:"";});
        rerender&&rerender();
      }},l));
    });
    b.appendChild(h("div",[h("div.lbl","Status"),stat]));
    // booked details, shown once she's booked it
    if(cur==="done"){
      const bk=S.bookings[taskId]||{};
      const vn=bookingVendorName(bk);
      const rows=[];
      if(vn)rows.push(["Vendor",vn]);
      if(bk.date)rows.push(["Date",new Date(bk.date+"T00:00:00").toLocaleDateString("en",{day:"numeric",month:"long",year:"numeric"})]);
      if(bk.price)rows.push(["Amount",money(+bk.price)]);
      b.appendChild(h("div.card.pad-s",{style:{background:"var(--good-soft)"}},[
        h("div.between",[h("b.small","Booking details"),
          h("button.chip",{onclick:()=>{close();setTimeout(()=>openBookedSheet(taskId,rerender),260);}},"Edit")]),
        rows.length?h("div.col.gap6",{style:{marginTop:"8px"}},rows.map(([k,v])=>
          h("div.between.small",[h("span.faint",k),h("b",v)]))):
          h("div.tiny.faint",{style:{marginTop:"6px"}},"No details yet — tap Edit to add them."),
      ]));
    }
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
          h("span",{style:{fontSize:"18px"}},(n.catId&&catById(n.catId)?catById(n.catId).icon:"📝")),
          h("span.grow.small",{style:{fontWeight:"600"}},n.title),
          h("span.tag "+statusTag(S.checklist[n.id]),statusLabel(S.checklist[n.id])),
        ])))]));
    }
    return b;
  }});
}
