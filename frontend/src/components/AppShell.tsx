import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';

import { ChevronIcon, ProjectIcon, RecycleIcon, UploadIcon, WaveformIcon } from './Icons.js';
import { globalModules } from '../modules.js';
import styles from './AppShell.module.css';
import { FeedbackButton, FeedbackModal, type FeedbackNotice } from '../features/feedback/FeedbackModal.js';
import { useOptionalEmployeeSession } from '../features/employee-auth/EmployeeSessionGate.js';

export const AppShell = ({ children }: { children: ReactNode }) => {
  const employeeSession = useOptionalEmployeeSession();
  const [collapsed, setCollapsed] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<FeedbackNotice | null>(null);
  const feedbackNoticeRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 1100);
  const location = useLocation();
  const isAsrRoute = /^\/projects\/[^/]+\/asr$/.test(location.pathname);
  const isTasksRoute = location.pathname === '/tasks';
  const isPreReviewRoute = /^\/projects\/[^/]+\/pre-review$/.test(location.pathname);
  const isScreenTextRoute = /^\/projects\/[^/]+\/screen-text$/.test(location.pathname);
  const isSubtitleAcceptanceRoute = /^\/projects\/[^/]+\/subtitle-acceptance$/.test(location.pathname);
  const isDeliveryConfirmRoute = /^\/projects\/[^/]+\/deliveries\/confirm$/.test(location.pathname);
  const isDeliveryRoute = /^\/deliveries(?:\/|$)/.test(location.pathname) || isDeliveryConfirmRoute;
  const tasksOverlayOpen = isTasksRoute && isNarrow && !collapsed;
  const sidebarRef = useRef<HTMLElement>(null);
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  const focusToggleAfterCloseRef = useRef(false);
  const projectGlobalModules = globalModules.filter((module) => module.group === 'project');
  const jobGlobalModules = globalModules.filter((module) => module.group === 'job');
  const pageTitle = globalModules.find((module) => module.route === location.pathname)?.title
    ?? (/^\/projects\/[^/]+\/materials$/.test(location.pathname)
      ? '概览与素材'
      : /^\/projects\/[^/]+\/terms$/.test(location.pathname)
        ? '术语'
        : isAsrRoute
          ? '中文识别'
          : isScreenTextRoute
            ? '画面字'
          : isPreReviewRoute
            ? '前置审改'
          : isSubtitleAcceptanceRoute
            ? '视频字幕验收'
            : isDeliveryRoute
              ? '交付产品库'
            : '项目中心');

  useEffect(() => {
    const syncCollapse = () => {
      const narrow = window.innerWidth <= 1100;
      setIsNarrow(narrow);
      if (narrow && (isSubtitleAcceptanceRoute || isDeliveryRoute || isTasksRoute)) setCollapsed(true);
    };
    syncCollapse();
    window.addEventListener('resize', syncCollapse);
    return () => window.removeEventListener('resize', syncCollapse);
  }, [isDeliveryRoute, isSubtitleAcceptanceRoute, isTasksRoute]);

  useLayoutEffect(() => {
    if (tasksOverlayOpen) collapseButtonRef.current?.focus();
    if (!tasksOverlayOpen && focusToggleAfterCloseRef.current) {
      focusToggleAfterCloseRef.current = false;
      collapseButtonRef.current?.focus();
    }
  }, [tasksOverlayOpen]);
  useLayoutEffect(() => { if (feedbackNotice) feedbackNoticeRef.current?.focus(); }, [feedbackNotice]);

  const closeTasksOverlay = () => {
    focusToggleAfterCloseRef.current = true;
    setCollapsed(true);
  };
  const toggleSidebar = () => {
    if (tasksOverlayOpen) { closeTasksOverlay(); return; }
    setCollapsed((value) => !value);
  };
  const openFeedback = () => { setFeedbackNotice(null); setFeedbackOpen(true); };
  const trapTasksSidebar = (event: KeyboardEvent<HTMLElement>) => {
    if (!tasksOverlayOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); closeTasksOverlay(); return; }
    if (event.key !== 'Tab' || !sidebarRef.current) return;
    const nodes = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'));
    if (!nodes.length) { event.preventDefault(); sidebarRef.current.focus(); return; }
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''} ${isTasksRoute ? styles.tasksShell : ''}`}>
      {tasksOverlayOpen && <button className={styles.tasksOverlay} type="button" tabIndex={-1} aria-label="关闭侧栏菜单" onClick={closeTasksOverlay} />}
      <aside className={styles.sidebar} aria-label="全局导航" ref={sidebarRef} onKeyDown={trapTasksSidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">审</span>
          <span className={styles.brandText}>审改工作台</span>
        </div>
        <nav className={styles.nav}>
          <p className={styles.navLabel}>项目</p>
          {projectGlobalModules.map((module) => {
            const icon = module.id === 'uploads' ? <UploadIcon /> : module.id === 'recycle-bin' ? <RecycleIcon /> : <ProjectIcon />;
            const content = <>{icon}<span>{module.title}</span></>;
            const title = collapsed ? module.title : undefined;
            if (module.id === 'deliveries' && isDeliveryRoute) {
              return <Link key={module.id} to={module.route} className={`${styles.navItem} ${styles.active}`} aria-current="page" title={title}>{content}</Link>;
            }
            return <NavLink key={module.id} to={module.route} end={module.id === 'projects'} className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`} title={title}>{content}</NavLink>;
          })}
          <p className={styles.navLabel}>作业</p>
          {jobGlobalModules.map((module) => (
            <NavLink
              key={module.id}
              to={module.route}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              title={collapsed ? module.title : undefined}
            >
              <WaveformIcon />
              <span>{module.title}</span>
            </NavLink>
          ))}
        </nav>
        <button
          ref={collapseButtonRef}
          className={styles.collapseButton}
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
          aria-expanded={!collapsed}
        >
          <ChevronIcon className={collapsed ? styles.rotate : undefined} />
          <span>{collapsed ? '展开' : '收起侧栏'}</span>
        </button>
        {employeeSession ? (
          <button className={styles.logoutButton} type="button" onClick={() => void employeeSession.logout()} disabled={employeeSession.logoutBusy}>
            <span aria-hidden="true">退</span>
            <span>{employeeSession.logoutBusy ? '正在退出…' : '退出登录'}</span>
          </button>
        ) : null}
      </aside>
      <div className={styles.workspace}>
        {!isPreReviewRoute && !isSubtitleAcceptanceRoute && !isDeliveryRoute && <header className={styles.topbar}>
          <h1>{pageTitle}</h1>
          <div className={styles.topbarActions}>
            <FeedbackButton onClick={openFeedback} />
            <div className={styles.serviceStatus} role="status"><span aria-hidden="true" />{isAsrRoute ? '服务正常' : '本地服务正常'}</div>
          </div>
        </header>}
        {employeeSession?.logoutError ? <div className={styles.sessionNotice} role="alert">{employeeSession.logoutError}</div> : null}
        {feedbackNotice ? <div ref={feedbackNoticeRef} className={styles.feedbackNotice} role="alert" tabIndex={-1}><strong>{feedbackNotice.kind === 'create_error' ? '反馈未提交' : '反馈已创建'}</strong><span>{feedbackNotice.message}</span>{feedbackNotice.kind === 'create_error' ? <button type="button" onClick={openFeedback}>重新填写反馈</button> : <button type="button" onClick={() => setFeedbackNotice(null)}>知道了</button>}</div> : null}
        <main className={`${styles.main} ${isPreReviewRoute ? styles.preReviewMain : ''} ${isScreenTextRoute ? styles.screenTextMain : ''} ${isSubtitleAcceptanceRoute ? styles.subtitleAcceptanceMain : ''} ${isDeliveryRoute ? styles.deliveriesMain : ''}`}>{children}</main>
      </div>
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} routePath={location.pathname} onNotice={setFeedbackNotice} />
    </div>
  );
};
