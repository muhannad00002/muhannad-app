/* ============ ZAFFA — BRIDE SCREENS · B (vendors · detail · search · saved · profile) ============ */

/* shared filter state for a category / search view */
function makeFilters(){return {city:"",price:0,rating:0,sort:"popular",offers:false};}

function applyFilters(list,f,q){
  let r=list.slice();
  if(q){const s=q.toLowerCase();r=r.filter(v=>v.name.toLowerCase().includes(s)||v.city.toLowerCase().includes(s)||(catById(v.catId)?.name.toLowerCase().includes(s))||v.short.toLowerCase().includes(s));}
  if(f.city)r=r.filter(v=>v.city===f.city);
  if(f.price)r=r.filter(v=>v.priceLevel===f.price);
  if(f.rating)r=r.filter(v=>v.rating>=f.rating);
  if(f.offers)r=r.filter(v=>v.offer);
  const sorters={
    popular:(a,b)=>b.popularity-a.popularity,
    rating:(a,b)=>b.rating-a.rating,
    priceLow:(a,b)=>a.priceLevel-b.priceLevel,
    priceHigh:(a,b)=>b.priceLevel-a.priceLevel,
    newest:(a,b)=>(b.isNew-a.isNew)||(b.id>a.id?1:-1),
  };
  r.sort(sorters[f.sort]||sorters.popular);
  return r;
}

function filterBar(f,onChange){
  const activeCount=[f.city,f.price,f.rating,f.offers].filter(Boolean).length;
  const bar=h("div.scroll-x",{style:{display:"flex",gap:"8px",padding:"2px 20px 12px",margin:"0 -20px"}});
  bar.appendChild(h("button.chip"+(activeCount?".on":""),{onclick:()=>openFilterSheet(f,onChange)},
    [icon("sliders",15),"Filters",activeCount?h("span",{style:{background:"rgba(255,255,255,.3)",borderRadius:"9px",padding:"0 6px",fontSize:"11px"}},activeCount):null]));
  const sortLabels={popular:"Popular",rating:"Top rated",priceLow:"Price ↑",priceHigh:"Price ↓",newest:"Newest"};
  bar.appendChild(h("button.chip",{onclick:()=>{
    let ref; ref=sheet({title:"Sort by",body:(close)=>h("div.col.gap8",Object.entries(sortLabels).map(([k,l])=>
      h("button.lrow",{style:{cursor:"pointer",width:"100%"},onclick:()=>{f.sort=k;close();onChange();}},[
        h("span.grow",{style:{fontWeight:f.sort===k?"700":"500",color:f.sort===k?"var(--rose-deep)":""}},l),
        f.sort===k?icon("check",18,"faint"):null])))});
  }},[icon("filter",15),sortLabels[f.sort]]));
  bar.appendChild(h("button.chip"+(f.offers?".on":""),{onclick:()=>{f.offers=!f.offers;onChange();}},"🎁 Offers"));
  CITIES.forEach(city=>bar.appendChild(h("button.chip"+(f.city===city?".on":""),{onclick:()=>{f.city=f.city===city?"":city;onChange();}},city)));
  return bar;
}

function openFilterSheet(f,onChange){
  let ref;
  ref=sheet({title:"Filters",body:(close)=>{
    const b=h("div.col.gap16",{style:{marginTop:"6px"}});
    // city
    b.appendChild(fGroup("City",["",...CITIES].map(c=>chip(c||"All cities",f.city===c,()=>{f.city=c;refreshMarks();}))));
    // price
    b.appendChild(fGroup("Price",[0,1,2,3,4].map(p=>chip(p?priceLabel(p):"Any",f.price===p,()=>{f.price=p;refreshMarks();}))));
    // rating
    b.appendChild(fGroup("Minimum rating",[0,4,4.5,4.8].map(rt=>chip(rt?("★ "+rt+"+"):"Any",f.rating===rt,()=>{f.rating=rt;refreshMarks();}))));
    // offers
    b.appendChild(fGroup("Only show",[chip("🎁 Special offers",f.offers,()=>{f.offers=!f.offers;refreshMarks();})]));
    function refreshMarks(){ref.close();setTimeout(()=>openFilterSheet(f,onChange),10);} // simple re-render
    return b;
  },actions:[
    h("button.btn.btn-sec.grow",{onclick:()=>{Object.assign(f,makeFilters());ref.close();onChange();}},"Reset"),
    h("button.btn.btn-pri.grow",{onclick:()=>{ref.close();onChange();}},"Show results"),
  ]});
  function fGroup(label,chips){return h("div",[h("div.lbl",label),h("div.row.wrap.gap8",chips)]);}
  function chip(label,on,fn){return h("button.chip"+(on?".on":""),{onclick:fn},label);}
}

