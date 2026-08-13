import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./pages/Dashboard";
import { Vendors } from "./pages/Vendors";
import { Discover } from "./pages/Discover";
import { ImportPage } from "./pages/Import";
import { makeT, type Lang } from "./i18n";

type Page = "dashboard" | "vendors" | "discover" | "import";

const NAV: { key: Page; icon: string }[] = [
  { key: "dashboard", icon: "▚" },
  { key: "vendors", icon: "▤" },
  { key: "discover", icon: "◎" },
  { key: "import", icon: "▼" },
];

export function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [lang, setLang] = useState<Lang>("en");
  const t = useMemo(() => makeT(lang), [lang]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">◆</div>
            <div>
              <div className="text-sm font-bold text-slate-900">{t("app_title")}</div>
              <div className="text-[11px] text-slate-500">Oman Wedding Vendors</div>
            </div>
          </div>

          <nav className="ml-4 flex gap-1">
            {NAV.map((n) => (
              <button
                key={n.key}
                onClick={() => setPage(n.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  page === n.key
                    ? "bg-brand-soft text-brand-ink"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                <span className="mr-1.5">{n.icon}</span>
                {t(n.key)}
              </button>
            ))}
          </nav>

          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="btn ml-auto"
            title="Toggle language"
          >
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {page === "dashboard" && <Dashboard t={t} />}
        {page === "vendors" && <Vendors t={t} />}
        {page === "discover" && <Discover t={t} />}
        {page === "import" && <ImportPage t={t} />}
      </main>
    </div>
  );
}
