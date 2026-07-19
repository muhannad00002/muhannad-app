/* ================= ZAFFA — SEED DATA =================
   Realistic demo content for a wedding-planning marketplace (Oman).
   Currency: Omani Rial (OMR). All prices illustrative. */

const CITIES = ["Muscat","Salalah","Sohar","Nizwa","Sur","Barka"];

/* The 11 governorates of Oman — used for customer sign-up */
const GOVERNORATES = [
  "Muscat","Dhofar","Musandam","Al Buraimi","Ad Dakhiliyah",
  "Al Batinah North","Al Batinah South","Al Sharqiyah North",
  "Al Sharqiyah South","Ad Dhahirah","Al Wusta",
];

/* ---- Categories (expandable; admin can add more) ---- */
const SEED_CATEGORIES = [
  ["dresses","Wedding Dresses","👰",1],
  ["evening","Evening Dresses","💃",2],
  ["tailors","Tailors","🧵",3],
  ["boutiques","Bridal Boutiques","🛍️",4],
  ["halls","Wedding Halls","🏛️",5],
  ["hotels","Hotels","🏨",6],
  ["decor","Wedding Decorations","🎀",7],
  ["flowers","Flowers","🌸",8],
  ["bouquets","Bridal Bouquets","💐",9],
  ["makeup","Makeup Artists","💄",10],
  ["hair","Hair Stylists","💇‍♀️",11],
  ["henna","Henna","🌿",12],
  ["photo","Photography","📸",13],
  ["video","Videography","🎥",14],
  ["booth","Photo Booth","🖼️",15],
  ["catering","Catering","🍽️",16],
  ["desserts","Desserts","🍰",17],
  ["chocolates","Chocolates","🍫",18],
  ["hospitality","Hospitality","🤍",19],
  ["coffee","Coffee Corner","☕",20],
  ["cake","Cake","🎂",21],
  ["dj","DJ","🎧",22],
  ["band","Band","🎺",23],
  ["music","Live Music","🎻",24],
  ["lighting","Lighting","✨",25],
  ["cars","Luxury Cars","🚗",26],
  ["planner","Wedding Planner","📋",27],
  ["invitations","Invitations","💌",28],
  ["printing","Printing","🖨️",29],
  ["gifts","Gifts","🎁",30],
  ["favors","Wedding Favors","🎉",31],
  ["accessories","Accessories","👜",32],
  ["jewelry","Jewelry","💍",33],
  ["perfumes","Perfumes","🌷",34],
  ["honeymoon","Honeymoon Packages","✈️",35],
].map(([id,name,icon,order])=>({id,name,icon,order}));

/* palette hints per category for generated cover art */
const CAT_HUE = {
  dresses:[345,25],evening:[300,20],tailors:[25,15],boutiques:[335,20],halls:[35,18],
  hotels:[210,14],decor:[345,26],flowers:[330,32],bouquets:[340,30],makeup:[350,28],
  hair:[20,18],henna:[95,26],photo:[215,14],video:[260,16],booth:[290,20],catering:[30,20],
  desserts:[28,26],chocolates:[22,24],hospitality:[40,16],coffee:[25,22],cake:[335,22],
  dj:[265,22],band:[45,20],music:[260,16],lighting:[48,30],cars:[210,10],planner:[340,18],
  invitations:[40,22],printing:[210,12],gifts:[345,24],favors:[330,26],accessories:[300,16],
  jewelry:[45,32],perfumes:[320,20],honeymoon:[195,26],
};

