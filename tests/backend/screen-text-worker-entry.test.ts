import { beforeEach, describe, expect, it, vi } from 'vitest';

const workerState = vi.hoisted(() => ({
  runOnce: vi.fn(),
  runUntilStopped: vi.fn(),
}));

vi.mock('../../backend/src/workers/screen-text.worker.js', () => ({
  ScreenTextWorker: class {
    runOnce(...args: unknown[]) { return workerState.runOnce(...args); }
    runUntilStopped(...args: unknown[]) { return workerState.runUntilStopped(...args); }
  },
}));

import type { DatabasePool } from '../../backend/src/database/pool.js';
import {
  parseScreenTextWorkerMode,
  runScreenTextWorkerEntry,
} from '../../backend/src/workers/screen-text.worker.entry.js';

const input = (database: DatabasePool, mode: 'once' | 'continuous', writeOutput?: (value: unknown) => void) => ({
  database,
  registry: {} as never,
  evidenceStorage: {} as never,
  signal: new AbortController().signal,
  mode,
  ...(writeOutput ? { writeOutput } : {}),
});

describe('screen-text worker entry', () => {
  beforeEach(() => {
    workerState.runOnce.mockReset();
    workerState.runUntilStopped.mockReset();
  });

  it('只接受无参数常驻模式或单一 --once', () => {
    expect(parseScreenTextWorkerMode([])).toBe('continuous');
    expect(parseScreenTextWorkerMode(['--once'])).toBe('once');
    expect(() => parseScreenTextWorkerMode(['--once', '--again'])).toThrow();
    expect(() => parseScreenTextWorkerMode(['--bad'])).toThrow();
  });

  it.each([
    [{ processed: false as const }, { processed: false }],
    [{ processed: true as const, projectId: 'project', batchId: 'batch', jobId: 'job', episodeNumber: 7, outcome: 'completed' as const }, { processed: true, projectId: 'project', batchId: 'batch', jobId: 'job', episodeNumber: 7, outcome: 'completed' }],
    [{ processed: true as const, projectId: 'project', batchId: 'batch', jobId: 'job', episodeNumber: 7, outcome: 'failed' as const }, { processed: true, projectId: 'project', batchId: 'batch', jobId: 'job', episodeNumber: 7, outcome: 'failed' }],
    [{ processed: true as const, projectId: 'project', batchId: 'batch', jobId: 'job', episodeNumber: 7, outcome: 'reconciliation_required' as const }, { processed: true, projectId: 'project', batchId: 'batch', jobId: 'job', episodeNumber: 7, outcome: 'reconciliation_required' }],
  ] as const)('once 对无任务/完成/失败/unknown 只运行一次并输出脱敏摘要：%o', async (result, outputResult) => {
    workerState.runOnce.mockResolvedValueOnce(result);
    const database = { end: vi.fn(async () => undefined) } as unknown as DatabasePool;
    const writeOutput = vi.fn();

    await runScreenTextWorkerEntry(input(database, 'once', writeOutput));

    expect(workerState.runOnce).toHaveBeenCalledTimes(1);
    expect(workerState.runUntilStopped).not.toHaveBeenCalled();
    expect(writeOutput).toHaveBeenCalledWith(outputResult);
    expect(database.end).toHaveBeenCalledTimes(1);
  });

  it('无参数常驻入口只调用 runUntilStopped，仍在退出时关闭 DB', async () => {
    workerState.runUntilStopped.mockResolvedValueOnce(undefined);
    const database = { end: vi.fn(async () => undefined) } as unknown as DatabasePool;

    await runScreenTextWorkerEntry(input(database, 'continuous'));

    expect(workerState.runUntilStopped).toHaveBeenCalledTimes(1);
    expect(workerState.runOnce).not.toHaveBeenCalled();
    expect(database.end).toHaveBeenCalledTimes(1);
  });

  it('runOnce 抛错时也关闭 DB，不启动常驻循环', async () => {
    workerState.runOnce.mockRejectedValueOnce(new Error('worker failure'));
    const database = { end: vi.fn(async () => undefined) } as unknown as DatabasePool;

    await expect(runScreenTextWorkerEntry(input(database, 'once'))).rejects.toThrow('worker failure');
    expect(workerState.runOnce).toHaveBeenCalledTimes(1);
    expect(workerState.runUntilStopped).not.toHaveBeenCalled();
    expect(database.end).toHaveBeenCalledTimes(1);
  });
});
