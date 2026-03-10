import React, { useEffect, useMemo, useState } from "react";

import { LanguageContext, type Language } from "./language-context";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") {
      return "zh";
    }

    const stored = window.localStorage.getItem("language");
    return stored === "en" ? "en" : "zh";
  });

  useEffect(() => {
    window.localStorage.setItem("language", language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage: () => setLanguage(prev => (prev === "zh" ? "en" : "zh")),
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
