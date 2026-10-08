import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata = {
  title: {
    default: 'MemoryAI Nigeria — Preserving Indigenous Wisdom Through AI',
    template: '%s | MemoryAI Nigeria',
  },
  description:
    'Voice-first preservation of Nigerian indigenous knowledge. Contributions in Hausa and English are processed by N-ATLAS and verified by people.',
  keywords: ['Nigeria', 'indigenous knowledge', 'AI', 'Hausa', 'Yoruba', 'Igbo', 'cultural preservation', 'N-ATLAS', 'voice'],
  openGraph: {
    title: 'MemoryAI Nigeria',
    description: 'Our Stories, Our Languages, Our Memory.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
