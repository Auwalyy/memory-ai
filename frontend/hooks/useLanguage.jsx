'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import translations from '@/lib/i18n';

const LanguageContext = createContext(null);

export function LanguageProvider({ children, initialLang = 'english' }) {
  const [lang, setLangState] = useState(initialLang);

  // Sync when user object changes (e.g. after login or profile update)
  const syncLang = (newLang) => {
    if (newLang && translations[newLang]) {
      setLangState(newLang);
    }
  };

  const setLanguage = (newLang) => {
    if (translations[newLang]) setLangState(newLang);
  };

  const t = (key) =>
    translations[lang]?.[key] || translations.english[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, syncLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
