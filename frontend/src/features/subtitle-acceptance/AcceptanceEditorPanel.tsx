import type { Dispatch, KeyboardEvent, MouseEvent, RefObject, SetStateAction } from 'react';
import type { AcceptanceCue, AcceptanceIssue, AcceptanceTrack } from '@qimao-terms-cloud/contracts';
import { formatMs, issueLabel, trackLabels } from './model.js';
import styles from './SubtitleAcceptanceWorkspace.module.css';
import editorStyles from './AcceptanceEditorPanel.module.css';
import type { CueFilter, SidebarTab } from './workspaceSupport.js';

export interface CueDraftState {
  cueId: string;
  text: string;
  start: string;
  end: string;
}

interface ReworkItem {
  id: string;
  episodeNumbers: number[];
  tracks: AcceptanceTrack[];
  reason: string;
  createdAt: string;
}

interface AcceptanceEditorPanelProps {
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;
  cueFilter: CueFilter;
  setCueFilter: (filter: CueFilter) => void;
  writeLocked: boolean;
  commandBlocked: boolean;
  commandActive: boolean;
  readOnly: boolean;
  draftDirty: boolean;
  clipboardAvailable: boolean;
  selectedCueIds: string[];
  visibleCues: AcceptanceCue[];
  selectedCue: AcceptanceCue | null;
  draft: CueDraftState | null;
  setDraft: Dispatch<SetStateAction<CueDraftState | null>>;
  issues: AcceptanceIssue[];
  issueReasons: Record<string, string>;
  setIssueReasons: Dispatch<SetStateAction<Record<string, string>>>;
  reworkItems: ReworkItem[];
  titleRef: RefObject<HTMLHeadingElement | null>;
  issueTriggerRef: RefObject<HTMLButtonElement | null>;
  reworkTriggerRef: RefObject<HTMLButtonElement | null>;
  trackChoiceOpenTriggerRef: RefObject<HTMLButtonElement | null>;
  deleteTriggerRef: RefObject<HTMLButtonElement | null>;
  addCue: (track: AcceptanceTrack, focus?: HTMLElement | null) => void;
  copySelection: () => void;
  cutSelection: () => void;
  pasteClipboard: (track: AcceptanceTrack) => void;
  chooseCue: (cue: AcceptanceCue, event?: MouseEvent | KeyboardEvent) => void;
  saveCue: (focus?: HTMLElement | null) => void;
  resolveIssue: (issue: AcceptanceIssue, status: 'resolved' | 'waived') => void;
  setCurrentTimeMs: (value: number) => void;
  setDeleteDialog: (open: boolean) => void;
  setTrackChoice: (value: { mode: 'add' | 'paste' } | null) => void;
  setIssueDialog: (open: boolean) => void;
  setReworkOpen: (open: boolean) => void;
}

