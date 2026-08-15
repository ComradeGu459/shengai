import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useEffect, useRef, useState } from 'react';
import type { CleanupJobStatus, RecycleBinItem, RecycleBinQuery } from '@qimao-terms-cloud/contracts';

import { RetryIcon, SearchIcon } from '../../components/Icons.js';
import { listRecycleBin, RecycleApiError, restoreProject } from './api.js';
import styles from './RecycleBin.module.css';

type LifecycleFilter = '' | 'recycled' | 'purging';
type CleanupFilter = '' | CleanupJobStatus;
type SortBy = NonNullable<RecycleBinQuery['sortBy']>;
type SortDirection = NonNullable<RecycleBinQuery['sortDirection']>;

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const formatDate = (value: string) => dateFormatter.format(new Date(value));

const formatRemaining = (expiresAt: string) => {
  const milliseconds = new Date(expiresAt).getTime() - Date.now();
  if (milliseconds <= 0) return '已到截止时间，等待后台处理';
  const totalMinutes = Math.ceil(milliseconds / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) return `剩余 ${Math.floor(hours / 24)} 天 ${hours % 24} 小时`;
  if (hours > 0) return `剩余 ${hours} 小时 ${minutes} 分钟`;
  return `剩余 ${minutes} 分钟`;
};

const statusPresentation = (item: RecycleBinItem) => {
  if (item.lifecycleStatus === 'recycled') {
    return { label: '已回收', className: styles.recycled, description: '仍在后端恢复窗口内' };
  }
  if (item.cleanupJob.status === 'retryable') {
    return { label: '等待后台重试', className: styles.retryable, description: '清理失败，系统将按计划重试' };
  }
  if (item.cleanupJob.status === 'failed') {
    return { label: '清理最终失败', className: styles.failed, description: '清理未完成，等待系统处理' };
  }
  return { label: '清理中', className: styles.purging, description: '后台已开始处理，项目不可恢复' };
};