/* ---------- CATEGORY / VENDOR LIST ---------- */
route("/category/:id",(q,p)=>{
  const cat=catById(p.id);
  if(!cat)return appFrame([topbar("Not found",{back:true}),h("div.empty",[h("div.em","🔍"),h("h3","Category not found")])],{tabs:brideTabs("/categories")});
  // freemium gate: first 3 distinct categories free
  if(!categoryViewable(p.id)){
    setTimeout(()=>openPaywall("category"),80);
    return appFrame([topbar(cat.name,{back:true}),
      h("div.empty",{style:{paddingTop:"56px"}},[
        h("div.em",{style:{fontSize:"52px"}},"🔒"),
        h("h3","Premium category"),
        h("p.muted",{style:{maxWidth:"280px",margin:"0 auto 20px"}},`You've viewed your ${FREE_CATEGORY_VIEWS} free categories. Go Premium to browse ${cat.name} and every other category — from under $2 a month.`),
        h("button.btn.btn-pri.btn-lg",{onclick:()=>openPaywall("category")},["Unlock all categories ",icon("fwd",16)]),
        h("button.btn.btn-quiet",{style:{marginTop:"10px"},onclick:()=>back()},"Go back"),
      ])],{tabs:brideTabs("/categories")});
  }
  recordCategoryView(p.id);
  const f=makeFilters();
  const kids=[topbar(cat.name,{back:true,right:h("button.icon-btn",{onclick:()=>go("/search?cat="+cat.id)},icon("search",21))})];
  const header=h("div.row.gap12",{style:{padding:"2px 3px 14px"}},[
    h("span.em",{class:"em",style:{width:"52px",height:"52px",borderRadius:"var(--r-full)",display:"grid",placeItems:"center",fontSize:"26px",background:"var(--rose-soft)"}},cat.icon),
    h("div",[h("div.small.muted","Curated vendors"),h("h3",{style:{fontSize:"20px"}},cat.name)]),
  ]);
  kids.push(header);
  let bar=filterBar(f,()=>redraw()); kids.push(bar);
  const listWrap=h("div.col.gap16",{style:{marginTop:"2px"}});
  kids.push(listWrap);
  const app=appFrame(kids,{tabs:brideTabs("/categories")});
  function redraw(){
    // rebuild filter bar (chips reflect state) and list
    const nb=filterBar(f,()=>redraw()); bar.replaceWith(nb); bar=nb;
    clear(listWrap);
    const res=applyFilters(vendorsInCat(cat.id),f);
    listWrap.appendChild(h("div.small.faint",{style:{margin:"0 3px 4px"}},res.length+(res.length===1?" vendor":" vendors")));
    if(!res.length)listWrap.appendChild(h("div.empty",[h("div.em","🌿"),h("h3","No matches"),h("p.muted","Try adjusting your filters."),
      h("button.btn.btn-ghost",{style:{marginTop:"14px"},onclick:()=>{Object.assign(f,makeFilters());redraw();}},"Clear filters")]));
    else res.forEach(v=>listWrap.appendChild(vendorCard(v)));
  }
  redraw();
  return app;
});

