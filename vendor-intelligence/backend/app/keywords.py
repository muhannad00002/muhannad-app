"""Bilingual (English/Arabic) keyword dictionary and query generator.

Every one of the 35 categories has English and Arabic seed terms plus hashtags.
:func:`generate_queries` expands a category into many real search queries by
combining seeds with Oman / governorate / city / Instagram / hashtag patterns —
so discovery never relies on a single query or the bare English name.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

COUNTRY_EN = "Oman"
COUNTRY_AR = "عمان"

# Governorates (English + Arabic) and common cities/wilayats used to localise
# queries. Kept here so the discovery engine and classifier share one source.
GOVERNORATES: Dict[str, str] = {
    "Muscat": "مسقط",
    "Dhofar": "ظفار",
    "North Al Batinah": "شمال الباطنة",
    "South Al Batinah": "جنوب الباطنة",
    "Al Dakhiliyah": "الداخلية",
    "North Al Sharqiyah": "شمال الشرقية",
    "South Al Sharqiyah": "جنوب الشرقية",
    "Al Dhahirah": "الظاهرة",
    "Al Buraimi": "البريمي",
    "Musandam": "مسندم",
    "Al Wusta": "الوسطى",
}

CITIES: Dict[str, str] = {
    "Muscat": "مسقط",
    "Muttrah": "مطرح",
    "Seeb": "السيب",
    "Bawshar": "بوشر",
    "Al Amerat": "العامرات",
    "Qurum": "القرم",
    "Salalah": "صلالة",
    "Sohar": "صحار",
    "Nizwa": "نزوى",
    "Sur": "صور",
    "Ibri": "عبري",
    "Buraimi": "البريمي",
    "Rustaq": "الرستاق",
    "Barka": "بركاء",
    "Ibra": "إبراء",
    "Khasab": "خصب",
}

INSTAGRAM_TERMS_EN = ["instagram", "insta"]
INSTAGRAM_TERMS_AR = ["انستقرام", "انستغرام"]


@dataclass
class CategoryKeywords:
    """English + Arabic seed terms and hashtags for a category."""

    en: List[str] = field(default_factory=list)
    ar: List[str] = field(default_factory=list)
    hashtags: List[str] = field(default_factory=list)


# Seed terms per category. English + Arabic. Deliberately varied so the query
# generator produces broad, natural-language coverage.
CATEGORY_KEYWORDS: Dict[str, CategoryKeywords] = {
    "Wedding Dresses": CategoryKeywords(
        en=["wedding dresses", "bridal dresses", "bridal gowns", "wedding gown", "wedding dress shop"],
        ar=["فساتين زفاف", "فساتين عرائس", "فساتين عروس", "فساتين أفراح", "بدلة عروس"],
        hashtags=["#فساتين_زفاف_عمان", "#weddingdressoman", "#فساتين_عمان"],
    ),
    "Evening Dresses": CategoryKeywords(
        en=["evening dresses", "evening gowns", "party dresses", "soiree dresses"],
        ar=["فساتين سهرة", "فساتين سواريه", "فساتين مناسبات", "فساتين حفلات"],
        hashtags=["#فساتين_سهرة_عمان", "#eveningdressoman"],
    ),
    "Tailors": CategoryKeywords(
        en=["tailor", "dressmaker", "custom tailoring", "bridal tailor", "abaya tailor"],
        ar=["خياط", "خياطة", "تفصيل فساتين", "خياطة فساتين", "تفصيل عبايات"],
        hashtags=["#خياطة_عمان", "#tailoroman"],
    ),
    "Bridal Boutiques": CategoryKeywords(
        en=["bridal boutique", "bridal shop", "bridal store", "bridal salon"],
        ar=["بوتيك عرائس", "بوتيك عروس", "محل عرائس", "صالون عرائس"],
        hashtags=["#بوتيك_عرائس_عمان", "#bridaloman"],
    ),
    "Wedding Halls": CategoryKeywords(
        en=["wedding hall", "wedding venue", "banquet hall", "event hall", "wedding ballroom"],
        ar=["قاعة أفراح", "قاعة زفاف", "قاعة مناسبات", "صالة أفراح", "قصر أفراح"],
        hashtags=["#قاعات_افراح_عمان", "#weddinghalloman"],
    ),
    "Hotels": CategoryKeywords(
        en=["wedding hotel", "hotel wedding venue", "resort wedding", "hotel ballroom"],
        ar=["فندق أعراس", "فندق مناسبات", "منتجع أعراس", "قاعة فندق"],
        hashtags=["#weddinghoteloman"],
    ),
    "Wedding Decorations": CategoryKeywords(
        en=["wedding decoration", "wedding decor", "event decoration", "stage decoration", "kosha"],
        ar=["ديكور أفراح", "تنسيق أعراس", "كوش أفراح", "ديكور مناسبات", "تجهيز قاعات"],
        hashtags=["#ديكور_افراح_عمان", "#weddingdecoroman", "#كوش_عمان"],
    ),
    "Flowers": CategoryKeywords(
        en=["florist", "wedding flowers", "flower shop", "flower arrangement"],
        ar=["محل ورد", "تنسيق ورد", "زهور", "ورد أفراح", "منسق زهور"],
        hashtags=["#ورد_عمان", "#floweroman", "#زهور_عمان"],
    ),
    "Bridal Bouquets": CategoryKeywords(
        en=["bridal bouquet", "wedding bouquet", "bride flowers"],
        ar=["بوكيه عروس", "بوكيه ورد", "باقة عروس"],
        hashtags=["#بوكيه_عروس_عمان", "#bridalbouquetoman"],
    ),
    "Makeup Artists": CategoryKeywords(
        en=["makeup artist", "bridal makeup", "wedding makeup", "mua"],
        ar=["مكياج عرائس", "خبيرة تجميل", "ميكب ارتست", "مكياج عروس", "فنانة مكياج"],
        hashtags=["#مكياج_عرائس_عمان", "#makeupoman", "#مكياج_عمان"],
    ),
    "Hair Stylists": CategoryKeywords(
        en=["hair stylist", "bridal hair", "hairdresser", "wedding hair"],
        ar=["تسريحات شعر", "كوافير", "تسريحات عرائس", "مصففة شعر"],
        hashtags=["#كوافير_عمان", "#hairoman", "#تسريحات_عمان"],
    ),
    "Henna": CategoryKeywords(
        en=["henna artist", "bridal henna", "mehndi", "henna design"],
        ar=["نقش حنة", "حناية", "حنة عرائس", "رسم حنة", "نقاشة حنة"],
        hashtags=["#حنة_عمان", "#hennaoman", "#نقش_حناء_عمان"],
    ),
    "Photography": CategoryKeywords(
        en=["wedding photographer", "photography", "bridal photography", "photo studio"],
        ar=["تصوير أعراس", "مصور أعراس", "مصورة عرائس", "استوديو تصوير", "تصوير عرائس"],
        hashtags=["#تصوير_اعراس_عمان", "#photographyoman", "#مصورة_عمان"],
    ),
    "Videography": CategoryKeywords(
        en=["wedding videographer", "videography", "wedding film", "cinematography"],
        ar=["تصوير فيديو أعراس", "فيديو أعراس", "تصوير سينمائي", "مونتاج أعراس"],
        hashtags=["#فيديو_اعراس_عمان", "#videographyoman"],
    ),
    "Photo Booth": CategoryKeywords(
        en=["photo booth", "photobooth rental", "selfie booth", "360 photo booth"],
        ar=["فوتو بوث", "ركن تصوير", "بوث تصوير", "تصوير فوري"],
        hashtags=["#photobootoman", "#فوتوبوث_عمان"],
    ),
    "Catering": CategoryKeywords(
        en=["wedding catering", "caterer", "buffet catering", "event catering"],
        ar=["تموين حفلات", "بوفيه أعراس", "ضيافة أعراس", "متعهد حفلات", "تجهيز بوفيه"],
        hashtags=["#تموين_عمان", "#cateringoman", "#بوفيه_عمان"],
    ),
    "Desserts": CategoryKeywords(
        en=["desserts", "wedding sweets", "dessert table", "sweet shop"],
        ar=["حلويات", "حلويات أفراح", "ركن حلا", "معجنات وحلا", "حلا مناسبات"],
        hashtags=["#حلويات_عمان", "#dessertoman", "#حلا_عمان"],
    ),
    "Chocolates": CategoryKeywords(
        en=["chocolate shop", "wedding chocolate", "chocolate favors", "chocolatier"],
        ar=["شوكولاتة", "شوكولاته أفراح", "توزيعات شوكولاته", "محل شوكولاتة"],
        hashtags=["#شوكولاته_عمان", "#chocolateoman"],
    ),
    "Hospitality": CategoryKeywords(
        en=["hospitality service", "wedding hospitality", "serving staff", "waiters service"],
        ar=["ضيافة", "خدمة ضيافة", "مباشرين ضيافة", "ضيافة مناسبات", "قهوجية"],
        hashtags=["#ضيافة_عمان", "#hospitalityoman"],
    ),
    "Coffee Corner": CategoryKeywords(
        en=["coffee corner", "coffee cart", "arabic coffee service", "barista service"],
        ar=["ركن قهوة", "عربة قهوة", "قهوجية", "ضيافة قهوة عربية", "ركن قهوه"],
        hashtags=["#ركن_قهوة_عمان", "#coffeecorneroman"],
    ),
    "Cake": CategoryKeywords(
        en=["wedding cake", "cake shop", "custom cake", "cake designer"],
        ar=["كيك أعراس", "كيكة زفاف", "محل كيك", "تصميم كيك", "كيك مناسبات"],
        hashtags=["#كيك_عمان", "#cakeoman", "#كيك_اعراس_عمان"],
    ),
    "DJ": CategoryKeywords(
        en=["wedding dj", "dj service", "event dj", "disc jockey"],
        ar=["دي جي", "دي جي أعراس", "منسق أغاني", "دي جي حفلات"],
        hashtags=["#دي_جي_عمان", "#djoman"],
    ),
    "Band": CategoryKeywords(
        en=["wedding band", "live band", "music band", "wedding musicians"],
        ar=["فرقة موسيقية", "فرقة أعراس", "عازفين", "فرقة شعبية"],
        hashtags=["#فرقة_عمان", "#bandoman"],
    ),
    "Live Music": CategoryKeywords(
        en=["live music", "live performance", "oud player", "singer for weddings"],
        ar=["عزف حي", "موسيقى حية", "عازف عود", "مطرب أعراس", "فنان حفلات"],
        hashtags=["#عزف_حي_عمان", "#livemusicoman"],
    ),
    "Lighting": CategoryKeywords(
        en=["event lighting", "wedding lighting", "stage lighting", "lighting rental"],
        ar=["إضاءة أفراح", "تأجير إضاءة", "إضاءة مسرح", "تجهيز إضاءة"],
        hashtags=["#اضاءة_عمان", "#lightingoman"],
    ),
    "Luxury Cars": CategoryKeywords(
        en=["luxury car rental", "wedding car", "bridal car", "limousine rental"],
        ar=["سيارات فخمة للايجار", "سيارة عروس", "تأجير سيارات أعراس", "ليموزين"],
        hashtags=["#سيارات_اعراس_عمان", "#luxurycaroman"],
    ),
    "Wedding Planner": CategoryKeywords(
        en=["wedding planner", "event planner", "wedding organizer", "event management"],
        ar=["منظم حفلات", "تنظيم أعراس", "تنسيق حفلات", "تنظيم مناسبات", "منسقة أعراس"],
        hashtags=["#تنظيم_حفلات_عمان", "#weddingplanneroman", "#تنسيق_حفلات_عمان"],
    ),
    "Invitations": CategoryKeywords(
        en=["wedding invitations", "invitation cards", "digital invitation", "invitation designer"],
        ar=["دعوات زفاف", "كروت دعوة", "دعوات إلكترونية", "تصميم دعوات", "بطاقات دعوة"],
        hashtags=["#دعوات_عمان", "#invitationoman", "#دعوات_زواج_عمان"],
    ),
    "Printing": CategoryKeywords(
        en=["printing press", "print shop", "event printing", "digital printing"],
        ar=["مطبعة", "طباعة", "خدمات طباعة", "طباعة دعوات"],
        hashtags=["#مطبعة_عمان", "#printingoman"],
    ),
    "Gifts": CategoryKeywords(
        en=["gift shop", "wedding gifts", "gift boxes", "gift arrangement"],
        ar=["هدايا", "محل هدايا", "تنسيق هدايا", "بوكسات هدايا", "هدايا عروس"],
        hashtags=["#هدايا_عمان", "#giftoman"],
    ),
    "Wedding Favors": CategoryKeywords(
        en=["wedding favors", "party favors", "giveaways", "toazeaat"],
        ar=["توزيعات أعراس", "توزيعات عروس", "هدايا ضيوف", "توزيعات مناسبات"],
        hashtags=["#توزيعات_عمان", "#weddingfavorsoman", "#توزيعات_عروس_عمان"],
    ),
    "Accessories": CategoryKeywords(
        en=["bridal accessories", "wedding accessories", "hair accessories", "tiara crown"],
        ar=["اكسسوارات عرائس", "اكسسوارات أفراح", "تيجان عرائس", "اكسسوارات شعر"],
        hashtags=["#اكسسوارات_عمان", "#accessoriesoman"],
    ),
    "Jewelry": CategoryKeywords(
        en=["jewelry", "gold jewelry", "bridal jewelry", "jewellery shop"],
        ar=["مجوهرات", "ذهب", "مجوهرات عرائس", "محل مجوهرات", "ذهب عروس"],
        hashtags=["#مجوهرات_عمان", "#jewelryoman", "#ذهب_عمان"],
    ),
    "Perfumes": CategoryKeywords(
        en=["perfume shop", "oud perfume", "bridal perfume", "arabic perfume"],
        ar=["عطور", "محل عطور", "عود ومبخر", "عطور عرائس", "بخور وعود"],
        hashtags=["#عطور_عمان", "#perfumeoman", "#عود_عمان"],
    ),
    "Honeymoon Packages": CategoryKeywords(
        en=["honeymoon package", "honeymoon travel", "travel agency honeymoon", "honeymoon resort"],
        ar=["شهر العسل", "باقات شهر العسل", "عروض شهر عسل", "وكالة سفر شهر العسل"],
        hashtags=["#شهر_العسل_عمان", "#honeymoonoman"],
    ),
}

ALL_CATEGORIES: List[str] = list(CATEGORY_KEYWORDS.keys())


def _dedupe(seq: List[str]) -> List[str]:
    seen: set = set()
    out: List[str] = []
    for item in seq:
        key = item.strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(item.strip())
    return out


def generate_queries(
    category: str,
    governorate: Optional[str] = None,
    deep: bool = False,
    limit: Optional[int] = None,
) -> List[str]:
    """Generate search queries for ``category``.

    Standard mode returns a focused set (English + Arabic + Instagram).
    Deep mode adds governorate/city localisation, ``site:instagram.com``
    dorks, and hashtag queries — significantly more variations.

    Args:
        category: One of :data:`ALL_CATEGORIES`.
        governorate: Optional governorate to localise toward.
        deep: Whether to generate the expanded deep-search set.
        limit: Optional hard cap on returned queries.
    """
    kw = CATEGORY_KEYWORDS.get(category)
    if kw is None:
        return []

    queries: List[str] = []

    # 1. Core English + Arabic + country.
    for term in kw.en:
        queries.append(f"{term} {COUNTRY_EN}")
    for term in kw.ar:
        queries.append(f"{term} {COUNTRY_AR}")

    # 2. Instagram-oriented queries (primary discovery source).
    for term in kw.en[:3]:
        queries.append(f"{term} {COUNTRY_EN} instagram")
    for term in kw.ar[:3]:
        queries.append(f"{term} {COUNTRY_AR} انستقرام")

    if not deep:
        result = _dedupe(queries)
        return result[:limit] if limit else result

    # 3. Deep: governorate + city localisation.
    govs = {governorate: GOVERNORATES.get(governorate)} if governorate else GOVERNORATES
    for gov_en, gov_ar in govs.items():
        if not gov_en:
            continue
        if kw.en:
            queries.append(f"{kw.en[0]} {gov_en}")
        if kw.ar and gov_ar:
            queries.append(f"{kw.ar[0]} {gov_ar}")

    for city_en, city_ar in list(CITIES.items())[:6]:
        if kw.en:
            queries.append(f"{kw.en[0]} {city_en}")
        if kw.ar:
            queries.append(f"{kw.ar[0]} {city_ar}")

    # 4. site:instagram.com search-engine dorks (public results only).
    for term in kw.en[:2]:
        queries.append(f'site:instagram.com "{term}" "{COUNTRY_EN}"')
    for term in kw.ar[:2]:
        queries.append(f'site:instagram.com "{term}" "{COUNTRY_AR}"')

    # 5. Hashtag queries.
    for tag in kw.hashtags:
        queries.append(tag)

    result = _dedupe(queries)
    return result[:limit] if limit else result
