import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { AcceptanceCue, AcceptanceSessionDetail, AcceptanceSourceSnapshot, AcceptanceTrack } from '@qimao-terms-cloud/contracts';
import { formatMs, issueCodeLabels, trackLabels } from './model.js';
import styles from './SubtitleAcceptanceWorkspace.module.css';
import dialogStyles from './AcceptanceDialogs.module.css';
import { writableStatus, type PreflightState, type SaveState } from './workspaceSupport.js';

export interface IssueDraftState {
  note: string;
  track: AcceptanceTrack;
  cueId: string;
}

interface AcceptanceDialogsProps {
  preflightOpen: boolean;
  preflightState: PreflightState;
  currentSession: AcceptanceSessionDetail | undefined;
  source: AcceptanceSourceSnapshot | undefined;
  passedEpisodeCount: number;
  saveState: SaveState;
  commandActive: boolean;
  writeLocked: boolean;
  currentTimeMs: number;
  visibleCues: AcceptanceCue[];
  selectedCueCount: number;
  selectedCueTracks: string;
  deleteDialog: boolean;
  trackChoice: { mode: 'add' | 'paste' } | null;
  issueDialog: boolean;
  reworkOpen: boolean;
  issueDraft: IssueDraftState;
  setIssueDraft: Dispatch<SetStateAction<IssueDraftState>>;
  reworkReason: string;
  setReworkReason: (reason: string) => void;
  reworkTracks: AcceptanceTrack[];
  setReworkTracks: Dispatch<SetStateAction<AcceptanceTrack[]>>;
  preflightPanelRef: RefObject<HTMLDivElement | null>;
  preflightCloseRef: RefObject<HTMLButtonElement | null>;
  preflightTitleRef: RefObject<HTMLHeadingElement | null>;
  preflightRetryRef: RefObject<HTMLButtonElement | null>;
  deletePanelRef: RefObject<HTMLDivElement | null>;
  deleteSafeRef: RefObject<HTMLButtonElement | null>;
  trackChoicePanelRef: RefObject<HTMLDivElement | null>;
  trackChoiceTriggerRef: RefObject<HTMLButtonElement | null>;
  issuePanelRef: RefObject<HTMLFormElement | null>;
  issueCancelRef: RefObject<HTMLButtonElement | null>;
  reworkPanelRef: RefObject<HTMLDivElement | null>;
  reworkCancelRef: RefObject<HTMLButtonElement | null>;
  titleRef: RefObject<HTMLHeadingElement | null>;
  openPreflight: () => void;
  closePreflight: () => void;
  passPreflightEligible: () => void;
  goToDeliveryConfirmation: () => void;
  closeDeleteDialog: () => void;
  deleteSelection: () => void;
  closeTrackChoice: () => void;
  addCue: (track: AcceptanceTrack, focus?: HTMLElement | null) => void;
  pasteClipboard: (track: AcceptanceTrack) => void;
  closeIssueDialog: () => void;
  createIssue: () => void;
  closeReworkDialog: () => void;
  createReworkRequest: () => void;
  changeEpisode: (episodeNumber: number) => void;
  setTrackChoice: (value: { mode: 'add' | 'paste' } | null) => void;
}