/* ---------- VENDOR DETAIL ---------- */
route("/vendor/:id",(q,p)=>{
  const v=vendorById(p.id);
  if(!v)return appFrame([topbar("Not found",{back:true}),h("div.empty",[h("div.em","🔍"),h("h3","Vendor not found")])],{noTab:true});
  const cat=catById(v.catId);
  const fav=S.favorites.includes(v.id);
  // find which checklist task this vendor could complete
  const linkedTask=CHECKLIST_TEMPLATE.find(t=>t.catId===v.catId);
  const isSelected=linkedTask&&S.selectedVendor[linkedTask.id]===v.id;

  const kids=[];
  // cover with floating back / actions
  const cover=coverEl(v,"",1,true); cover.style.height="270px"; cover.style.width="100%"; cover.style.borderRadius="0 0 var(--r-xl) var(--r-xl)";
  cover.appendChild(h("div",{style:{position:"absolute",inset:"0",background:"linear-gradient(to bottom,rgba(0,0,0,.18),transparent 40%,transparent 70%,rgba(0,0,0,.15))"}}));
  const backBtn=h("button.icon-btn",{style:{position:"absolute",top:"calc(14px + env(safe-area-inset-top))",left:"16px",background:"rgba(255,255,255,.85)",backdropFilter:"blur(6px)"},onclick:()=>back()},icon("back",22));
  const favBtn=h("button.icon-btn",{style:{position:"absolute",top:"calc(14px + env(safe-area-inset-top))",right:"64px",background:"rgba(255,255,255,.85)",backdropFilter:"blur(6px)",color:fav?"var(--rose)":"var(--ink2)"},
    onclick:()=>{toggleFav(v.id);const on=S.favorites.includes(v.id);clear(favBtn).appendChild(icon(on?"heartFill":"heart",21));favBtn.style.color=on?"var(--rose)":"var(--ink2)";}},icon(fav?"heartFill":"heart",21));
  const shareBtn=h("button.icon-btn",{style:{position:"absolute",top:"calc(14px + env(safe-area-inset-top))",right:"16px",background:"rgba(255,255,255,.85)",backdropFilter:"blur(6px)"},
    onclick:()=>{const url=location.href; if(navigator.share)navigator.share({title:v.name,url}).catch(()=>{}); else{navigator.clipboard?.writeText(url);toast("Link copied","🔗");}}},icon("share",20));
  cover.append(backBtn,favBtn,shareBtn);
  if(v.featured)cover.appendChild(h("span.tag.tag-gold",{style:{position:"absolute",left:"16px",bottom:"16px"}},"★ Featured vendor"));

  // wrap cover so it can bleed to edges
  const coverWrap=h("div",{style:{margin:"0 -20px"}},cover);
  kids.push(coverWrap);

  // title block
  kids.push(h("div",{style:{padding:"16px 2px 4px"}},[
    h("div.between",[
      h("div",[h("h1",{style:{fontSize:"27px"}},v.name),
        h("div.row.gap6",{style:{marginTop:"5px",color:"var(--ink2)"}},[icon("pin",14),h("span.small",v.city),
          h("span.faint","·"),h("span.small",cat?cat.name:"")])]),
    ]),
    h("div.row.gap12",{style:{marginTop:"12px",flexWrap:"wrap"}},[
      h("span.row.gap6",[starsEl(v.rating),h("b.small",v.rating.toFixed(1)),h("span.small.faint","("+v.reviews+")")]),
      h("span.faint","·"),
      h("span.small",{style:{fontWeight:"700",color:"var(--rose-deep)"}},v.priceRange),
      h("span.tag "+(v.priceLevel>=3?"tag-gold":"tag-rose"),priceLabel(v.priceLevel)),
    ]),
  ]));

  // offer banner
  if(v.offer)kids.push(h("div.card.pad-s",{style:{background:"linear-gradient(135deg,var(--gold-soft),var(--rose-soft))",display:"flex",gap:"10px",alignItems:"center",marginTop:"8px"}},
    [h("span",{style:{fontSize:"24px"}},"🎁"),h("div",[h("b.small","Special offer"),h("div.small.muted",v.offer.label)])]));

  // quick actions
  kids.push(h("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"9px",margin:"16px 0 4px"}},[
    actionBtn("chat","WhatsApp",()=>openLink("https://wa.me/"+v.whatsapp.replace(/[^0-9]/g,""))),
    actionBtn("phone","Call",()=>openLink("tel:"+v.phone.replace(/\s/g,""))),
    actionBtn("ig","Instagram",()=>openLink("https://instagram.com/"+v.instagram.replace("@",""))),
    actionBtn("pin","Map",()=>openLink("https://maps.google.com/?q="+encodeURIComponent(v.maps))),
  ]));

  // gallery
  kids.push(sectionTitle("Gallery"));
  kids.push(h("div.scroll-x",{style:{display:"flex",gap:"10px",margin:"0 -20px",padding:"2px 20px 4px"}},
    Array.from({length:6},(_,i)=>{const g=coverEl(v,"",i+2,i%3===0);g.style.width="150px";g.style.height="190px";g.style.flex="none";g.style.scrollSnapAlign="start";return g;})));

  // about
  kids.push(sectionTitle("About"));
  kids.push(h("p.muted",{style:{lineHeight:"1.6"}},v.desc));

  // services
  kids.push(sectionTitle("Services"));
  kids.push(h("div.row.wrap.gap8",v.services.map(s=>h("span.chip",[icon("check",14),s]))));

  // packages
  kids.push(sectionTitle("Packages & pricing"));
  kids.push(h("div.col.gap12",v.packages.map(pk=>h("div.card.pad"+(pk.popular?"":""),{style:pk.popular?{border:"1.5px solid var(--rose)",background:"var(--rose-tint)"}:{}},[
    h("div.between",[h("h4",{style:{fontSize:"18px"}},[pk.name,pk.popular?h("span.tag.tag-rose",{style:{marginLeft:"8px"}},"Popular"):null]),
      h("b",{style:{color:"var(--rose-deep)",fontFamily:"var(--font-d)",fontSize:"18px"}},pk.price)]),
    h("div.col.gap6",{style:{marginTop:"10px"}},pk.items.map(it=>h("div.row.gap8.small.muted",[icon("check",15,"faint"),it]))),
  ]))));

  // working hours
  kids.push(sectionTitle("Working hours"));
  kids.push(h("div.card.pad-s.row.gap12",[icon("clock",20,"faint"),h("span",v.hours)]));

  // reviews
  kids.push(h("div.sec-h",{style:{marginTop:"26px"}},[h("h3","Reviews"),h("span.small.muted",[starsEl(v.rating)," ",v.rating.toFixed(1)])]));
  kids.push(h("div.col.gap12",v.reviewsList.map(r=>h("div.card.pad-s",[
    h("div.between",[h("div.row.gap8",[h("span.avatar",{style:{width:"36px",height:"36px",fontSize:"14px",background:"linear-gradient(135deg,var(--rose),var(--gold))"}},initials(r.by)),
      h("div",[h("b.small",r.by),h("div.tiny.faint",r.when)])]),
      h("span.stars",{style:{"--v":r.stars}},h("i"))]),
    h("p.small.muted",{style:{marginTop:"9px"}},r.text),
  ]))));

  // spacer for sticky bar
  kids.push(h("div",{style:{height:"92px"}}));

  const app=appFrame(kids,{noTab:true});
  app.querySelector(".screen").style.padding="0 20px 20px";

  // sticky select bar
  if(linkedTask){
    const booking=S.bookings[linkedTask.id];
    const selBtn=h("button.btn.btn-block "+(isSelected?"btn-sec":"btn-pri btn-lg"),{onclick:()=>{
      if(S.selectedVendor[linkedTask.id]===v.id){
        delete S.selectedVendor[linkedTask.id]; delete S.bookings[linkedTask.id]; setTask(linkedTask.id,"prog"); save();
        toast("Selection removed"); go("/vendor/"+v.id);
      }else{
        openBookingSheet(v,linkedTask.id,()=>go("/vendor/"+v.id));
      }
    }},isSelected?[icon("check",18),booking&&booking.date?("Booked "+new Date(booking.date+"T00:00:00").toLocaleDateString("en",{day:"numeric",month:"short"})+" — tap to undo"):"Selected — tap to undo"]:[icon("cal",18),"Select & pick a date"]);
    const bar=h("div",{style:{position:"fixed",bottom:"0",left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:"460px",zIndex:"48",
      padding:"12px 20px calc(14px + env(safe-area-inset-bottom))",background:"color-mix(in srgb,var(--surface) 90%,transparent)",
      backdropFilter:"blur(14px)",borderTop:"1px solid var(--line)"}},selBtn);
    app.appendChild(bar);
  }
  return app;

  function actionBtn(ic,label,fn){return h("button",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:"6px"},onclick:fn},
    [h("span.icon-btn",{style:{width:"48px",height:"48px",color:"var(--rose-deep)",background:"var(--rose-soft)",border:"0"}},icon(ic,21)),
     h("span.tiny.muted",{style:{fontWeight:"600"}},label)]);}
});
function sectionTitle(t){return h("h3",{style:{fontSize:"20px",margin:"26px 0 12px"}},t);}
function shortTask(t){return t.replace(/^(Book|Buy|Order|Choose|Arrange|Send|Set up|Reserve|Select|Consider|Prepare|Confirm|Draft|Print|Add|Plan|Hire) /,"");}
function openLink(url){try{window.open(url,"_blank");}catch{location.href=url;}}

