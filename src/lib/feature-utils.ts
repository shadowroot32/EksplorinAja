import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';

export interface MindMapNode { id: string; label: string; parentId: string | null; }

const mindMapSchema = z.object({
  title: z.string().trim().min(1).max(180),
  nodes: z.array(z.object({
    id: z.string().trim().min(1).max(50),
    label: z.string().trim().min(1).max(180),
    parentId: z.string().trim().min(1).max(50).nullable(),
  })).min(3).max(50),
});

export class InvalidMindMapError extends Error {
  constructor(message = 'Mind map output did not match expected structure') {
    super(message);
    this.name = 'InvalidMindMapError';
  }
}

export function createShareToken(): string { return randomBytes(32).toString('base64url'); }
export function hashShareToken(token: string): string { return createHash('sha256').update(token, 'utf8').digest('hex'); }
export function isValidShareToken(token: string): boolean { return /^[A-Za-z0-9_-]{43}$/.test(token); }

export function parseMindMapOutput(raw: string): { title: string; nodes: MindMapNode[] } {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const start = cleaned.indexOf('{');
  if (start < 0) throw new InvalidMindMapError('Mind map response did not contain a JSON object');
  let depth = 0, inString = false, escaped = false;
  let value: unknown;
  for (let i = start; i < cleaned.length; i += 1) {
    const ch = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        try { value = JSON.parse(cleaned.slice(start, i + 1)) as unknown; }
        catch { throw new InvalidMindMapError('Mind map response contained malformed JSON'); }
        break;
      }
    }
  }
  const parsed = mindMapSchema.safeParse(value);
  if (!parsed.success) throw new InvalidMindMapError();
  const nodes = parsed.data.nodes;
  const index = new Map(nodes.map((node) => [node.id, node]));
  if (index.size !== nodes.length) throw new InvalidMindMapError('Mind map node IDs must be unique');
  if (nodes.filter((node) => node.parentId === null).length !== 1) throw new InvalidMindMapError('Mind map must have exactly one root node');
  for (const node of nodes) {
    if (node.parentId === null) continue;
    if (!index.has(node.parentId) || node.parentId === node.id) throw new InvalidMindMapError('Mind map contains an invalid parent reference');
    const seen = new Set([node.id]);
    let parentId: string | null = node.parentId;
    while (parentId !== null) {
      if (seen.has(parentId)) throw new InvalidMindMapError('Mind map contains a cycle');
      seen.add(parentId);
      const parent = index.get(parentId);
      if (!parent) throw new InvalidMindMapError('Mind map contains an orphan node');
      parentId = parent.parentId;
    }
  }
  return {
    title: parsed.data.title,
    nodes: parsed.data.nodes.map((node) => ({ id: node.id, label: node.label, parentId: node.parentId ?? null })),
  };
}
