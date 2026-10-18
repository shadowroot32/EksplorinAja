'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', school: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch('/api/user', { cache: 'no-store' });
        if (!response.ok) throw new Error('Profile request failed');
        const value = await response.json() as User;
        if (cancelled) return;
        setUser(value);
        setForm({ firstName: value.firstName ?? '', lastName: value.lastName ?? '', school: value.school ?? '' });
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => { cancelled = true; };
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setErrorMessage('');
    try {
      const response = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'Profile update failed');
      setUser(payload as User);
      setForm({
        firstName: (payload as User).firstName ?? '',
        lastName: (payload as User).lastName ?? '',
        school: (payload as User).school ?? '',
      });
      setSaved(true);
    } catch {
      setErrorMessage('Changes could not be saved. Please check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function downloadData() {
    setExporting(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/user/export', { cache: 'no-store' });
      if (!response.ok) throw new Error('Export request failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cendekia-ai-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setErrorMessage('Your data could not be downloaded. Please try again later.');
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (!confirm('Delete your account and all data? This cannot be undone.')) return;
    setDeleting(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/user', { method: 'DELETE' });
      if (!response.ok) throw new Error('Account deletion failed');
      window.location.href = '/login';
    } catch {
      setErrorMessage('The account could not be deleted. Please try again or contact the administrator.');
      setDeleting(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-slate-600">Loading settings…</div>;

  if (loadError || !user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">
          Settings could not be loaded. Please sign in again or reload the page.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {errorMessage && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{errorMessage}</p>}

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user.email} disabled className="opacity-60" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  value={form.firstName}
                  maxLength={100}
                  required
                  onChange={e => { setForm(p => ({ ...p, firstName: e.target.value })); setSaved(false); }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  value={form.lastName}
                  maxLength={100}
                  onChange={e => { setForm(p => ({ ...p, lastName: e.target.value })); setSaved(false); }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>School / Institution</Label>
              <Input
                value={form.school}
                maxLength={160}
                onChange={e => { setForm(p => ({ ...p, school: e.target.value })); setSaved(false); }}
                placeholder="Your school or university"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
              {saved && <span className="text-sm text-emerald-700" role="status">✓ Changes saved</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Data & privacy</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-slate-600">
            Download a JSON copy of your profile, subjects, study materials, flashcards, quizzes, notes, podcast scripts, chat history, progress, and share-link metadata.
          </p>
          <p className="text-xs leading-5 text-slate-500">
            The export does not contain session cookies, OAuth credentials, API keys, or share-token secrets. Store the downloaded file securely.
          </p>
          <Button type="button" variant="outline" onClick={downloadData} disabled={exporting}>
            {exporting ? 'Preparing export…' : 'Download my data (JSON)'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader><CardTitle className="text-rose-600">Danger zone</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">Permanently delete your account and all associated data. This action cannot be undone.</p>
          <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
            {deleting ? 'Deleting account…' : 'Delete Account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
