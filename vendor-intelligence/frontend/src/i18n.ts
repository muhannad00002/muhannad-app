// Minimal bilingual (English / Arabic) label dictionary with RTL support.

export type Lang = "en" | "ar";

export const STRINGS: Record<string, { en: string; ar: string }> = {
  app_title: { en: "Vendor Intelligence", ar: "منصة الموردين" },
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  vendors: { en: "Vendors", ar: "الموردون" },
  discover: { en: "Discover", ar: "اكتشاف" },
  import: { en: "Import", ar: "استيراد" },
  total_vendors: { en: "Total Vendors", ar: "إجمالي الموردين" },
  verified: { en: "Verified", ar: "موثّق" },
  needs_verification: { en: "Needs Verification", ar: "يحتاج تحقق" },
  approved: { en: "Approved", ar: "معتمد" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  categories: { en: "Categories", ar: "الفئات" },
  governorates: { en: "Governorates", ar: "المحافظات" },
  instagram_accounts: { en: "Instagram Accounts", ar: "حسابات إنستغرام" },
  google_maps_matches: { en: "Google Maps Matches", ar: "مطابقات خرائط جوجل" },
  by_category: { en: "Vendors by Category", ar: "الموردون حسب الفئة" },
  by_governorate: { en: "Vendors by Governorate", ar: "الموردون حسب المحافظة" },
  verification_status: { en: "Verification Status", ar: "حالة التحقق" },
  search_placeholder: { en: "Search name, phone, Instagram, address…", ar: "ابحث بالاسم أو الهاتف أو إنستغرام…" },
  export_excel: { en: "Export Excel", ar: "تصدير Excel" },
  export_csv: { en: "Export CSV", ar: "تصدير CSV" },
  start_discovery: { en: "Start Discovery", ar: "بدء الاكتشاف" },
  deep_search: { en: "Deep Search", ar: "بحث عميق" },
  all_categories: { en: "All Categories", ar: "كل الفئات" },
  all_governorates: { en: "All Oman", ar: "كل عمان" },
  business: { en: "Business", ar: "النشاط" },
  category: { en: "Category", ar: "الفئة" },
  governorate: { en: "Governorate", ar: "المحافظة" },
  phone: { en: "Phone", ar: "الهاتف" },
  rating: { en: "Rating", ar: "التقييم" },
  confidence: { en: "Confidence", ar: "الثقة" },
  status: { en: "Status", ar: "الحالة" },
  approve: { en: "Approve", ar: "اعتماد" },
  reject: { en: "Reject", ar: "رفض" },
};

export function makeT(lang: Lang) {
  return (key: string) => STRINGS[key]?.[lang] ?? key;
}