/* ---------- GLOBAL SEARCH ---------- */
route("/search",(q)=>{
  const f=makeFilters();
  if(q.cat){/* preset category filter via query when arriving from a category */}
  let query="";
  const kids=[];
  const input=h("input.field",{placeholder:"Search vendors, categories, cities…",style:{paddingLeft:"44px"},
    oninput:e=>{query=e.target.value;redraw();}});
  const inputWrap=h("div",{style:{position:"relative"}},[
    h("span",{style:{position:"absolute",left:"15px",top:"50%",transform:"translateY(-50%)",color:"var(--ink3)"}},icon("search",19)),
    input,
  ]);
  kids.push(h("div.row.gap8",{style:{padding:"14px 0 12px"}},[
    h("button.icon-btn",{onclick:()=>back()},icon("back",22)),
    h("div.grow",inputWrap),
  ]));
  let bar=filterBar(f,()=>redraw()); kids.push(bar);
  const results=h("div",{style:{marginTop:"4px"}});
  kids.push(results);
  const app=appFrame(kids,{tabs:brideTabs("/categories")});
  setTimeout(()=>input.focus(),150);

  function redraw(){
    const nb=filterBar(f,()=>redraw()); bar.replaceWith(nb); bar=nb;
    clear(results);
    if(!query.trim() && !f.city && !f.price && !f.rating && !f.offers){
      // suggestions state: popular categories + trending vendors
      results.appendChild(h("div.eyebrow",{style:{margin:"6px 3px 12px"}},"Popular categories"));
      const grid=h("div.row.wrap.gap8");
      CATEGORIES.slice(0,10).forEach(c=>grid.appendChild(h("button.chip",{onclick:()=>go("/category/"+c.id)},[c.icon+" "+c.name])));
      results.appendChild(grid);
      results.appendChild(h("div.eyebrow",{style:{margin:"22px 3px 12px"}},"Trending vendors"));
      results.appendChild(h("div.col.gap16",VENDORS.slice().sort((a,b)=>b.popularity-a.popularity).slice(0,4).map(v=>vendorCard(v))));
      return;
    }
    const res=applyFilters(VENDORS.filter(v=>v.approved),f,query);
    results.appendChild(h("div.small.faint",{style:{margin:"4px 3px 10px"}},res.length+" result"+(res.length===1?"":"s")+(query?` for “${query}”`:"")));
    if(!res.length)results.appendChild(h("div.empty",[h("div.em","🔎"),h("h3","No results"),h("p.muted","Try a different search or clear filters.")]));
    else results.appendChild(h("div.col.gap16",res.map(v=>vendorCard(v))));
  }
  redraw();
  return app;
});

