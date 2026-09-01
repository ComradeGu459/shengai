import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import type {
  AcceptanceCue,
  AcceptanceSessionDetail,
  AcceptanceTrack,
} from '@qimao-terms-cloud/contracts';

import {
  createAcceptanceRework,
  createAcceptanceSession,
  type AcceptancePlaybackGrant,
  type AcceptanceRelease,
} from './api.js';
import {
  commandKey,
  normalizeCommandError,
  stableStringify,
  trackLabels,
} from './model.js';
import styles from './SubtitleAcceptanceWorkspace.module.css';
import { useAcceptanceQueries } from './useAcceptanceQueries.js';
import {
  isInputTarget,
  useFocusTrap,
  writableStatus,
  type CommandError,
  type CommandIntent,
  type CommandSpec,
  type CueFilter,
  type EpisodeFilter,
  type PreflightState,
  type SaveState,
  type SidebarTab,
} from './workspaceSupport.js';
import { AcceptanceDialogs } from './AcceptanceDialogs.js';
import { AcceptanceEditorPanel } from './AcceptanceEditorPanel.js';
import { AcceptanceEpisodeQueue } from './AcceptanceEpisodeQueue.js';
import { AcceptanceMediaTimeline } from './AcceptanceMediaTimeline.js';
import { AcceptanceWorkspaceChrome } from './AcceptanceWorkspaceChrome.js';
import { useAcceptanceCueActions } from './useAcceptanceCueActions.js';
import { useAcceptanceMediaActions } from './useAcceptanceMediaActions.js';
import { useAcceptancePreflightActions } from './useAcceptancePreflightActions.js';
import { useAcceptanceIssueActions } from './useAcceptanceIssueActions.js';

