import { describe, expect, it } from 'vitest';

import { resolveAsrAdapterDescriptorDigest } from '../../backend/src/modules/asr/asr-worker.repository.js';

describe('ASR Worker descriptor digest mapping', () => {
  it('uses capabilities descriptorDigest independently from deployment config digest', () => {
    const descriptorDigest = 'a'.repeat(64);
    const deploymentConfigDigest = 'b'.repeat(64);
    expect(resolveAsrAdapterDescriptorDigest({ descriptorDigest, configDigest: deploymentConfigDigest })).toBe(descriptorDigest);
    expect(resolveAsrAdapterDescriptorDigest({ descriptorDigest: deploymentConfigDigest, configDigest: descriptorDigest })).toBe(deploymentConfigDigest);
  });

  it('rejects missing or malformed descriptor digest', () => {
    expect(() => resolveAsrAdapterDescriptorDigest({ configDigest: 'a'.repeat(64) })).toThrow('ASR_ROUTING_TARGET_DESCRIPTOR_DIGEST_MISSING');
    expect(() => resolveAsrAdapterDescriptorDigest({ descriptorDigest: 'not-a-digest' })).toThrow('ASR_ROUTING_TARGET_DESCRIPTOR_DIGEST_MISSING');
  });
});
