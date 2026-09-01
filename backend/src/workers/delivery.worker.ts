import { randomUUID } from 'node:crypto';

import { sha256 } from '../modules/deliveries/deliveries.domain.js';
import { DeliveryRepository } from '../modules/deliveries/deliveries.repository.js';
import type { DeliveryStorage } from '../modules/deliveries/delivery-storage.js';
import type { DatabasePool } from '../database/pool.js';

export interface DeliveryWorkerConfig { leaseMs: number; pollIntervalMs: number }
export const deliveryWorkerConfig: DeliveryWorkerConfig = { leaseMs: 60_000, pollIntervalMs: 1_000 };

const waitForPoll = (delayMs: number, signal: AbortSignal) => new Promise<void>((resolve) => {
  if (signal.aborted) return resolve();
  const onAbort = () => { clearTimeout(timer); resolve(); };
  const timer = setTimeout(() => { signal.removeEventListener('abort', onAbort); resolve(); }, delayMs);
  signal.addEventListener('abort', onAbort, { once: true });
});

export class DeliveryWorker {
  private readonly repository: DeliveryRepository;

  constructor(
    database: DatabasePool,
    private readonly storage: DeliveryStorage,
    private readonly config: DeliveryWorkerConfig = deliveryWorkerConfig,
    private readonly options: { workerId?: string; clock?: () => Date } = {},
  ) { this.repository = new DeliveryRepository(database, storage); }

  private now() { return this.options.clock?.() ?? new Date(); }

  async runOnce() {
    const now = this.now();
    const claim = await this.repository.claimGeneration(this.options.workerId ?? `delivery-${randomUUID()}`, now, this.config.leaseMs);
    if (!claim) return { processed: false as const };
    try {
      const files = await this.repository.loadGenerationFiles(claim.deliveryId);
      for (const file of files) {
        const digest = sha256(file.bytes);
        if (digest !== file.content_digest || file.bytes.byteLength !== file.size_bytes) throw new Error(`计划文件 ${file.id} 的摘要或大小不一致。`);
        const stored = await this.storage.putObject({ objectKey: file.object_key, bytes: file.bytes, contentType: file.content_type, metadata: file.metadata });
        if (stored.sizeBytes !== file.size_bytes || stored.checksumValue !== file.content_digest) throw new Error(`对象 ${file.id} 写入后摘要或大小不一致。`);
        const head = await this.storage.headObject(file.object_key);
        if (!head || head.sizeBytes !== file.size_bytes || head.checksumValue !== file.content_digest) throw new Error(`对象 ${file.id} 写入后无法通过摘要校验。`);
      }
      const completed = await this.repository.completeGeneration(claim, this.now(), files.length);
      return { processed: true as const, deliveryId: claim.deliveryId, status: completed ? 'ready' as const : 'lease_lost' as const };
    } catch (error) {
      const failed = await this.repository.failGeneration(claim, this.now(), error);
      return { processed: true as const, deliveryId: claim.deliveryId, status: failed ? 'generation_failed' as const : 'lease_lost' as const };
    }
  }

  async runUntilStopped(signal: AbortSignal) {
    const pollIntervalMs = Math.min(Math.max(this.config.pollIntervalMs, 50), 60_000);
    while (!signal.aborted) { const result = await this.runOnce(); if (!result.processed) await waitForPoll(pollIntervalMs, signal); }
  }
}