export const AcceptanceEditorPanel = ({
  sidebarTab, setSidebarTab, cueFilter, setCueFilter, writeLocked, commandBlocked, commandActive,
  readOnly, draftDirty, clipboardAvailable, selectedCueIds, visibleCues, selectedCue, draft, setDraft, issues,
  issueReasons, setIssueReasons, reworkItems, titleRef, issueTriggerRef, reworkTriggerRef,
  trackChoiceOpenTriggerRef, deleteTriggerRef, addCue, copySelection, cutSelection, pasteClipboard,
  chooseCue, saveCue, resolveIssue, setCurrentTimeMs, setDeleteDialog, setTrackChoice, setIssueDialog,
  setReworkOpen,
}: AcceptanceEditorPanelProps) => (
  <aside className={styles.rightPane} aria-label="字幕与问题编辑">
    <div className={styles.tabs} role="tablist" aria-label="右侧工作页">
      <button type="button" role="tab" aria-selected={sidebarTab === 'subtitles'} className={sidebarTab === 'subtitles' ? styles.active : ''} onClick={() => setSidebarTab('subtitles')}>字幕</button>
      <button type="button" role="tab" aria-selected={sidebarTab === 'issues'} className={sidebarTab === 'issues' ? styles.active : ''} onClick={() => setSidebarTab('issues')}>问题</button>
    </div>

    {sidebarTab === 'subtitles' ? (
      <div className={editorStyles.editorPane}>
        <div className={styles.segmented} role="group" aria-label="字幕轨道筛选">
          {[
            ['all', '全部'],
            ['dialogue', '台词'],
            ['screen_text', '画面字'],
          ].map(([value, label]) => (
            <button key={value} type="button" className={cueFilter === value ? styles.active : ''} onClick={() => setCueFilter(value as CueFilter)}>{label}</button>
          ))}
        </div>
        <div className={styles.compactToolbar} aria-label="字幕快捷工具">
          <button type="button" onClick={() => addCue('dialogue', titleRef.current)} disabled={writeLocked}>新增台词</button>
          <button type="button" onClick={() => addCue('screen_text', titleRef.current)} disabled={writeLocked}>新增画面字</button>
          <button type="button" onClick={copySelection} disabled={!selectedCueIds.length}>复制</button>
          <button type="button" onClick={cutSelection} disabled={writeLocked || !selectedCueIds.length}>剪切</button>
          <button ref={trackChoiceOpenTriggerRef} type="button" onClick={() => cueFilter === 'all' ? setTrackChoice({ mode: 'paste' }) : pasteClipboard(cueFilter)} disabled={writeLocked || !clipboardAvailable}>粘贴</button>
          <button ref={deleteTriggerRef} type="button" onClick={() => setDeleteDialog(true)} disabled={writeLocked || !selectedCueIds.length}>删除选中</button>
        </div>
        <p className={editorStyles.selectionSummary}>选择 {selectedCueIds.length} 条；全部筛选下 Ctrl+N 会先选择台词或画面字轨道。</p>
        <ol className={editorStyles.cueList}>
          {visibleCues.map((cue) => (
            <li key={cue.id}>
              <button type="button" className={selectedCueIds.includes(cue.id) ? styles.selectedCueRow : ''} onClick={(event) => chooseCue(cue, event)}>
                <span>{trackLabels[cue.track]}</span>
                <strong>{cue.text || '（空文本）'}</strong>
                <small>{formatMs(cue.startMs)} → {formatMs(cue.endMs)}</small>
              </button>
            </li>
          ))}
        </ol>
        {draft && selectedCue ? (
          <form className={editorStyles.cueEditor} onSubmit={(event) => { event.preventDefault(); saveCue(titleRef.current); }}>
            <label>
              文字
              <textarea value={draft.text} onChange={(event) => setDraft({ ...draft, text: event.target.value })} disabled={commandBlocked} />
            </label>
            <div className={editorStyles.editorGrid}>
              <label>入点<input value={draft.start} onChange={(event) => setDraft({ ...draft, start: event.target.value })} disabled={commandBlocked} /></label>
              <label>出点<input value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} disabled={commandBlocked} /></label>
            </div>
            <p className={editorStyles.editorNote}>转到另一轨道请复制/剪切后粘贴到目标轨道；当前 S5 合约只允许直接编辑文字、入点和出点。</p>
            <button type="submit" className={styles.primaryButton} disabled={commandBlocked || !draftDirty}>应用修改</button>
          </form>
        ) : <p className={editorStyles.emptyHint}>选择一条 Cue 后可编辑文字、入点和出点；转轨请使用跨轨粘贴。</p>}
      </div>
    ) : (
      <div className={editorStyles.issuePane}>
        <button ref={issueTriggerRef} type="button" className={styles.primaryButton} onClick={() => setIssueDialog(true)} disabled={writeLocked}>记录问题</button>
        <ol className={editorStyles.issueList}>
          {issues.map((issue) => (
            <li key={issue.id} className={issue.status === 'open' ? editorStyles.openIssue : ''}>
              <div>
                <strong>{issueLabel(issue)}</strong>
                <p>{issue.note}</p>
                <small>{formatMs(issue.timeMs)} · {issue.track ? trackLabels[issue.track] : '整集'} · {issue.status}</small>
              </div>
              <button type="button" onClick={() => setCurrentTimeMs(issue.timeMs ?? 0)}>定位</button>
              {issue.status === 'open' && (
                <div className={editorStyles.issueResolve}>
                  <input value={issueReasons[issue.id] ?? ''} placeholder="处理理由至少 8 字" onChange={(event) => setIssueReasons({ ...issueReasons, [issue.id]: event.target.value })} disabled={readOnly || commandActive} />
                  <button type="button" onClick={() => resolveIssue(issue, 'resolved')} disabled={writeLocked || (issueReasons[issue.id] ?? '').trim().length < 8}>已解决</button>
                  <button type="button" onClick={() => resolveIssue(issue, 'waived')} disabled={writeLocked || (issueReasons[issue.id] ?? '').trim().length < 8}>有理由豁免</button>
                </div>
              )}
            </li>
          ))}
        </ol>
        <button ref={reworkTriggerRef} type="button" className={styles.secondaryButton} onClick={() => setReworkOpen(true)} disabled={writeLocked}>发起局部返工</button>
        <section className={editorStyles.reworkHistory} aria-label="局部返工历史">
          <h3>局部返工历史</h3>
          {reworkItems.length === 0 ? <p>暂无返工记录。</p> : (
            <ol>
              {reworkItems.map((rework) => (
                <li key={rework.id}>
                  <strong>第 {rework.episodeNumbers.join('、')} 集</strong>
                  <small>{rework.tracks.map((track) => trackLabels[track]).join('、')} · {new Date(rework.createdAt).toLocaleString('zh-CN')}</small>
                  <p>{rework.reason}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    )}
  </aside>
);