export const RecycleBin = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [lifecycleStatus, setLifecycleStatus] = useState<LifecycleFilter>('');
  const [cleanupJobStatus, setCleanupJobStatus] = useState<CleanupFilter>('');
  const [sortBy, setSortBy] = useState<SortBy>('recycleExpiresAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [notice, setNotice] = useState('');
  const deferredSearch = useDeferredValue(search);
  const restoreIntents = useRef(new Map<string, { version: number; idempotencyKey: string }>());
  const previousPurging = useRef<{
    signature: string;
    isCompleteResult: boolean;
    items: Map<string, string>;
  } | null>(null);
  const querySignature = JSON.stringify({ deferredSearch, lifecycleStatus, cleanupJobStatus, sortBy, sortDirection });

  const recycleBin = useQuery({
    queryKey: ['recycle-bin', deferredSearch, lifecycleStatus, cleanupJobStatus, sortBy, sortDirection],
    queryFn: () => listRecycleBin({
      search: deferredSearch,
      lifecycleStatus,
      cleanupJobStatus,
      sortBy,
      sortDirection,
    }),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    if (!recycleBin.isSuccess) return;
    const currentIds = new Set(recycleBin.data.items.map((item) => item.id));
    const isCompleteResult = recycleBin.data.total === recycleBin.data.items.length;
    const previous = previousPurging.current;
    if (
      !cleanupJobStatus
      && previous?.signature === querySignature
      && previous.isCompleteResult
      && isCompleteResult
    ) {
      const cleaned = [...previous.items].find(([id]) => !currentIds.has(id));
      if (cleaned) setNotice(`项目“${cleaned[1]}”已清理，已从普通回收站列表移除。`);
    }
    previousPurging.current = {
      signature: querySignature,
      isCompleteResult,
      items: new Map(
        recycleBin.data.items
          .filter((item) => item.lifecycleStatus === 'purging')
          .map((item) => [item.id, item.name]),
      ),
    };
  }, [cleanupJobStatus, querySignature, recycleBin.data, recycleBin.isSuccess]);

  const restoreMutation = useMutation({
    mutationFn: async (item: RecycleBinItem) => {
      const current = restoreIntents.current.get(item.id);
      const intent = current?.version === item.version
        ? current
        : { version: item.version, idempotencyKey: crypto.randomUUID() };
      restoreIntents.current.set(item.id, intent);
      const result = await restoreProject(item.id, item.version, intent.idempotencyKey);
      return { item, result };
    },
    onMutate: () => setNotice(''),
    onSuccess: async ({ item }) => {
      restoreIntents.current.delete(item.id);
      setNotice(`项目“${item.name}”已恢复。已完成素材和清单仍然保留；先前终止的未完成上传不会自动恢复，请重新选择文件并新建上传任务。`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recycle-bin'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });

  const mutationItemId = restoreMutation.variables?.id;
  const mutationError = restoreMutation.error instanceof RecycleApiError ? restoreMutation.error : null;

  return (
    <section className={styles.page} aria-label="项目回收站">
      <div className={styles.intro}>
        <div>
          <strong>{recycleBin.data?.total ?? 0}</strong>
          <span>个回收中的项目</span>
        </div>
        <p>项目在恢复窗口内可恢复；后台开始清理后不可恢复。</p>
      </div>

      {notice && <div className={styles.notice} role="status">{notice}</div>}

      <div className={styles.filters} aria-label="回收站筛选和排序">
        <label className={styles.searchField}>
          <SearchIcon />
          <span className="sr-only">搜索回收站项目</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="搜索项目名称"
          />
        </label>
        <label>
          <span>生命周期</span>
          <select value={lifecycleStatus} onChange={(event) => setLifecycleStatus(event.target.value as LifecycleFilter)}>
            <option value="">全部状态</option>
            <option value="recycled">已回收</option>
            <option value="purging">清理中</option>
          </select>
        </label>
        <label>
          <span>后台处理</span>
          <select value={cleanupJobStatus} onChange={(event) => setCleanupJobStatus(event.target.value as CleanupFilter)}>
            <option value="">全部处理状态</option>
            <option value="scheduled">等待到期</option>
            <option value="leased">正在清理</option>
            <option value="retryable">等待后台重试</option>
            <option value="failed">清理最终失败</option>
          </select>
        </label>
        <label>
          <span>排序</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortBy)}>
            <option value="recycleExpiresAt">恢复窗口</option>
            <option value="name">项目名称</option>
            <option value="recycledAt">回收时间</option>
          </select>
        </label>
        <label>
          <span>方向</span>
          <select value={sortDirection} onChange={(event) => setSortDirection(event.target.value as SortDirection)}>
            <option value="asc">升序</option>
            <option value="desc">降序</option>
          </select>
        </label>
      </div>

      <div className={styles.tableFrame} aria-live="polite">
        {recycleBin.isError ? (
          <div className={styles.statePanel} role="alert">
            <strong>回收站暂时无法加载</strong>
            <p>{recycleBin.error.message}</p>
            <button type="button" onClick={() => recycleBin.refetch()}><RetryIcon />重新加载</button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>项目</th>
                  <th>状态</th>
                  <th>回收时间</th>
                  <th>恢复窗口</th>
                  <th>处理说明</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {recycleBin.isLoading && <RecycleTableSkeleton />}
                {recycleBin.isSuccess && recycleBin.data.items.length === 0 && (
                  <tr className={styles.emptyRow}>
                    <td colSpan={6}>
                      <strong>{search || lifecycleStatus || cleanupJobStatus ? '没有匹配的回收项目' : '回收站为空'}</strong>
                      <span>当前没有可恢复或正在清理的项目。</span>
                    </td>
                  </tr>
                )}
                {recycleBin.data?.items.map((item) => {
                  const presentation = statusPresentation(item);
                  const isMutating = restoreMutation.isPending && mutationItemId === item.id;
                  const rowError = mutationItemId === item.id ? mutationError : null;
                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <span className={styles.projectId}>ID {item.id.slice(0, 8)}</span>
                      </td>
                      <td>
                        <span className={`${styles.status} ${presentation.className}`}>{presentation.label}</span>
                        <span className={styles.cellNote}>{presentation.description}</span>
                      </td>
                      <td className={styles.numeric}>{formatDate(item.recycledAt)}</td>
                      <td>
                        <strong className={styles.windowLabel}>
                          {item.lifecycleStatus === 'recycled' ? formatRemaining(item.recycleExpiresAt) : '已到期 / 不可恢复'}
                        </strong>
                        <span className={styles.cellNote}>截止 {formatDate(item.recycleExpiresAt)}</span>
                      </td>
                      <td>
                        <CleanupFacts item={item} />
                        {rowError && (
                          <span className={styles.rowError} role="alert">
                            恢复失败：{rowError.message}
                            {rowError.requestId && <>；请求标识 {rowError.requestId}</>}
                            {rowError.resultUnknown && '；结果未知，请使用同一操作重试'}
                          </span>
                        )}
                      </td>
                      <td>
                        {item.lifecycleStatus === 'recycled' ? (
                          <button
                            className={styles.restoreButton}
                            type="button"
                            disabled={restoreMutation.isPending}
                            onClick={() => restoreMutation.mutate(item)}
                          >
                            {isMutating ? '正在恢复…' : '恢复项目'}
                          </button>
                        ) : <span className={styles.unavailable}>不可恢复</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

const CleanupFacts = ({ item }: { item: RecycleBinItem }) => {
  if (item.lifecycleStatus === 'recycled') {
    return <span className={styles.cellNote}>后台清理尚未开始</span>;
  }
  return (
    <span className={styles.cleanupFacts}>
      {item.cleanupJob.lastError && <span>原因：{item.cleanupJob.lastError}</span>}
      <span>尝试 {item.cleanupJob.attemptCount} 次</span>
      {item.cleanupJob.nextAttemptAt && <span>下次重试 {formatDate(item.cleanupJob.nextAttemptAt)}</span>}
      <span>请求标识 {item.cleanupJob.id}</span>
    </span>
  );
};

const RecycleTableSkeleton = () => (
  <>
    {[0, 1, 2].map((row) => (
      <tr className={styles.skeletonRow} key={row} aria-label="正在加载回收站项目">
        <td colSpan={6}><span /></td>
      </tr>
    ))}
  </>
);
