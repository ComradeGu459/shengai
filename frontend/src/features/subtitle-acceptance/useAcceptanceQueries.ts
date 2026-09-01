import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProjectMaterialState } from '../materials/api.js';
import {
  getAcceptanceEpisode,
  getAcceptanceSession,
  listAcceptanceEvents,
  listAcceptanceReleases,
  listAcceptanceRework,
  listAcceptanceSessions,
  listPreEditSourceReleases,
  listScreenTextSourceReleases,
  type AcceptanceEpisodeDetail,
} from './api.js';
import { readOnlyReason, type CueFilter } from './workspaceSupport.js';
import { sortCues } from './model.js';

export const useAcceptanceQueries = ({
  projectId,
  sessionId,
  selectedEpisodeNumber,
  cueFilter,
  createSessionOpen,
}: {
  projectId: string;
  sessionId: string;
  selectedEpisodeNumber: number;
  cueFilter: CueFilter;
  createSessionOpen: boolean;
}) => {
  const projectQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'project'],
    queryFn: () => getProjectMaterialState(projectId),
    enabled: Boolean(projectId),
    retry: false,
  });
  const sessionsQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'sessions'],
    queryFn: () => listAcceptanceSessions(projectId),
    enabled: Boolean(projectId),
    retry: false,
  });
  const sessionQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'session', sessionId],
    queryFn: () => getAcceptanceSession(projectId, sessionId),
    enabled: Boolean(projectId && sessionId),
    retry: false,
  });
  const currentSession = sessionQuery.data;
  const currentEpisodeNumber = currentSession?.episodes.some((episode) => episode.episodeNumber === selectedEpisodeNumber)
    ? selectedEpisodeNumber
    : currentSession?.episodes[0]?.episodeNumber ?? 1;
  const episodeQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'session', sessionId, 'episode', currentEpisodeNumber],
    queryFn: () => getAcceptanceEpisode(projectId, sessionId, currentEpisodeNumber),
    enabled: Boolean(projectId && sessionId && currentEpisodeNumber),
    retry: false,
  });
  const eventsQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'session', sessionId, 'episode', currentEpisodeNumber, 'events'],
    queryFn: () => listAcceptanceEvents(projectId, sessionId, currentEpisodeNumber),
    enabled: Boolean(projectId && sessionId && currentEpisodeNumber),
    retry: false,
  });
  const releasesQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'releases'],
    queryFn: () => listAcceptanceReleases(projectId),
    enabled: Boolean(projectId),
    retry: false,
  });
  const reworkQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'session', sessionId, 'rework'],
    queryFn: () => listAcceptanceRework(projectId, sessionId),
    enabled: Boolean(projectId && sessionId),
    retry: false,
  });
  const preEditReleasesQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'source', 'pre-edit'],
    queryFn: () => listPreEditSourceReleases(projectId),
    enabled: Boolean(projectId && createSessionOpen),
    retry: false,
  });
  const screenTextReleasesQuery = useQuery({
    queryKey: ['subtitle-acceptance', projectId, 'source', 'screen-text'],
    queryFn: () => listScreenTextSourceReleases(projectId),
    enabled: Boolean(projectId && createSessionOpen),
    retry: false,
  });
  const episodeDetail = episodeQuery.data as AcceptanceEpisodeDetail | undefined;
  const episode = episodeDetail?.episode;
  const cues = useMemo(() => sortCues(episodeDetail?.cues ?? []), [episodeDetail]);
  const visibleCues = useMemo(() => cues.filter((cue) => cueFilter === 'all' || cue.track === cueFilter), [cueFilter, cues]);
  const issues = episodeDetail?.issues ?? [];
  const openIssueCount = issues.filter((issue) => issue.status === 'open').length;
  const readOnly = Boolean(readOnlyReason(currentSession));
  const source = currentSession?.source;
  const sourceRelease = releasesQuery.data?.items.find((release) => release.sessionId === sessionId);
  const passedEpisodeCount = currentSession?.episodes.filter((item) => item.status === 'passed').length ?? 0;
  return {
    projectQuery, sessionsQuery, sessionQuery, currentSession, currentEpisodeNumber,
    episodeQuery, eventsQuery, releasesQuery, reworkQuery, preEditReleasesQuery, screenTextReleasesQuery,
    episodeDetail, episode, cues, visibleCues, issues, openIssueCount, readOnly, source, sourceRelease, passedEpisodeCount,
  };
};
