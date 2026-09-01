import { useCallback, useEffect, useMemo, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';
import type { AcceptanceCue, AcceptanceCueOperation, AcceptanceEpisode, AcceptanceIssue, AcceptanceSessionDetail, AcceptanceTrack } from '@qimao-terms-cloud/contracts';
import {
  applyAcceptanceCueCommand,
  redoAcceptanceEdit,
  undoAcceptanceEdit,
  type AcceptanceEditEvent,
} from './api.js';
import { clampMs, commandKey, formatMs, parseTimeInput, trackLabels } from './model.js';
import { defaultCueText, type CommandSpec, type SaveState } from './workspaceSupport.js';

interface CueDraftState {
  cueId: string;
  text: string;
  start: string;
  end: string;
}

interface UseAcceptanceCueActionsProps {
  projectId: string;
  currentSession: AcceptanceSessionDetail | undefined;
  episode: AcceptanceEpisode | undefined;
  visibleCues: AcceptanceCue[];
  selectedCues: AcceptanceCue[];
  selectedCue: AcceptanceCue | null;
  clipboard: Array<Pick<AcceptanceCue, 'track' | 'startMs' | 'endMs' | 'text'>>;
  currentTimeMs: number;
  canWrite: boolean;
  canSave: boolean;
  saveState: SaveState;
  draft: CueDraftState | null;
  events: AcceptanceEditEvent[];
  executeCommand: (spec: CommandSpec) => Promise<unknown>;
  setDraft: (value: CueDraftState | null | ((current: CueDraftState | null) => CueDraftState | null)) => void;
  setSaveState: (state: 'saved' | 'dirty' | 'saving' | 'failed') => void;
  setLastError: (error: { code: string; message: string; requestId: string | null }) => void;
  setSelectedCueIds: (ids: string[] | ((current: string[]) => string[])) => void;
  setClipboard: (items: Array<Pick<AcceptanceCue, 'track' | 'startMs' | 'endMs' | 'text'>>) => void;
  setCueFilter: (filter: 'all' | AcceptanceTrack) => void;
  setCurrentTimeMs: (value: number) => void;
  setDeleteDialog: (open: boolean) => void;
  titleRef: RefObject<HTMLHeadingElement | null>;
  deleteSafeRef: RefObject<HTMLButtonElement | null>;
  deleteTriggerRef: RefObject<HTMLButtonElement | null>;
  selectionAnchorRef: RefObject<string | null>;
  focusLater: (element?: HTMLElement | null) => void;
}

export const useAcceptanceCueActions = ({
  projectId, currentSession, episode, visibleCues, selectedCues, selectedCue,
  clipboard, currentTimeMs, canWrite, canSave, saveState, draft, events, executeCommand, setDraft, setSaveState,
  setLastError, setSelectedCueIds, setClipboard, setCueFilter, setCurrentTimeMs, setDeleteDialog,
  titleRef, deleteSafeRef, deleteTriggerRef, selectionAnchorRef, focusLater,
}: UseAcceptanceCueActionsProps) => {
  useEffect(() => {
    if (!selectedCue) {
      setDraft(null);
      setSaveState('saved');
      return;
    }
    setDraft({ cueId: selectedCue.id, text: selectedCue.text, start: formatMs(selectedCue.startMs), end: formatMs(selectedCue.endMs) });
    setSaveState('saved');
  }, [selectedCue?.id]);

  const draftDirty = useMemo(() => {
    if (!draft || !selectedCue) return false;
    return draft.text !== selectedCue.text || parseTimeInput(draft.start) !== selectedCue.startMs || parseTimeInput(draft.end) !== selectedCue.endMs;
  }, [draft, selectedCue]);

  useEffect(() => {
    if (saveState === 'dirty' && !draftDirty) setSaveState('saved');
  }, [draftDirty, saveState, setSaveState]);

  const saveCue = useCallback((focus?: HTMLElement | null) => {
    if (!canSave || !draft || !selectedCue || !currentSession || !episode) return;
    const startMs = parseTimeInput(draft.start);
    const endMs = parseTimeInput(draft.end);
    if (startMs === null || endMs === null || endMs <= startMs) {
      setSaveState('failed');
      setLastError({ code: 'CLIENT_INVALID_TIME', message: '入点和出点必须是有效时间，且出点晚于入点。', requestId: null });
      return;
    }
    const operation: AcceptanceCueOperation = { kind: 'update', cueId: selectedCue.id, text: draft.text, startMs, endMs };
    const body = { expectedSessionRevision: currentSession.revision, expectedEpisodeRevision: episode.revision, operations: [operation] };
    const key = commandKey('save-cue');
    setSaveState('saving');
    void executeCommand({ label: '保存字幕修改', key, body, focus, execute: () => applyAcceptanceCueCommand(projectId, currentSession.id, episode.episodeNumber, body, key) });
  }, [canSave, currentSession, draft, episode, executeCommand, projectId, selectedCue, setLastError, setSaveState]);

  useEffect(() => {
    if (!draftDirty || !canSave || !draft || !selectedCue) return;
    setSaveState('dirty');
    const timer = window.setTimeout(() => saveCue(titleRef.current), 900);
    return () => window.clearTimeout(timer);
  }, [canSave, draft, draftDirty, saveCue, selectedCue, setSaveState, titleRef]);

  const runCueOperations = useCallback((label: string, operations: AcceptanceCueOperation[], focus?: HTMLElement | null) => {
    if (!canWrite || !currentSession || !episode) return;
    const body = { expectedSessionRevision: currentSession.revision, expectedEpisodeRevision: episode.revision, operations };
    const key = commandKey(label);
    void executeCommand({
      label,
      key,
      body,
      focus,
      errorFocus: operations.some((operation) => operation.kind === 'delete') ? deleteSafeRef.current : focus,
      execute: () => applyAcceptanceCueCommand(projectId, currentSession.id, episode.episodeNumber, body, key),
      onSuccess: () => {
        if (operations.some((operation) => operation.kind === 'delete' || operation.kind === 'cut')) setSelectedCueIds([]);
        if (operations.some((operation) => operation.kind === 'delete')) {
          setDeleteDialog(false);
          focusLater(deleteTriggerRef.current);
        }
      },
    });
  }, [canWrite, currentSession, deleteSafeRef, deleteTriggerRef, episode, executeCommand, focusLater, projectId, setDeleteDialog, setSelectedCueIds]);

  const addCue = useCallback((track: AcceptanceTrack, focus?: HTMLElement | null) => {
    if (!episode) return;
    const startMs = clampMs(currentTimeMs, episode.authoritativeDurationMs);
    const endMs = clampMs(startMs + 2_000, episode.authoritativeDurationMs);
    if (episode.authoritativeDurationMs && endMs - startMs < 80) {
      setLastError({ code: 'CLIENT_DURATION_TOO_SHORT', message: '播放头距离视频结尾不足，无法创建安全 2 秒字幕。', requestId: null });
      return;
    }
    setCueFilter(track);
    runCueOperations(`新增${trackLabels[track]}`, [{ kind: 'add', cue: { track, startMs, endMs, text: defaultCueText(track) } }], focus);
  }, [currentTimeMs, episode, runCueOperations, setCueFilter, setLastError]);

  const copySelection = useCallback(() => {
    if (!selectedCues.length) return;
    const start = Math.min(...selectedCues.map((cue) => cue.startMs));
    setClipboard(selectedCues.map((cue) => ({ track: cue.track, startMs: cue.startMs - start, endMs: cue.endMs - start, text: cue.text })));
  }, [selectedCues, setClipboard]);

  const cutSelection = useCallback(() => {
    if (!selectedCues.length) return;
    copySelection();
    runCueOperations('剪切字幕', [{ kind: 'cut', cueIds: selectedCues.map((cue) => cue.id) }], titleRef.current);
  }, [copySelection, runCueOperations, selectedCues, titleRef]);

  const pasteClipboard = useCallback((targetTrack?: AcceptanceTrack) => {
    if (!clipboard.length) return;
    const cuesToPaste = clipboard.map((cue) => ({ track: targetTrack ?? cue.track, startMs: clampMs(currentTimeMs + cue.startMs, episode?.authoritativeDurationMs), endMs: clampMs(currentTimeMs + cue.endMs, episode?.authoritativeDurationMs), text: cue.text })).filter((cue) => cue.endMs > cue.startMs);
    if (!cuesToPaste.length) return;
    runCueOperations('粘贴字幕', [{ kind: 'paste', cues: cuesToPaste }], titleRef.current);
  }, [clipboard, currentTimeMs, episode?.authoritativeDurationMs, runCueOperations, titleRef]);

  const deleteSelection = useCallback(() => {
    if (!selectedCues.length) return;
    runCueOperations('删除字幕', [{ kind: 'delete', cueIds: selectedCues.map((cue) => cue.id) }], deleteTriggerRef.current);
  }, [deleteTriggerRef, runCueOperations, selectedCues]);

  const moveCue = useCallback((cue: AcceptanceCue, deltaMs: number) => {
    runCueOperations('移动字幕', [{ kind: 'move', cueId: cue.id, deltaMs }], titleRef.current);
  }, [runCueOperations, titleRef]);

  const chooseCue = useCallback((cue: AcceptanceCue, event?: MouseEvent | KeyboardEvent) => {
    setCurrentTimeMs(cue.startMs);
    if (event?.shiftKey && selectionAnchorRef.current) {
      const ordered = visibleCues.map((item) => item.id);
      const start = ordered.indexOf(selectionAnchorRef.current);
      const end = ordered.indexOf(cue.id);
      if (start >= 0 && end >= 0) {
        const [from, to] = start < end ? [start, end] : [end, start];
        setSelectedCueIds(ordered.slice(from, to + 1));
        return;
      }
    }
    if (event?.ctrlKey || event?.metaKey) {
      setSelectedCueIds((values) => values.includes(cue.id) ? values.filter((id) => id !== cue.id) : [...values, cue.id]);
      selectionAnchorRef.current = cue.id;
      return;
    }
    setSelectedCueIds([cue.id]);
    selectionAnchorRef.current = cue.id;
  }, [selectionAnchorRef, setCurrentTimeMs, setSelectedCueIds, visibleCues]);

  const undoLatest = useCallback((direction: 'undo' | 'redo') => {
    if (!canWrite || !currentSession || !episode) return;
    const event = direction === 'undo'
      ? [...events].reverse().find((item) => item.kind !== 'undo' && item.kind !== 'redo' && item.kind !== 'pass')
      : [...events].reverse().find((item) => item.kind === 'undo');
    if (!event) {
      setLastError({ code: 'CLIENT_NO_EVENT', message: direction === 'undo' ? '当前集没有可撤销的编辑。' : '当前集没有可恢复的编辑。', requestId: null });
      return;
    }
    const body = { expectedSessionRevision: currentSession.revision, expectedEpisodeRevision: episode.revision, eventId: event.id };
    const key = commandKey(direction);
    void executeCommand({
      label: direction === 'undo' ? '撤销编辑' : '恢复编辑', key, body, focus: titleRef.current,
      execute: () => direction === 'undo' ? undoAcceptanceEdit(projectId, currentSession.id, episode.episodeNumber, body, key) : redoAcceptanceEdit(projectId, currentSession.id, episode.episodeNumber, body, key),
    });
  }, [canWrite, currentSession, episode, events, executeCommand, projectId, setLastError, titleRef]);

  return { draftDirty, saveCue, addCue, copySelection, cutSelection, pasteClipboard, deleteSelection, moveCue, chooseCue, undoLatest };
};
