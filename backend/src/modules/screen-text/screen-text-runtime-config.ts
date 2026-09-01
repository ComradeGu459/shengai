import type {
  SystemControlScreenTextRuntimeConfig,
  SystemControlScreenTextRuntimeConfigInput,
} from '@qimao-terms-cloud/contracts';

/** 8GB Worker 的有界抽帧策略：默认延续历史约 1fps / 600 帧。 */
export const SCREEN_TEXT_RUNTIME_CONFIG_PRESET = 'screen_text_openvino_ppocrv6_small' as const;
export const SCREEN_TEXT_FRAME_INTERVAL_MIN_MS = 250;
export const SCREEN_TEXT_FRAME_INTERVAL_MAX_MS = 10_000;
export const SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS = 1_000;
export const SCREEN_TEXT_MAX_FRAMES_MIN = 1;
export const SCREEN_TEXT_MAX_FRAMES_MAX = 600;
export const SCREEN_TEXT_MAX_FRAMES_DEFAULT = 600;

export const defaultScreenTextRuntimeConfig: Readonly<SystemControlScreenTextRuntimeConfig> = Object.freeze({
  preset: SCREEN_TEXT_RUNTIME_CONFIG_PRESET,
  frameIntervalMs: SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS,
  maxFramesPerEpisode: SCREEN_TEXT_MAX_FRAMES_DEFAULT,
});

export const resolveScreenTextRuntimeConfig = (
  adapterKey: string,
  input: SystemControlScreenTextRuntimeConfigInput | SystemControlScreenTextRuntimeConfig | Record<string, unknown> | null | undefined,
): Readonly<SystemControlScreenTextRuntimeConfig> | null => {
  if (adapterKey !== SCREEN_TEXT_RUNTIME_CONFIG_PRESET) {
    if (input !== undefined && input !== null) throw new Error('只有 screen_text_openvino_ppocrv6_small 可以配置抽帧 runtimeConfig。');
    return null;
  }
  const requested = (input ?? {}) as Record<string, unknown>;
  const preset = requested.preset ?? SCREEN_TEXT_RUNTIME_CONFIG_PRESET;
  const frameIntervalValue = requested.frameIntervalMs ?? SCREEN_TEXT_FRAME_INTERVAL_DEFAULT_MS;
  const maxFramesValue = requested.maxFramesPerEpisode ?? SCREEN_TEXT_MAX_FRAMES_DEFAULT;
  const frameIntervalMs = typeof frameIntervalValue === 'number' ? frameIntervalValue : NaN;
  const maxFramesPerEpisode = typeof maxFramesValue === 'number' ? maxFramesValue : NaN;
  if (preset !== SCREEN_TEXT_RUNTIME_CONFIG_PRESET
    || !Number.isSafeInteger(frameIntervalMs)
    || frameIntervalMs < SCREEN_TEXT_FRAME_INTERVAL_MIN_MS
    || frameIntervalMs > SCREEN_TEXT_FRAME_INTERVAL_MAX_MS
    || !Number.isSafeInteger(maxFramesPerEpisode)
    || maxFramesPerEpisode < SCREEN_TEXT_MAX_FRAMES_MIN
    || maxFramesPerEpisode > SCREEN_TEXT_MAX_FRAMES_MAX) {
    throw new Error(`screen-text 抽帧 runtimeConfig 必须满足 frameIntervalMs ${SCREEN_TEXT_FRAME_INTERVAL_MIN_MS}-${SCREEN_TEXT_FRAME_INTERVAL_MAX_MS}、maxFramesPerEpisode ${SCREEN_TEXT_MAX_FRAMES_MIN}-${SCREEN_TEXT_MAX_FRAMES_MAX}。`);
  }
  const keys = Object.keys(requested);
  if (keys.some((key) => !['preset', 'frameIntervalMs', 'maxFramesPerEpisode'].includes(key))) {
    throw new Error('screen-text 抽帧 runtimeConfig 含未知字段。');
  }
  return Object.freeze({
    preset: SCREEN_TEXT_RUNTIME_CONFIG_PRESET,
    frameIntervalMs,
    maxFramesPerEpisode,
  });
};
