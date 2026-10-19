import type { Metadata } from 'next';
import LandingPage from '@/components/public/LandingPage';
import { getSiteUrl, siteBrand } from '@/lib/site-url';

const canonicalUrl = new URL('/', getSiteUrl()).toString();

export const metadata: Metadata = {
  title: { absolute: siteBrand + ' — Your AI Learning Space' },
  description: 'EksplorinAja turns notes, PDFs, and videos into flashcards, quizzes, and a clearer learning routine.',
  alternates: { canonical: canonicalUrl },
  openGraph: {
    type: 'website',
    url: canonicalUrl,
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

export default function HomePage() {
  return <LandingPage />;
}
