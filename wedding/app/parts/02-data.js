/* ================= ZAFFA — SEED DATA =================
   Realistic demo content for a wedding-planning marketplace (Oman).
   Currency: Omani Rial (OMR). All prices illustrative. */

const CITIES = ["Muscat","Salalah","Sohar","Nizwa","Sur","Barka"];

/* The 11 governorates of Oman — used for customer sign-up & vendor location */
const GOVERNORATES = [
  "Muscat","Dhofar","Musandam","Al Buraimi","Ad Dakhiliyah",
  "Al Batinah North","Al Batinah South","Al Sharqiyah North",
  "Al Sharqiyah South","Ad Dhahirah","Al Wusta",
];
/* Map the demo cities to their governorate so existing vendors get a location */
const CITY_GOVERNORATE = {
  "Muscat":"Muscat", "Salalah":"Dhofar", "Sohar":"Al Batinah North",
  "Nizwa":"Ad Dakhiliyah", "Sur":"Al Sharqiyah South", "Barka":"Al Batinah South",
};
const govOfCity = (city) => CITY_GOVERNORATE[city] || city || "";

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
    governorate:opts.gov||govOfCity(city),
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

const SEED_VENDORS = [];

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

/* Wedding tips — managed by the admin (empty until added) */
const SEED_TIPS = [];

/* Advertisements / promoted banners — managed by the admin */
const SEED_ADS = [];

/* Notifications — generated for real brides at runtime */
const SEED_NOTIFS = [];

/* Users — real accounts come from the backend; none seeded */
const SEED_USERS = [];
