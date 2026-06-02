import { createContext, useContext, useState, type ReactNode } from "react";
import { translations } from "./i18n";

interface LangContextValue {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState("es");
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
