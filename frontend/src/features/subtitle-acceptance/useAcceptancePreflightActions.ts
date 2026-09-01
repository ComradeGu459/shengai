import { useCallback, useEffect, type RefObject } from 'react';
import type { AcceptanceEpisode, AcceptanceSessionDetail } from '@qimao-terms-cloud/contracts';
import { getAcceptancePreflight, passAcceptanceEpisode, passEligibleAcceptanceEpisodes } from './api.js';
import { commandKey, normalizeCommandError } from './model.js';
import { writableStatus, type CommandSpec, type PreflightState, type SaveState } from './workspaceSupport.js';

interface UseAcceptancePreflightActionsProps {
  projectId: string;
  currentSession: AcceptanceSessionDetail | undefined;
  episode: AcceptanceEpisode | undefined;
  canWrite: boolean;
  preflightOpen: boolean;
  preflightState: PreflightState;
  saveState: SaveState;
  commandActive: boolean;
  activeSessionIdRef: RefObject<string>;
  preflightOpenRef: RefObject<boolean>;
  preflightRequestTokenRef: RefObject<number>;
  preflightSessionIdRef: RefObject<string>;
  preflightTitleRef: RefObject<HTMLHeadingElement | null>;
  preflightRetryRef: RefObject<HTMLButtonElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  executeCommand: (spec: CommandSpec) => Promise<unknown>;
  focusLater: (element?: HTMLElement | null) => void;
  updateSearch: (patch: Record<string, string | number | null>) => void;
  navigate: (path: string) => void;
  setPreflightOpen: (open: boolean) => void;
  setPreflightState: (state: PreflightState) => void;
}

export const useAcceptancePreflightActions = ({
  projectId, currentSession, episode, canWrite, preflightOpen, preflightState, saveState, commandActive,
  activeSessionIdRef, preflightOpenRef, preflightRequestTokenRef, preflightSessionIdRef, preflightTitleRef,
  preflightRetryRef, titleRef, executeCommand, focusLater, updateSearch, navigate, setPreflightOpen,
  setPreflightState,
}: UseAcceptancePreflightActionsProps) => {
  const passCurrentEpisode = useCallback(() => {
    if (!canWrite || !currentSession || !episode) return;
    const body = { expectedSessionRevision: currentSession.revision, expectedEpisodeRevision: episode.revision };
    const key = commandKey('pass-episode');
    void executeCommand({
      label: '通过并下一集', key, body, focus: titleRef.current,
      execute: () => passAcceptanceEpisode(projectId, currentSession.id, episode.episodeNumber, body, key),
      onSuccess: () => {
        const next = currentSession.episodes.find((item) => item.episodeNumber > episode.episodeNumber && item.status !== 'passed')
          ?? currentSession.episodes.find((item) => item.status !== 'passed');
        if (next) updateSearch({ episode: next.episodeNumber });
      },
    });
  }, [canWrite, currentSession, episode, executeCommand, projectId, titleRef, updateSearch]);

  const openPreflight = useCallback(() => {
    if (!currentSession) return;
    if (preflightOpen && preflightState.kind === 'loading') return;
    const openedSessionId = currentSession.id;
    const requestToken = preflightRequestTokenRef.current + 1;
    preflightRequestTokenRef.current = requestToken;
    preflightSessionIdRef.current = openedSessionId;
    setPreflightOpen(true);
    setPreflightState({ kind: 'loading' });
    void getAcceptancePreflight(projectId, openedSessionId).then((result) => {
      if (requestToken !== preflightRequestTokenRef.current || activeSessionIdRef.current !== openedSessionId || !preflightOpenRef.current || preflightSessionIdRef.current !== openedSessionId) return;
      setPreflightState({ kind: 'success', result, at: new Date().toISOString(), sessionId: openedSessionId });
      focusLater(preflightTitleRef.current);
    }).catch((error) => {
      if (requestToken !== preflightRequestTokenRef.current || activeSessionIdRef.current !== openedSessionId || !preflightOpenRef.current || preflightSessionIdRef.current !== openedSessionId) return;
      const normalized = normalizeCommandError(error);
      setPreflightState({ kind: 'failed', message: normalized.message, code: normalized.code, requestId: normalized.requestId });
      focusLater(preflightRetryRef.current);
    });
  }, [activeSessionIdRef, currentSession, focusLater, preflightOpen, preflightOpenRef, preflightRequestTokenRef, preflightSessionIdRef, preflightState.kind, projectId, setPreflightOpen, setPreflightState, preflightTitleRef, preflightRetryRef]);

  useEffect(() => {
    if (!preflightOpen || preflightState.kind !== 'failed') return;
    focusLater(preflightRetryRef.current);
  }, [focusLater, preflightOpen, preflightRetryRef, preflightState]);

  const passPreflightEligible = useCallback(() => {
    if (!currentSession || preflightState.kind !== 'success') return;
    if (preflightState.sessionId !== currentSession.id || activeSessionIdRef.current !== currentSession.id || !writableStatus(currentSession) || saveState !== 'saved' || commandActive) return;
    const body = { expectedSessionRevision: preflightState.result.sessionRevision, episodeNumbers: preflightState.result.eligibleEpisodeNumbers };
    if (!body.episodeNumbers.length) return;
    const key = commandKey('pass-eligible');
    void executeCommand({ label: '一键通过可通过集', key, body, focus: preflightTitleRef.current, execute: () => passEligibleAcceptanceEpisodes(projectId, currentSession.id, body, key) });
  }, [activeSessionIdRef, commandActive, currentSession, executeCommand, preflightState, preflightTitleRef, projectId, saveState]);

  const goToDeliveryConfirmation = useCallback(() => {
    if (!currentSession || preflightState.kind !== 'success') return;
    if (preflightState.sessionId !== currentSession.id || activeSessionIdRef.current !== currentSession.id || currentSession.status !== 'ready_to_release' || saveState !== 'saved' || commandActive) return;
    navigate(`/projects/${projectId}/deliveries/confirm?sessionId=${encodeURIComponent(currentSession.id)}`);
  }, [activeSessionIdRef, commandActive, currentSession, navigate, preflightState, projectId, saveState]);

  return { passCurrentEpisode, openPreflight, passPreflightEligible, goToDeliveryConfirmation };
};
