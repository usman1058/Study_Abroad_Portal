"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { LANGS, translate, dirForLang, type LangCode } from "@/lib/i18n";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial: Theme = stored ?? "light";
    setTheme(initial);
    if (initial === "dark") document.documentElement.classList.add("dark");
  }, []);

  const toggle = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("theme", next);
      return next;
    });
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

type LangContextValue = {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: string) => string;
};

const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function useLang() {
  return useContext(LangContext);
}

function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const stored = localStorage.getItem("lang") as LangCode | null;
    const initial = stored && LANGS.some((l) => l.code === stored) ? stored : "en";
    setLangState(initial);
    document.documentElement.lang = initial;
    document.documentElement.dir = dirForLang(initial);
  }, []);

  const setLang = (next: LangCode) => {
    setLangState(next);
    localStorage.setItem("lang", next);
    document.documentElement.lang = next;
    document.documentElement.dir = dirForLang(next);
  };

  const t = (key: string) => translate(lang, key);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LanguageProvider>{children}</LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}