/* ---------- FAVORITES ---------- */
route("/favorites",()=>{
  const kids=[topbar("Saved",{right:h("button.icon-btn",{onclick:()=>go("/search")},icon("search",21))})];
  const favs=S.favorites.map(vendorById).filter(Boolean);
  if(!favs.length){
    kids.push(h("div.empty",{style:{paddingTop:"70px"}},[h("div.em","🤍"),h("h3","No favourites yet"),
      h("p.muted",{style:{maxWidth:"260px",margin:"0 auto 18px"}},"Tap the heart on any vendor to save them here for later."),
      h("button.btn.btn-pri",{onclick:()=>go("/categories")},"Browse vendors")]));
  }else{
    kids.push(h("div.small.faint",{style:{margin:"0 3px 12px"}},favs.length+" saved vendor"+(favs.length===1?"":"s")));
    kids.push(h("div.col.gap16",favs.map(v=>vendorCard(v))));
  }
  return appFrame(h("div.stagger",kids),{tabs:brideTabs("/favorites")});
});

/* ---------- NOTIFICATIONS ---------- */
route("/notifications",()=>{
  // regenerate a couple of smart reminders based on plan state
  generateSmartReminders();
  const kids=[topbar("Notifications",{back:true,right:S.notifs.some(n=>!n.read)?h("button.btn.btn-sm.btn-ghost",{onclick:()=>{S.notifs.forEach(n=>n.read=true);save();go("/notifications");}},"Mark all read"):null})];
  if(!S.notifs.length){
    kids.push(h("div.empty",{style:{paddingTop:"70px"}},[h("div.em","🔔"),h("h3","All caught up"),h("p.muted","We'll nudge you about upcoming tasks.")]));
  }else{
    kids.push(h("div.col.gap12",S.notifs.map(n=>h("div.card.pad-s",{style:{display:"flex",gap:"12px",cursor:"pointer",opacity:n.read?".72":"1",
      borderLeft:n.read?"":"3px solid var(--rose)"},onclick:()=>{n.read=true;save();if(n.taskId){openTaskSheet(n.taskId);} else go("/checklist");
        [...kids];}},[
      h("span",{style:{fontSize:"24px",width:"36px",textAlign:"center"}},n.em),
      h("div.grow",[h("div.between",[h("b.small",n.title),h("span.tiny.faint",timeAgo(n.when))]),
        h("p.small.muted",{style:{marginTop:"3px"}},n.body)]),
    ]))));
  }
  return appFrame(kids,{tabs:brideTabs("/home")});
});

