import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { PreferencesProvider } from '@/components/providers/PreferencesProvider';
import { getSiteUrl, siteBrand } from '@/lib/site-url';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: siteBrand + ' — Your AI Learning Space',
  description: 'EksplorinAja turns notes, PDFs, and videos into flashcards, quizzes, and a clearer learning routine.',
  openGraph: {
    type: 'website',
    siteName: siteBrand,
    title: siteBrand + ' — Your AI Learning Space',
    description: 'Turn notes, PDFs, and videos into flashcards, quizzes, and a clearer learning routine.',
  },
  twitter: {
    card: 'summary_large_image',
    title: siteBrand + ' — Your AI Learning Space',
    description: 'Turn notes, PDFs, and videos into flashcards, quizzes, and a clearer learning routine.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable + ' ' + geistMono.variable + ' h-full'}>
      <body className="min-h-full bg-sky-50 text-slate-900 antialiased">
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