export const SubtitleAcceptanceWorkspace = () => {
  const params = useParams();
  const projectId = params.projectId ?? '';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const titleRef = useRef<HTMLHeadingElement>(null);
  const preflightTriggerRef = useRef<HTMLButtonElement>(null);
  const preflightCloseRef = useRef<HTMLButtonElement>(null);
  const preflightPanelRef = useRef<HTMLDivElement>(null);
  const preflightRetryRef = useRef<HTMLButtonElement>(null);
  const preflightTitleRef = useRef<HTMLHeadingElement>(null);
  const deletePanelRef = useRef<HTMLDivElement>(null);
  const deleteSafeRef = useRef<HTMLButtonElement>(null);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const trackChoicePanelRef = useRef<HTMLDivElement>(null);
  const trackChoiceOpenTriggerRef = useRef<HTMLButtonElement>(null);
  const trackChoiceTriggerRef = useRef<HTMLButtonElement>(null);
  const issuePanelRef = useRef<HTMLFormElement>(null);
  const issueCancelRef = useRef<HTMLButtonElement>(null);
  const issueTriggerRef = useRef<HTMLButtonElement>(null);
  const reworkPanelRef = useRef<HTMLDivElement>(null);
  const reworkCancelRef = useRef<HTMLButtonElement>(null);
  const reworkTriggerRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStageRef = useRef<HTMLDivElement>(null);
  const selectionAnchorRef = useRef<string | null>(null);
  const activeSessionIdRef = useRef('');
  const previousSessionIdRef = useRef('');
  const preflightOpenRef = useRef(false);
  const preflightRequestTokenRef = useRef(0);
  const preflightSessionIdRef = useRef('');
  const mediaIdentityRef = useRef('');
  const latestMediaIdentityRef = useRef('');
  const latestMediaRevisionRef = useRef<number | null>(null);
  const playbackRequestTokenRef = useRef(0);
  const playbackRequestActiveRef = useRef(false);

  const sessionId = searchParams.get('sessionId') ?? '';
  const episodeNumberFromUrl = Number(searchParams.get('episode') ?? '1');
  const selectedEpisodeNumber = Number.isFinite(episodeNumberFromUrl) && episodeNumberFromUrl > 0
    ? episodeNumberFromUrl
    : 1;

  const [episodeFilter, setEpisodeFilter] = useState<EpisodeFilter>('all');
  const [cueFilter, setCueFilter] = useState<CueFilter>('all');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('subtitles');
  const [selectedCueIds, setSelectedCueIds] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<Array<Pick<AcceptanceCue, 'track' | 'startMs' | 'endMs' | 'text'>>>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [mediaDurationMs, setMediaDurationMs] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const [playback, setPlayback] = useState<AcceptancePlaybackGrant | null>(null);
  const [playbackPending, setPlaybackPending] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [mediaFailure, setMediaFailure] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ cueId: string; text: string; start: string; end: string } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [lastError, setLastError] = useState<CommandError | null>(null);
  const [commandIntent, setCommandIntent] = useState<CommandIntent | null>(null);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [preflightState, setPreflightState] = useState<PreflightState>({ kind: 'idle' });
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [trackChoice, setTrackChoice] = useState<null | { mode: 'add' | 'paste' }>(null);
  const [issueDialog, setIssueDialog] = useState(false);
  const [issueDraft, setIssueDraft] = useState({ note: '', track: 'dialogue' as AcceptanceTrack, cueId: '' });
  const [issueReasons, setIssueReasons] = useState<Record<string, string>>({});
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reworkReason, setReworkReason] = useState('');
  const [reworkTracks, setReworkTracks] = useState<AcceptanceTrack[]>(['dialogue']);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [selectedPreEditReleaseId, setSelectedPreEditReleaseId] = useState('');
  const [selectedScreenTextReleaseId, setSelectedScreenTextReleaseId] = useState<string>('latest');
  const {
    projectQuery, sessionsQuery, currentSession, currentEpisodeNumber, eventsQuery, releasesQuery,
    reworkQuery, preEditReleasesQuery, screenTextReleasesQuery, episodeDetail, episode, cues,
    visibleCues, issues, openIssueCount, readOnly, source, sourceRelease, passedEpisodeCount,
  } = useAcceptanceQueries({ projectId, sessionId, selectedEpisodeNumber, cueFilter, createSessionOpen });
  const selectedCues = selectedCueIds
    .map((id) => cues.find((cue) => cue.id === id))
    .filter((cue): cue is AcceptanceCue => Boolean(cue));
  const selectedCue = selectedCues.length === 1 ? (selectedCues[0] ?? null) : null;
  const commandActive = Boolean(commandIntent);
  const commandBlocked = readOnly || commandActive || saveState === 'saving';
  const writeLocked = commandBlocked || saveState === 'dirty';
  const durationMs = episode?.authoritativeDurationMs ?? Math.max(60_000, ...cues.map((cue) => cue.endMs), 60_000);
  const selectedVideo = episode?.availableVideos.find((video) => video.assetId === episode.selectedVideoAssetId) ?? null;
  const mediaIdentity = `${sessionId}|${currentEpisodeNumber}|${episode?.selectedVideoAssetId ?? ''}`;
  latestMediaIdentityRef.current = mediaIdentity;
  latestMediaRevisionRef.current = currentSession?.revision ?? null;

  const updateSearch = useCallback((patch: Record<string, string | number | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: false });
  }, [searchParams, setSearchParams]);

  const refreshAuthority = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['subtitle-acceptance', projectId] });
  }, [projectId, queryClient]);

  const focusLater = useCallback((element?: HTMLElement | null) => {
    window.setTimeout(() => (element ?? titleRef.current)?.focus(), 0);
  }, []);

  const resetMediaState = useCallback(() => {
    playbackRequestTokenRef.current += 1;
    playbackRequestActiveRef.current = false;
    setPlaybackPending(false);
    videoRef.current?.pause();
    if (videoRef.current) {
      try {
        videoRef.current.currentTime = 0;
      } catch {
        // 视频尚未加载时浏览器可能拒绝设置 currentTime，状态清理仍然有效。
      }
    }
    setPlayback(null);
    setPlaybackError(null);
    setMediaFailure(null);
    setMediaDurationMs(null);
    setCurrentTimeMs(0);
    setIsPlaying(false);
  }, []);

  const closePreflight = useCallback(() => {
    if (commandActive) return;
    preflightRequestTokenRef.current += 1;
    setPreflightOpen(false);
    setPreflightState({ kind: 'idle' });
    focusLater(preflightTriggerRef.current);
  }, [commandActive, focusLater]);

  const closeDeleteDialog = useCallback(() => {
    if (commandActive) return;
    setDeleteDialog(false);
    focusLater(deleteTriggerRef.current);
  }, [commandActive, focusLater]);

  const closeTrackChoice = useCallback(() => {
    if (commandActive) return;
    setTrackChoice(null);
    focusLater(trackChoiceOpenTriggerRef.current ?? titleRef.current);
  }, [commandActive, focusLater]);

  const closeIssueDialog = useCallback(() => {
    if (commandActive) return;
    setIssueDialog(false);
    focusLater(issueTriggerRef.current);
  }, [commandActive, focusLater]);

  const closeReworkDialog = useCallback(() => {
    if (commandActive) return;
    setReworkOpen(false);
    focusLater(reworkTriggerRef.current);
  }, [commandActive, focusLater]);

  useFocusTrap({
    open: preflightOpen,
    containerRef: preflightPanelRef,
    initialFocusRef: preflightCloseRef,
    onClose: closePreflight,
    locked: commandActive,
  });
  useFocusTrap({
    open: deleteDialog,
    containerRef: deletePanelRef,
    initialFocusRef: deleteSafeRef,
    onClose: closeDeleteDialog,
    locked: commandActive,
  });
  useFocusTrap({
    open: Boolean(trackChoice),
    containerRef: trackChoicePanelRef,
    initialFocusRef: trackChoiceTriggerRef,
    onClose: closeTrackChoice,
    locked: commandActive,
  });
  useFocusTrap({
    open: issueDialog,
    containerRef: issuePanelRef,
    initialFocusRef: issueCancelRef,
    onClose: closeIssueDialog,
    locked: commandActive,
  });
  useFocusTrap({
    open: reworkOpen,
    containerRef: reworkPanelRef,
    initialFocusRef: reworkCancelRef,
    onClose: closeReworkDialog,
    locked: commandActive,
  });

  const leaveBlocked = saveState === 'dirty' || saveState === 'saving' || commandActive;
  const writeIntentBlocked = readOnly || leaveBlocked;
  const announceBlockedIntent = useCallback((intent: string) => {
    setLastError({
      code: readOnly ? 'READ_ONLY_SESSION' : 'UNCOMMITTED_WORK',
      message: readOnly ? '当前会话只读，不能执行写入操作。' : `当前${intent}尚未完成，已阻止离开以保护未提交修改。`,
      requestId: null,
    });
  }, [readOnly]);

  const canLeaveContext = useCallback(() => {
    if (!leaveBlocked) return true;
    announceBlockedIntent('写入');
    return false;
  }, [announceBlockedIntent, leaveBlocked]);

  const navigateToProjectCenter = useCallback((event?: ReactMouseEvent) => {
    if (!canLeaveContext()) {
      event?.preventDefault();
      return;
    }
    navigate('/projects');
  }, [canLeaveContext, navigate]);

  const changeSession = useCallback((nextSessionId: string) => {
    if (!canLeaveContext()) return;
    updateSearch({ sessionId: nextSessionId, episode: 1 });
  }, [canLeaveContext, updateSearch]);

  const changeEpisode = useCallback((nextEpisodeNumber: number) => {
    if (!canLeaveContext()) return;
    updateSearch({ episode: nextEpisodeNumber });
  }, [canLeaveContext, updateSearch]);

  const executeCommand = useCallback(async (spec: CommandSpec) => {
    const intent: CommandIntent = { ...spec, bodyText: stableStringify(spec.body), pending: true };
    setCommandIntent(intent);
    setLastError(null);
    try {
      const result = await spec.execute();
      setCommandIntent(null);
      setSaveState('saved');
      await refreshAuthority();
      await spec.onSuccess?.(result);
      focusLater(spec.focus);
    } catch (error) {
      const normalized = normalizeCommandError(error);
      const failureFocus = spec.errorFocus ?? spec.focus;
      if (normalized.deterministic) {
        setCommandIntent(null);
        setLastError(normalized);
        await refreshAuthority();
        focusLater(failureFocus);
        return;
      }
      setCommandIntent({ ...intent, pending: false, error: normalized });
      setLastError(normalized);
      focusLater(failureFocus);
    }
  }, [focusLater, refreshAuthority]);

  const canWrite = Boolean(projectId && currentSession && episode && !writeLocked);
  const canSave = Boolean(projectId && currentSession && episode && !commandBlocked);

  useEffect(() => {
    preflightOpenRef.current = preflightOpen;
  }, [preflightOpen]);

  useEffect(() => {
    activeSessionIdRef.current = sessionId;
    if (previousSessionIdRef.current === sessionId) return;
    previousSessionIdRef.current = sessionId;
    preflightRequestTokenRef.current += 1;
    preflightSessionIdRef.current = '';
    setPreflightOpen(false);
    setPreflightState({ kind: 'idle' });
    setSelectedCueIds([]);
    selectionAnchorRef.current = null;
  }, [sessionId]);

  useEffect(() => {
    if (!mediaIdentityRef.current) {
      mediaIdentityRef.current = mediaIdentity;
      return;
    }
    if (mediaIdentityRef.current === mediaIdentity) return;
    mediaIdentityRef.current = mediaIdentity;
    resetMediaState();
  }, [mediaIdentity, resetMediaState]);

  useEffect(() => {
    const items = sessionsQuery.data?.items ?? [];
    if (!items.length || sessionId) return;
    const target = items.find(writableStatus) ?? items[0];
    if (target) updateSearch({ sessionId: target.id, episode: 1 });
  }, [sessionId, sessionsQuery.data, updateSearch]);

  useEffect(() => {
    const validSession = sessionsQuery.data?.items.some((session) => session.id === sessionId);
    if (!sessionId || sessionsQuery.isLoading || validSession !== false) return;
    const target = sessionsQuery.data?.items.find(writableStatus) ?? sessionsQuery.data?.items[0];
    if (target) updateSearch({ sessionId: target.id, episode: 1 });
  }, [sessionId, sessionsQuery.data, sessionsQuery.isLoading, updateSearch]);

  const {
    draftDirty, saveCue, addCue, copySelection, cutSelection, pasteClipboard, deleteSelection,
    moveCue, chooseCue, undoLatest,
  } = useAcceptanceCueActions({
    projectId,
    currentSession,
    episode,
    visibleCues,
    selectedCues,
    selectedCue,
    clipboard,
    currentTimeMs,
    canWrite,
    canSave,
    saveState,
    draft,
    events: eventsQuery.data?.items ?? [],
    executeCommand,
    setDraft,
    setSaveState,
    setLastError,
    setSelectedCueIds,
    setClipboard,
    setCueFilter,
    setCurrentTimeMs,
    setDeleteDialog,
    titleRef,
    deleteSafeRef,
    deleteTriggerRef,
    selectionAnchorRef,
    focusLater,
  });

  const { passCurrentEpisode, openPreflight, passPreflightEligible, goToDeliveryConfirmation } = useAcceptancePreflightActions({
    projectId,
    currentSession,
    episode,
    canWrite,
    preflightOpen,
    preflightState,
    saveState,
    commandActive,
    activeSessionIdRef,
    preflightOpenRef,
    preflightRequestTokenRef,
    preflightSessionIdRef,
    preflightTitleRef,
    preflightRetryRef,
    titleRef,
    executeCommand,
    focusLater,
    updateSearch,
    navigate,
    setPreflightOpen,
    setPreflightState,
  });
  const { createIssue, resolveIssue } = useAcceptanceIssueActions({
    projectId, currentSession, episode, canWrite, currentTimeMs, issueDraft, issueReasons,
    executeCommand, issueTriggerRef, issueCancelRef, titleRef, setIssueDialog, setSidebarTab, setIssueDraft,
  });
  const {
    selectVideo, mediaLimitMs, seekMedia, togglePlayback, updateVolume, toggleMute,
    updatePlaybackRate, toggleFullscreen, requestPlayback,
  } = useAcceptanceMediaActions({
    projectId,
    currentSession,
    episode,
    canWrite,
    currentTimeMs,
    mediaDurationMs,
    durationMs,
    volume,
    muted,
    playbackRate,
    latestMediaIdentityRef,
    latestMediaRevisionRef,
    playbackRequestTokenRef,
    playbackRequestActiveRef,
    videoRef,
    videoStageRef,
    titleRef,
    executeCommand,
    resetMediaState,
    setPlayback,
    setPlaybackPending,
    setPlaybackError,
    setMediaFailure,
    setCurrentTimeMs,
    setMediaDurationMs,
    setIsPlaying,
    setVolume,
    setMuted,
    setPlaybackRate,
  });
  const createNewSession = useCallback(() => {
    if (!projectQuery.data?.project) return;
    const body = {
      expectedProjectVersion: projectQuery.data.project.version,
      ...(selectedPreEditReleaseId ? { preEditReleaseId: selectedPreEditReleaseId } : {}),
      ...(selectedScreenTextReleaseId === 'none' ? { screenTextReleaseId: null } : selectedScreenTextReleaseId !== 'latest' ? { screenTextReleaseId: selectedScreenTextReleaseId } : {}),
    };
    const key = commandKey('create-session');
    void executeCommand({
      label: '新建验收会话',
      key,
      body,
      focus: titleRef.current,
      execute: () => createAcceptanceSession(projectId, body, key),
      onSuccess: async (result) => {
        await queryClient.invalidateQueries({ queryKey: ['subtitle-acceptance', projectId, 'sessions'] });
        const created = result as { session?: AcceptanceSessionDetail };
        if (created.session) updateSearch({ sessionId: created.session.id, episode: created.session.episodes[0]?.episodeNumber ?? 1 });
        setCreateSessionOpen(false);
      },
    });
  }, [executeCommand, projectId, projectQuery.data?.project, queryClient, selectedPreEditReleaseId, selectedScreenTextReleaseId]);

  const sourceQueryError = useCallback((error: unknown) => {
    if (!error) return null;
    return error instanceof Error ? error.message : '上游 Release 读取失败，请重新读取。';
  }, []);

  const createReworkRequest = useCallback(() => {
    if (!currentSession || !reworkReason.trim() || !reworkTracks.length) return;
    const body = {
      expectedSessionRevision: currentSession.revision,
      episodeNumbers: selectedCues.length ? [...new Set(selectedCues.map((cue) => cue.episodeNumber))] : [currentEpisodeNumber],
      tracks: reworkTracks,
      reason: reworkReason.trim(),
    };
    const key = commandKey('rework');
    void executeCommand({
      label: '发起局部返工',
      key,
      body,
      focus: reworkTriggerRef.current,
      errorFocus: reworkCancelRef.current,
      execute: () => createAcceptanceRework(projectId, currentSession.id, body, key),
      onSuccess: () => setReworkOpen(false),
    });
  }, [currentEpisodeNumber, currentSession, executeCommand, projectId, reworkReason, reworkTracks, selectedCues]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeModal = document.querySelector<HTMLElement>('[aria-modal="true"]');
      if (activeModal) {
        const insideModal = event.target instanceof Node && activeModal.contains(event.target);
        if (insideModal) return;
        const key = event.key.toLowerCase();
        const blocksWorkspaceShortcut = event.key === 'Delete'
          || event.key === ' '
          || event.key === 'ArrowLeft'
          || event.key === 'ArrowRight'
          || ['j', 'k', 'l'].includes(key)
          || (event.ctrlKey && ['n', 'c', 'x', 'v', 'z', 'y'].includes(key));
        if (blocksWorkspaceShortcut) event.preventDefault();
        return;
      }
      if (isInputTarget(event.target)) return;
      if (event.ctrlKey && event.key.toLowerCase() === 'n') {
        event.preventDefault();
        if (writeIntentBlocked) {
          announceBlockedIntent('新增字幕');
        } else if (cueFilter === 'all') setTrackChoice({ mode: 'add' });
        else addCue(cueFilter, titleRef.current);
      } else if (event.key === 'Delete') {
        if (selectedCues.length) {
          event.preventDefault();
          if (writeIntentBlocked) announceBlockedIntent('删除字幕');
          else setDeleteDialog(true);
        }
      } else if (event.ctrlKey && event.key.toLowerCase() === 'c') {
        copySelection();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'x') {
        event.preventDefault();
        cutSelection();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        if (writeIntentBlocked) announceBlockedIntent('粘贴字幕');
        else if (cueFilter === 'all') setTrackChoice({ mode: 'paste' });
        else pasteClipboard(cueFilter);
      } else if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undoLatest('undo');
      } else if (event.ctrlKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        undoLatest('redo');
      } else if (event.key === 'ArrowLeft') {
        seekMedia(currentTimeMs - 40);
      } else if (event.key === 'ArrowRight') {
        seekMedia(currentTimeMs + 40);
      } else if (event.key.toLowerCase() === 'j') {
        seekMedia(currentTimeMs - 1_000);
      } else if (event.key.toLowerCase() === 'l') {
        seekMedia(currentTimeMs + 1_000);
      } else if (event.key.toLowerCase() === 'k') {
        videoRef.current?.pause();
      } else if (event.key === ' ') {
        event.preventDefault();
        if (videoRef.current?.paused) void videoRef.current.play().catch(() => undefined);
        else videoRef.current?.pause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [addCue, announceBlockedIntent, copySelection, cueFilter, cutSelection, currentTimeMs, pasteClipboard, seekMedia, selectedCues.length, undoLatest, writeIntentBlocked]);

  const filteredEpisodes = useMemo(() => {
    const episodes = currentSession?.episodes ?? [];
    return episodes.filter((item) => {
      if (episodeFilter === 'screen') return item.screenTextCueCount > 0;
      if (episodeFilter === 'multi') return item.dialogueCueCount > 0 && item.screenTextCueCount > 0;
      if (episodeFilter === 'issues') return item.openErrorCount + item.openWarningCount > 0;
      return true;
    });
  }, [currentSession?.episodes, episodeFilter]);

  if (!projectId) {
    return <div className={styles.emptyState}>缺少项目 ID，请从项目中心重新打开项目。</div>;
  }

  return (
    <section className={styles.workspace} aria-label="视频字幕验收工作台">
      <AcceptanceWorkspaceChrome
        projectId={projectId}
        projectName={projectQuery.data?.project.name ?? '正在读取项目…'}
        projectExists={Boolean(projectQuery.data?.project)}
        sessions={sessionsQuery.data?.items ?? []}
        sessionsLoading={sessionsQuery.isLoading}
        currentSession={currentSession}
        sessionId={sessionId}
        createSessionOpen={createSessionOpen}
        setCreateSessionOpen={setCreateSessionOpen}
        selectedPreEditReleaseId={selectedPreEditReleaseId}
        setSelectedPreEditReleaseId={setSelectedPreEditReleaseId}
        selectedScreenTextReleaseId={selectedScreenTextReleaseId}
        setSelectedScreenTextReleaseId={setSelectedScreenTextReleaseId}
        preEditReleases={preEditReleasesQuery.data?.items ?? []}
        screenTextReleases={screenTextReleasesQuery.data?.items ?? []}
        sourceQueries={{
          preEdit: { pending: preEditReleasesQuery.isPending, error: sourceQueryError(preEditReleasesQuery.error) },
          screenText: { pending: screenTextReleasesQuery.isPending, error: sourceQueryError(screenTextReleasesQuery.error) },
        }}
        retrySourceQueries={() => { void preEditReleasesQuery.refetch(); void screenTextReleasesQuery.refetch(); }}
        sourceRelease={sourceRelease ? { version: sourceRelease.version, cueCount: sourceRelease.cueCount } : undefined}
        readOnly={readOnly}
        saveState={saveState}
        commandActive={commandActive}
        lastError={lastError}
        commandIntent={commandIntent}
        openIssueCount={openIssueCount}
        canWrite={canWrite}
        preflightTriggerRef={preflightTriggerRef}
        titleRef={titleRef}
        canLeaveContext={canLeaveContext}
        navigateToProjectCenter={() => navigateToProjectCenter()}
        changeSession={changeSession}
        createNewSession={createNewSession}
        passCurrentEpisode={passCurrentEpisode}
        resumeCommand={(intent) => { void executeCommand(intent); }}
        openPreflight={openPreflight}
      />

      {currentSession && (
        <div className={styles.threePane} data-testid="subtitle-three-pane">
          <AcceptanceEpisodeQueue
            episodes={filteredEpisodes}
            currentEpisodeNumber={currentEpisodeNumber}
            episodeFilter={episodeFilter}
            setEpisodeFilter={setEpisodeFilter}
            changeEpisode={changeEpisode}
          />
          <AcceptanceMediaTimeline
            episode={episode}
            selectedVideo={selectedVideo}
            visibleCues={visibleCues}
            issues={issues}
            currentEpisodeNumber={currentEpisodeNumber}
            durationMs={durationMs}
            mediaLimitMs={mediaLimitMs}
            currentTimeMs={currentTimeMs}
            mediaDurationMs={mediaDurationMs}
            isPlaying={isPlaying}
            volume={volume}
            muted={muted}
            playbackRate={playbackRate}
            mediaExpanded={mediaExpanded}
            playback={playback}
            playbackPending={playbackPending}
            playbackError={playbackError}
            mediaFailure={mediaFailure}
            selectedCueIds={selectedCueIds}
            writeLocked={writeLocked}
            titleRef={titleRef}
            videoRef={videoRef}
            videoStageRef={videoStageRef}
            setMediaDurationMs={setMediaDurationMs}
            setIsPlaying={setIsPlaying}
            setCurrentTimeMs={setCurrentTimeMs}
            setMediaFailure={setMediaFailure}
            setMediaExpanded={setMediaExpanded}
            requestPlayback={requestPlayback}
            togglePlayback={togglePlayback}
            seekMedia={seekMedia}
            updateVolume={updateVolume}
            toggleMute={toggleMute}
            updatePlaybackRate={updatePlaybackRate}
            toggleFullscreen={toggleFullscreen}
            selectVideo={selectVideo}
            undoLatest={undoLatest}
            addCue={addCue}
            chooseCue={chooseCue}
            moveCue={moveCue}
          />
          <AcceptanceEditorPanel
            sidebarTab={sidebarTab}
            setSidebarTab={setSidebarTab}
            cueFilter={cueFilter}
            setCueFilter={setCueFilter}
            writeLocked={writeLocked}
            commandBlocked={commandBlocked}
            commandActive={commandActive}
            readOnly={readOnly}
            draftDirty={draftDirty}
            clipboardAvailable={clipboard.length > 0}
            selectedCueIds={selectedCueIds}
            visibleCues={visibleCues}
            selectedCue={selectedCue}
            draft={draft}
            setDraft={setDraft}
            issues={issues}
            issueReasons={issueReasons}
            setIssueReasons={setIssueReasons}
            reworkItems={reworkQuery.data?.items ?? []}
            titleRef={titleRef}
            issueTriggerRef={issueTriggerRef}
            reworkTriggerRef={reworkTriggerRef}
            trackChoiceOpenTriggerRef={trackChoiceOpenTriggerRef}
            deleteTriggerRef={deleteTriggerRef}
            addCue={addCue}
            copySelection={copySelection}
            cutSelection={cutSelection}
            pasteClipboard={pasteClipboard}
            chooseCue={chooseCue}
            saveCue={saveCue}
            resolveIssue={resolveIssue}
            setCurrentTimeMs={setCurrentTimeMs}
            setDeleteDialog={setDeleteDialog}
            setTrackChoice={setTrackChoice}
            setIssueDialog={setIssueDialog}
            setReworkOpen={setReworkOpen}
          />
        </div>
      )}

      <section className={styles.releasePanel} aria-label="不可变验收版本历史">
        <h2>验收版本历史</h2>
        {(releasesQuery.data?.items ?? []).length === 0 ? <p>暂无不可变验收版本。</p> : (
          <ol>
            {(releasesQuery.data?.items ?? []).map((release: AcceptanceRelease) => (
              <li key={release.id}><span>V{release.version} · {release.cueCount} 条 · {new Date(release.createdAt).toLocaleString('zh-CN')}</span></li>
            ))}
          </ol>
        )}
        <p className={styles.releaseHint}>发布、冻结与正式下载由交付确认页统一承接。</p>
      </section>

      <AcceptanceDialogs
        preflightOpen={preflightOpen}
        preflightState={preflightState}
        currentSession={currentSession}
        source={source}
        passedEpisodeCount={passedEpisodeCount}
        saveState={saveState}
        commandActive={commandActive}
        writeLocked={writeLocked}
        currentTimeMs={currentTimeMs}
        visibleCues={visibleCues}
        selectedCueCount={selectedCues.length}
        selectedCueTracks={[...new Set(selectedCues.map((cue) => trackLabels[cue.track]))].join('、')}
        deleteDialog={deleteDialog}
        trackChoice={trackChoice}
        issueDialog={issueDialog}
        reworkOpen={reworkOpen}
        issueDraft={issueDraft}
        setIssueDraft={setIssueDraft}
        reworkReason={reworkReason}
        setReworkReason={setReworkReason}
        reworkTracks={reworkTracks}
        setReworkTracks={setReworkTracks}
        preflightPanelRef={preflightPanelRef}
        preflightCloseRef={preflightCloseRef}
        preflightTitleRef={preflightTitleRef}
        preflightRetryRef={preflightRetryRef}
        deletePanelRef={deletePanelRef}
        deleteSafeRef={deleteSafeRef}
        trackChoicePanelRef={trackChoicePanelRef}
        trackChoiceTriggerRef={trackChoiceTriggerRef}
        issuePanelRef={issuePanelRef}
        issueCancelRef={issueCancelRef}
        reworkPanelRef={reworkPanelRef}
        reworkCancelRef={reworkCancelRef}
        titleRef={titleRef}
        openPreflight={openPreflight}
        closePreflight={closePreflight}
        passPreflightEligible={passPreflightEligible}
        goToDeliveryConfirmation={goToDeliveryConfirmation}
        closeDeleteDialog={closeDeleteDialog}
        deleteSelection={deleteSelection}
        closeTrackChoice={closeTrackChoice}
        addCue={addCue}
        pasteClipboard={pasteClipboard}
        closeIssueDialog={closeIssueDialog}
        createIssue={createIssue}
        closeReworkDialog={closeReworkDialog}
        createReworkRequest={createReworkRequest}
        changeEpisode={changeEpisode}
        setTrackChoice={setTrackChoice}
      />
    </section>
  );
};