function generateSmartReminders(){
  const d=daysLeft();
  const critical=["makeup","photo","hall","catering","dress","cake","henna"];
  const already=new Set(S.notifs.map(n=>n.taskId));
  critical.forEach(id=>{
    if(S.checklist[id]==="todo" && !already.has(id) && S.notifs.length<8){
      const t=templateById(id);
      const dtxt=d!=null?`Your wedding is in ${d} days. `:"";
      pushNotif({em:catById(t.catId)?.icon||"🔔",title:`Still to book: ${shortTask(t.title)}`,
        body:`${dtxt}Brides usually secure this early — tap to browse ${catById(t.catId)?.name.toLowerCase()||"vendors"}.`,taskId:id});
    }
  });
}

/* ---------- PROFILE ---------- */
route("/profile",()=>{
  const c=counts(), pct=progressPct(), d=daysLeft();
  const kids=[topbar("You",{right:h("button.icon-btn",{onclick:()=>go("/profile/edit")},icon("edit",20))})];
  // header card
  kids.push(h("div.card.pad-l",{style:{textAlign:"center",background:"linear-gradient(160deg,var(--rose-tint),var(--surface))"}},[
    h("span.avatar",{style:{width:"84px",height:"84px",fontSize:"30px",margin:"0 auto 12px",background:"linear-gradient(135deg,var(--rose),var(--gold))"}},initials(S.bride.name)),
    h("h2",{style:{fontSize:"25px"}},S.bride.name),
    S.bride.date?h("p.muted",{style:{marginTop:"4px"}},["💍 ",new Date(S.bride.date+"T00:00:00").toLocaleDateString("en",{weekday:"long",day:"numeric",month:"long",year:"numeric"})]):h("p.muted",{style:{marginTop:"4px"}},"No date set yet"),
    d!=null?h("span.tag.tag-rose",{style:{marginTop:"10px"}},d+" days to go"):null,
  ]));
  // stats
  kids.push(h("div",{style:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"11px",marginTop:"16px"}},[
    kpi(pct+"%","Complete"),kpi(c.done,"Tasks done"),kpi(S.favorites.length,"Saved"),
  ]));
  // subscription card
  if(isPremium()){
    kids.push(h("div.card.pad",{style:{marginTop:"16px",background:"linear-gradient(135deg,var(--gold-soft),var(--rose-soft))",border:"0",display:"flex",gap:"12px",alignItems:"center"}},[
      h("span",{style:{fontSize:"26px"}},"💗"),
      h("div.grow",[h("b","Zaffa Premium"),h("div.tiny.faint",(S.subscription.tier==="annual"?"Annual":"Monthly")+" plan · all features unlocked")]),
      h("button.chip",{onclick:()=>confirmSheet("Cancel Premium?","You'll return to the free plan (3 categories & limited assistant).","Cancel plan",()=>{cancelPremium();toast("Back on free plan");go("/profile");},true)},"Manage"),
    ]));
  }else{
    kids.push(h("button.card.pad",{style:{marginTop:"16px",width:"100%",textAlign:"left",cursor:"pointer",
      background:"linear-gradient(135deg,var(--rose),var(--rose-deep))",border:"0",color:"#fff",display:"flex",gap:"12px",alignItems:"center"},onclick:()=>openPaywall("default")},[
      h("span",{style:{fontSize:"26px"}},"✨"),
      h("div.grow",[h("b",{style:{color:"#fff"}},"Go Premium"),h("div.tiny",{style:{color:"rgba(255,255,255,.85)"}},"Unlimited categories & AI assistant · under $3/mo")]),
      icon("fwd",18),
    ]));
  }
  // budget
  kids.push(h("div.card.pad",{style:{marginTop:"16px"}},[
    h("div.between",[h("div.row.gap8",[icon("wallet",20,"faint"),h("b","Budget")]),
      h("b",{style:{color:"var(--rose-deep)"}},money(S.bride.budget))]),
    h("p.tiny.faint",{style:{marginTop:"6px"}},"Estimated total for your wedding"),
  ]));
  // menu
  const menu=[
    ["spark","AI assistant (Aya)",()=>go("/assistant"),isPremium()?"":FREE_AI_MESSAGES-S.assistant.used+" free"],
    ["cal","My appointments",()=>go("/appointments"),upcomingBookings().length?upcomingBookings().length+"":""],
    ["heart","Saved vendors",()=>go("/favorites"),S.favorites.length+""],
    ["list","My checklist",()=>go("/checklist"),c.done+"/"+c.total],
    ["bell","Notifications",()=>go("/notifications"),unreadNotifs()?unreadNotifs()+" new":""],
    ["user","Wedding details",()=>go("/profile/edit"),""],
  ];
  kids.push(h("div.card",{style:{marginTop:"16px",overflow:"hidden"}},menu.map(([ic,label,fn,meta])=>
    h("button.lrow",{style:{width:"100%",padding:"15px 16px",cursor:"pointer"},onclick:fn},[
      h("span.icon-btn",{style:{width:"38px",height:"38px",background:"var(--rose-soft)",color:"var(--rose-deep)",border:"0"}},icon(ic,19)),
      h("span.grow",{style:{fontWeight:"600",textAlign:"left"}},label),
      meta?h("span.small.faint",meta):null, icon("fwd",18,"faint"),
    ]))));
  // theme + admin
  kids.push(h("div.card",{style:{marginTop:"16px",overflow:"hidden"}},[
    h("div.lrow",{style:{padding:"14px 16px"}},[
      h("span.icon-btn",{style:{width:"38px",height:"38px",background:"var(--gold-soft)",color:"var(--gold)",border:"0"}},icon("sun",19)),
      h("span.grow",{style:{fontWeight:"600"}},"Appearance"),
      themeSeg(),
    ]),
    h("button.lrow",{style:{width:"100%",padding:"15px 16px",cursor:"pointer"},onclick:()=>{S.role="admin";save();go("/admin");}},[
      h("span.icon-btn",{style:{width:"38px",height:"38px",background:"var(--surface3)",color:"var(--ink2)",border:"0"}},icon("settings",19)),
      h("span.grow",{style:{fontWeight:"600",textAlign:"left"}},"Admin dashboard"),
      icon("fwd",18,"faint"),
    ]),
  ]));
  kids.push(h("button.btn.btn-sec.btn-block",{style:{marginTop:"16px",color:"var(--crit)"},onclick:()=>{
    confirmSheet("Reset demo?","This clears your plan and restores the original demo data.","Reset",()=>{
      localStorage.removeItem(LS_KEY);location.hash="#/welcome";load();render();toast("Demo reset");},true);
  }},[icon("logout",18),"Reset demo data"]));
  kids.push(h("p.center.faint.tiny",{style:{padding:"22px 0 6px"}},"Zaffa · Version 1.0"));

  return appFrame(h("div.stagger",kids),{tabs:brideTabs("/profile")});

  function kpi(v,k){return h("div.kpi",{style:{textAlign:"center"}},[h("div.v",{style:{color:"var(--rose-deep)"}},v),h("div.k",k)]);}
  function themeSeg(){
    const seg=h("div.seg",{style:{width:"140px"}});
    [["auto","Auto"],["light","☀"],["dark","☾"]].forEach(([k,l])=>{
      seg.appendChild(h("button"+(S.theme===k?".on":""),{onclick:e=>{S.theme=k;save();applyTheme();[...seg.children].forEach(b=>b.classList.remove("on"));e.target.classList.add("on");}},l));
    });
    return seg;
  }
});

