'use client';

import { useLanguage } from './useLanguage';

export function useTranslation() {
  const { lang, t, setLanguage } = useLanguage();
  return { t, lang, setLanguage };
}
