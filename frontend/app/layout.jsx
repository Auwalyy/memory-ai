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
    'An AI-powered platform preserving Nigeria\'s indigenous knowledge across Hausa, Yoruba, and Igbo languages using Google Gemma 4.',
  keywords: ['Nigeria', 'indigenous knowledge', 'AI', 'Hausa', 'Yoruba', 'Igbo', 'cultural preservation', 'Gemma'],
  openGraph: {
    title: 'MemoryAI Nigeria',
    description: 'Every Elder is a Library. Every Story Matters.',
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