export const AcceptanceDialogs = ({
  preflightOpen, preflightState, currentSession, source, passedEpisodeCount, saveState, commandActive,
  writeLocked, currentTimeMs, visibleCues, selectedCueCount, selectedCueTracks, deleteDialog, trackChoice, issueDialog, reworkOpen, issueDraft,
  setIssueDraft, reworkReason, setReworkReason, reworkTracks, setReworkTracks, preflightPanelRef,
  preflightCloseRef, preflightTitleRef, preflightRetryRef, deletePanelRef, deleteSafeRef,
  trackChoicePanelRef, trackChoiceTriggerRef, issuePanelRef, issueCancelRef, reworkPanelRef,
  reworkCancelRef, titleRef, openPreflight, closePreflight, passPreflightEligible,
  goToDeliveryConfirmation, closeDeleteDialog, deleteSelection, closeTrackChoice, addCue,
  pasteClipboard, closeIssueDialog, createIssue, closeReworkDialog, createReworkRequest, changeEpisode, setTrackChoice,
}: AcceptanceDialogsProps) => (
  <>
    {preflightOpen && (
      <div className={dialogStyles.drawer} role="dialog" aria-modal="true" aria-label="整剧预检" onClick={(event) => { if (event.target === event.currentTarget) closePreflight(); }}>
        <div ref={preflightPanelRef} className={dialogStyles.drawerPanel} onClick={(event) => event.stopPropagation()}>
          <button ref={preflightCloseRef} type="button" className={dialogStyles.closeButton} onClick={closePreflight}>关闭</button>
          <h2 ref={preflightTitleRef} tabIndex={-1}>整剧同步预检</h2>
          {preflightState.kind === 'loading' && <div className={dialogStyles.skeleton}>正在读取服务端预检结果…</div>}
          {preflightState.kind === 'failed' && (
            <div className={dialogStyles.errorBlock} role="alert">
              <strong>{preflightState.message}</strong>
              <p>代码：{preflightState.code}</p>
              {preflightState.requestId && <p>请求标识：{preflightState.requestId}</p>}
              <button ref={preflightRetryRef} type="button" onClick={openPreflight}>重新读取预检</button>
            </div>
          )}
          {preflightState.kind === 'success' && (
            <div>
              <p>最近成功：{new Date(preflightState.at).toLocaleTimeString('zh-CN')} · 会话修订 {preflightState.result.sessionRevision} · 可通过 {preflightState.result.eligibleEpisodeNumbers.length} 集 · 已通过 {passedEpisodeCount} 集 · 阻断 {Math.max(0, (currentSession?.episodes.length ?? preflightState.result.episodes.length) - preflightState.result.eligibleEpisodeNumbers.length)} 集</p>
              <p className={styles.sourceSummary}>来源：台词 V{source?.preEditReleaseVersion ?? '—'} · 画面字 {source?.screenTextReleaseVersion ? `V${source.screenTextReleaseVersion}` : '未绑定'} · 结果仅属于当前会话</p>
              <ol className={dialogStyles.preflightList}>
                {preflightState.result.episodes.map((item) => (
                  <li key={item.episodeNumber}>
                    第 {item.episodeNumber} 集 · {item.eligible ? '可通过' : '需处理'}
                    {item.errorCodes.length > 0 && <small>硬错误：{item.errorCodes.map((code) => issueCodeLabels[code] ?? code).join('、')}</small>}
                    {item.warningCodes.length > 0 && <small>警告：{item.warningCodes.map((code) => issueCodeLabels[code] ?? code).join('、')}</small>}
                    <button type="button" onClick={() => changeEpisode(item.episodeNumber)}>定位</button>
                  </li>
                ))}
              </ol>
              <button type="button" className={styles.primaryButton} onClick={passPreflightEligible} disabled={!preflightState.result.eligibleEpisodeNumbers.length || preflightState.sessionId !== currentSession?.id || !currentSession || !writableStatus(currentSession) || saveState !== 'saved' || commandActive}>一键通过可通过集</button>
              {currentSession?.status === 'ready_to_release' && preflightState.sessionId === currentSession.id && (
                <button type="button" className={styles.primaryButton} onClick={goToDeliveryConfirmation} disabled={saveState !== 'saved' || commandActive}>前往交付确认</button>
              )}
            </div>
          )}
        </div>
      </div>
    )}

    {deleteDialog && (
      <div className={dialogStyles.dialogBackdrop} role="dialog" aria-modal="true" aria-label="删除字幕确认" onClick={(event) => { if (event.target === event.currentTarget) closeDeleteDialog(); }}>
        <div ref={deletePanelRef} className={dialogStyles.dialog} onClick={(event) => event.stopPropagation()}>
          <h2>删除选中字幕？</h2>
          <p>将删除 {selectedCueCount} 条，轨道：{selectedCueTracks}。</p>
          <p>仅删除当前验收工作副本，不修改上游 SRT、源视频或不可变历史版本；完成后可撤销。</p>
          <div className={dialogStyles.dialogActions}>
            <button ref={deleteSafeRef} type="button" onClick={closeDeleteDialog}>安全返回</button>
            <button type="button" className={styles.dangerButton} onClick={deleteSelection} disabled={writeLocked}>确认删除</button>
          </div>
        </div>
      </div>
    )}

    {trackChoice && (
      <div className={dialogStyles.dialogBackdrop} role="dialog" aria-modal="true" aria-label="选择目标轨道" onClick={(event) => { if (event.target === event.currentTarget) closeTrackChoice(); }}>
        <div ref={trackChoicePanelRef} className={dialogStyles.dialog} onClick={(event) => event.stopPropagation()}>
          <h2>{trackChoice.mode === 'add' ? '选择新增轨道' : '选择粘贴目标轨道'}</h2>
          <p>当前是“全部”筛选，必须明确目标轨道，不会静默默认台词。</p>
          <div className={dialogStyles.dialogActions}>
            <button ref={trackChoiceTriggerRef} type="button" onClick={() => { trackChoice.mode === 'add' ? addCue('dialogue', titleRef.current) : pasteClipboard('dialogue'); setTrackChoice(null); }}>台词</button>
            <button type="button" onClick={() => { trackChoice.mode === 'add' ? addCue('screen_text', titleRef.current) : pasteClipboard('screen_text'); setTrackChoice(null); }}>画面字</button>
            <button type="button" onClick={closeTrackChoice}>取消</button>
          </div>
        </div>
      </div>
    )}

    {issueDialog && (
      <div className={dialogStyles.dialogBackdrop} role="dialog" aria-modal="true" aria-label="记录人工问题" onClick={(event) => { if (event.target === event.currentTarget) closeIssueDialog(); }}>
        <form ref={issuePanelRef} className={dialogStyles.dialog} onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); createIssue(); }}>
          <h2>记录人工问题</h2>
          <p>默认定位到当前播放头 {formatMs(currentTimeMs)}。</p>
          <label>轨道<select value={issueDraft.track} onChange={(event) => setIssueDraft({ ...issueDraft, track: event.target.value as AcceptanceTrack })}><option value="dialogue">台词</option><option value="screen_text">画面字</option></select></label>
          <label>关联 Cue<select value={issueDraft.cueId} onChange={(event) => setIssueDraft({ ...issueDraft, cueId: event.target.value })}><option value="">不绑定具体 Cue</option>{visibleCues.map((cue) => <option key={cue.id} value={cue.id}>{trackLabels[cue.track]} · {cue.text}</option>)}</select></label>
          <label>备注<textarea value={issueDraft.note} onChange={(event) => setIssueDraft({ ...issueDraft, note: event.target.value })} /></label>
          <div className={dialogStyles.dialogActions}><button ref={issueCancelRef} type="button" onClick={closeIssueDialog}>取消</button><button type="submit" className={styles.primaryButton} disabled={writeLocked || !issueDraft.note.trim()}>保存问题</button></div>
        </form>
      </div>
    )}

    {reworkOpen && (
      <div className={dialogStyles.dialogBackdrop} role="dialog" aria-modal="true" aria-label="发起局部返工" onClick={(event) => { if (event.target === event.currentTarget) closeReworkDialog(); }}>
        <div ref={reworkPanelRef} className={dialogStyles.dialog} onClick={(event) => event.stopPropagation()}>
          <h2>发起局部返工</h2>
          <p>默认作用于当前集；未选择的集不会受影响。</p>
          <div className={dialogStyles.checkboxRow}>{(['dialogue', 'screen_text'] as AcceptanceTrack[]).map((track) => <label key={track}><input type="checkbox" checked={reworkTracks.includes(track)} onChange={(event) => setReworkTracks(event.target.checked ? [...reworkTracks, track] : reworkTracks.filter((item) => item !== track))} />{trackLabels[track]}</label>)}</div>
          <textarea value={reworkReason} onChange={(event) => setReworkReason(event.target.value)} placeholder="返工原因至少 8 字" />
          <div className={dialogStyles.dialogActions}><button ref={reworkCancelRef} type="button" onClick={closeReworkDialog}>取消</button><button type="button" className={styles.primaryButton} onClick={createReworkRequest} disabled={writeLocked || reworkReason.trim().length < 8 || !reworkTracks.length}>提交返工</button></div>
        </div>
      </div>
    )}
  </>
);
