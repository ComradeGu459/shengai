import type { RefObject } from 'react';
import { Link } from 'react-router';
import type { AcceptanceSession, AcceptanceSessionDetail, PreEditRelease, ScreenTextRelease } from '@qimao-terms-cloud/contracts';
import { sessionStatusLabels } from './model.js';
import styles from './SubtitleAcceptanceWorkspace.module.css';
import { readOnlyReason, sourceLabel, type CommandIntent, type SaveState } from './workspaceSupport.js';

interface AcceptanceWorkspaceChromeProps {
  projectId: string;
  projectName: string;
  projectExists: boolean;
  sessions: AcceptanceSession[];
  sessionsLoading: boolean;
  currentSession: AcceptanceSessionDetail | undefined;
  sessionId: string;
  createSessionOpen: boolean;
  setCreateSessionOpen: (open: boolean) => void;
  selectedPreEditReleaseId: string;
  setSelectedPreEditReleaseId: (id: string) => void;
  selectedScreenTextReleaseId: string;
  setSelectedScreenTextReleaseId: (id: string) => void;
  preEditReleases: PreEditRelease[];
  screenTextReleases: ScreenTextRelease[];
  sourceQueries: {
    preEdit: { pending: boolean; error: string | null };
    screenText: { pending: boolean; error: string | null };
  };
  retrySourceQueries: () => void;
  sourceRelease: { version: number; cueCount: number } | undefined;
  readOnly: boolean;
  saveState: SaveState;
  commandActive: boolean;
  lastError: { message: string; requestId: string | null } | null;
  commandIntent: CommandIntent | null;
  openIssueCount: number;
  canWrite: boolean;
  preflightTriggerRef: RefObject<HTMLButtonElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  canLeaveContext: () => boolean;
  navigateToProjectCenter: () => void;
  changeSession: (sessionId: string) => void;
  createNewSession: () => void;
  passCurrentEpisode: () => void;
  resumeCommand: (intent: CommandIntent) => void;
  openPreflight: () => void;
}

