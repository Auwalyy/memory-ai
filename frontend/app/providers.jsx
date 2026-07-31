'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import { useState } from 'react';
import { AuthProvider } from '@/hooks/useAuth';
import { LanguageProvider, useLanguage } from '@/hooks/useLanguage';

const LANGUAGES = [
  { code: 'hausa',   label: 'Hausa',   native: 'Hausa',   flag: '🇳🇬', desc: 'Arewacin Najeriya' },
  { code: 'english', label: 'English', native: 'English', flag: '🌍', desc: 'Northern Nigeria' },
  { code: 'yoruba',  label: 'Yoruba',  native: 'Yorùbá',  flag: '🇳🇬', desc: 'Kudu-Yamma Najeriya' },
  { code: 'igbo',    label: 'Igbo',    native: 'Igbo',    flag: '🇳🇬', desc: 'Kudu-Gabas Najeriya' },
];

function LanguagePickerScreen() {
  const { confirmLanguage } = useLanguage();
  const [selected, setSelected] = useState('hausa');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mb-6">
        <span className="text-white font-bold text-2xl">M</span>
      </div>
      <h1 className="font-serif text-3xl font-bold mb-1 text-center">MemoryAI Nigeria</h1>
      <p className="text-muted-foreground text-sm mb-8 text-center">
        Zaɓi harshe · Choose your language
      </p>

      <div className="w-full max-w-sm space-y-3 mb-8">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelected(lang.code)}
            className={[
              'w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left',
              selected === lang.code
                ? 'border-primary bg-primary/8 shadow-sm'
                : 'border-border hover:border-primary/40 hover:bg-muted/40',
            ].join(' ')}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{lang.native}</p>
              <p className="text-xs text-muted-foreground">{lang.desc}</p>
            </div>
            {selected === lang.code && (
              <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <button
        onClick={() => confirmLanguage(selected)}
        className="w-full max-w-sm h-12 rounded-xl gradient-brand text-white font-semibold text-base transition-opacity hover:opacity-90"
      >
        {selected === 'hausa' ? 'Ci gaba' : selected === 'yoruba' ? 'Tẹsiwaju' : selected === 'igbo' ? 'Gaa n\'ihu' : 'Continue'}
      </button>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        {selected === 'hausa' ? 'Za ku iya canza harshe daga Saituna' : 'You can change language later in Settings'}
      </p>
    </div>
  );
}

function AppShell({ children }) {
  const { firstLaunch, mounted } = useLanguage();
  if (!mounted) return null;
  if (firstLaunch) return <LanguagePickerScreen />;
  return <>{children}</>;
}

export function Providers({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <LanguageProvider>
          <AppShell>
            <AuthProvider>
              {children}
              <Toaster richColors position="top-right" />
            </AuthProvider>
          </AppShell>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
