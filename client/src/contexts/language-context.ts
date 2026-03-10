import { createContext } from "react";

export type Language = "zh" | "en";

export type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

export const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);
