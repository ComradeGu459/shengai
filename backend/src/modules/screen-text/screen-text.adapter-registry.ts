import type { ScreenTextAdapter, ScreenTextAdapterDescriptor } from './screen-text.adapter.js';
import {
  DeterministicFakeScreenTextAdapter,
  ZeroNetworkCloudApiStub,
  ZeroNetworkSelfHostedWorkerStub,
} from './screen-text.adapter.js';
import { ScreenTextLocalOcrSidecarAdapter, ZeroNetworkLocalOcrSidecarTransport } from './screen-text.local-ocr-sidecar.js';
import { stableHash } from './screen-text.domain.js';

const sameDescriptor = (left: ScreenTextAdapterDescriptor, right: ScreenTextAdapterDescriptor) =>
  stableHash(left) === stableHash(right);

export class ScreenTextAdapterRegistry {
  private readonly adapters = new Map<string, ScreenTextAdapter>();

  constructor(adapters: ScreenTextAdapter[], private readonly defaultAdapterId: string) {
    for (const adapter of adapters) {
      if (this.adapters.has(adapter.descriptor.adapter)) {
        throw new Error(`画面字适配器重复登记：${adapter.descriptor.adapter}`);
      }
      this.adapters.set(adapter.descriptor.adapter, adapter);
    }
    if (!this.adapters.has(defaultAdapterId)) throw new Error(`默认画面字适配器未登记：${defaultAdapterId}`);
  }

  get defaultDescriptor() {
    return this.adapters.get(this.defaultAdapterId)!.descriptor;
  }

  get(adapterKey: string): ScreenTextAdapter | undefined {
    return this.adapters.get(adapterKey);
  }

  descriptors(): ReadonlyArray<Readonly<ScreenTextAdapterDescriptor>> {
    return [...this.adapters.values()].map((adapter) => adapter.descriptor);
  }

  resolve(saved: ScreenTextAdapterDescriptor) {
    const adapter = this.adapters.get(saved.adapter);
    if (!adapter || !sameDescriptor(adapter.descriptor, saved)) {
      throw new Error(`画面字适配器未登记或能力快照不匹配：${saved.adapter}`);
    }
    return adapter;
  }
}

export const createDefaultScreenTextAdapterRegistry = () => new ScreenTextAdapterRegistry([
  new DeterministicFakeScreenTextAdapter(),
  new ZeroNetworkCloudApiStub(),
  new ZeroNetworkSelfHostedWorkerStub(),
  new ScreenTextLocalOcrSidecarAdapter(new ZeroNetworkLocalOcrSidecarTransport()),
], 'screen_text_deterministic_fake');
