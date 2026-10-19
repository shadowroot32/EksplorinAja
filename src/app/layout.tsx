import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { PreferencesProvider } from '@/components/providers/PreferencesProvider';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Cendekia.ai — Your AI Learning Workspace',
  description: 'Turn notes, PDFs, and videos into flashcards, quizzes, and clear learning progress with AI.',
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
