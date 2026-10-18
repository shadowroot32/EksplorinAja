'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Step = 'email' | 'otp';

export default function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function requestOtp() {
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? 'We could not send the code. Please try again.');
        return;
      }
      setStep('otp');
      setNotice('Verification code sent. It expires in 10 minutes.');
    } catch {
      setError('A network error interrupted the request. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await requestOtp();
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code, name: name.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? 'That code did not work. Please request a new one.');
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('A network error interrupted verification. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl shadow-blue-900/10 lg:grid-cols-2">
      <section className="relative hidden min-h-[650px] flex-col justify-between overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-10 text-white lg:flex xl:p-14">
        <div aria-hidden="true" className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-cyan-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-indigo-300/30 blur-2xl" />
        <Brand light />
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide backdrop-blur"><span aria-hidden="true">✦</span> YOUR PERSONAL AI STUDY SPACE</div>
          <h1 className="max-w-lg text-4xl font-black leading-tight tracking-tight xl:text-5xl">Every big goal starts with one small lesson.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-blue-50">Turn class notes, PDFs, and videos into a learning routine that actually sticks.</p>
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
          <div className="mb-7">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-700"><span aria-hidden="true">🔐</span> Secure sign in</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{step === 'email' ? 'Welcome back' : 'Check your inbox'}</h2>
            <p className="mt-2 leading-6 text-slate-500">{step === 'email' ? 'Enter your email and we’ll send you a one-time login code.' : 'Enter the six-digit code sent to your email address.'}</p>
          </div>
          {step === 'email' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2"><Label htmlFor="name">Your name <span className="font-normal text-slate-400">(optional)</span></Label><Input id="name" name="name" autoComplete="name" placeholder="How should we call you?" value={name} onChange={(event) => setName(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="email">Email address</Label><Input id="email" name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <Button type="submit" size="lg" className="w-full rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700" disabled={loading}>{loading ? 'Sending code…' : 'Email me a login code'} <span className="ml-2" aria-hidden="true">→</span></Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4"><p className="text-sm text-slate-600">Code sent to</p><p className="mt-1 break-all font-semibold text-slate-900">{email}</p></div>
              <div className="space-y-2"><Label htmlFor="code">6-digit verification code</Label><Input id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" aria-describedby="code-help" placeholder="000000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} required className="h-14 rounded-xl text-center text-2xl font-bold tracking-[0.55em]" /><p id="code-help" className="text-xs text-slate-500">For your security, the code expires after 10 minutes.</p></div>
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              <Button type="submit" size="lg" className="w-full rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 hover:bg-blue-700" disabled={loading || code.length !== 6}>{loading ? 'Verifying…' : 'Verify and continue'} <span className="ml-2" aria-hidden="true">→</span></Button>
              <button type="button" onClick={requestOtp} disabled={loading} className="w-full text-sm font-semibold text-blue-700 transition hover:text-blue-900 disabled:opacity-50">Didn’t receive it? Resend code</button>
              <button type="button" onClick={() => { setStep('email'); setCode(''); setError(''); setNotice(''); }} className="w-full text-sm text-slate-500 transition hover:text-slate-900">← Use a different email</button>
            </form>
          )}
          {notice && <p role="status" className="mt-4 text-center text-sm text-emerald-700">{notice}</p>}
          <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400"><span aria-hidden="true">🛡️</span>Passwordless sign-in, protected by a one-time code</div>
        </div>
      </section>
    </div>
  );
}

function Brand({ light = false }: { light?: boolean }) {
  return <Link href="/" className="relative z-10 inline-flex items-center gap-3 self-start" aria-label="Cendekia.ai home">
    <span className={'flex h-11 w-11 items-center justify-center rounded-2xl text-xl font-black shadow-lg ' + (light ? 'bg-white text-blue-700' : 'bg-gradient-to-br from-sky-500 to-blue-600 text-white')}>C</span>
    <span><span className={'block text-lg font-extrabold tracking-tight ' + (light ? 'text-white' : 'text-slate-950')}>Cendekia.ai</span><span className={'block text-xs ' + (light ? 'text-blue-100' : 'text-slate-500')}>Learn · Practice · Grow</span></span>
  </Link>;
}
