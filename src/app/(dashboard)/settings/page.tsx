'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface User { id: string; email: string; firstName: string; lastName: string; school: string; }

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', school: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/user').then(r => r.json()).then(u => {
      setUser(u); setForm({ firstName: u.firstName, lastName: u.lastName, school: u.school });
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaved(false);
    const res = await fetch('/api/user', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { setUser(await res.json()); setSaved(true); }
    setSaving(false);
  }

  async function deleteAccount() {
    if (!confirm('Delete your account and all data? This cannot be undone.')) return;
    await fetch('/api/user', { method: 'DELETE' });
    window.location.href = '/login';
  }

  if (!user) return <div className="text-slate-400 text-center py-20">Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-100">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user.email} disabled className="opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>School / Institution</Label>
              <Input value={form.school} onChange={e => setForm(p => ({ ...p, school: e.target.value }))} placeholder="Your school or university" />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
              {saved && <span className="text-emerald-400 text-sm">✓ Saved</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Environment Config</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm font-mono text-slate-400">
          {['LLM_BASE_URL', 'LLM_MODEL', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'DATABASE_URL'].map(k => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-emerald-500">{k}</span>
              <span className="text-slate-600">=</span>
              <span className="text-slate-500">[set via .env]</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-red-900/50">
        <CardHeader><CardTitle className="text-red-400">Danger Zone</CardTitle></CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm mb-4">Permanently delete your account and all associated data.</p>
          <Button variant="destructive" onClick={deleteAccount}>Delete Account</Button>
        </CardContent>
      </Card>
    </div>
  );
}
