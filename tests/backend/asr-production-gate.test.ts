import { describe, expect, it, vi } from 'vitest';

import type { AsrAdapterRegistry } from '../../backend/src/modules/asr/asr-adapter-registry.js';
import { deterministicFakeDescriptor, createAsrAdapterDescriptor } from '../../backend/src/modules/asr/asr-adapter.js';
import { AsrService } from '../../backend/src/modules/asr/asr.service.js';
import { AsrDomainError } from '../../backend/src/modules/asr/asr-errors.js';
import { AsrAdapterRegistry as Registry } from '../../backend/src/modules/asr/asr-adapter-registry.js';
import { asrWriteCommandsEnabled } from '../../backend/src/modules/asr/asr.routes.js';

const repositories = () => ({
  commands: {
    create: vi.fn(() => ({ replay: false, batch: { id: 'batch-1' } })),
    retry: vi.fn(() => ({ replay: false, batch: { id: 'batch-2' } })),
  },
  reads: {},
  eligibility: {},
  dispatches: {
    create: vi.fn(() => ({ replay: false, group: { id: 'group-1' } })),
  },
});

const service = (enabled: boolean, repos = repositories()) => new AsrService(
  repos.commands as never,
  repos.reads as never,
  repos.eligibility as never,
  repos.dispatches as never,
  enabled,
);

const expectBlocked = (operation: () => unknown) => {
  try {
    operation();
    throw new Error('expected_asr_gate');
  } catch (error) {
    expect(error).toMatchObject({ code: 'ASR_FAKE_DISABLED', statusCode: 503 });
  }
};

describe('ASR production write gate', () => {
  it('生产 fake 精确拒绝 create/dispatch/retry，非生产 fake 仍可测', () => {
    const fakeRegistry = { defaultDescriptor: deterministicFakeDescriptor } as Pick<AsrAdapterRegistry, 'defaultDescriptor'>;
    expect(asrWriteCommandsEnabled(fakeRegistry, 'production')).toBe(false);
    expect(asrWriteCommandsEnabled(fakeRegistry, 'test')).toBe(true);
    const blocked = service(false);
    expect(() => blocked.create('project-1', {} as never, 'key-1')).toThrowError(
      new AsrDomainError('ASR_FAKE_DISABLED', '生产环境未启用模拟识别，真实供应商仍需单独授权。', 503, 'contact_administrator'),
    );
    expectBlocked(() => blocked.createDispatchGroup({} as never, 'key-2', 'request-1'));
    expectBlocked(() => blocked.retry('project-1', 'batch-1', {} as never, 'key-3'));
  });

  it('生产默认真实 Tencent registry 通过同一 service 写链，不绕过仓储/路由', () => {
    const descriptor = createAsrAdapterDescriptor({
      provider: 'tencent_cloud', adapter: 'tencent_cloud_recorded_v1', model: '16k_zh', language: 'zh-CN',
      configVersion: 'test', billing: { billingClass: 'metered', currency: 'CNY', maximumAmount: '8.750000', billingUnit: 'minute', maximumQuantity: '300' },
    });
    const realRegistry = new Registry([{ descriptor, execute: vi.fn() }], descriptor.adapter);
    expect(asrWriteCommandsEnabled(realRegistry, 'production')).toBe(true);
    const repos = repositories();
    const allowed = service(true, repos);
    expect(allowed.create('project-1', {} as never, 'key-1')).toMatchObject({ batch: { id: 'batch-1' } });
    expect(allowed.createDispatchGroup({} as never, 'key-2', 'request-1')).toMatchObject({ group: { id: 'group-1' } });
    expect(allowed.retry('project-1', 'batch-1', {} as never, 'key-3')).toMatchObject({ batch: { id: 'batch-2' } });
    expect(repos.commands.create).toHaveBeenCalledTimes(1);
    expect(repos.dispatches.create).toHaveBeenCalledTimes(1);
    expect(repos.commands.retry).toHaveBeenCalledTimes(1);
  });
});
