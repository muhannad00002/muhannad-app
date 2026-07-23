/* ============ ZAFFA — AI ASSISTANT · PAYWALL · BOOKINGS · CALENDAR ============ */

/* ---------------- PREMIUM PAYWALL ---------------- */
const PREMIUM_BENEFITS=[
  ["grid","Unlimited vendor categories","Browse every category — no limits."],
  ["spark","Unlimited AI assistant","Chat with Aya as much as you like."],
  ["cal","Calendar sync","Save every appointment to your calendar."],
  ["heart","Unlimited favourites & plans","Keep your whole wedding organised."],
  ["bell","Smart reminders","Never miss a booking as the day nears."],
];
const PLANS=[
  {id:"monthly",name:"Monthly",price:"$2.99",per:"per month",note:"Billed monthly · cancel anytime"},
  {id:"annual",name:"Annual",price:"$24",per:"per year",sub:"$2.00 / month",note:"Save 33% · best value",best:true},
];

function openPaywall(reason){
  let ref, chosen="annual";
  const reasons={
    category:"You've viewed your 3 free categories. Go Premium to browse them all.",
    assistant:"You've used your free assistant messages. Go Premium for unlimited chat with Aya.",
    default:"Unlock everything Wedding & Co has to offer.",
  };
  ref=sheet({title:null,maxWidth:"460px",body:(close)=>{
    const b=h("div",{style:{marginTop:"-4px"}});
    b.appendChild(h("div.center",[
      h("div",{style:{fontSize:"40px",marginBottom:"4px"}},"💗"),
      h("div.eyebrow",{style:{color:"var(--gold)"}},"Wedding & Co Premium"),
      h("h2",{style:{fontSize:"27px",margin:"6px 0 6px"}},"Plan without limits"),
      h("p.muted",{style:{maxWidth:"320px",margin:"0 auto 4px"}},reasons[reason]||reasons.default),
    ]));
    // benefits
    b.appendChild(h("div.col.gap12",{style:{margin:"18px 2px"}},PREMIUM_BENEFITS.map(([ic,t,d])=>
      h("div.row.gap12",[
        h("span.icon-btn",{style:{width:"40px",height:"40px",background:"var(--rose-soft)",color:"var(--rose-deep)",border:"0",flex:"none"}},icon(ic,19)),
        h("div",[h("b.small",t),h("div.tiny.faint",d)]),
      ]))));
    // plan cards
    const planWrap=h("div.col.gap10",{style:{margin:"6px 0 4px"}});
    function drawPlans(){
      clear(planWrap);
      PLANS.forEach(p=>{
        const on=chosen===p.id;
        planWrap.appendChild(h("button",{style:{textAlign:"left",padding:"15px 16px",borderRadius:"var(--r-l)",width:"100%",
          border:on?"2px solid var(--rose)":"1.5px solid var(--line2)",background:on?"var(--rose-tint)":"var(--surface)",
          display:"flex",alignItems:"center",gap:"12px",transition:"all var(--dur) var(--ease)"},onclick:()=>{chosen=p.id;drawPlans();}},[
          h("span",{style:{width:"22px",height:"22px",borderRadius:"50%",flex:"none",border:on?"7px solid var(--rose)":"2px solid var(--line2)",transition:"all var(--dur)"}}),
          h("div.grow",[h("div.row.gap8",[h("b",p.name),p.best?h("span.tag.tag-gold","Best value"):null]),
            h("div.tiny.faint",p.note)]),
          h("div",{style:{textAlign:"right"}},[h("b",{style:{fontFamily:"var(--font-d)",fontSize:"19px",color:"var(--rose-deep)"}},p.price),
            h("div.tiny.faint",p.sub||p.per)]),
        ]));
      });
    }
    drawPlans(); b.appendChild(planWrap);
    const prov=paymentProvider();
    const payLabel=prov==="apple"?"Subscribe with Apple":prov==="smartpay"?"Pay with Bank Muscat":"Start Premium";
    const payBtn=h("button.btn.btn-pri.btn-lg.btn-block",{style:{marginTop:"10px"},onclick:async()=>{
      payBtn.disabled=true; clear(payBtn).appendChild(h("span","Processing…"));
      try{
        await payCheckout(chosen);          // demo resolves instantly; smartpay redirects; apple awaits StoreKit
        ref.close(); confetti(); toast("Welcome to Premium 💗","✨"); setTimeout(render,120);
      }catch(e){ payBtn.disabled=false; clear(payBtn).appendChild(h("span",payLabel)); }
    }},payLabel);
    b.appendChild(payBtn);
    b.appendChild(h("p.center.tiny.faint",{style:{margin:"12px 0 2px"}},
      prov==="demo" ? "Demo — no real payment is taken. Both plans stay under $3 / month."
                    : "Secured by "+providerLabel()+" · both plans stay under $3 / month."));
    // pay OR redeem a code
    b.appendChild(h("div.orline",{style:{margin:"12px 0 8px"}},"or"));
    b.appendChild(h("button.btn.btn-sec.btn-block",{onclick:()=>{ref.close();openRedeemSheet();}},[icon("gift",17),"Redeem a code"]));
    b.appendChild(h("button.btn.btn-quiet.btn-block",{style:{marginTop:"6px"},onclick:()=>ref.close()},"Maybe later"));
    return b;
  }});
  return ref;
}

