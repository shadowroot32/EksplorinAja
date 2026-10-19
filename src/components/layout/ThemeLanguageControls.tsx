'use client';

import { useEffect, useRef, useState } from 'react';
import { usePreferences } from '@/components/providers/PreferencesProvider';

export default function ThemeLanguageControls({ compact = false }: { compact?: boolean }) {
  const { locale, theme, setLocale, toggleTheme, t } = usePreferences();
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeWhenOutside(event: PointerEvent) {
      if (event.target instanceof Node && !languageRef.current?.contains(event.target)) {
        setLanguageOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setLanguageOpen(false);
    }
    document.addEventListener('pointerdown', closeWhenOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeWhenOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  const label = locale === 'id' ? 'Bahasa Indonesia' : 'English';

  return (
    <div className="flex items-center gap-2.5" aria-label="Appearance and language">
      <button
        type="button"
        onClick={toggleTheme}
        className={
          'group inline-flex shrink-0 items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/90 font-semibold text-slate-700 shadow-sm shadow-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:border-sky-700 dark:hover:bg-slate-800 ' +
          (compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm')
        }
        aria-label={theme === 'dark' ? t('prefs.switchLight') : t('prefs.switchDark')}
        title={theme === 'dark' ? t('prefs.switchLight') : t('prefs.switchDark')}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-amber-100 text-sm transition-colors group-hover:bg-amber-200 dark:bg-slate-800 dark:group-hover:bg-slate-700" aria-hidden="true">
          {theme === 'dark' ? '☀' : '☾'}
        </span>
        <span>{t(theme === 'dark' ? 'prefs.dark' : 'prefs.light')}</span>
      </button>

      <div className="relative" ref={languageRef}>
        <button
          type="button"
          onClick={() => setLanguageOpen((open) => !open)}
          className={
            'inline-flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white/90 font-semibold text-slate-700 shadow-sm shadow-slate-900/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:border-sky-700 dark:hover:bg-slate-800 ' +
            (compact ? 'px-2.5 py-2 text-xs' : 'px-3.5 py-2.5 text-sm')
          }
          aria-haspopup="menu"
          aria-expanded={languageOpen}
          aria-label={t('prefs.language')}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-xl bg-sky-100 text-sm text-sky-700 dark:bg-slate-800 dark:text-sky-300" aria-hidden="true">◎</span>
          <span className={compact ? 'hidden sm:inline' : 'inline'}>{compact ? (locale === 'id' ? 'ID' : 'EN') : label}</span>
          <svg className={'h-4 w-4 text-slate-400 transition-transform ' + (languageOpen ? 'rotate-180' : '')} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {languageOpen && (
          <div role="menu" aria-label={t('prefs.language')} className="absolute right-0 top-[calc(100%+10px)] z-[80] w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/15 ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/5">
            <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('prefs.language')}</p>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={locale === 'en'}
              onClick={() => { setLocale('en'); setLanguageOpen(false); }}
              className={'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ' + (locale === 'en' ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-100' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800')}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">EN</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">English</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">English interface</span></span>
              {locale === 'en' && <span className="text-sky-600 dark:text-sky-300" aria-hidden="true">✓</span>}
            </button>
            <button
              type="button"
              role="menuitemradio"
              aria-checked={locale === 'id'}
              onClick={() => { setLocale('id'); setLanguageOpen(false); }}
              className={'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ' + (locale === 'id' ? 'bg-sky-50 text-sky-900 dark:bg-sky-950/60 dark:text-sky-100' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800')}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-extrabold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">ID</span>
              <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Bahasa Indonesia</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">Antarmuka bahasa Indonesia</span></span>
              {locale === 'id' && <span className="text-sky-600 dark:text-sky-300" aria-hidden="true">✓</span>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
