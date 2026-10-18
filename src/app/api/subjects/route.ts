import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { subjects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { randomUUID } from 'crypto';

const schema = z.object({
  name: z.string().min(1).max(100),
  emoji: z.string().default('📚'),
  description: z.string().default(''),
});

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const rows = await db.select().from(subjects).where(eq(subjects.userId, user.id));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  const [row] = await db.insert(subjects).values({
    id: randomUUID(),
    userId: user.id,
    ...parsed.data,
  }).returning();
  return NextResponse.json(row, { status: 201 });
}