/* ---------------- BOOKING + CALENDAR ---------------- */
function suggestBookingDate(){
  // a sensible default: ~2 weeks from today, but before the wedding
  const now=new Date(); now.setDate(now.getDate()+14);
  if(S.bride.date){ const w=new Date(S.bride.date+"T00:00:00"); if(now>w) now.setTime(w.getTime()-7*86400000); }
  return now.toISOString().slice(0,10);
}

/* Sheet shown when a bride selects a vendor for a task: pick date/time then confirm. */
function openBookingSheet(vendor,taskId,onConfirm){
  const existing=S.bookings[taskId];
  const d={date:existing?.date||suggestBookingDate(),time:existing?.time||"11:00",note:existing?.note||""};
  const task=templateById(taskId);
  const title=(task?shortTask(task.title):"Appointment")+" — "+vendor.name;
  let ref;
  ref=sheet({title:"Book an appointment",body:(close)=>{
    const b=h("div.col.gap16",{style:{marginTop:"4px"}});
    b.appendChild(h("div.card.pad-s.row.gap12",{style:{background:"var(--rose-tint)"}},[
      (()=>{const cv=coverEl(vendor,"");cv.style.width="46px";cv.style.height="46px";return cv;})(),
      h("div.grow",[h("b",vendor.name),h("div.tiny.faint",[catById(vendor.catId)?.name," · ",vendor.city])]),
    ]));
    const dateI=h("input.field",{type:"date",value:d.date,min:new Date().toISOString().slice(0,10),max:S.bride.date||undefined,oninput:e=>d.date=e.target.value});
    const timeI=h("input.field",{type:"time",value:d.time,oninput:e=>d.time=e.target.value});
    const noteI=h("input.field",{value:d.note,placeholder:"Add a note (optional)",oninput:e=>d.note=e.target.value});
    b.append(
      h("div.row.gap8",[h("div.grow",[h("label.lbl","Date"),dateI]),h("div",{style:{width:"120px"}},[h("label.lbl","Time"),timeI])]),
      h("div",[h("label.lbl","Note"),noteI]),
      h("p.tiny.faint",{style:{margin:"0 2px"}},"Selecting confirms this vendor for “"+(task?shortTask(task.title):"this task")+"” and marks it done. We'll remind you a day before."),
    );
    return b;
  },actions:[
    h("button.btn.btn-sec.grow",{onclick:()=>ref.close()},"Cancel"),
    h("button.btn.btn-pri.grow",{onclick:()=>{
      if(!d.date){toast("Please pick a date","📅");return;}
      saveBooking(taskId,vendor.id,d.date,d.time,d.note);
      selectVendorForTask(vendor.id,taskId);
      ref.close(); confetti();
      const opts={title:(task?shortTask(task.title):"Wedding appointment")+": "+vendor.name,date:d.date,time:d.time,
        desc:(d.note?d.note+"\n":"")+"Booked via Wedding & Co. "+(vendor.phone?("Call "+vendor.phone):""),location:vendor.maps};
      setTimeout(()=>openCalendarSheet(opts,()=>{onConfirm&&onConfirm();}),260);
    }},[icon("check",17),"Confirm & save"]),
  ]});
  return ref;
}

