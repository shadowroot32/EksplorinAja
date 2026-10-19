import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { podcasts, studySets } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { AIRequestTimeoutError, generatePodcastScript, InvalidAIOutputError } from '@/lib/ai/engine';

export const maxDuration = 30;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [set] = await db.select({ id: studySets.id }).from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const [podcast] = await db.select().from(podcasts).where(eq(podcasts.studySetId, id))
    .orderBy(desc(podcasts.createdAt)).limit(1);
  return NextResponse.json(podcast ?? null, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [set] = await db.select().from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const content = (set.summary || set.sourceContent).trim();
  if (content.length < 10) return NextResponse.json({ error: 'Not enough material to create a podcast' }, { status: 422 });
  try {
    const script = await generatePodcastScript(content);
    if (script.trim().length < 120) return NextResponse.json({ error: 'Podcast script was too short. Try again.' }, { status: 502 });
    const [existing] = await db.select({ id: podcasts.id }).from(podcasts)
      .where(eq(podcasts.studySetId, id)).orderBy(desc(podcasts.createdAt)).limit(1);
    if (existing) {
      const [updated] = await db.update(podcasts).set({ script, audioUrl: null })
        .where(eq(podcasts.id, existing.id)).returning();
      return NextResponse.json(updated);
    }
    const [created] = await db.insert(podcasts).values({ id: randomUUID(), studySetId: id, script, audioUrl: null }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof AIRequestTimeoutError) return NextResponse.json({ error: 'Podcast generation timed out. Try again.' }, { status: 504 });
    if (error instanceof InvalidAIOutputError) return NextResponse.json({ error: 'AI returned an invalid podcast script. Try again.' }, { status: 502 });
    console.error('[PODCAST] Generation failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ error: 'Could not generate podcast right now.' }, { status: 502 });
  }
}
