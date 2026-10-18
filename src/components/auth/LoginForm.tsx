'use client';
import { useState } from 'react';
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

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    setLoading(false);
    if (res.ok) setStep('otp');
    else setError((await res.json()).error ?? 'Failed to send code');
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, name }),
    });
    setLoading(false);
    if (res.ok) router.push('/dashboard');
    else setError((await res.json()).error ?? 'Invalid code');
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-emerald-400 mb-1">Cendekia.ai</h1>
        <p className="text-slate-400 text-sm">AI Learning Workspace</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">Sign in</h2>
            <div className="space-y-1.5">
              <Label htmlFor="name">Name (optional, for new accounts)</Label>
              <Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send login code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-100">Enter code</h2>
            <p className="text-slate-400 text-sm">We sent a 6-digit code to <span className="text-slate-200">{email}</span></p>
            <div className="space-y-1.5">
              <Label htmlFor="code">Verification code</Label>
              <Input id="code" placeholder="123456" value={code} onChange={e => setCode(e.target.value)} maxLength={6} required className="text-center text-2xl tracking-widest" />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify & Sign in'}
            </Button>
            <button type="button" onClick={() => setStep('email')} className="w-full text-sm text-slate-400 hover:text-slate-200 transition-colors">
              ← Use different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
