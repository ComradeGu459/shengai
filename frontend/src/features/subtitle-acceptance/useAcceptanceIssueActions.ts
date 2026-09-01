import { useCallback, type RefObject } from 'react';
import type { AcceptanceEpisode, AcceptanceIssue, AcceptanceSessionDetail, AcceptanceTrack } from '@qimao-terms-cloud/contracts';
import { createAcceptanceIssue, resolveAcceptanceIssue } from './api.js';
import { commandKey } from './model.js';
import type { CommandSpec } from './workspaceSupport.js';

interface UseAcceptanceIssueActionsProps {
  projectId: string;
  currentSession: AcceptanceSessionDetail | undefined;
  episode: AcceptanceEpisode | undefined;
  canWrite: boolean;
  currentTimeMs: number;
  issueDraft: { note: string; track: AcceptanceTrack; cueId: string };
  issueReasons: Record<string, string>;
  executeCommand: (spec: CommandSpec) => Promise<unknown>;
  issueTriggerRef: RefObject<HTMLButtonElement | null>;
  issueCancelRef: RefObject<HTMLButtonElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  setIssueDialog: (open: boolean) => void;
  setSidebarTab: (tab: 'subtitles' | 'issues') => void;
  setIssueDraft: (draft: { note: string; track: AcceptanceTrack; cueId: string }) => void;
}

export const useAcceptanceIssueActions = ({
  projectId, currentSession, episode, canWrite, currentTimeMs, issueDraft, issueReasons,
  executeCommand, issueTriggerRef, issueCancelRef, titleRef, setIssueDialog, setSidebarTab, setIssueDraft,
}: UseAcceptanceIssueActionsProps) => {
  const createIssue = useCallback(() => {
    if (!canWrite || !currentSession || !episode) return;
    const note = issueDraft.note.trim();
    if (!note) return;
    const body = { expectedSessionRevision: currentSession.revision, expectedEpisodeRevision: episode.revision, track: issueDraft.track, timeMs: currentTimeMs, note, ...(issueDraft.cueId ? { cueId: issueDraft.cueId } : {}) };
    const key = commandKey('create-issue');
    void executeCommand({
      label: '记录人工问题', key, body, focus: issueTriggerRef.current, errorFocus: issueCancelRef.current,
      execute: () => createAcceptanceIssue(projectId, currentSession.id, episode.episodeNumber, body, key),
      onSuccess: () => { setIssueDialog(false); setSidebarTab('issues'); setIssueDraft({ note: '', track: 'dialogue', cueId: '' }); },
    });
  }, [canWrite, currentSession, currentTimeMs, episode, executeCommand, issueCancelRef, issueDraft, issueTriggerRef, projectId, setIssueDialog, setIssueDraft, setSidebarTab]);

  const resolveIssue = useCallback((issue: AcceptanceIssue, status: 'resolved' | 'waived') => {
    if (!canWrite || !currentSession || !episode) return;
    const reason = (issueReasons[issue.id] ?? '').trim();
    if (reason.length < 8) return;
    const body = { expectedSessionRevision: currentSession.revision, expectedEpisodeRevision: episode.revision, status, reason };
    const key = commandKey('resolve-issue');
    void executeCommand({ label: status === 'resolved' ? '解决问题' : '豁免问题', key, body, focus: titleRef.current, execute: () => resolveAcceptanceIssue(projectId, currentSession.id, episode.episodeNumber, issue.id, body, key) });
  }, [canWrite, currentSession, episode, executeCommand, issueReasons, projectId, titleRef]);

  return { createIssue, resolveIssue };
};