/* ---------- EDIT WEDDING DETAILS ---------- */
route("/profile/edit",()=>{
  const data={name:S.bride.name,date:S.bride.date||"",budget:S.bride.budget};
  const kids=[topbar("Wedding details",{back:true})];
  const nameI=h("input.field",{value:data.name,oninput:e=>data.name=e.target.value});
  const dateI=h("input.field",{type:"date",value:data.date,min:new Date().toISOString().slice(0,10),oninput:e=>data.date=e.target.value});
  const budView=h("b",{style:{color:"var(--rose-deep)",fontFamily:"var(--font-d)",fontSize:"22px"}},money(data.budget));
  const budI=h("input",{type:"range",min:1000,max:20000,step:500,value:data.budget,style:{width:"100%",accentColor:"var(--rose)"},
    oninput:e=>{data.budget=+e.target.value;budView.textContent=money(data.budget);}});
  kids.push(h("div.card.pad.col.gap16",{style:{marginTop:"6px"}},[
    h("div",[h("label.lbl","Your name"),nameI]),
    h("div",[h("label.lbl","Wedding date"),dateI]),
    h("div",[h("div.between",{style:{marginBottom:"6px"}},[h("label.lbl",{style:{margin:0}},"Budget"),budView]),budI]),
  ]));
  kids.push(h("button.btn.btn-pri.btn-lg.btn-block",{style:{marginTop:"18px"},onclick:()=>{
    S.bride.name=data.name.trim()||S.bride.name; S.bride.date=data.date||null; S.bride.budget=data.budget;
    save();toast("Saved 💗");go("/profile");
  }},"Save changes"));
  return appFrame(kids,{noTab:true});
});
