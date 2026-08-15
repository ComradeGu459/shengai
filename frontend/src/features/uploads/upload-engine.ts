import type { UploadSession } from '@qimao-terms-cloud/contracts';

import { authorizePart, completeUpload, confirmPart, getUpload, putPart, UploadApiError } from './api.js';
import { sha256Blob } from './sha256.js';

const protocolLimits = { perFileConcurrency: 3, browserConcurrency: 12 } as const;

class Semaphore {
  private available: number = protocolLimits.browserConcurrency;
  private waiting: Array<() => void> = [];

  async run<T>(task: () => Promise<T>) {
    if (this.available === 0) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.available -= 1;
    try {
      return await task();
    } finally {
      this.available += 1;
      this.waiting.shift()?.();
    }
  }
}

const browserParts = new Semaphore();
const idempotencyKey = (uploadId: string, scope: string) => `browser-${uploadId}-${scope}`;
const completionIntents = new Map<string, { key: string; expectedVersion: number }>();
const renewableAuthorizationErrors = new Set(['UPLOAD_AUTHORIZATION_EXPIRED', 'UPLOAD_AUTHORIZATION_INVALID']);

const uploadPartWithRenewal = async (file: File, session: UploadSession, partNumber: number) => {
  const start = (partNumber - 1) * session.partSizeBytes;
  const blob = file.slice(start, Math.min(start + session.partSizeBytes, file.size));
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const authorization = await authorizePart(session.id, {
        partNumber,
        fileFingerprint: session.fileFingerprint,
      });
      return { blob, receipt: await putPart(authorization, blob) };
    } catch (error) {
      if (!(error instanceof UploadApiError) || !renewableAuthorizationErrors.has(error.code) || attempt === 1) throw error;
    }
  }
  throw new Error('分片上传授权续签失败。');
};

export interface UploadEngineControl {
  paused: () => boolean;
  onSession: (session: UploadSession) => void;
}

export const uploadMissingParts = async (file: File, initial: UploadSession, control: UploadEngineControl) => {
  let latest = initial;
  const queue = [...initial.missingPartNumbers];
  const workers = Array.from({ length: Math.min(protocolLimits.perFileConcurrency, queue.length) }, async () => {
    while (queue.length > 0) {
      if (control.paused()) return;
      const partNumber = queue.shift();
      if (!partNumber) return;
      await browserParts.run(async () => {
        if (control.paused()) {
          queue.unshift(partNumber);
          return;
        }
        const { blob, receipt } = await uploadPartWithRenewal(file, initial, partNumber);
        latest = await confirmPart(initial.id, idempotencyKey(initial.id, `part-${partNumber}`), {
          partNumber,
          sizeBytes: receipt.sizeBytes,
          etag: receipt.etag,
          checksumValue: await sha256Blob(blob),
        });
        control.onSession(latest);
      });
    }
  });
  await Promise.all(workers);
  if (control.paused()) return latest;
  latest = await getUpload(initial.id);
  control.onSession(latest);
  if (latest.missingPartNumbers.length > 0) return latest;
  const intent = completionIntents.get(latest.id) ?? {
    key: idempotencyKey(latest.id, 'complete'),
    expectedVersion: latest.version,
  };
  completionIntents.set(latest.id, intent);
  latest = await completeUpload(latest.id, intent.key, { expectedVersion: intent.expectedVersion });
  control.onSession(latest);
  if (latest.status === 'completed') completionIntents.delete(latest.id);
  return latest;
};
