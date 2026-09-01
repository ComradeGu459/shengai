import type { AcceptanceCue, AcceptanceEpisode, AcceptanceIssue } from '@qimao-terms-cloud/contracts';
import type { Dispatch, KeyboardEvent, MouseEvent, RefObject, SetStateAction } from 'react';
import type { AcceptancePlaybackGrant } from './api.js';
import { clampMs, cuePercent, describeVideoRole, formatMs, trackLabels } from './model.js';
import styles from './SubtitleAcceptanceWorkspace.module.css';
import mediaStyles from './AcceptanceMediaTimeline.module.css';

interface AcceptanceMediaTimelineProps {
  episode: AcceptanceEpisode | undefined;
  selectedVideo: AcceptanceEpisode['availableVideos'][number] | null;
  visibleCues: AcceptanceCue[];
  issues: AcceptanceIssue[];
  currentEpisodeNumber: number;
  durationMs: number;
  mediaLimitMs: number;
  currentTimeMs: number;
  mediaDurationMs: number | null;
  isPlaying: boolean;
  volume: number;
  muted: boolean;
  playbackRate: number;
  mediaExpanded: boolean;
  playback: AcceptancePlaybackGrant | null;
  playbackPending: boolean;
  playbackError: string | null;
  mediaFailure: string | null;
  selectedCueIds: string[];
  writeLocked: boolean;
  titleRef: RefObject<HTMLHeadingElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoStageRef: RefObject<HTMLDivElement | null>;
  setMediaDurationMs: (value: number | null) => void;
  setIsPlaying: (value: boolean) => void;
  setCurrentTimeMs: (value: number) => void;
  setMediaFailure: (value: string | null) => void;
  setMediaExpanded: Dispatch<SetStateAction<boolean>>;
  requestPlayback: () => void;
  togglePlayback: () => void;
  seekMedia: (value: number) => void;
  updateVolume: (value: number) => void;
  toggleMute: () => void;
  updatePlaybackRate: (value: number) => void;
  toggleFullscreen: () => void;
  selectVideo: (assetId: string) => void;
  undoLatest: (direction: 'undo' | 'redo') => void;
  addCue: (track: 'dialogue' | 'screen_text', focus?: HTMLElement | null) => void;
  chooseCue: (cue: AcceptanceCue, event?: MouseEvent | KeyboardEvent) => void;
  moveCue: (cue: AcceptanceCue, deltaMs: number) => void;
}

