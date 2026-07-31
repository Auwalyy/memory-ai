'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import translations from '@/lib/i18n';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'memoryai_lang';
const FIRST_LAUNCH_KEY = 'memoryai_lang_chosen';

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState('hausa');
  const [firstLaunch, setFirstLaunch] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const chosen = localStorage.getItem(FIRST_LAUNCH_KEY);
    if (stored && translations[stored]) {
      setLangState(stored);
    }
    if (!chosen) {
      setFirstLaunch(true);
    }
    setMounted(true);
  }, []);

  const setLanguage = (newLang) => {
    if (!translations[newLang]) return;
    setLangState(newLang);
    localStorage.setItem(STORAGE_KEY, newLang);
  };

  const confirmLanguage = (newLang) => {
    setLanguage(newLang);
    localStorage.setItem(FIRST_LAUNCH_KEY, '1');
    setFirstLaunch(false);
  };

  const syncLang = (newLang) => {
    if (newLang && translations[newLang]) setLangState(newLang);
  };

  const t = (key) =>
    translations[lang]?.[key] || translations.english[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, syncLang, t, firstLaunch, confirmLanguage, mounted }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
