import { useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';

import { ChevronIcon, ProjectIcon, RecycleIcon, UploadIcon, WaveformIcon } from './Icons.js';
import { globalModules } from '../modules.js';
import styles from './AppShell.module.css';

export const AppShell = ({ children }: { children: ReactNode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isAsrRoute = /^\/projects\/[^/]+\/asr$/.test(location.pathname);
  const isAsrDispatchRoute = location.pathname === '/asr-dispatches';
  const isPreReviewRoute = /^\/projects\/[^/]+\/pre-review$/.test(location.pathname);
  const isScreenTextRoute = /^\/projects\/[^/]+\/screen-text$/.test(location.pathname);
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
            : '项目中心');

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ''}`}>
      <aside className={styles.sidebar} aria-label="全局导航">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">审</span>
          <span className={styles.brandText}>审改工作台</span>
        </div>
        <nav className={styles.nav}>
          <p className={styles.navLabel}>项目</p>
          {projectGlobalModules.map((module) => (
            <NavLink
              key={module.id}
              to={module.route}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
              title={collapsed ? module.title : undefined}
            >
              {module.id === 'uploads'
                ? <UploadIcon />
                : module.id === 'recycle-bin'
                  ? <RecycleIcon />
                  : <ProjectIcon />}
              <span>{module.title}</span>
            </NavLink>
          ))}
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
          className={styles.collapseButton}
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
          aria-expanded={!collapsed}
        >
          <ChevronIcon className={collapsed ? styles.rotate : undefined} />
          <span>{collapsed ? '展开' : '收起侧栏'}</span>
        </button>
      </aside>
      <div className={styles.workspace}>
        {!isPreReviewRoute && <header className={styles.topbar}>
          <h1>{pageTitle}</h1>
          <div className={styles.serviceStatus} role="status">
            <span aria-hidden="true" />
            {isAsrRoute || isAsrDispatchRoute ? '服务正常' : '本地服务正常'}
          </div>
        </header>}
        <main className={`${styles.main} ${isPreReviewRoute ? styles.preReviewMain : ''} ${isScreenTextRoute ? styles.screenTextMain : ''}`}>{children}</main>
      </div>
    </div>
  );
};
