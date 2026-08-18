"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { useLang } from "@/components/providers";
import { LANGS } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Change language"
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span className="truncate">{LANGS.find((l) => l.code === lang)?.label ?? "English"}</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-2 z-50 mb-1 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={"block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800 " + (lang === l.code ? "font-semibold text-brand-700 dark:text-brand-200" : "")}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}