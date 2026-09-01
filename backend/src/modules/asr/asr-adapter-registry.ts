import type { AsrAdapter, AsrAdapterDescriptor } from './asr-adapter.js';
import { DeterministicFakeAsrAdapter } from './asr-adapter.js';

const sameDescriptor = (left: AsrAdapterDescriptor, right: AsrAdapterDescriptor) =>
  left.provider === right.provider
  && left.adapter === right.adapter
  && left.model === right.model
  && left.language === right.language
  && left.configDigest === right.configDigest
  && left.hotwordCapabilities.supported === right.hotwordCapabilities.supported
  && left.hotwordCapabilities.maxEntries === right.hotwordCapabilities.maxEntries
  && left.hotwordCapabilities.maxCharacters === right.hotwordCapabilities.maxCharacters
  && left.billing.billingClass === right.billing.billingClass
  && left.billing.currency === right.billing.currency
  && left.billing.maximumAmount === right.billing.maximumAmount
  && left.billing.billingUnit === right.billing.billingUnit
  && left.billing.maximumQuantity === right.billing.maximumQuantity;

export class AsrAdapterRegistry {
  private readonly adapters = new Map<string, AsrAdapter>();

  constructor(adapters: AsrAdapter[], private readonly defaultAdapterId: string) {
    for (const adapter of adapters) {
      if (this.adapters.has(adapter.descriptor.adapter)) {
        throw new Error(`ASR 适配器重复登记：${adapter.descriptor.adapter}`);
      }
      this.adapters.set(adapter.descriptor.adapter, adapter);
    }
    if (!this.adapters.has(defaultAdapterId)) {
      throw new Error(`默认 ASR 适配器未登记：${defaultAdapterId}`);
    }
  }

  get defaultDescriptor(): Readonly<AsrAdapterDescriptor> {
    return this.adapters.get(this.defaultAdapterId)!.descriptor;
  }

  get(adapterKey: string): AsrAdapter | undefined {
    return this.adapters.get(adapterKey);
  }

  descriptors(): ReadonlyArray<Readonly<AsrAdapterDescriptor>> {
    return [...this.adapters.values()].map((adapter) => adapter.descriptor);
  }

  resolve(saved: AsrAdapterDescriptor): AsrAdapter {
    const adapter = this.adapters.get(saved.adapter);
    if (!adapter || !sameDescriptor(adapter.descriptor, saved)) {
      throw new Error(`ASR 批次适配器未登记或配置不匹配：${saved.adapter}`);
    }
    return adapter;
  }
}

export const createDefaultAsrAdapterRegistry = () => new AsrAdapterRegistry(
  [new DeterministicFakeAsrAdapter()],
  'deterministic_fake',
);
