'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const loginErrors: Record<string, string> = {
  google_not_configured: 'Google sign-in belum dikonfigurasi. Isi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan URL callback pada environment hosting.',
  google_cancelled: 'Proses masuk dengan Google dibatalkan. Kamu bisa mencoba lagi kapan saja.',
  google_invalid_state: 'Sesi keamanan Google tidak cocok atau sudah kedaluwarsa. Silakan coba masuk lagi.',
  google_email_unverified: 'Akun Google ini belum memberikan alamat email terverifikasi.',
  google_auth_failed: 'Kami belum bisa memverifikasi akun Google. Silakan coba lagi.',
};

export default function LoginForm() {
  const [error, setError] = useState('');

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    if (code) setError(loginErrors[code] ?? 'Login tidak berhasil. Silakan coba lagi.');
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-blue-900/10 lg:grid-cols-2">
      <section className="relative hidden min-h-[650px] flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-10 text-white lg:flex xl:p-14">
        <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-indigo-300/30 blur-2xl" />
        <Brand light />
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide backdrop-blur"><span aria-hidden="true">✦</span> YOUR PERSONAL AI STUDY SPACE</div>
          <h1 className="max-w-lg text-4xl font-black leading-tight tracking-tight xl:text-5xl">Every big goal starts with one small lesson.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-50">Sign in securely with Google and pick up where your curiosity left off.</p>
          <div className="mt-9 space-y-3">
            { [['🧠', 'Smart flashcards and quizzes'], ['⚡', 'AI summaries in a few clicks'], ['📈', 'Progress that keeps you motivated']].map(([icon, label]) =>
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-lg" aria-hidden="true">{icon}</span><span className="text-sm font-medium text-white">{label}</span></div>
            )}
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3 text-sm text-blue-100"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-lg" aria-hidden="true">🌱</span>A little progress, every day.</div>
      </section>

      <section className="flex min-h-[620px] flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 xl:px-16">
        <div className="mb-10 lg:hidden"><Brand /></div>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-700"><span aria-hidden="true">🔐</span> Secure sign in</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Welcome to Cendekia.ai</h2>
            <p className="mt-2 leading-6 text-slate-500">One tap to your personal AI learning space. Use your Google account to continue securely.</p>
          </div>
          {error && <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{error}</p>}
          <a href="/api/auth/google" className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
            <GoogleMark />
            Continue with Google
          </a>
          <p className="mt-5 text-center text-xs leading-5 text-slate-400">By continuing, you’ll use Google to verify your identity. Cendekia.ai never receives your Google password.</p>
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400"><span aria-hidden="true">🛡️</span> Secure OAuth 2.0 sign-in</div>
        </div>
      </section>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5" role="img">
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 38.03 46.98 31.94 46.98 24.55z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z" />
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    </svg>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className="relative z-10 inline-flex items-center gap-3 self-start" aria-label="Cendekia.ai home">
    <span className={'flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black shadow-lg ' + (light ? 'bg-white text-blue-700' : 'bg-gradient-to-br from-sky-500 to-blue-600 text-white')}>C</span>
    <span><span className={'block text-lg font-extrabold tracking-tight ' + (light ? 'text-white' : 'text-slate-950')}>Cendekia.ai</span><span className={'block text-xs ' + (light ? 'text-blue-100' : 'text-slate-500')}>Learn · Practice · Grow</span></span>
  </Link>;
}