export const AcceptanceWorkspaceChrome = ({
  projectId, projectName, projectExists, sessions, sessionsLoading, currentSession, sessionId,
  createSessionOpen, setCreateSessionOpen, selectedPreEditReleaseId,
  setSelectedPreEditReleaseId, selectedScreenTextReleaseId, setSelectedScreenTextReleaseId, preEditReleases,
  screenTextReleases, sourceQueries, retrySourceQueries, sourceRelease, readOnly, saveState, commandActive, lastError, commandIntent, openIssueCount, canWrite,
  preflightTriggerRef, titleRef, canLeaveContext, navigateToProjectCenter, changeSession,
  createNewSession, passCurrentEpisode, resumeCommand, openPreflight,
}: AcceptanceWorkspaceChromeProps) => (
  <>
    <header className={styles.header}>
      <div className={styles.projectContext}>
        <Link to="/projects" className={styles.contextLink} onClick={(event) => { if (!canLeaveContext()) event.preventDefault(); }}>返回项目中心</Link>
        <button className={styles.contextButton} type="button" onClick={navigateToProjectCenter}>切换项目</button>
        <span className={styles.projectName}>{projectName}</span>
        <span className={styles.projectMeta}>项目中心是唯一跨项目选择器</span>
      </div>
      <div className={styles.titleRow}>
        <div>
          <h1 tabIndex={-1} ref={titleRef}>视频字幕验收</h1>
          <p>来源固定：台词 V{currentSession?.source.preEditReleaseVersion ?? '—'} · 画面字 {currentSession?.source.screenTextReleaseVersion ? `V${currentSession.source.screenTextReleaseVersion}` : '未绑定'} · 素材 V{currentSession?.source.manifestVersion ?? '—'}</p>
        </div>
        <div className={styles.headerActions}>
          <span className={`${styles.statusPill} ${readOnly ? styles.statusReadOnly : ''}`}>{currentSession ? sessionStatusLabels[currentSession.status] : '未选择会话'}</span>
          <span className={styles.savePill} data-state={saveState}>{saveState === 'saving' ? '保存中' : saveState === 'dirty' ? '有未提交修改' : saveState === 'failed' ? '保存失败' : '已保存'}</span>
          <button ref={preflightTriggerRef} type="button" className={styles.secondaryButton} onClick={openPreflight} disabled={!currentSession}>整剧预检</button>
          <button type="button" className={styles.primaryButton} onClick={passCurrentEpisode} disabled={!canWrite || openIssueCount > 0 || saveState === 'dirty'}>通过并下一集</button>
        </div>
      </div>
      {readOnlyReason(currentSession) && <div className={styles.readOnlyBanner} role="status">{readOnlyReason(currentSession)}</div>}
      {currentSession && (currentSession.source.screenTextExcludedEpisodes ?? []).length > 0 && (
        <div className={styles.sourceExclusionNotice} role="status">
          <strong>画面字来源为部分 Release</strong>
          <span>排除 {(currentSession.source.screenTextExcludedEpisodes ?? []).length} 集；验收只读读取该快照，不会重跑或改写这些异常集。</span>
          <ul>{(currentSession.source.screenTextExcludedEpisodes ?? []).map((entry) => <li key={`${entry.episodeNumber}-${entry.jobId}`}>第 {entry.episodeNumber} 集 · {entry.status}{entry.errorCode ? ` · ${entry.errorCode}` : ''}</li>)}</ul>
        </div>
      )}
      {lastError && <div className={styles.errorBanner} role="alert">{lastError.message}{lastError.requestId ? `（请求 ${lastError.requestId}）` : ''}</div>}
      {commandIntent?.error && (
        <div className={styles.pendingPanel} role="alert">
          <div><strong>{commandIntent.label} 结果未知</strong><p>{commandIntent.error.message}{commandIntent.error.requestId ? ` · ${commandIntent.error.requestId}` : ''}</p><code>{commandIntent.key}</code><pre>{commandIntent.bodyText}</pre></div>
          <button type="button" onClick={() => resumeCommand(commandIntent)} disabled={commandIntent.pending}>{commandIntent.pending ? '恢复中…' : `恢复本次${commandIntent.label}`}</button>
        </div>
      )}
    </header>

    <div className={styles.sessionBar}>
      <label>会话<select value={sessionId} onChange={(event) => changeSession(event.target.value)} aria-label="选择验收会话"><option value="">选择会话</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.status === 'draft' || session.status === 'ready_to_release' ? '当前可写' : '历史只读'} · {sessionStatusLabels[session.status]} · 修订 {session.revision}</option>)}</select></label>
      <button type="button" className={styles.secondaryButton} onClick={() => setCreateSessionOpen(!createSessionOpen)}>从来源版本新建会话</button>
      {sourceRelease && <span>不可变验收 V{sourceRelease.version} · {sourceRelease.cueCount} 条</span>}
    </div>

    {createSessionOpen && (() => {
      const selectedScreenTextRelease = selectedScreenTextReleaseId === 'latest'
        ? screenTextReleases[0]
        : screenTextReleases.find((release) => release.id === selectedScreenTextReleaseId);
      const sourceLoading = sourceQueries.preEdit.pending || sourceQueries.screenText.pending;
      const sourceError = sourceQueries.preEdit.error || sourceQueries.screenText.error;
      const hasDialogueRelease = preEditReleases.length > 0;
      const screenTextSelectionValid = screenTextReleases.length > 0
        ? selectedScreenTextReleaseId === 'none' || Boolean(selectedScreenTextRelease)
        : selectedScreenTextReleaseId === 'none';
      const canCreateFromSources = Boolean(projectExists && hasDialogueRelease && screenTextSelectionValid
        && !sourceLoading && !sourceError && !commandActive);
      return (
        <section className={styles.sourcePanel} aria-label="新建验收会话来源版本">
          <div className={styles.sourcePanelHeading}><h2>新建验收会话</h2><span>只固定服务端已发布版本；不会重跑或改写上游。</span></div>
          {sourceLoading && <div className={styles.sourceStatus} role="status">正在读取台词与画面字 Release…</div>}
          {sourceError && <div className={styles.sourceError} role="alert"><strong>上游 Release 读取失败</strong><span>{sourceError}</span><button type="button" onClick={retrySourceQueries}>重新读取上游 Release</button></div>}
          {!sourceLoading && !sourceError && !hasDialogueRelease && <div className={styles.sourceWarning} role="status"><strong>缺少 S3 台词 Release</strong><span>请先在前置审改完成并发布待验收修订，再回这里创建验收会话。</span><Link to={`/projects/${projectId}/pre-review`} onClick={(event) => { if (!canLeaveContext()) event.preventDefault(); }}>前往前置审改</Link></div>}
          {!sourceLoading && !sourceError && !screenTextReleases.length && <div className={styles.sourceWarning} role="status"><strong>尚无 S4 画面字 Release</strong><span>可以明确选择“不绑定画面字版本”；需要画面字轨时请先完成发布，系统不会猜测或替代缺失来源。</span><Link to={`/projects/${projectId}/screen-text`} onClick={(event) => { if (!canLeaveContext()) event.preventDefault(); }}>前往画面字</Link></div>}
          <label>S3 台词 Release<select value={selectedPreEditReleaseId} onChange={(event) => setSelectedPreEditReleaseId(event.target.value)} disabled={sourceLoading || Boolean(sourceError)}><option value="" disabled={!hasDialogueRelease}>{hasDialogueRelease ? '使用最新台词 Release' : '未发现已发布台词 Release'}</option>{preEditReleases.map((release) => <option key={release.id} value={release.id}>{sourceLabel(release)}</option>)}</select></label>
          <label>S4 画面字 Release<select value={selectedScreenTextReleaseId} onChange={(event) => setSelectedScreenTextReleaseId(event.target.value)} disabled={sourceLoading || Boolean(sourceError)}><option value="latest" disabled={!screenTextReleases.length}>{screenTextReleases.length ? '使用最新画面字 Release' : '未发现已发布画面字 Release'}</option><option value="none">不绑定画面字版本</option>{screenTextReleases.map((release) => <option key={release.id} value={release.id}>{sourceLabel(release)}{release.partial ? ' · 部分发布' : ''}</option>)}</select></label>
          {selectedScreenTextRelease?.partial && <div className={styles.sourceWarning} role="status"><strong>画面字 Release V{selectedScreenTextRelease.version} 为部分发布</strong><span>排除 {selectedScreenTextRelease.excludedEpisodes.length} 集；这些集不会在验收创建时重跑、删除或改变原状态。</span><ul className={styles.sourceExclusions}>{selectedScreenTextRelease.excludedEpisodes.map((entry) => <li key={`${entry.episodeNumber}-${entry.jobId}`}>第 {entry.episodeNumber} 集 · {entry.status}{entry.errorCode ? ` · ${entry.errorCode}` : ''}</li>)}</ul></div>}
          <button type="button" className={styles.primaryButton} onClick={createNewSession} disabled={!canCreateFromSources}>创建并固定来源</button>
        </section>
      );
    })()}

    {!currentSession && !sessionsLoading && (
      <section className={styles.emptyState}><h2>还没有验收会话</h2><p>请先固定 S3 台词 Release、可选 S4 画面字 Release 与当前素材清单，创建后刷新不会偷换来源。</p><button type="button" className={styles.primaryButton} onClick={() => setCreateSessionOpen(true)}>新建验收会话</button></section>
    )}

  </>
);
