import type { DeliveryListQuery, DeliveryProductStatus } from '@qimao-terms-cloud/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';

import { listDeliveries } from './api.js';
import { deliveryStatusLabels, fileSummary, formatDateTime } from './model.js';
import { RequestNotice, StatusPill } from './shared.js';
import styles from './Deliveries.module.css';

const pageSize = 10;
type LibraryQuery = DeliveryListQuery & { limit: number; offset: number; sortBy: 'createdAt' | 'updatedAt'; sortDirection: 'asc' | 'desc' };

export const DeliveryLibraryPage = () => {
  const [searchDraft, setSearchDraft] = useState('');
  const [query, setQuery] = useState<LibraryQuery>({ limit: pageSize, offset: 0, sortBy: 'createdAt', sortDirection: 'desc' });
  const [status, setStatus] = useState<DeliveryProductStatus | ''>('');
  const listQuery = useQuery({
    queryKey: ['delivery-library', query],
    queryFn: () => listDeliveries(query),
    retry: false,
  });

  useEffect(() => {
    if (query.offset && listQuery.data && query.offset >= listQuery.data.total) setQuery((current) => ({ ...current, offset: 0 }));
  }, [listQuery.data, query.offset]);

  const submitQuery = () => setQuery((current) => {
    const next = { ...current, offset: 0 };
    if (searchDraft.trim()) next.search = searchDraft.trim(); else delete next.search;
    if (status) next.status = status; else delete next.status;
    return next;
  });
  const clearQuery = () => {
    setSearchDraft('');
    setStatus('');
    setQuery({ limit: pageSize, offset: 0, sortBy: 'createdAt', sortDirection: 'desc' });
  };
  const total = listQuery.data?.total ?? 0;
  const rangeStart = total === 0 ? 0 : query.offset + 1;
  const rangeEnd = Math.min(query.offset + pageSize, total);

  return (
    <main className={`${styles.page} ${styles.libraryPage}`}>
      <header className={styles.pageHeader}>
        <div><p className={styles.eyebrow}>Delivery library</p><h1>交付产品库</h1><p>跨项目读取不可变交付产品。文件内容只读，修改必须返回验收流程创建修订。</p></div>
      </header>
      <section className={styles.panel} aria-labelledby="delivery-library-heading">
        <div className={styles.panelHeader}><div><h2 id="delivery-library-heading">全部产品</h2><p className={styles.sectionLead}>搜索、状态、排序和分页均由服务端提供。</p></div></div>
        <div className={styles.toolbar} role="search">
          <label className={styles.search}>搜索产品、项目、负责人或备注<input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitQuery(); }} placeholder="输入关键词" /></label>
          <label>状态<select value={status} onChange={(event) => setStatus(event.target.value as DeliveryProductStatus | '')}><option value="">全部状态</option>{(Object.keys(deliveryStatusLabels) as DeliveryProductStatus[]).map((value) => <option key={value} value={value}>{deliveryStatusLabels[value]}</option>)}</select></label>
          <label>排序<select value={`${query.sortBy}:${query.sortDirection}`} onChange={(event) => { const [sortBy, sortDirection] = event.target.value.split(':') as ['createdAt' | 'updatedAt', 'asc' | 'desc']; setQuery((current) => ({ ...current, sortBy, sortDirection, offset: 0 })); }}><option value="createdAt:desc">创建时间 · 新到旧</option><option value="createdAt:asc">创建时间 · 旧到新</option><option value="updatedAt:desc">更新时间 · 新到旧</option><option value="updatedAt:asc">更新时间 · 旧到新</option></select></label>
          <div className={styles.toolbarActions}><button className={styles.primaryButton} type="button" onClick={submitQuery}>查询</button><button className={styles.button} type="button" onClick={clearQuery}>清除</button></div>
        </div>

        {listQuery.isPending && <div className={styles.loadingNotice} role="status"><div><strong>正在读取产品库</strong><p>保留当前表格工作面，等待服务端返回。</p></div></div>}
        {listQuery.error && <RequestNotice error={listQuery.error} retry={() => void listQuery.refetch()} retryLabel="重新读取产品列表" />}
        {!listQuery.isPending && !listQuery.error && listQuery.data && listQuery.data.items.length === 0 && <div className={styles.emptyNotice}><strong>没有匹配的交付产品</strong><p>当前筛选没有结果；可以清除筛选后重新查询。</p><button className={styles.button} type="button" onClick={clearQuery}>清除筛选</button></div>}
        {!listQuery.isPending && !listQuery.error && listQuery.data && listQuery.data.items.length > 0 && <>
          <div className={styles.tableWrap}><table className={styles.dataTable}><thead><tr><th>产品名称</th><th>项目</th><th>版本</th><th>状态</th><th>文件摘要</th><th>负责人</th><th>备注摘要</th><th>创建时间</th><th>更新时间</th><th>操作</th></tr></thead><tbody>{listQuery.data.items.map((product) => <tr key={product.id}><td><Link className={styles.link} to={`/deliveries/${product.deliveryId}`}>{product.name}</Link></td><td>{product.projectName}</td><td>V{product.version}</td><td><StatusPill status={product.status} /></td><td>{fileSummary(product)}</td><td>{product.owner || '未填写'}</td><td title={product.note}>{product.note || '—'}</td><td>{formatDateTime(product.createdAt)}</td><td>{formatDateTime(product.updatedAt)}</td><td><Link className={styles.button} to={`/deliveries/${product.deliveryId}`}>查看详情</Link></td></tr>)}</tbody></table></div>
          <div className={styles.pagination}><span>显示 {rangeStart}–{rangeEnd} / 共 {total} 个产品</span><div className={styles.paginationActions}><button className={styles.button} type="button" onClick={() => setQuery((current) => ({ ...current, offset: Math.max(0, current.offset - pageSize) }))} disabled={query.offset === 0}>上一页</button><button className={styles.button} type="button" onClick={() => setQuery((current) => ({ ...current, offset: current.offset + pageSize }))} disabled={rangeEnd >= total}>下一页</button></div></div>
        </>}
      </section>
    </main>
  );
};