/* ---- helper to build vendors compactly ---- */
let _vid=0;
function V(catId,name,city,rating,reviews,priceLevel,short,opts={}){
  _vid++;
  const priceRanges={1:"OMR 40–120",2:"OMR 120–350",3:"OMR 350–900",4:"OMR 900+"};
  return {
    id:"v"+String(_vid).padStart(3,"0"),
    catId,name,city,
    rating,reviews,
    priceLevel,                       // 1..4
    priceRange:opts.price||priceRanges[priceLevel],
    short,
    desc:opts.desc||short+" Our team brings years of experience creating unforgettable wedding moments, with meticulous attention to every detail so your day feels effortless and truly yours.",
    services:opts.services||["Private consultation","Bespoke packages","Day-of coordination","Flexible scheduling"],
    hours:opts.hours||"Sat–Thu · 10:00 AM – 9:00 PM",
    instagram:opts.ig||("@"+name.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")),
    whatsapp:opts.wa||"+968 9"+ (2000000+_vid*137%7999999),
    phone:opts.phone||"+968 2"+ (4000000+_vid*211%3999999),
    maps:opts.maps||(city+", Oman"),
    featured:!!opts.featured,
    approved:opts.approved!==false,
    isNew:!!opts.isNew,
    offer:opts.offer||null,          // {label, until}
    popularity:opts.pop|| (rating*20 + reviews/12),
    packages:opts.packages||[
      {name:"Essential",price:priceRanges[priceLevel].split("–")[0].trim(),items:["Core service","1 revision","Standard timeline"]},
      {name:"Signature",price:priceRanges[priceLevel].replace("–"," / ").split("/")[1]?.trim()||priceRanges[priceLevel],items:["Everything in Essential","Premium options","Priority booking","Extended session"],popular:true},
    ],
    reviewsList:opts.reviews||[
      {by:"Aisha K.",stars:5,text:"Absolutely stunning experience. Everything was perfect and stress-free.",when:"2 weeks ago"},
      {by:"Mariam S.",stars:rating>=4.6?5:4,text:"So happy we chose them. Professional, warm and truly talented.",when:"1 month ago"},
      {by:"Latifa A.",stars:5,text:"Exceeded every expectation. Highly recommend to any bride.",when:"2 months ago"},
    ],
  };
}

const SEED_VENDORS = [
  // Wedding Dresses
  V("dresses","Maison Blanche","Muscat",4.9,214,4,"Couture bridal gowns handcrafted with imported French lace.",{featured:true,offer:{label:"Free veil with any gown",until:"2026-08-31"},services:["Made-to-measure couture","Imported lace & silk","3 fittings included","Veil & accessories"]}),
  V("dresses","Rose & Ivory","Salalah",4.7,138,3,"Romantic ready-to-wear gowns with delicate beadwork.",{featured:true}),
  V("dresses","Atelier Yasmin","Muscat",4.8,176,4,"Modern minimalist silhouettes for the contemporary bride.",{isNew:true}),
  V("dresses","Pearl Bridal House","Sohar",4.5,92,2,"Affordable elegance with a wide seasonal collection.",{offer:{label:"15% off spring collection",until:"2026-07-30"}}),
  // Evening Dresses
  V("evening","Soirée Couture","Muscat",4.8,121,3,"Show-stopping evening gowns for the henna & reception.",{featured:true}),
  V("evening","Velvet & Gold","Nizwa",4.6,74,2,"Rich colours and flowing fabrics for every celebration."),
  // Tailors
  V("tailors","Golden Needle","Muscat",4.7,203,2,"Master tailoring & alterations with same-week turnaround.",{services:["Alterations","Custom stitching","Bustle & hemming","Rush service"]}),
  V("tailors","Stitch Atelier","Barka",4.4,58,1,"Reliable everyday tailoring for the whole bridal party."),
  // Bridal Boutiques
  V("boutiques","The Bridal Room","Muscat",4.9,167,3,"One-stop boutique: gowns, veils, shoes and accessories.",{featured:true}),
  V("boutiques","Blush Boutique","Salalah",4.6,88,2,"Curated bridal edit with personal styling sessions."),
  // Wedding Halls
  V("halls","Al Bustan Ballroom","Muscat",4.9,341,4,"Grand seaside ballroom seating up to 600 guests.",{featured:true,services:["Up to 600 guests","In-house catering","Bridal suite","Valet & security"],price:"OMR 1,500+"}),
  V("halls","Qasr Al Noor","Salalah",4.7,192,3,"Elegant garden hall wrapped in greenery and light.",{offer:{label:"Weekday 20% off",until:"2026-09-15"}}),
  V("halls","Pearl Palace Hall","Sohar",4.5,124,3,"Modern hall with flexible layouts for 150–400 guests."),
  V("halls","Nizwa Heritage Hall","Nizwa",4.6,97,2,"Traditional charm with contemporary comforts.",{isNew:true}),
  // Hotels
  V("hotels","Shangri-La Barr Al Jissah","Muscat",4.9,410,4,"Luxury resort weddings across three beachfront hotels.",{featured:true,price:"OMR 2,000+"}),
  V("hotels","Kempinski Muscat","Muscat",4.8,286,4,"Beachfront elegance with award-winning catering."),
  V("hotels","Alila Jabal Akhdar","Nizwa",4.9,178,4,"Dramatic mountain-top celebrations above the clouds.",{isNew:true,price:"OMR 2,500+"}),
  // Decorations
  V("decor","Lush Events","Muscat",4.8,156,3,"Full-scale wedding styling — stages, aisles & tablescapes.",{featured:true,services:["Stage & backdrop design","Floral installations","Table styling","Lighting concept"]}),
  V("decor","Petal & Pearl Decor","Salalah",4.6,89,2,"Romantic soft styling with signature blush palettes."),
  V("decor","Grand Affair","Sohar",4.5,63,3,"Bold, dramatic décor for statement celebrations."),
  // Flowers
  V("flowers","Bloom Studio","Muscat",4.9,198,2,"Seasonal florals arranged fresh for every event.",{featured:true}),
  V("flowers","Jasmine & Co","Salalah",4.7,112,2,"Fragrant local blooms and lush greenery."),
  // Bridal Bouquets
  V("bouquets","The Bouquet Bar","Muscat",4.8,134,1,"Hand-tied bridal bouquets in your exact palette.",{price:"OMR 25–90"}),
  V("bouquets","Wild Rose","Nizwa",4.6,71,1,"Garden-style bouquets with a natural, untamed feel.",{price:"OMR 20–75"}),
  // Makeup
  V("makeup","Glow by Reem","Muscat",4.9,321,3,"Signature bridal glam & natural soft-glam looks.",{featured:true,offer:{label:"Free trial with booking",until:"2026-08-15"},services:["Bridal trial","Wedding-day glam","Henna-night look","Touch-up kit"]}),
  V("makeup","Noor Beauty","Salalah",4.7,187,2,"Flawless long-wear makeup for you and your guests."),
  V("makeup","Muse Artistry","Sohar",4.6,96,2,"Editorial-inspired looks tailored to your features.",{isNew:true}),
  V("makeup","Layali Glam","Muscat",4.8,142,3,"Luxury on-location bridal beauty team."),
  // Hair
  V("hair","Crown Hair Atelier","Muscat",4.8,163,2,"Bridal updos, waves and veil styling.",{featured:true}),
  V("hair","Silk & Shine","Salalah",4.6,84,2,"Sleek, elegant styling for the whole bridal party."),
  // Henna
  V("henna","Henna by Huda","Muscat",4.9,241,1,"Intricate bridal henna in classic & modern styles.",{featured:true,price:"OMR 30–120"}),
  V("henna","Naqsh Studio","Nizwa",4.7,109,1,"Fine-line contemporary henna artistry.",{price:"OMR 25–100"}),
  // Photography
  V("photo","Lumière Photography","Muscat",4.9,276,3,"Timeless, editorial wedding photography.",{featured:true,services:["Full-day coverage","Two photographers","Online gallery","Pre-wedding shoot"]}),
  V("photo","Golden Hour Studio","Salalah",4.8,158,3,"Warm, candid storytelling of your day."),
  V("photo","Frame & Light","Sohar",4.6,92,2,"Bright, natural photography with quick delivery.",{isNew:true}),
  // Videography
  V("video","Cinematic Vows","Muscat",4.8,144,3,"Film-style wedding highlights & full features.",{featured:true,services:["Cinematic highlight film","Full ceremony edit","Drone footage","Same-day teaser"]}),
  V("video","Reel Memories","Salalah",4.6,77,2,"Heartfelt films that capture the real moments."),
  // Photo Booth
  V("booth","Snap & Smile","Muscat",4.7,131,1,"360° and classic booths with instant prints.",{price:"OMR 90–250"}),
  // Catering
  V("catering","Saffron Kitchen","Muscat",4.8,219,3,"Refined Omani & international wedding menus.",{featured:true,services:["Buffet & plated menus","Live cooking stations","Dietary options","Full service staff"]}),
  V("catering","Feast & Co","Sohar",4.6,103,2,"Generous, crowd-pleasing spreads for large weddings."),
  // Desserts
  V("desserts","Sweet Symphony","Muscat",4.8,127,2,"Dessert tables, mini pastries & live stations."),
  // Chocolates
  V("chocolates","Cacao Muscat","Muscat",4.9,168,2,"Personalised luxury chocolates & favour boxes.",{featured:true}),
  // Hospitality
  V("hospitality","Karam Hospitality","Muscat",4.7,88,2,"Warm guest reception, ushers & welcome service."),
  // Coffee Corner
  V("coffee","Qahwa Corner","Muscat",4.8,142,1,"Traditional Omani coffee & dates stations.",{price:"OMR 60–180"}),
  // Cake
  V("cake","The Cake Room","Muscat",4.9,201,2,"Tiered couture wedding cakes, made to order.",{featured:true}),
  V("cake","Buttercream Bliss","Salalah",4.6,79,1,"Delicious, beautifully simple celebration cakes.",{price:"OMR 40–150"}),
  // DJ
  V("dj","DJ Amir","Muscat",4.7,156,2,"High-energy sets blending Khaleeji & global hits."),
  // Band
  V("band","The Grand Ensemble","Muscat",4.8,94,3,"Live band & singers for an unforgettable reception."),
  // Live Music
  V("music","Oud & Strings","Nizwa",4.7,63,2,"Elegant live oud, violin & piano for ceremonies."),
  // Lighting
  V("lighting","Lumina Lighting","Muscat",4.8,118,2,"Ambient, architectural & dance-floor lighting design.",{featured:true}),
  // Luxury Cars
  V("cars","Royal Rides","Muscat",4.7,101,3,"Chauffeured luxury & classic bridal cars.",{services:["Rolls-Royce & Bentley","Classic vintage cars","Ribbon & décor","Professional chauffeur"]}),
  // Wedding Planner
  V("planner","Ever After Planners","Muscat",4.9,187,4,"Full-service planning from proposal to send-off.",{featured:true,services:["Full planning","Partial planning","Day-of coordination","Vendor management"]}),
  V("planner","Blissful Beginnings","Salalah",4.7,96,3,"Calm, organised planning with a personal touch."),
  // Invitations
  V("invitations","Ink & Foil","Muscat",4.8,134,1,"Bespoke printed & digital wedding invitations.",{price:"OMR 2–8 / card"}),
  // Printing
  V("printing","Prestige Print","Muscat",4.6,88,1,"Menus, signage, seating charts & thank-you cards.",{price:"OMR 30–200"}),
  // Gifts
  V("gifts","The Gift Atelier","Muscat",4.7,76,2,"Curated luxury gifts for the couple & guests."),
  // Wedding Favors
  V("favors","Little Tokens","Salalah",4.6,64,1,"Personalised favours your guests will love.",{price:"OMR 1–5 / favour"}),
  // Accessories
  V("accessories","Adorn","Muscat",4.7,91,2,"Veils, belts, gloves & bridal hair pieces."),
  // Jewelry
  V("jewelry","Lustre Fine Jewellery","Muscat",4.9,203,4,"Bridal sets, bands & heirloom pieces.",{featured:true,price:"OMR 300+"}),
  // Perfumes
  V("perfumes","Attar House","Nizwa",4.8,117,2,"Signature bridal scents & bespoke attar blends."),
  // Honeymoon
  V("honeymoon","Voyage Weddings","Muscat",4.8,142,4,"Curated honeymoon escapes worldwide.",{featured:true,services:["Maldives & Zanzibar","Europe city breaks","All-inclusive resorts","Full itinerary planning"],price:"OMR 1,200+"}),
];

/* ---- Master checklist template with relationships ----
   status: todo | prog | done
   catId links a task to a vendor category (selecting a vendor completes it).
   suggests: task ids to surface next when this one is completed. */
const CHECKLIST_TEMPLATE = [
  {id:"budget",  title:"Set your wedding budget", cat:null, phase:"Foundations", suggests:["planner"]},
  {id:"planner", title:"Hire a wedding planner", catId:"planner", phase:"Foundations", suggests:["hall","guests"]},
  {id:"date",    title:"Confirm the wedding date", cat:null, phase:"Foundations", suggests:["hall"]},
  {id:"guests",  title:"Draft the guest list", cat:null, phase:"Foundations", suggests:["hall","invitations"]},

  {id:"hall",    title:"Choose the wedding hall", catId:"halls", phase:"Venue & Vendors", suggests:["decor","catering","lighting","photo"]},
  {id:"catering",title:"Book catering", catId:"catering", phase:"Venue & Vendors", suggests:["cake","desserts","coffee"]},
  {id:"decor",   title:"Book decorations", catId:"decor", phase:"Venue & Vendors", suggests:["flowers","lighting"]},
  {id:"lighting",title:"Arrange lighting", catId:"lighting", phase:"Venue & Vendors"},
  {id:"flowers", title:"Order flowers", catId:"flowers", phase:"Venue & Vendors", suggests:["bouquet"]},

  {id:"photo",   title:"Book the photographer", catId:"photo", phase:"Memories", suggests:["video","booth","preshoot"]},
  {id:"video",   title:"Book videography", catId:"video", phase:"Memories", suggests:["drone"]},
  {id:"preshoot",title:"Plan the pre-wedding shoot", cat:null, phase:"Memories"},
  {id:"drone",   title:"Add drone footage", cat:null, phase:"Memories"},
  {id:"album",   title:"Order the wedding album", cat:null, phase:"Memories"},
  {id:"booth",   title:"Reserve a photo booth", catId:"booth", phase:"Memories"},

  {id:"dress",   title:"Buy the wedding dress", catId:"dresses", phase:"Bridal Look", suggests:["shoes","accessories","jewelry","veil","bouquet"]},
  {id:"shoes",   title:"Buy wedding shoes", cat:null, phase:"Bridal Look"},
  {id:"accessories",title:"Choose accessories", catId:"accessories", phase:"Bridal Look"},
  {id:"jewelry", title:"Select bridal jewellery", catId:"jewelry", phase:"Bridal Look"},
  {id:"veil",    title:"Choose the veil", cat:null, phase:"Bridal Look"},
  {id:"rings",   title:"Buy the wedding rings", catId:"jewelry", phase:"Bridal Look"},
  {id:"makeup",  title:"Book makeup artist", catId:"makeup", phase:"Bridal Look", suggests:["hair","henna"]},
  {id:"hair",    title:"Book hair stylist", catId:"hair", phase:"Bridal Look"},
  {id:"henna",   title:"Book henna night", catId:"henna", phase:"Bridal Look"},
  {id:"bouquet", title:"Order the bridal bouquet", catId:"bouquets", phase:"Bridal Look"},
  {id:"perfume", title:"Choose your signature scent", catId:"perfumes", phase:"Bridal Look"},

  {id:"invitations",title:"Send invitations", catId:"invitations", phase:"Guests & Details", suggests:["favors","printing"]},
  {id:"favors",  title:"Order wedding favours", catId:"favors", phase:"Guests & Details"},
  {id:"printing",title:"Print menus & signage", catId:"printing", phase:"Guests & Details"},
  {id:"cake",    title:"Order the wedding cake", catId:"cake", phase:"Guests & Details", suggests:["desserts"]},
  {id:"desserts",title:"Arrange desserts table", catId:"desserts", phase:"Guests & Details"},
  {id:"coffee",  title:"Set up coffee corner", catId:"coffee", phase:"Guests & Details"},
  {id:"hospitality",title:"Arrange hospitality & ushers", catId:"hospitality", phase:"Guests & Details"},

  {id:"music",   title:"Book music / DJ", catId:"dj", phase:"The Celebration", suggests:["band","lighting"]},
  {id:"band",    title:"Consider a live band", catId:"band", phase:"The Celebration"},
  {id:"cars",    title:"Arrange the bridal car", catId:"cars", phase:"The Celebration"},
  {id:"honeymoon",title:"Book the honeymoon", catId:"honeymoon", phase:"After the Day", suggests:[]},
  {id:"gifts",   title:"Prepare thank-you gifts", catId:"gifts", phase:"After the Day"},
];

/* Wedding tips carousel */
const SEED_TIPS = [
  {t:"Book early, breathe easy",b:"The best halls and photographers are reserved 8–12 months ahead. Lock your date first, then your top three vendors.",em:"⏳"},
  {t:"Always do a makeup trial",b:"A trial before the big day means zero surprises. Bring photos of looks you love and your dress neckline.",em:"💄"},
  {t:"Build a 10% buffer",b:"Set aside a little extra in your budget for the lovely details you'll discover along the way.",em:"💰"},
  {t:"Delegate the day-of",b:"Assign a trusted person (or planner) to handle vendors on the day so you can simply be present.",em:"🤍"},
  {t:"Comfort is beauty",b:"Break in your shoes and pack a small kit: pins, plasters, and your favourite scent.",em:"👠"},
];

/* Advertisements / promoted banners */
const SEED_ADS = [
  {id:"ad1",title:"Summer Bridal Sale",body:"Up to 25% off gowns at Maison Blanche",vendorId:"v001",active:true,placement:"home"},
  {id:"ad2",title:"Free Makeup Trial",body:"Book Glow by Reem this month",vendorId:"v025",active:true,placement:"home"},
];

/* Notification templates seeded on first run (generated dynamically too) */
const SEED_NOTIFS = [
  {id:"n1",em:"💄",title:"Don't forget your makeup artist",body:"You still haven't booked makeup — brides book this 4 months ahead.",taskId:"makeup",read:false,when:Date.now()-3600e3*5},
  {id:"n2",em:"📸",title:"Book photography this week",body:"Your favourite photographers get reserved fast. Secure yours soon.",taskId:"photo",read:false,when:Date.now()-3600e3*26},
  {id:"n3",em:"🎂",title:"Cake tasting pending",body:"Schedule your cake tasting to lock in the design.",taskId:"cake",read:true,when:Date.now()-3600e3*50},
];

/* Users for admin */
const SEED_USERS = [
  {id:"u1",name:"Sarah Al Balushi",email:"muhannad00002@gmail.com",role:"bride",date:"2026-10-04",joined:"2026-01-12",status:"active"},
  {id:"u2",name:"Fatma Al Harthy",email:"fatma@example.com",role:"bride",date:"2026-09-20",joined:"2026-02-01",status:"active"},
  {id:"u3",name:"Reem Al Said",email:"reem@example.com",role:"bride",date:"2026-12-15",joined:"2026-03-18",status:"active"},
  {id:"u4",name:"Admin",email:"admin@zaffa.app",role:"admin",date:null,joined:"2025-11-01",status:"active"},
];
