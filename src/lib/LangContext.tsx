import { createContext, useContext, useState, type ReactNode } from "react";
import { translations } from "./i18n";

interface LangContextValue {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

// Until the visitor picks a language, it follows the browser: Spanish if the device is in
// Spanish, English otherwise. The choice is persisted in localStorage so it stays
// consistent across pages (each public page mounts its own LangProvider).
const STORAGE_KEY = "ce_lang";

function getInitialLang(): string {
  if (typeof window === "undefined") return "es";
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    /* ignore storage errors (private mode, etc.) */
  }
  if (saved === "en" || saved === "es") return saved;
  const browser = (navigator.languages?.[0] || navigator.language || "es").toLowerCase();
  return browser.startsWith("es") ? "es" : "en";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(getInitialLang);
  const setLang = (next: string) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  };
  const t = (key: string) => translations[lang]?.[key] || key;
  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
