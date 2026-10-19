'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DAILY_REVIEW_TARGET } from '@/lib/study-progress-utils';
import { usePreferences } from '@/components/providers/PreferencesProvider';

interface Stats { subjects: number; studySets: number; dueCards: number; mastery: number; cardsReviewedToday: number; streakDays: number; }
interface StudySet { id: string; title: string; sourceType: string; createdAt: string; }
interface Subject { id: string; name: string; emoji: string; masteryLevel: number; }
interface Activity { id: string; description: string; createdAt: string; }

export default function DashboardPage() {
  const { locale, t } = usePreferences();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard')
      .then((response) => {
        if (!response.ok) throw new Error('Dashboard request failed');
        return response.json();
      })
      .then((data) => {
        if (cancelled) return;
        setStats(data.stats ?? null);
        setSets(Array.isArray(data.recentSets) ? data.recentSets : []);
        setSubjects(Array.isArray(data.subjects) ? data.subjects : []);
        setActivities(Array.isArray(data.activities) ? data.activities : []);
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('dashboard.loadError'));
      });
    return () => { cancelled = true; };
  }, [t]);

  const reviewedToday = stats?.cardsReviewedToday ?? 0;
  const goalProgress = Math.min(100, Math.round((reviewedToday / DAILY_REVIEW_TARGET) * 100));
  const statsCards = [
    { label: t('dashboard.studySets'), value: stats?.studySets ?? '—', icon: '📚', tone: 'bg-violet-50 text-violet-700' },
    { label: t('dashboard.subjects'), value: stats?.subjects ?? '—', icon: '🗂️', tone: 'bg-sky-50 text-sky-700' },
    { label: t('dashboard.cardsDue'), value: stats?.dueCards ?? '—', icon: '🧠', tone: 'bg-amber-50 text-amber-700' },
    { label: t('dashboard.mastery'), value: stats ? String(stats.mastery) + '%' : '—', icon: '✨', tone: 'bg-emerald-50 text-emerald-700' },
    { label: t('dashboard.streak'), value: stats ? String(stats.streakDays) + ' ' + t('dashboard.days') : '—', icon: '🔥', tone: 'bg-orange-50 text-orange-700' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">{t('dashboard.heading')}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t('dashboard.greeting')} <span aria-hidden="true">👋</span></h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">{t('dashboard.intro')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/review" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-extrabold text-blue-700 transition hover:bg-blue-50">✓ {t('dashboard.reviewDue')} ({stats?.dueCards ?? '—'})</Link>
          <Link href="/library" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">＋ {t('dashboard.createSet')}</Link>
        </div>
      </header>

      {loadError && <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{loadError}</p>}

      <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-200 via-blue-200 to-cyan-100 px-6 py-8 shadow-sm sm:px-9 sm:py-10">
        <div aria-hidden="true" className="absolute -right-12 -top-16 -z-10 h-64 w-64 rounded-full bg-white/30 blur-2xl" />
        <div aria-hidden="true" className="absolute bottom-0 right-1/4 -z-10 h-32 w-32 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_260px]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/50 px-3 py-1.5 text-xs font-bold text-blue-900 backdrop-blur"><span aria-hidden="true">✦</span> {t('dashboard.companion')}</span>
            <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">{t('dashboard.heroTitle')}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-700 sm:text-base">{t('dashboard.heroBody')}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/library" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-800/20 transition hover:bg-blue-800">{t('dashboard.continue')} <span aria-hidden="true">→</span></Link>
              <Link href="/subjects" className="inline-flex items-center rounded-xl border border-white/80 bg-white/50 px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-white/80">{t('dashboard.exploreSubjects')}</Link>
            </div>
          </div>
          <div className="flex items-center gap-5 rounded-3xl border border-white/70 bg-white/55 p-5 backdrop-blur sm:max-w-sm lg:flex-col lg:items-center lg:justify-center lg:gap-3 lg:p-6">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full p-2" style={{ background: 'conic-gradient(#2563eb ' + goalProgress + '%, #dbeafe ' + goalProgress + '%)' }}>
              <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-white"><span className="text-2xl font-black text-slate-950">{reviewedToday}</span><span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('dashboard.ofCards').replace('{n}', String(DAILY_REVIEW_TARGET))}</span></div>
            </div>
            <div className="min-w-0 lg:text-center">
              <div className="text-xs font-extrabold uppercase tracking-widest text-blue-800">{t('dashboard.dailyGoal')}</div>
              <div className="mt-1 text-lg font-black text-slate-950">{goalProgress >= 100 ? t('dashboard.goalReached') : t('dashboard.keepStreak')}</div>
              <p className="mt-1 text-xs leading-5 text-slate-600">{goalProgress >= 100 ? t('dashboard.goalReachedBody') : Math.max(0, DAILY_REVIEW_TARGET - reviewedToday) + ' ' + t('dashboard.goalBody')}</p>
              <p className="mt-2 text-xs font-bold text-orange-700">🔥 {stats?.streakDays ?? 0} day streak</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Learning statistics" className="grid grid-cols-2 gap-3 xl:grid-cols-5 xl:gap-4">
        {statsCards.map((stat) => <article key={stat.label} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
          <div className="flex items-center justify-between gap-3"><span className={'flex h-11 w-11 items-center justify-center rounded-2xl text-xl ' + stat.tone} aria-hidden="true">{stat.icon}</span><span className="text-xs font-semibold text-slate-400">{t('dashboard.progress')}</span></div>
          <div className="mt-5 text-3xl font-black tracking-tight text-slate-950">{String(stat.value)}</div><div className="mt-1 text-sm font-semibold text-slate-500">{stat.label}</div>
        </article>)}
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 className="text-lg font-black text-slate-950">{t('dashboard.continueTitle')}</h2><p className="mt-1 text-xs text-slate-500">{t('dashboard.continueBody')}</p></div><Link href="/library" className="shrink-0 text-sm font-bold text-blue-700 hover:text-blue-900">{t('dashboard.viewLibrary')} →</Link></div>
          <div className="space-y-3 p-4 sm:p-5">
            {sets.length === 0 && <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/70 px-5 py-8 text-center"><div className="text-3xl" aria-hidden="true">📘</div><p className="mt-3 font-bold text-slate-900">{t('dashboard.nextSession')}</p><p className="mt-1 text-sm text-slate-500">{t('dashboard.createFrom')}</p><Link href="/library" className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">{t('dashboard.createFirst')}</Link></div>}
            {sets.slice(0, 4).map((set, index) => <Link key={set.id} href={'/study/' + set.id} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-sky-200 hover:bg-sky-50/60">
              <span className={'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl ' + (index % 2 === 0 ? 'bg-sky-100 text-sky-700' : 'bg-violet-100 text-violet-700')} aria-hidden="true">{set.sourceType === 'pdf' ? '📄' : set.sourceType === 'youtube' ? '▶️' : '📝'}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold text-slate-900 group-hover:text-blue-700">{set.title}</span><span className="mt-1 block text-xs capitalize text-slate-500">{set.sourceType} · {t('dashboard.added')} {new Date(set.createdAt).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US')}</span></span>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700 transition group-hover:bg-blue-600 group-hover:text-white" aria-hidden="true">→</span>
            </Link>)}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 className="text-lg font-black text-slate-950">{t('dashboard.yourSubjects')}</h2><p className="mt-1 text-xs text-slate-500">{t('dashboard.subjectsBody')}</p></div><Link href="/subjects" className="text-sm font-bold text-blue-700 hover:text-blue-900">{t('dashboard.seeAll')} →</Link></div>
          <div className="space-y-4 p-5 sm:p-6">
            {subjects.length === 0 && <div className="rounded-2xl bg-slate-50 px-4 py-7 text-center"><div className="text-3xl" aria-hidden="true">🗂️</div><p className="mt-2 text-sm font-bold text-slate-800">{t('dashboard.noSubjects')}</p><Link href="/subjects" className="mt-2 inline-flex text-sm font-bold text-blue-700">{t('dashboard.addSubject')} →</Link></div>}
            {subjects.slice(0, 5).map((subject) => <div key={subject.id}><div className="mb-2 flex items-center justify-between gap-3"><span className="min-w-0 truncate text-sm font-bold text-slate-800">{subject.emoji} {subject.name}</span><span className="text-xs font-extrabold tabular-nums text-slate-500">{Math.round(subject.masteryLevel * 100)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: Math.max(0, Math.min(100, subject.masteryLevel * 100)) + '%' }} /></div></div>)}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">{t('dashboard.recentActivity')}</h2><p className="mt-1 text-xs text-slate-500">{t('dashboard.activityBody')}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-xl" aria-hidden="true">⚡</span></div>
        <div className="mt-4">{activities.length === 0 && <p className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">{t('dashboard.noActivity')}</p>}
          {activities.slice(0, 5).map((activity) => <div key={activity.id} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700" aria-hidden="true">✓</span><span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{activity.description}</span><time className="shrink-0 text-xs text-slate-400" dateTime={activity.createdAt}>{new Date(activity.createdAt).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US')}</time></div>)}
        </div>
      </section>
    </div>
  );
}
