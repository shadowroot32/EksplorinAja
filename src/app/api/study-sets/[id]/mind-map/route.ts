import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { studySets } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { AIRequestTimeoutError, generateMindMap, InvalidMindMapError } from '@/lib/ai/engine';

export const maxDuration = 30;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [set] = await db.select().from(studySets)
    .where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const content = (set.summary || set.sourceContent).trim();
  if (content.length < 10) return NextResponse.json({ error: 'Not enough material to create a mind map' }, { status: 422 });
  try {
    return NextResponse.json(await generateMindMap(content));
  } catch (error) {
    if (error instanceof AIRequestTimeoutError) return NextResponse.json({ error: 'Mind map generation timed out. Try again.' }, { status: 504 });
    if (error instanceof InvalidMindMapError) return NextResponse.json({ error: 'AI returned an invalid mind map. Try again.' }, { status: 502 });
    console.error('[MIND MAP] Generation failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ error: 'Could not generate mind map right now.' }, { status: 502 });
  }
}
