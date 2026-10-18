import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

function getProvider() {
  return createOpenAI({
    baseURL: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: process.env.LLM_API_KEY ?? '',
  });
}

function model() {
  return getProvider()(process.env.LLM_MODEL ?? 'gpt-4o-mini');
}

async function ask(prompt: string): Promise<string> {
  const { text } = await generateText({ model: model(), prompt });
  return text.trim();
}

export async function generateSummary(content: string): Promise<string> {
  return ask(
    `Summarize the following study material in 3-5 clear paragraphs suitable for a student. Be concise and educational.\n\n${content}`,
  );
}

export async function generateFlashcards(
  content: string,
): Promise<{ front: string; back: string }[]> {
  const raw = await ask(
    `Generate 10 flashcards from the following study material. Return ONLY valid JSON array: [{"front":"...","back":"..."},...]\n\n${content}`,
  );
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }
}

export async function generateQuiz(content: string): Promise<
  { question: string; options: string[]; correctIndex: number; explanation: string }[]
> {
  const raw = await ask(
    `Generate 5 multiple-choice quiz questions from the following study material. Return ONLY valid JSON array: [{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."},...]\n\n${content}`,
  );
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }
}

export async function generatePodcastScript(content: string): Promise<string> {
  return ask(
    `Write an engaging podcast-style script (2-3 minutes) explaining the following study material as if talking to a student. Be conversational.\n\n${content}`,
  );
}

export async function extractPDF(buffer: Buffer): Promise<string> {
  // dynamic import avoids pdf-parse test-file side-effect at module load
  const pdfMod = await import('pdf-parse');
  // pdf-parse ships both CJS and ESM; normalise to callable
  const parse = (pdfMod as unknown as { default?: (b: Buffer) => Promise<{ text: string }> }).default ?? (pdfMod as unknown as (b: Buffer) => Promise<{ text: string }>);
  const data = await parse(buffer);
  return data.text;
}

export async function extractYouTube(url: string): Promise<string> {
  const { YoutubeTranscript } = await import('youtube-transcript');
  const videoId = url.match(
    /(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/,
  )?.[1];
  if (!videoId) throw new Error('Invalid YouTube URL');
  const segments = await YoutubeTranscript.fetchTranscript(videoId);
  return segments.map((s: { text: string }) => s.text).join(' ');
}
