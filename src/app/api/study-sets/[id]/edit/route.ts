import { and, eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { studySets } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { AIRequestTimeoutError, generateDocumentEdit, InvalidAIOutputError } from '@/lib/ai/engine';
import { MAX_SOURCE_CHARS } from '@/lib/ai/material-validation';

export const maxDuration = 30;

const schema = z.object({
  instruction: z.string().trim().min(3).max(1_000),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Write a short, clear editing instruction.' }, { status: 400 });

  const [set] = await db.select({
    id: studySets.id,
    sourceContent: studySets.sourceContent,
  }).from(studySets).where(and(
    eq(studySets.id, id),
    eq(studySets.userId, user.id),
  )).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const sourceContent = set.sourceContent.trim();
  if (sourceContent.length < 10) {
    return NextResponse.json({ error: 'There is not enough document text to edit.' }, { status: 422 });
  }
  if (sourceContent.length > MAX_SOURCE_CHARS) {
    return NextResponse.json({ error: 'The document is too long to edit in one request.' }, { status: 413 });
  }

  try {
    const content = await generateDocumentEdit(sourceContent, parsed.data.instruction);
    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof AIRequestTimeoutError) {
      return NextResponse.json({ error: 'AI editing timed out. Try a shorter document or a simpler instruction.' }, { status: 504 });
    }
    if (error instanceof InvalidAIOutputError) {
      return NextResponse.json({ error: 'AI returned an invalid document revision. Try again with a clearer instruction.' }, { status: 502 });
    }
    console.error('[STUDY SET EDIT] AI edit failed:', error instanceof Error ? error.name : 'unknown error');
    return NextResponse.json({ error: 'Could not edit the document right now.' }, { status: 502 });
  }
}
