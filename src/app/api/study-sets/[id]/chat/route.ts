import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { chatMessages, studySets } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { randomUUID } from 'crypto';

const schema = z.object({ message: z.string().min(1) });

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const rows = await db.select().from(chatMessages).where(eq(chatMessages.studySetId, id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const [set] = await db.select().from(studySets).where(and(eq(studySets.id, id), eq(studySets.userId, user.id))).limit(1);
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await db.insert(chatMessages).values({ id: randomUUID(), studySetId: id, userId: user.id, role: 'user', content: parsed.data.message });

  const provider = createOpenAI({ baseURL: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1', apiKey: process.env.LLM_API_KEY ?? '' });
  const { text } = await generateText({
    model: provider(process.env.LLM_MODEL ?? 'gpt-4o-mini'),
    system: `You are a helpful study assistant. Use this study material to answer questions:\n\n${set.summary || set.sourceContent.slice(0, 4000)}`,
    prompt: parsed.data.message,
  });

  const [reply] = await db.insert(chatMessages).values({ id: randomUUID(), studySetId: id, userId: user.id, role: 'assistant', content: text }).returning();
  return NextResponse.json(reply, { status: 201 });
}
