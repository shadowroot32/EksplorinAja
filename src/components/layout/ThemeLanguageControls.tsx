'use client';

import { usePreferences } from '@/components/providers/PreferencesProvider';

export default function ThemeLanguageControls({ compact = false }: { compact?: boolean }) {
  const { locale, theme, setLocale, toggleTheme, t } = usePreferences();
  const padding = compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm';

  return (
    <div className="flex items-center gap-2" aria-label="Appearance and language">
      <button
        type="button"
        onClick={toggleTheme}
        className={'inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 ' + padding}
        aria-label={theme === 'dark' ? t('prefs.switchLight') : t('prefs.switchDark')}
        title={theme === 'dark' ? t('prefs.switchLight') : t('prefs.switchDark')}
      >
        <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
        {!compact && <span>{t(theme === 'dark' ? 'prefs.dark' : 'prefs.light')}</span>}
      </button>
      <label className="flex min-w-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 dark:border-slate-700 dark:bg-slate-900">
        <span className="sr-only">{t('prefs.language')}</span>
        <span aria-hidden="true">🌐</span>
        <select
          value={locale}
          onChange={(event) => setLocale(event.target.value === 'id' ? 'id' : 'en')}
          className={'min-w-0 max-w-[120px] cursor-pointer bg-transparent font-semibold text-slate-700 outline-none dark:text-slate-200 ' + (compact ? 'text-xs' : 'text-sm')}
          aria-label={t('prefs.language')}
        >
          <option value="en">{t('prefs.english')}</option>
          <option value="id">{t('prefs.indonesian')}</option>
        </select>
      </label>
    </div>
  );
}
