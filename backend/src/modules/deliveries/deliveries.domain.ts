import { createHash } from 'node:crypto';

export const sha256 = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
export const stableDigest = (value: unknown) => sha256(JSON.stringify(value));

const srtTime = (ms: number) => {
  const safe = Math.max(0, Math.floor(ms));
  const hours = Math.floor(safe / 3_600_000);
  const minutes = Math.floor((safe % 3_600_000) / 60_000);
  const seconds = Math.floor((safe % 60_000) / 1_000);
  const millis = safe % 1_000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
};

export interface DeliveryCue {
  id: string;
  start_ms: number;
  end_ms: number;
  text: string;
  ordinal: number;
}

export const createSrt = (cues: DeliveryCue[]) => {
  const ordered = [...cues].sort((a, b) => a.start_ms - b.start_ms || a.end_ms - b.end_ms || a.ordinal - b.ordinal || a.id.localeCompare(b.id));
  const body = ordered.map((cue, index) => `${index + 1}\n${srtTime(cue.start_ms)} --> ${srtTime(cue.end_ms)}\n${cue.text}\n`).join('\n');
  return Buffer.from(`\uFEFF${body}`, 'utf8');
};

export const createEmptySrt = () => Buffer.from('\uFEFF', 'utf8');
