import { z } from 'zod';

export const MAX_PDF_BYTES = 4 * 1024 * 1024;
export const MAX_SOURCE_CHARS = 60_000;
export const AI_REQUEST_TIMEOUT_MS = 15_000;
export const MIN_NATIVE_PDF_TEXT_CHARS = 40;
export const MAX_PDF_OCR_PAGES = 8;
export const PDF_OCR_TIMEOUT_MS = 25_000;

export function shouldRunPdfOcr(extractedText: string): boolean {
  return extractedText.trim().length < MIN_NATIVE_PDF_TEXT_CHARS;
}

const titleSchema = z.string().trim().min(1).max(200);
const subjectIdSchema = z.string().trim().min(1).max(200).optional();

export const textStudySetSchema = z.object({
  title: titleSchema,
  subjectId: subjectIdSchema,
  sourceType: z.literal('text'),
  content: z.string().trim().min(10).max(MAX_SOURCE_CHARS),
});

export function getYouTubeVideoId(raw: string): string | null {
  try {
    const url = new URL(raw);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let candidate: string | null = null;

    if (hostname === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'music.youtube.com') {
      if (url.pathname === '/watch') {
        candidate = url.searchParams.get('v');
      } else {
        candidate = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:\/|$)/)?.[1] ?? null;
      }
    }

    return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export const youtubeStudySetSchema = z.object({
  title: titleSchema,
  subjectId: subjectIdSchema,
  sourceType: z.literal('youtube'),
  url: z.string().url().refine((url) => getYouTubeVideoId(url) !== null, {
    message: 'URL YouTube tidak valid atau tidak didukung',
  }),
});

export function getPdfUploadError(file: { name: string; size: number; type: string }): string | null {
  if (!file.name.trim() || !file.name.toLowerCase().endsWith('.pdf')) {
    return 'invalid_extension';
  }
  if (file.type && file.type.toLowerCase() !== 'application/pdf') {
    return 'invalid_type';
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return 'empty_file';
  }
  if (file.size > MAX_PDF_BYTES) {
    return 'file_too_large';
  }
  return null;
}

export function hasPdfSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 5
    && bytes[0] === 0x25
    && bytes[1] === 0x50
    && bytes[2] === 0x44
    && bytes[3] === 0x46
    && bytes[4] === 0x2d;
}

export class InvalidAIOutputError extends Error {
  constructor(message = 'AI returned output that does not match the expected schema') {
    super(message);
    this.name = 'InvalidAIOutputError';
  }
}

const flashcardsSchema = z.array(z.object({
  front: z.string().trim().min(1).max(2_000),
  back: z.string().trim().min(1).max(2_000),
})).min(1).max(20);

const quizSchema = z.array(z.object({
  question: z.string().trim().min(1).max(2_000),
  options: z.array(z.string().trim().min(1).max(500)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().max(2_000).default(''),
})).min(1).max(10);

const summarySchema = z.string().trim().min(40).max(30_000);

function extractJsonArray(raw: string): unknown {
  const cleaned = raw.trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '').trim();
  try {
    const direct = JSON.parse(cleaned) as unknown;
    if (Array.isArray(direct)) return direct;
  } catch {
    // Some providers add a short sentence before the JSON array; extract the first complete array below.
  }

  const start = cleaned.indexOf('[');
  if (start < 0) throw new InvalidAIOutputError('AI response did not contain a JSON array');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '[') depth += 1;
    else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(cleaned.slice(start, index + 1)) as unknown;
          if (Array.isArray(parsed)) return parsed;
        } catch {
          throw new InvalidAIOutputError('AI response contained malformed JSON');
        }
      }
    }
  }
  throw new InvalidAIOutputError('AI response contained an incomplete JSON array');
}

export function parseFlashcardsOutput(raw: string): { front: string; back: string }[] {
  const parsed = flashcardsSchema.safeParse(extractJsonArray(raw));
  if (!parsed.success) throw new InvalidAIOutputError('AI flashcards failed schema validation');
  return parsed.data;
}

export function parseQuizOutput(raw: string): {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}[] {
  const parsed = quizSchema.safeParse(extractJsonArray(raw));
  if (!parsed.success) throw new InvalidAIOutputError('AI quiz failed schema validation');
  return parsed.data;
}

export function parseSummaryOutput(raw: string): string {
  const parsed = summarySchema.safeParse(raw);
  if (!parsed.success) throw new InvalidAIOutputError('AI summary failed schema validation');
  return parsed.data;
}
