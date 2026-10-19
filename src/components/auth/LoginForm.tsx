'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePreferences, type Locale } from '@/components/providers/PreferencesProvider';

const contentByLocale: Record<Locale, {
  tagline: string;
  eyebrow: string;
  title: string;
  description: string;
  featuresTitle: string;
  features: [string, string][];
  footerLine: string;
  secure: string;
  signInTitle: string;
  signInDescription: string;
  google: string;
  privacy: string;
  oauth: string;
  back: string;
  genericError: string;
  errors: Record<string, string>;
}> = {
  en: {
    tagline: 'Learn · Practice · Grow',
    eyebrow: 'YOUR PERSONAL AI STUDY SPACE',
    title: 'Every big goal starts with one small lesson.',
    description: 'Sign in securely and pick up where your curiosity left off.',
    featuresTitle: 'Make learning feel lighter',
    features: [
      ['🧠', 'Smart flashcards and quizzes'],
      ['✦', 'AI summaries in a few clicks'],
      ['↗', 'Progress that keeps you going'],
    ],
    footerLine: 'A little progress, every day.',
    secure: 'Secure sign in',
    signInTitle: 'Welcome to Explorin',
    signInDescription: 'One secure step into your personal learning space. Continue with your Google account.',
    google: 'Continue with Google',
    privacy: 'Explorin never receives your Google password. Google securely verifies your identity.',
    oauth: 'Protected with Google OAuth 2.0',
    back: 'Back to home',
    genericError: 'Sign-in did not complete. Please try again.',
    errors: {
      google_not_configured: 'Google sign-in is not configured yet. Check the Google OAuth environment settings.',
      google_cancelled: 'Google sign-in was cancelled. You can try again whenever you are ready.',
      google_invalid_state: 'The Google security session did not match or has expired. Please try again.',
      google_email_unverified: 'This Google account has not provided a verified email address.',
      google_auth_failed: 'We could not verify your Google account. Please try again.',
    },
  },
  id: {
    tagline: 'Belajar · Latihan · Berkembang',
    eyebrow: 'RUANG BELAJAR AI PRIBADIMU',
    title: 'Setiap tujuan besar berawal dari satu pelajaran kecil.',
    description: 'Masuk dengan aman dan lanjutkan perjalanan belajar yang membuatmu penasaran.',
    featuresTitle: 'Belajar terasa lebih ringan',
    features: [
      ['🧠', 'Flashcard dan kuis pintar'],
      ['✦', 'Ringkasan AI dalam beberapa klik'],
      ['↗', 'Progres yang membuatmu semangat'],
    ],
    footerLine: 'Sedikit progres, setiap hari.',
    secure: 'Masuk dengan aman',
    signInTitle: 'Selamat datang di Explorin',
    signInDescription: 'Satu langkah aman untuk membuka ruang belajarmu. Lanjutkan dengan akun Google.',
    google: 'Lanjutkan dengan Google',
    privacy: 'Explorin tidak pernah menerima kata sandi Google-mu. Google memverifikasi identitasmu dengan aman.',
    oauth: 'Dilindungi Google OAuth 2.0',
    back: 'Kembali ke beranda',
    genericError: 'Proses masuk belum berhasil. Silakan coba lagi.',
    errors: {
      google_not_configured: 'Login Google belum dikonfigurasi. Periksa pengaturan environment Google OAuth pada hosting.',
      google_cancelled: 'Proses masuk dengan Google dibatalkan. Kamu bisa mencoba lagi kapan saja.',
      google_invalid_state: 'Sesi keamanan Google tidak cocok atau sudah kedaluwarsa. Silakan coba masuk lagi.',
      google_email_unverified: 'Akun Google ini belum memberikan alamat email yang terverifikasi.',
      google_auth_failed: 'Kami belum bisa memverifikasi akun Google. Silakan coba lagi.',
    },
  },
};

export default function LoginForm() {
  const { locale } = usePreferences();
  const text = contentByLocale[locale];
  const [errorCode, setErrorCode] = useState('');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    if (code) setErrorCode(code);
  }, []);

  const error = errorCode ? (text.errors[errorCode] ?? text.genericError) : '';

  return (
    <main className="public-auth-card mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-[var(--public-border)] bg-[var(--public-surface)] shadow-2xl shadow-blue-950/10 lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative hidden min-h-[680px] flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-10 text-white dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 lg:flex xl:p-12">
        <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-indigo-300/25 blur-3xl" />
        <Brand light tagline={text.tagline} />
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide backdrop-blur"><span aria-hidden="true">✦</span> {text.eyebrow}</div>
          <h1 className="max-w-lg text-4xl font-black leading-[1.12] tracking-tight xl:text-5xl">{text.title}</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-50 dark:text-slate-300">{text.description}</p>
          <div className="mt-9 space-y-3">
            {text.features.map(([icon, label]) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg" aria-hidden="true">{icon}</span>
                <span className="text-sm font-semibold text-white">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3 text-sm text-blue-100 dark:text-slate-300"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-lg" aria-hidden="true">🌱</span>{text.footerLine}</div>
      </section>

      <section className="flex min-h-[610px] flex-col justify-center px-6 py-10 sm:px-10 lg:min-h-[680px] lg:px-12 xl:px-16">
        <div className="mb-9 lg:hidden"><Brand tagline={text.tagline} /></div>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200"><span aria-hidden="true">↗</span> {text.secure}</span>
            <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-[var(--public-text)] sm:text-4xl">{text.signInTitle}</h2>
            <p className="mt-3 leading-7 text-[var(--public-muted)]">{text.signInDescription}</p>
          </div>

          {error && <p role="alert" className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><span aria-hidden="true">!</span><span>{error}</span></p>}

          <a href="/api/auth/google" className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[var(--public-border)] bg-[var(--public-surface)] px-5 py-4 text-sm font-bold text-[var(--public-text)] shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-[var(--public-soft)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-900/40">
            <GoogleMark />
            <span>{text.google}</span>
            <span className="ml-auto text-[var(--public-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
          </a>

          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[var(--public-soft)] px-4 py-4">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" aria-hidden="true">✓</span>
            <p className="text-xs leading-5 text-[var(--public-muted)]">{text.privacy}</p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 border-t border-[var(--public-border)] pt-6 text-xs font-medium text-[var(--public-muted)]"><span aria-hidden="true">🛡</span>{text.oauth}</div>
          <div className="mt-6 text-center"><Link href="/" className="inline-flex rounded-xl px-3 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-slate-800">← {text.back}</Link></div>
        </div>
      </section>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0" role="img">
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.94 46.98 24.55z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z" />
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    </svg>
  );
}

function Brand({ light = false, tagline }: { light?: boolean; tagline: string }) {
  return <Link href="/" className="relative z-10 inline-flex items-center gap-3 self-start" aria-label="Explorin home">
    <span className={'flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black shadow-lg ' + (light ? 'bg-white text-blue-700' : 'bg-gradient-to-br from-sky-500 to-blue-600 text-white')}>E</span>
    <span><span className={'block text-lg font-extrabold tracking-tight ' + (light ? 'text-white' : 'text-[var(--public-text)]')}>Explorin</span><span className={'block text-xs ' + (light ? 'text-blue-100' : 'text-[var(--public-muted)]')}>{tagline}</span></span>
  </Link>;
}