/* Calendar chooser: Google Calendar link or downloadable .ics */
function openCalendarSheet(opts,after){
  let ref;
  const when=new Date(opts.date+"T"+((opts.time||"11:00"))+":00").toLocaleDateString("en",{weekday:"long",day:"numeric",month:"long"});
  ref=sheet({title:"Appointment saved ✓",body:(close)=>h("div.col.gap12",[
    h("div.card.pad-s",{style:{background:"var(--good-soft)"}},[
      h("div.row.gap8",[icon("cal",18),h("b.small",when+(opts.time?(" · "+opts.time):""))]),
      h("div.small.muted",{style:{marginTop:"4px"}},opts.title),
    ]),
    h("p.small.muted",{style:{margin:"2px 2px"}},"Add it to your calendar so you never miss it:"),
    h("button.btn.btn-pri.btn-block",{onclick:()=>{openLink(gcalUrl(opts));}},[icon("cal",17),"Add to Google Calendar"]),
    h("button.btn.btn-sec.btn-block",{onclick:()=>{downloadICS(opts);toast("Calendar file downloaded","📅");}},[icon("share",17),"Download .ics (Apple / Outlook)"]),
    h("button.btn.btn-quiet.btn-block",{onclick:()=>{ref.close();after&&after();}},"Done"),
  ])});
  return ref;
}

/* ---------------- AI ASSISTANT (Aya) ---------------- */
const CAT_KEYWORDS=[
  [/\b(dress|gown|wedding dress)\b/,"dresses"],[/\bevening\b/,"evening"],[/\btailor|alter/,"tailors"],
  [/\bboutique\b/,"boutiques"],[/\bhall|venue|ballroom\b/,"halls"],[/\bhotel|resort\b/,"hotels"],
  [/\bdecor|decorat|stage/,"decor"],[/\bflower|floral\b/,"flowers"],[/\bbouquet\b/,"bouquets"],
  [/\bmakeup|make-up|mua|glam\b/,"makeup"],[/\bhair|updo|hairstyl/,"hair"],[/\bhenna|mehndi\b/,"henna"],
  [/\bphoto|photograph|shoot\b/,"photo"],[/\bvideo|film|cinemat/,"video"],[/\bbooth\b/,"booth"],
  [/\bcater|food|menu|buffet\b/,"catering"],[/\bdessert\b/,"desserts"],[/\bchocolate\b/,"chocolates"],
  [/\bhospitality|usher\b/,"hospitality"],[/\bcoffee|qahwa\b/,"coffee"],[/\bcake\b/,"cake"],
  [/\bdj\b/,"dj"],[/\bband\b/,"band"],[/\blive music|oud|violin|piano\b/,"music"],[/\blight/,"lighting"],
  [/\bcar|transport|ride\b/,"cars"],[/\bplanner|coordinat/,"planner"],[/\binvitation|invite\b/,"invitations"],
  [/\bprint/,"printing"],[/\bgift\b/,"gifts"],[/\bfavou?r/,"favors"],[/\baccessor/,"accessories"],
  [/\bjewel|ring|diamond\b/,"jewelry"],[/\bperfume|scent|attar\b/,"perfumes"],[/\bhoneymoon|travel\b/,"honeymoon"],
];
function bestVendor(catId){ return vendorsInCat(catId).sort((a,b)=>b.popularity-a.popularity)[0]; }
function budgetBreakdown(){
  const t=S.bride.budget||6000;
  const rows=[["Venue & hall",.34],["Catering & cake",.18],["Photography & video",.12],["Attire & beauty",.12],
    ["Décor & flowers",.10],["Entertainment",.06],["Buffer",.08]];
  return rows.map(([k,p])=>[k,Math.round(t*p)]);
}

