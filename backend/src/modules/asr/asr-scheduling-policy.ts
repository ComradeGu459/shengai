export interface AsrSchedulingPolicy {
  version: string;
  source: 'development_default';
  maxGlobalInFlight: number;
  maxPerProjectInFlight: number;
  maxStartsPerWindow: number | null;
  rateWindowMs: number;
}

export interface AsrSchedulingPolicyReader {
  read(): Promise<Readonly<AsrSchedulingPolicy>>;
}

export const developmentAsrSchedulingPolicy = Object.freeze<AsrSchedulingPolicy>({
  version: 'development-default-v1',
  source: 'development_default',
  maxGlobalInFlight: 20,
  maxPerProjectInFlight: 20,
  maxStartsPerWindow: null,
  rateWindowMs: 60_000,
});

export class DevelopmentAsrSchedulingPolicyReader implements AsrSchedulingPolicyReader {
  async read() {
    return developmentAsrSchedulingPolicy;
  }
}
