import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { activities } from '@/lib/db/schema';

function cell(value: string | Date) {
  let text = value instanceof Date ? value.toISOString() : value;
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.select({
    activityType: activities.activityType,
    description: activities.description,
    createdAt: activities.createdAt,
  }).from(activities).where(eq(activities.userId, user.id)).orderBy(desc(activities.createdAt));

  const csvRows = [
    ['activity_type', 'description', 'created_at'],
    ...rows.map((row) => [row.activityType, row.description, row.createdAt]),
  ];
  const csv = '\uFEFF' + csvRows.map((row) => row.map((value) => cell(value)).join(',')).join('\r\n') + '\r\n';
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="eksplorinaja-activity-history-${date}.csv"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