function assistantAnswer(raw){
  const t=raw.toLowerCase().trim();
  const name=S.bride.name||"there";
  const d=daysLeft(), pct=progressPct(), c=counts();
  const has=re=>re.test(t);
  const chip=(label,q,route)=>({label,q,route});

  // greeting
  if(has(/^(hi|hello|hey|salam|salaam|marhaba|hala)\b/)||t==="hi")
    return {text:`Hi ${name}! 🌸 I'm Aya, your wedding assistant. I can help you plan, budget, and pick the right vendors. What's on your mind?`,
      chips:[chip("What should I do next?","what should I do next"),chip("Help with my budget","help me with my budget"),chip("Give me a tip","give me a tip")]};

  // thanks
  if(has(/\b(thank|thanks|shukran|shokran)\b/))
    return {text:"Anytime, love 💗 I'm here whenever you need a hand. Want me to suggest your next step?",chips:[chip("Yes, what's next?","what should I do next")]};

  // capabilities
  if(has(/what can you|who are you|help me\??$|how.*work|what do you do/))
    return {text:"I can suggest your next tasks, split your budget, recommend top-rated vendors for any service, share planning tips, and keep an eye on your countdown. Just ask — for example “find me a makeup artist” or “how should I spend my budget?”",
      chips:[chip("Recommend a photographer","recommend a photographer"),chip("Plan my budget","plan my budget"),chip("What's next?","what should I do next")]};

  // budget
  if(has(/budget|afford|spend|how much|money|cost breakdown|split.*(money|budget)/)){
    const rows=budgetBreakdown();
    const lines=rows.map(([k,v])=>`• ${k}: ${money(v)}`).join("\n");
    return {text:`Here's a balanced way to split your ${money(S.bride.budget)} budget:\n\n${lines}\n\nKeep the 8% buffer for the lovely surprises along the way. Want to adjust your total?`,
      chips:[chip("Edit my budget",null,"/profile/edit"),chip("Where should I splurge?","where should I splurge")]};
  }
  if(has(/splurge|worth.*money|invest|priorit.*(spend|money)/))
    return {text:"Splurge where it lasts: photography & video (your forever memories) and the venue (it shapes everything). Save on favours, printing and transport — small guests-notice-less items. 💡",
      chips:[chip("Recommend a photographer","recommend a photographer"),chip("Find a hall","find me a wedding hall")]};

  // countdown / timeline
  if(has(/how (long|many days)|days? (left|to go|until)|countdown|time left|when.*wedding|running out/)){
    if(d==null)return {text:"You haven't set your wedding date yet — add it and I'll pace everything for you.",chips:[chip("Set my date",null,"/profile/edit")]};
    const pace=d>180?"Plenty of time — lock your venue and top vendors first, then relax.":d>90?"Good timing. Focus on the big bookings this month.":d>30?"Crunch time — prioritise anything still not started.":"Final stretch! Confirm every detail and delegate the day-of.";
    return {text:`Your wedding is in ${d} days 💍 (${Math.floor(d/7)} weeks). You're ${pct}% planned with ${c.todo} tasks to go. ${pace}`,
      chips:[chip("What should I do next?","what should I do next"),chip("Show my plan",null,"/checklist")]};
  }

  // progress / status
  if(has(/progress|how.*(going|doing)|status|percent|how far/))
    return {text:`You're ${pct}% planned — ${c.done} done, ${c.prog} in progress, ${c.todo} to go. ${pct>75?"Amazing work! 🌟":pct>40?"Great momentum — keep it up! 💗":"Early days — let's tackle the big ones first."}`,
      chips:[chip("What's next?","what should I do next"),chip("Open my checklist",null,"/checklist")]};

  // next steps
  if(has(/next|start|begin|prioriti|what.*(do|should).*(do|now|first)|to.?do|where.*start|overwhelm|stress|lost/)){
    const s=suggestedTasks(3);
    if(!s.length)return {text:"You've completed everything — congratulations! 🎉 Time to relax and enjoy your day.",chips:[chip("Open my plan",null,"/checklist")]};
    const lines=s.map(x=>`• ${x.title}`).join("\n");
    return {text:`Here's what I'd focus on next, ${name}:\n\n${lines}\n\nTackle them one at a time — I'll suggest the following steps as you go. 💪`,
      chips:s.filter(x=>x.catId).slice(0,2).map(x=>chip("Browse "+catById(x.catId).name,null,"/category/"+x.catId)).concat([chip("Open my plan",null,"/checklist")])};
  }

  // favourites
  if(has(/favou?rite|saved|my list/)){
    const n=S.favorites.length;
    return {text:n?`You've saved ${n} vendor${n>1?"s":""}. Shall I open your favourites?`:"You haven't saved any vendors yet — tap the heart on any vendor you love and they'll appear in Saved.",
      chips:[n?chip("Open favourites",null,"/favorites"):chip("Browse vendors",null,"/categories")]};
  }

  // date / calendar
  if(has(/\b(date|calendar|appointment|schedule|remind|book)\b/)){
    const ups=upcomingBookings();
    if(ups.length)return {text:`You have ${ups.length} appointment${ups.length>1?"s":""} booked. When you select a vendor I let you pick a date and add it straight to your calendar. Want to see your appointments?`,
      chips:[chip("My appointments",null,"/appointments"),chip("Browse vendors",null,"/categories")]};
    return {text:"When you select a vendor, I'll ask for a date & time and you can add it to Google or Apple Calendar in one tap — with a reminder the day before. Pick a service to start!",
      chips:[chip("Browse categories",null,"/categories")]};
  }

  // category-specific recommendation
  for(const [re,cat] of CAT_KEYWORDS){
    if(has(re)){
      const v=bestVendor(cat), cname=catById(cat)?.name||"vendors";
      if(!v)return {text:`I don't have any ${cname} yet, but the admin adds new vendors often. Try browsing the category.`,chips:[chip("Open "+cname,null,"/category/"+cat)]};
      const tip=CAT_TIP[cat]?("\n\n💡 "+CAT_TIP[cat]):"";
      return {text:`For ${cname.toLowerCase()}, brides love ${v.name} in ${v.city} — ★${v.rating.toFixed(1)} from ${v.reviews} reviews, ${v.priceRange}. ${v.short}${tip}`,
        chips:[chip("View "+v.name,null,"/vendor/"+v.id),chip("See all "+cname,null,"/category/"+cat)]};
    }
  }

  // general recommend / best
  if(has(/recommend|suggest|best|top rated|find.*vendor|who.*(good|best)/)){
    const feats=VENDORS.filter(v=>v.featured&&v.approved).sort((a,b)=>b.rating-a.rating).slice(0,3);
    const lines=feats.map(v=>`• ${v.name} — ${catById(v.catId).name}, ★${v.rating.toFixed(1)}`).join("\n");
    return {text:`Some of our highest-rated vendors right now:\n\n${lines}\n\nTell me which service you need and I'll find the perfect match.`,
      chips:feats.slice(0,2).map(v=>chip("View "+v.name,null,"/vendor/"+v.id)).concat([chip("Browse all",null,"/categories")])};
  }

  // tips
  if(has(/tip|advice|idea|help.*plan|suggestion/)){
    const tip=TIPS[Math.floor(Math.random()*TIPS.length)];
    return {text:`${tip.em} ${tip.t}\n\n${tip.b}`,chips:[chip("Another tip","give me a tip"),chip("What's next?","what should I do next")]};
  }

  // fallback
  return {text:`I'm not sure I caught that, ${name}, but I'm great with vendors, budgets, timelines and next steps. Try one of these 👇`,
    chips:[chip("What should I do next?","what should I do next"),chip("Plan my budget","plan my budget"),chip("Find a makeup artist","find me a makeup artist"),chip("Give me a tip","give me a tip")]};
}
const CAT_TIP={
  dresses:"Book your first fitting 4–6 months out; alterations take time.",
  halls:"Visit in person and ask about the guest capacity and parking.",
  makeup:"Always do a trial and bring a photo of your dress neckline.",
  photo:"Ask to see a full wedding gallery, not just highlights.",
  catering:"Schedule a tasting before you commit to a menu.",
  henna:"Book your henna artist for the night before, not the wedding day.",
  cake:"Match the cake flavour to the season and your dessert table.",
  flowers:"Choose in-season blooms to stay on budget and fresh.",
  planner:"A planner pays for itself in saved time and stress. Hire early.",
};

