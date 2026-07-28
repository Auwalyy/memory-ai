'use client';

import { useAuth } from './useAuth';
import translations from '@/lib/i18n';

export function useTranslation() {
  const { user } = useAuth();
  const lang = user?.preferredLanguage || 'english';
  const dict = translations[lang] || translations.english;

  const t = (key) => dict[key] || translations.english[key] || key;

  return { t, lang };
}
