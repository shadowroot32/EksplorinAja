'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Stats { subjects: number; studySets: number; dueCards: number; mastery: number; minutesToday: number; }
interface StudySet { id: string; title: string; sourceType: string; createdAt: string; }
interface Subject { id: string; name: string; emoji: string; masteryLevel: number; }
interface Activity { id: string; description: string; createdAt: string; }

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sets, setSets] = useState<StudySet[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      setStats(d.stats);
      setSets(d.recentSets);
      setSubjects(d.subjects);
      setActivities(d.activities);
    });
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Subjects', value: stats?.subjects ?? '—' },
          { label: 'Study Sets', value: stats?.studySets ?? '—' },
          { label: 'Cards Due', value: stats?.dueCards ?? '—' },
          { label: 'Mastery', value: stats ? `${stats.mastery}%` : '—' },
          { label: 'Min Today', value: stats?.minutesToday ?? '—' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-emerald-400">{String(s.value)}</div>
              <div className="text-sm text-slate-400 mt-1">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Study Sets */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Study Sets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sets.length === 0 && <p className="text-slate-500 text-sm">No study sets yet. <Link href="/library" className="text-emerald-400 hover:underline">Create one</Link></p>}
            {sets.map(s => (
              <Link key={s.id} href={`/study/${s.id}`} className="flex items-center justify-between p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
                <span className="text-slate-200 text-sm font-medium">{s.title}</span>
                <Badge variant="secondary">{s.sourceType}</Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjects.length === 0 && <p className="text-slate-500 text-sm">No subjects yet. <Link href="/subjects" className="text-emerald-400 hover:underline">Add one</Link></p>}
            {subjects.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800">
                <span className="text-slate-200 text-sm font-medium">{s.emoji} {s.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${s.masteryLevel * 100}%` }} />
                  </div>
                  <span className="text-xs text-slate-400">{Math.round(s.masteryLevel * 100)}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card>
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {activities.length === 0 && <p className="text-slate-500 text-sm">No activity yet.</p>}
          {activities.map(a => (
            <div key={a.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-300 text-sm">{a.description}</span>
              <span className="text-slate-500 text-xs ml-auto">{new Date(a.createdAt).toLocaleDateString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