/* ---------------- ASSISTANT SCREEN ---------------- */
route("/assistant",()=>{
  const app=h("div.app");
  const screen=h("div",{style:{minHeight:"100vh",display:"flex",flexDirection:"column"}});
  app.appendChild(screen);
  // header
  screen.appendChild(h("div.topbar",{style:{gap:"12px"}},[
    h("button.icon-btn",{onclick:()=>back()},icon("back",22)),
    h("div.row.gap8.grow",[
      h("span.avatar",{style:{width:"38px",height:"38px",fontSize:"16px",background:"linear-gradient(135deg,var(--rose),var(--gold))"}},"A"),
      h("div",[h("h2",{style:{fontSize:"18px"}},"Aya"),h("div.tiny",{style:{color:"var(--good)"}},"● AI wedding assistant")]),
    ]),
    isPremium()?h("span.tag.tag-gold","Premium"):h("span.tag.tag-todo",FREE_AI_MESSAGES-S.assistant.used+" free"),
  ]));
  // messages
  const feed=h("div",{style:{flex:"1",overflowY:"auto",padding:"8px 18px 12px",display:"flex",flexDirection:"column",gap:"12px"}});
  screen.appendChild(feed);

  function bubble(role,text,chips){
    const isUser=role==="user";
    const wrap=h("div",{style:{display:"flex",justifyContent:isUser?"flex-end":"flex-start",animation:"fadeUp .3s var(--ease)"}});
    const col=h("div",{style:{maxWidth:"84%",display:"flex",flexDirection:"column",gap:"8px",alignItems:isUser?"flex-end":"flex-start"}});
    col.appendChild(h("div",{style:{padding:"11px 15px",borderRadius:isUser?"var(--r-l) var(--r-l) 4px var(--r-l)":"var(--r-l) var(--r-l) var(--r-l) 4px",
      background:isUser?"linear-gradient(135deg,var(--rose),var(--rose-deep))":"var(--surface)",color:isUser?"var(--on-rose)":"var(--ink)",
      boxShadow:"var(--shadow-1)",whiteSpace:"pre-wrap",lineHeight:"1.5",fontSize:"14.5px",border:isUser?"0":"1px solid var(--line)"}},text));
    if(chips&&chips.length)col.appendChild(h("div.row.wrap.gap8",chips.map(cp=>
      h("button.chip",{style:{background:"var(--rose-soft)",color:"var(--rose-deep)"},onclick:()=>{
        if(cp.route){go(cp.route);return;}
        if(cp.q)send(cp.q);
      }},cp.label))));
    wrap.appendChild(col); return wrap;
  }
  function typing(){
    return h("div",{style:{display:"flex",justifyContent:"flex-start"}},
      h("div",{style:{padding:"13px 16px",borderRadius:"var(--r-l)",background:"var(--surface)",boxShadow:"var(--shadow-1)",border:"1px solid var(--line)"}},
        h("div.row.gap6",[dot(0),dot(.15),dot(.3)])));
    function dot(delay){return h("span",{style:{width:"7px",height:"7px",borderRadius:"50%",background:"var(--ink3)",
      animation:"blink 1.2s "+delay+"s infinite"}});}
  }

  function renderFeed(){
    clear(feed);
    if(!S.assistant.msgs.length){
      feed.appendChild(bubble("bot",`Hi ${S.bride.name||"there"}! 🌸 I'm Aya, your personal wedding assistant. Ask me anything — from budgets to vendors to what to do next.`,
        [{label:"What should I do next?",q:"what should I do next"},{label:"Plan my budget",q:"plan my budget"},{label:"Find a photographer",q:"find me a photographer"}]));
    }else{
      S.assistant.msgs.forEach(m=>feed.appendChild(bubble(m.role,m.text,m.role==="bot"?m.chips:null)));
    }
    feed.scrollTop=feed.scrollHeight;
    setTimeout(()=>feed.scrollTop=feed.scrollHeight,50);
  }

  function send(text){
    text=(text||"").trim(); if(!text)return;
    // gate free users
    if(!isPremium() && S.assistant.used>=FREE_AI_MESSAGES){ openPaywall("assistant"); return; }
    S.assistant.msgs.push({role:"user",text});
    if(!isPremium())S.assistant.used++;
    save(); renderFeed();
    const tip=typing(); feed.appendChild(tip); feed.scrollTop=feed.scrollHeight;
    setTimeout(()=>{
      const ans=assistantAnswer(text);
      tip.remove();
      S.assistant.msgs.push({role:"bot",text:ans.text,chips:ans.chips});
      save(); renderFeed();
      // update free counter badge
      const badge=app.querySelector(".topbar .tag");
      if(badge&&!isPremium())badge.textContent=(FREE_AI_MESSAGES-S.assistant.used)+" free";
    },520+Math.random()*350);
  }

  renderFeed();

  // composer
  const input=h("input.field",{placeholder:"Message Aya…",style:{borderRadius:"var(--r-full)"},
    onkeydown:e=>{if(e.key==="Enter"){send(input.value);input.value="";}}});
  const sendBtn=h("button.icon-btn",{style:{width:"46px",height:"46px",background:"linear-gradient(135deg,var(--rose),var(--rose-deep))",color:"var(--on-rose)",border:"0",flex:"none"},
    onclick:()=>{send(input.value);input.value="";}},icon("send",20));
  screen.appendChild(h("div",{style:{position:"sticky",bottom:"0",padding:"10px 16px calc(10px + env(safe-area-inset-bottom))",
    background:"color-mix(in srgb,var(--surface) 92%,transparent)",backdropFilter:"blur(14px)",borderTop:"1px solid var(--line)",
    display:"flex",gap:"10px",alignItems:"center"}},[input,sendBtn]));
  setTimeout(()=>input.focus(),200);
  return app;
});

