'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePreferences } from '@/components/providers/PreferencesProvider';
import ThemeLanguageControls from '@/components/layout/ThemeLanguageControls';

const nav = [
  { href: '/dashboard', key: 'nav.dashboard', icon: '⌂' },
  { href: '/review', key: 'nav.review', shortId: 'Review', shortEn: 'Review', icon: '✓' },
  { href: '/subjects', key: 'nav.subjects', icon: '▤' },
  { href: '/library', key: 'nav.library', shortId: 'Perpustakaan', shortEn: 'Library', icon: '✧' },
  { href: '/settings', key: 'nav.settings', icon: '⚙' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = usePreferences();

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  }

  function activePath(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  }

  function navClass(href: string) {
    return cn('flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
      activePath(href)
        ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100 dark:bg-blue-950/60 dark:text-blue-200 dark:ring-blue-900'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white');
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200/80 bg-white/95 px-5 py-6 backdrop-blur-xl dark:border-slate-800 dark:bg-[#0b1220]/95 lg:flex">
        <Link href="/dashboard" className="mb-10 inline-flex items-center gap-3 px-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-700 text-xl font-black text-white shadow-lg shadow-blue-600/20">C</span>
          <span><span className="block text-lg font-extrabold tracking-tight text-slate-950 dark:text-slate-100">Cendekia.ai</span><span className="block text-xs text-slate-500 dark:text-slate-400">Learn · Practice · Grow</span></span>
        </Link>
        <p className="mb-3 px-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-400">{t('nav.workspace')}</p>
        <nav aria-label="Main navigation" className="space-y-1.5">
          {nav.map((item) => <Link key={item.href} href={item.href} className={navClass(item.href)} aria-current={activePath(item.href) ? 'page' : undefined}>
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl text-lg', activePath(item.href) ? 'bg-white text-blue-700 dark:bg-slate-800 dark:text-blue-200' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')} aria-hidden="true">{item.icon}</span>
            {t(item.key)}
            {activePath(item.href) && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />}
          </Link>)}
        </nav>
        <div className="mt-auto">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-50 p-4 ring-1 ring-blue-100/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:ring-slate-700">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-xl shadow-sm dark:bg-slate-800" aria-hidden="true">🌱</div>
            <h2 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-slate-100">{t('nav.habitTitle')}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{t('nav.habitBody')}</p>
            <Link href="/library" className="mt-3 inline-flex items-center gap-1 text-xs font-extrabold text-blue-700 hover:text-blue-900 dark:text-sky-300 dark:hover:text-sky-200">{t('nav.makeSet')} <span aria-hidden="true">→</span></Link>
          </div>
          <button onClick={logout} className="mt-4 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-300"><span aria-hidden="true">↗</span> {t('nav.signOut')}</button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#0b1220]/95 sm:px-4 lg:hidden">
        <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 font-black text-white">C</span><span className="text-sm font-extrabold tracking-tight text-slate-950 dark:text-slate-100">Cendekia.ai</span></Link>
        <div className="flex items-center gap-1.5">
          <ThemeLanguageControls compact />
          <button onClick={logout} aria-label={t('nav.signOut')} title={t('nav.signOut')} className="rounded-xl px-2 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">↗</button>
        </div>
      </header>

      <header className="fixed left-64 right-0 top-0 z-40 hidden h-16 items-center justify-end border-b border-slate-200/80 bg-white/95 px-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-[#0b1220]/95 lg:flex">
        <ThemeLanguageControls />
      </header>

      <nav aria-label="Mobile navigation" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl shadow-blue-900/10 backdrop-blur dark:border-slate-700 dark:bg-[#0f172a]/95 lg:hidden">
        {nav.map((item) => <Link key={item.href} href={item.href} aria-current={activePath(item.href) ? 'page' : undefined} className={cn('flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-bold transition-colors', activePath(item.href) ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800')}>
          <span className="text-lg leading-none" aria-hidden="true">{item.icon}</span><span className="truncate">{t(item.key)}</span>
        </Link>)}
      </nav>
    </>
  );
}
