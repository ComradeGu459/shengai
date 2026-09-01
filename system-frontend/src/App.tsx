import { useEffect, useState } from 'react';
import { ControlShell } from './ControlShell.js';
import { EnginesPage } from './enginesPage.js';
import { RoutingPage } from './routingPage.js';
import { ChangesPage } from './changesPage.js';
import { BudgetsPage } from './budgetsPage.js';
import { SecurityPage } from './securityPage.js';
import { ServersPage } from './serversPage.js';
import { LogsPage } from './logsPage.js';
import { StrategyPage } from './strategyPage.js';
import { FeedbackPage } from './feedbackPage.js';
import type { NavId } from './model.js';

const routeFor = (path: string): NavId => {
  if (path === '/engines' || path === '/system-control/engines') return 'engines';
  if (path === '/routing' || path === '/system-control/routing') return 'routing';
  if (path === '/changes' || path === '/system-control/changes') return 'changes';
  if (path === '/budgets' || path === '/system-control/budgets') return 'budgets';
  if (path === '/security' || path === '/system-control/security') return 'secrets';
  if (path === '/servers' || path === '/system-control/servers') return 'servers';
  if (path === '/logs' || path === '/system-control/logs') return 'logs';
  if (path === '/strategy' || path === '/system-control/strategy') return 'strategy';
  if (path === '/feedback' || path === '/system-control/feedback') return 'feedback';
  return 'overview';
};

export const App = () => {
  const [path, setPath] = useState(() => window.location.pathname);
  const active = routeFor(path);
  const navigate = (next: NavId) => { const target = next === 'overview' ? '/' : `/${next}`; window.history.pushState({}, '', target); setPath(target); };
  useEffect(() => { const onPop = () => setPath(window.location.pathname); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop); }, []);
  const page = active === 'engines' ? <EnginesPage onNavigateSecurity={() => navigate('secrets')} /> : active === 'routing' ? <RoutingPage onNavigate={(target) => navigate(routeFor(target))} /> : active === 'changes' ? <ChangesPage /> : active === 'budgets' ? <BudgetsPage onNavigate={(target) => navigate(routeFor(target))} /> : active === 'secrets' ? <SecurityPage /> : active === 'servers' ? <ServersPage onNavigate={navigate} /> : active === 'logs' ? <LogsPage onNavigate={navigate} /> : active === 'strategy' ? <StrategyPage /> : active === 'feedback' ? <FeedbackPage /> : undefined;
  return <ControlShell activeNav={active} onNavigate={navigate}>{page}</ControlShell>;
};