/* small keyframe for typing dots + assistant fab pulse (injected once) */
(function(){const s=document.createElement("style");
  s.textContent="@keyframes blink{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}"+
    "@keyframes pulseRose{0%{box-shadow:0 0 0 0 rgba(183,110,121,.5)}70%{box-shadow:0 0 0 12px rgba(183,110,121,0)}100%{box-shadow:0 0 0 0 rgba(183,110,121,0)}}";
  document.head.appendChild(s);})();

/* Floating assistant button used on main bride screens */
function assistantFab(){
  return h("button.fab-btn",{style:{animation:"pulseRose 2.4s infinite"},"aria-label":"AI assistant",onclick:()=>go("/assistant")},
    icon("spark",24));
}

/* ---------------- APPOINTMENTS SCREEN ---------------- */
route("/appointments",()=>{
  const kids=[topbar("Appointments",{back:true})];
  const ups=upcomingBookings();
  if(!ups.length){
    kids.push(h("div.empty",{style:{paddingTop:"64px"}},[h("div.em","📅"),h("h3","No appointments yet"),
      h("p.muted",{style:{maxWidth:"270px",margin:"0 auto 18px"}},"When you select a vendor you can pick a date and save it here — and to your calendar."),
      h("button.btn.btn-pri",{onclick:()=>go("/categories")},"Browse vendors")]));
  }else{
    kids.push(h("div.small.faint",{style:{margin:"0 3px 12px"}},ups.length+" upcoming appointment"+(ups.length>1?"s":"")));
    kids.push(h("div.col.gap12",ups.map(b=>{
      const dt=new Date(b.date+"T"+(b.time||"11:00")+":00");
      return h("div.card.pad-s",{style:{display:"flex",gap:"12px",alignItems:"center"}},[
        h("div",{style:{width:"56px",textAlign:"center",flex:"none"}},[
          h("div",{style:{fontFamily:"var(--font-d)",fontSize:"24px",fontWeight:"600",color:"var(--rose-deep)",lineHeight:"1"}},dt.getDate()),
          h("div.tiny.faint",{style:{textTransform:"uppercase",letterSpacing:".05em"}},dt.toLocaleDateString("en",{month:"short"})),
        ]),
        h("div.grow",{style:{minWidth:0,borderLeft:"1px solid var(--line)",paddingLeft:"12px"},onclick:()=>go("/vendor/"+b.vendorId)},[
          h("b",b.vendor.name),
          h("div.tiny.faint",[b.task?shortTask(b.task.title):"Appointment",b.time?(" · "+b.time):""]),
          b.note?h("div.tiny.muted",{style:{marginTop:"2px"}},b.note):null,
        ]),
        h("button.icon-btn.plain",{"aria-label":"Calendar",onclick:()=>openCalendarSheet({title:(b.task?shortTask(b.task.title):"Appointment")+": "+b.vendor.name,date:b.date,time:b.time,desc:b.note||"Booked via Wedding & Co",location:b.vendor.maps})},icon("cal",20)),
      ]);
    })));
  }
  return appFrame(kids,{tabs:brideTabs("/profile")});
});
