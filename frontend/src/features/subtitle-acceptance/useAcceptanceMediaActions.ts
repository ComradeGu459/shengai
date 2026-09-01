import { useCallback, type RefObject } from 'react';
import type { AcceptanceEpisode, AcceptanceSessionDetail } from '@qimao-terms-cloud/contracts';
import { createAcceptancePlaybackGrant, selectAcceptanceVideo, type AcceptancePlaybackGrant } from './api.js';
import { clampMs, commandKey, normalizeCommandError } from './model.js';
import type { CommandSpec } from './workspaceSupport.js';

interface UseAcceptanceMediaActionsProps {
  projectId: string;
  currentSession: AcceptanceSessionDetail | undefined;
  episode: AcceptanceEpisode | undefined;
  canWrite: boolean;
  currentTimeMs: number;
  mediaDurationMs: number | null;
  durationMs: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  latestMediaIdentityRef: RefObject<string>;
  latestMediaRevisionRef: RefObject<number | null>;
  playbackRequestTokenRef: RefObject<number>;
  playbackRequestActiveRef: RefObject<boolean>;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoStageRef: RefObject<HTMLDivElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  executeCommand: (spec: CommandSpec) => Promise<unknown>;
  resetMediaState: () => void;
  setPlayback: (value: AcceptancePlaybackGrant | null) => void;
  setPlaybackPending: (value: boolean) => void;
  setPlaybackError: (value: string | null) => void;
  setMediaFailure: (value: string | null) => void;
  setCurrentTimeMs: (value: number) => void;
  setMediaDurationMs: (value: number | null) => void;
  setIsPlaying: (value: boolean) => void;
  setVolume: (value: number) => void;
  setMuted: (value: boolean) => void;
  setPlaybackRate: (value: number) => void;
}

export const useAcceptanceMediaActions = ({
  projectId, currentSession, episode, canWrite, currentTimeMs, mediaDurationMs, durationMs, volume, muted,
  playbackRate, latestMediaIdentityRef, latestMediaRevisionRef, playbackRequestTokenRef,
  playbackRequestActiveRef, videoRef, videoStageRef, titleRef, executeCommand, resetMediaState,
  setPlayback, setPlaybackPending, setPlaybackError, setMediaFailure, setCurrentTimeMs, setMediaDurationMs,
  setIsPlaying, setVolume, setMuted, setPlaybackRate,
}: UseAcceptanceMediaActionsProps) => {
  const selectVideo = useCallback((assetId: string) => {
    if (!canWrite || !currentSession || !episode) return;
    resetMediaState();
    const body = { expectedSessionRevision: currentSession.revision, expectedEpisodeRevision: episode.revision, assetId };
    const key = commandKey('select-video');
    void executeCommand({ label: '选择视频版本', key, body, focus: titleRef.current, execute: () => selectAcceptanceVideo(projectId, currentSession.id, episode.episodeNumber, body, key) });
  }, [canWrite, currentSession, episode, executeCommand, projectId, resetMediaState, titleRef]);

  const mediaLimitMs = mediaDurationMs ?? episode?.authoritativeDurationMs ?? durationMs;

  const seekMedia = useCallback((value: number) => {
    const next = clampMs(value, mediaDurationMs ?? episode?.authoritativeDurationMs ?? durationMs);
    setCurrentTimeMs(next);
    const video = videoRef.current;
    if (video && Number.isFinite(video.duration)) video.currentTime = next / 1000;
  }, [durationMs, episode?.authoritativeDurationMs, mediaDurationMs, setCurrentTimeMs, videoRef]);

  const togglePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setMediaFailure('媒体播放失败，请检查短时授权或重新获取播放授权。'));
    else video.pause();
  }, [setMediaFailure, videoRef]);

  const updateVolume = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0, value));
    setVolume(next);
    setMuted(next === 0);
    if (videoRef.current) {
      videoRef.current.volume = next;
      videoRef.current.muted = next === 0;
    }
  }, [setMuted, setVolume, videoRef]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (videoRef.current) videoRef.current.muted = nextMuted;
  }, [muted, setMuted, videoRef]);

  const updatePlaybackRate = useCallback((value: number) => {
    setPlaybackRate(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  }, [setPlaybackRate, videoRef]);

  const toggleFullscreen = useCallback(() => {
    const stage = videoStageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    const request = stage.requestFullscreen?.();
    if (request) void request.catch(() => setMediaFailure('浏览器拒绝了全屏请求，请使用播放器放大按钮。'));
  }, [setMediaFailure, videoStageRef]);

  const requestPlayback = useCallback(() => {
    const assetId = episode?.selectedVideoAssetId;
    if (!currentSession || !episode || !assetId || playbackRequestActiveRef.current) return;
    resetMediaState();
    const requestToken = playbackRequestTokenRef.current + 1;
    playbackRequestTokenRef.current = requestToken;
    playbackRequestActiveRef.current = true;
    setPlaybackPending(true);
    const requestIdentity = latestMediaIdentityRef.current;
    const requestRevision = currentSession.revision;
    setPlaybackError(null);
    void createAcceptancePlaybackGrant(projectId, currentSession.id, episode.episodeNumber, { expectedSessionRevision: requestRevision })
      .then((grant) => {
        if (requestToken !== playbackRequestTokenRef.current) return;
        if (requestIdentity !== latestMediaIdentityRef.current || requestRevision !== latestMediaRevisionRef.current) {
          playbackRequestActiveRef.current = false;
          setPlaybackPending(false);
          return;
        }
        playbackRequestActiveRef.current = false;
        setPlaybackPending(false);
        setPlayback(grant);
        setMediaFailure(null);
        setCurrentTimeMs(0);
        setMediaDurationMs(null);
      })
      .catch((error) => {
        if (requestToken !== playbackRequestTokenRef.current) return;
        if (requestIdentity !== latestMediaIdentityRef.current || requestRevision !== latestMediaRevisionRef.current) {
          playbackRequestActiveRef.current = false;
          setPlaybackPending(false);
          return;
        }
        playbackRequestActiveRef.current = false;
        setPlaybackPending(false);
        const normalized = normalizeCommandError(error);
        setPlaybackError(`${normalized.message}${normalized.requestId ? `（${normalized.requestId}）` : ''}`);
      });
  }, [currentSession, episode, latestMediaIdentityRef, latestMediaRevisionRef, playbackRequestActiveRef, playbackRequestTokenRef, projectId, resetMediaState, setCurrentTimeMs, setMediaDurationMs, setMediaFailure, setPlayback, setPlaybackError, setPlaybackPending]);

  return { selectVideo, mediaLimitMs, seekMedia, togglePlayback, updateVolume, toggleMute, updatePlaybackRate, toggleFullscreen, requestPlayback };
};
