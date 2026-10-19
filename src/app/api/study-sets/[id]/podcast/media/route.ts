import { and, desc, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { podcasts, studySets } from '@/lib/db/schema';
export const maxDuration = 300;
type MediaKind = 'audio' | 'video';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const [set] = await db.select({ id: studySets.id, title: studySets.title, userId: studySets.userId }).from(studySets).where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => null) as { kind?: unknown } | null;
  const kind = body?.kind;
  if (kind !== 'audio' && kind !== 'video') return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
  const workerUrl = process.env.MEDIA_WORKER_URL?.trim(); const workerToken = process.env.MEDIA_WORKER_TOKEN;
  if (!workerUrl || !workerToken) return NextResponse.json({ error: 'Media generator is not configured yet. Set MEDIA_WORKER_URL and MEDIA_WORKER_TOKEN on the server.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } });
  const [podcast] = await db.select({ script: podcasts.script }).from(podcasts).where(eq(podcasts.studySetId, id)).orderBy(desc(podcasts.createdAt)).limit(1);
  if (!podcast?.script || podcast.script.trim().length < 10) return NextResponse.json({ error: 'Generate a podcast script first.' }, { status: 422 });
  const endpoint = new URL(kind === 'audio' ? '/v1/audio' : '/v1/video', workerUrl);
  let workerResponse: Response;
  try {
    workerResponse = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${workerToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(kind === 'audio' ? { text: podcast.script, format: 'mp3' } : { text: podcast.script, title: set.title || 'EksplorinAja - Ringkasan Belajar' }), cache: 'no-store', signal: AbortSignal.timeout(280_000) });
  } catch { return NextResponse.json({ error: 'Media worker is unavailable or timed out.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } }); }
  if (!workerResponse.ok) return NextResponse.json({ error: 'Media generation failed. Check the private media worker logs.' }, { status: workerResponse.status === 401 ? 502 : workerResponse.status, headers: { 'Cache-Control': 'private, no-store' } });
  const bytes = await workerResponse.arrayBuffer();
  if (bytes.byteLength < 100) return NextResponse.json({ error: 'Media worker returned an empty file.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } });
  return new NextResponse(bytes, { status: 200, headers: { 'Content-Type': kind === 'audio' ? 'audio/mpeg' : 'video/mp4', 'Content-Disposition': `attachment; filename="eksplorinaja-podcast.${kind === 'audio' ? 'mp3' : 'mp4'}"`, 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