export const AcceptanceMediaTimeline = ({
  episode, selectedVideo, visibleCues, issues, currentEpisodeNumber, durationMs, mediaLimitMs,
  currentTimeMs, mediaDurationMs, isPlaying, volume, muted, playbackRate, mediaExpanded, playback,
  playbackPending, playbackError, mediaFailure, selectedCueIds, writeLocked, titleRef, videoRef, videoStageRef,
  setMediaDurationMs, setIsPlaying, setCurrentTimeMs, setMediaFailure, setMediaExpanded, requestPlayback,
  togglePlayback, seekMedia, updateVolume, toggleMute, updatePlaybackRate, toggleFullscreen, selectVideo,
  undoLatest, addCue, chooseCue, moveCue,
}: AcceptanceMediaTimelineProps) => (
  <main className={styles.centerPane} aria-label="播放器与共享时间轴">
    <section className={mediaStyles.playerPanel}>
      <div className={mediaStyles.videoToolbar}>
        <div className={mediaStyles.videoVersions} role="group" aria-label="视频版本">
          {(episode?.availableVideos ?? []).map((video) => (
            <button key={video.assetId} type="button" className={video.assetId === episode?.selectedVideoAssetId ? mediaStyles.active : ''} disabled={writeLocked || video.assetId === episode?.selectedVideoAssetId} onClick={() => selectVideo(video.assetId)}>
              {describeVideoRole(video.role)}
            </button>
          ))}
        </div>
        <span>{selectedVideo ? `当前 ${describeVideoRole(selectedVideo.role)}` : '无可用视频'}</span>
      </div>
      <div ref={videoStageRef} className={`${mediaStyles.videoStage} ${mediaExpanded ? mediaStyles.videoStageExpanded : ''}`}>
        <div className={mediaStyles.videoViewport} data-primary-viewport="9:16" aria-label="9:16 竖屏安全画面">
          {playback?.url ? (
            <video
              ref={videoRef}
              src={playback.url}
              controls={false}
              muted={muted}
              onLoadedMetadata={(event) => {
                const nextDuration = Number.isFinite(event.currentTarget.duration) ? Math.round(event.currentTarget.duration * 1000) : null;
                setMediaDurationMs(nextDuration);
                event.currentTarget.volume = volume;
                event.currentTarget.playbackRate = playbackRate;
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(event) => setCurrentTimeMs(Math.round(event.currentTarget.currentTime * 1000))}
              onError={() => setMediaFailure('媒体解码失败或授权已过期，请重新获取短时播放授权。')}
              aria-label={`第 ${currentEpisodeNumber} 集验收视频`}
            />
          ) : (
            <div className={mediaStyles.videoPlaceholder}><strong>未获取短时播放授权</strong><p>只显示真实可用 Asset；360p/1080p 代理未生成时不会伪造成可播放版本。</p></div>
          )}
          {visibleCues.filter((cue) => cue.startMs <= currentTimeMs && cue.endMs >= currentTimeMs).map((cue) => (
            <span key={cue.id} className={`${mediaStyles.overlayCue} ${cue.track === 'screen_text' ? mediaStyles.overlayScreen : ''}`}>{cue.text}</span>
          ))}
        </div>
      </div>
      <div className={mediaStyles.playerControls} aria-label="播放器控制">
        <button type="button" onClick={requestPlayback} disabled={!episode?.selectedVideoAssetId || playbackPending}>{playbackPending ? '获取中…' : '获取播放授权'}</button>
        <button type="button" onClick={togglePlayback} disabled={!playback?.url}>{isPlaying ? '暂停' : '播放'}</button>
        <label className={mediaStyles.progressControl}><span>播放进度</span><input type="range" min="0" max={mediaLimitMs} step="40" value={Math.min(mediaLimitMs, currentTimeMs)} onChange={(event) => seekMedia(Number(event.target.value))} aria-label="播放进度" disabled={!playback?.url} /></label>
        <span className={mediaStyles.mediaTime} aria-label="播放时间">{formatMs(currentTimeMs)} / {formatMs(mediaDurationMs ?? episode?.authoritativeDurationMs)}</span>
        <button type="button" onClick={() => seekMedia(currentTimeMs - 40)} disabled={!playback?.url}>-40 ms</button><button type="button" onClick={() => seekMedia(currentTimeMs + 40)} disabled={!playback?.url}>+40 ms</button>
        <button type="button" onClick={() => seekMedia(currentTimeMs - 1_000)} disabled={!playback?.url}>-1 秒</button><button type="button" onClick={() => seekMedia(currentTimeMs + 1_000)} disabled={!playback?.url}>+1 秒</button>
        <button type="button" onClick={toggleMute} disabled={!playback?.url}>{muted ? '取消静音' : '静音'}</button>
        <label className={mediaStyles.volumeControl}><span>音量</span><input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(event) => updateVolume(Number(event.target.value))} aria-label="音量" disabled={!playback?.url} /></label>
        <label className={mediaStyles.rateControl}>倍速<select value={playbackRate} onChange={(event) => updatePlaybackRate(Number(event.target.value))} aria-label="播放倍速" disabled={!playback?.url}>{[0.75, 1, 1.25, 1.5, 2].map((rate) => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
        <button type="button" onClick={() => setMediaExpanded((value) => !value)} aria-pressed={mediaExpanded}>{mediaExpanded ? '还原播放器' : '放大播放器'}</button><button type="button" onClick={toggleFullscreen} disabled={!playback?.url}>全屏</button>
      </div>
      {(playbackError || mediaFailure) && <div className={styles.inlineError} role="alert">{playbackError ?? mediaFailure}</div>}
    </section>
    <section className={mediaStyles.timelinePanel} aria-label="共享多轨时间轴" style={{ ['--playhead' as string]: cuePercent(currentTimeMs, durationMs) }}>
      <div className={mediaStyles.timelineToolbar}><button type="button" onClick={() => undoLatest('undo')} disabled={writeLocked}>撤销</button><button type="button" onClick={() => undoLatest('redo')} disabled={writeLocked}>恢复</button><button type="button" onClick={() => addCue('dialogue', titleRef.current)} disabled={writeLocked}>新增台词</button><button type="button" onClick={() => addCue('screen_text', titleRef.current)} disabled={writeLocked}>新增画面字</button><span>已选 {selectedCueIds.length} 条 · Ctrl/Shift 多选</span></div>
      <div className={mediaStyles.timelineScroll}><div className={styles.playhead} aria-hidden="true" /><div className={mediaStyles.timelineLane}><span>视频</span><div className={mediaStyles.videoRail} /></div>
        {(['dialogue', 'screen_text'] as const).map((track) => {
          const trackCues = visibleCues.filter((cue) => cue.track === track);
          if (track === 'screen_text' && trackCues.length === 0) return null;
          return <div key={track} className={mediaStyles.timelineLane}><span>{trackLabels[track]}</span><div className={mediaStyles.cueRail}>{trackCues.map((cue) => <button key={cue.id} type="button" className={`${mediaStyles.cueBlock} ${track === 'screen_text' ? mediaStyles.screenCue : ''} ${selectedCueIds.includes(cue.id) ? mediaStyles.selectedCue : ''}`} style={{ left: cuePercent(cue.startMs, durationMs), width: cuePercent(cue.endMs - cue.startMs, durationMs) }} draggable={!writeLocked} onClick={(event) => chooseCue(cue, event)} onDragEnd={(event) => { const rail = event.currentTarget.closest(`.${mediaStyles.cueRail}`)?.getBoundingClientRect(); if (!rail) return; const targetMs = clampMs(Math.round(((event.clientX - rail.left) / rail.width) * durationMs), episode?.authoritativeDurationMs); moveCue(cue, targetMs - cue.startMs); }}>{cue.text}</button>)}</div></div>;
        })}
        <div className={mediaStyles.timelineLane}><span>问题</span><div className={mediaStyles.cueRail}>{issues.map((issue) => issue.timeMs !== null && <button key={issue.id} type="button" className={mediaStyles.issueMarker} style={{ left: cuePercent(issue.timeMs, durationMs) }} onClick={() => setCurrentTimeMs(issue.timeMs ?? 0)}>{issue.severity === 'error' ? '!' : '?'}</button>)}</div></div>
      </div>
    </section>
  </main>
);
