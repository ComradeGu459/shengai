import type { AcceptanceEpisode } from '@qimao-terms-cloud/contracts';
import { episodeStatusLabels } from './model.js';
import styles from './SubtitleAcceptanceWorkspace.module.css';
import type { EpisodeFilter } from './workspaceSupport.js';

interface AcceptanceEpisodeQueueProps {
  episodes: AcceptanceEpisode[];
  currentEpisodeNumber: number;
  episodeFilter: EpisodeFilter;
  setEpisodeFilter: (filter: EpisodeFilter) => void;
  changeEpisode: (episodeNumber: number) => void;
}

export const AcceptanceEpisodeQueue = ({ episodes, currentEpisodeNumber, episodeFilter, setEpisodeFilter, changeEpisode }: AcceptanceEpisodeQueueProps) => (
  <aside className={styles.leftPane} aria-label="剧集队列">
    <div className={styles.segmented} role="group" aria-label="剧集筛选">
      {[['all', '全部'], ['screen', '有画面字'], ['multi', '多层'], ['issues', '问题集']].map(([value, label]) => (
        <button key={value} type="button" className={episodeFilter === value ? styles.active : ''} onClick={() => setEpisodeFilter(value as EpisodeFilter)}>{label}</button>
      ))}
    </div>
    <ol className={styles.episodeList}>
      {episodes.map((item) => (
        <li key={item.id}>
          <button type="button" className={item.episodeNumber === currentEpisodeNumber ? styles.currentEpisode : ''} onClick={() => changeEpisode(item.episodeNumber)}>
            <span>第 {item.episodeNumber} 集</span>
            <strong>{episodeStatusLabels[item.status]}</strong>
            <small>台词 {item.dialogueCueCount} · 画面字 {item.screenTextCueCount}</small>
            <small>问题 {item.openErrorCount + item.openWarningCount}</small>
          </button>
        </li>
      ))}
    </ol>
  </aside>
);
