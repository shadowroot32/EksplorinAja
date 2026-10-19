'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  school: string;
}

export default function SettingsPage() {
  const { t: tr } = usePreferences();
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

  async function save(event: React.FormEvent) {
    event.preventDefault();
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
      if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : tr('settings.saveError'));
      setUser(payload as User);
      setForm({
        firstName: (payload as User).firstName ?? '',
        lastName: (payload as User).lastName ?? '',
        school: (payload as User).school ?? '',
      });
      setSaved(true);
    } catch {
      setErrorMessage(tr('settings.saveError'));
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
      link.download = 'eksplorinaja-export-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setErrorMessage(tr('settings.exportError'));
    } finally {
      setExporting(false);
    }
  }

  async function downloadCsv(type: 'flashcards' | 'quizzes' | 'progress') {
    setExporting(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/user/export/csv?type=' + type, { cache: 'no-store' });
      if (!response.ok) throw new Error('CSV export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'eksplorinaja-' + type + '-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setErrorMessage(tr('settings.exportError'));
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    if (!window.confirm(tr('settings.deleteConfirm'))) return;
    setDeleting(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/user', { method: 'DELETE' });
      if (!response.ok) throw new Error('Account deletion failed');
      window.location.href = '/login';
    } catch {
      setErrorMessage(tr('settings.deleteError'));
      setDeleting(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-slate-600 dark:text-slate-300">{tr('settings.loading')}</div>;
  if (loadError || !user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tr('settings.title')}</h1>
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200" role="alert">{tr('settings.loadError')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{tr('settings.title')}</h1>
      {errorMessage && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200" role="alert">{errorMessage}</p>}

      <Card>
        <CardHeader><CardTitle>{tr('settings.profile')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-1.5">
              <Label>{tr('settings.email')}</Label>
              <Input value={user.email} disabled className="opacity-60" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{tr('settings.firstName')}</Label>
                <Input value={form.firstName} maxLength={100} required onChange={(event) => { setForm((current) => ({ ...current, firstName: event.target.value })); setSaved(false); }} />
              </div>
              <div className="space-y-1.5">
                <Label>{tr('settings.lastName')}</Label>
                <Input value={form.lastName} maxLength={100} onChange={(event) => { setForm((current) => ({ ...current, lastName: event.target.value })); setSaved(false); }} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tr('settings.school')}</Label>
              <Input value={form.school} maxLength={160} onChange={(event) => { setForm((current) => ({ ...current, school: event.target.value })); setSaved(false); }} placeholder={tr('settings.schoolPlaceholder')} />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={saving}>{saving ? tr('settings.saving') : tr('settings.save')}</Button>
              {saved && <span className="text-sm text-emerald-700 dark:text-emerald-300" role="status">{tr('settings.saved')}</span>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{tr('settings.privacy')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{tr('settings.exportBody')}</p>
          <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">{tr('settings.exportWarning')}</p>
          <Button type="button" variant="outline" onClick={downloadData} disabled={exporting}>
            {exporting ? tr('settings.exporting') : tr('settings.export')}
          </Button>
          <div className="flex flex-wrap gap-2" aria-label="Download study tables as CSV">
            <Button type="button" variant="outline" onClick={() => void downloadCsv('flashcards')} disabled={exporting}>Flashcards CSV</Button>
            <Button type="button" variant="outline" onClick={() => void downloadCsv('quizzes')} disabled={exporting}>Quiz questions CSV</Button>
            <Button type="button" variant="outline" onClick={() => void downloadCsv('progress')} disabled={exporting}>Study progress CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-200 dark:border-rose-900">
        <CardHeader><CardTitle className="text-rose-600 dark:text-rose-300">{tr('settings.danger')}</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">{tr('settings.deleteBody')}</p>
          <Button variant="destructive" onClick={deleteAccount} disabled={deleting}>
            {deleting ? tr('settings.deleting') : tr('settings.delete')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
