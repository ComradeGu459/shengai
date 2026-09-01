import type { FastifyRequest } from 'fastify';

export interface SystemControlPrincipal {
  subject: string;
  audience: string | readonly string[];
  capabilities: readonly string[];
  /** 服务端身份映射的项目范围；未提供表示测试所有者可见当前库全部项目。 */
  projectIds?: readonly string[];
  projectAccess?: 'listed' | 'all';
}

export type SystemControlPrincipalResolver = (
  request: FastifyRequest,
) => SystemControlPrincipal | null | Promise<SystemControlPrincipal | null>;

export const SYSTEM_CONTROL_READ = 'system-control:read';
export const SYSTEM_CONTROL_ENGINES_READ = 'system-control:engines:read';
export const SYSTEM_CONTROL_ENGINES_WRITE = 'system-control:engines:write';
export const SYSTEM_CONTROL_ENGINES_TEST = 'system-control:engines:test';
export const SYSTEM_CONTROL_SECRETS_READ = 'system-control:secrets:read';
export const SYSTEM_CONTROL_SECRETS_WRITE = 'system-control:secrets:write';
export const SYSTEM_CONTROL_SECRETS_TEST = 'system-control:secrets:test';
export const SYSTEM_CONTROL_ROUTING_READ = 'system-control:routing:read';
export const SYSTEM_CONTROL_ROUTING_WRITE = 'system-control:routing:write';
export const SYSTEM_CONTROL_ROUTING_PUBLISH = 'system-control:routing:publish';
export const SYSTEM_CONTROL_ROUTING_ROLLBACK = 'system-control:routing:rollback';
export const SYSTEM_CONTROL_BUDGET_READ = 'budget:read';
export const SYSTEM_CONTROL_BUDGET_WRITE = 'budget:write';
export const SYSTEM_CONTROL_BUDGET_PUBLISH = 'budget:publish';
export const SYSTEM_CONTROL_RUNTIME_READ = 'system-control:runtime:read';
export const SYSTEM_CONTROL_LOGS_READ = 'system-control:logs:read';
export const SYSTEM_CONTROL_STRATEGY_READ = 'system-control:strategy:read';
export const SYSTEM_CONTROL_STRATEGY_WRITE = 'system-control:strategy:write';
export const SYSTEM_CONTROL_STRATEGY_EVALUATE = 'system-control:strategy:evaluate';
export const SYSTEM_CONTROL_STRATEGY_APPROVE = 'system-control:strategy:approve';
export const SYSTEM_CONTROL_STRATEGY_RELEASE = 'system-control:strategy:release';

export const canReadSystemControl = (principal: SystemControlPrincipal | null | undefined) => {
  if (!principal || !principal.subject.trim()) return false;
  const audiences = Array.isArray(principal.audience) ? principal.audience : [principal.audience];
  return audiences.includes('system-control') && principal.capabilities.includes(SYSTEM_CONTROL_READ);
};

export const canUseSystemControlCapability = (
  principal: SystemControlPrincipal | null | undefined,
  capability: string,
) => {
  if (!principal || !principal.subject.trim()) return false;
  const audiences = Array.isArray(principal.audience) ? principal.audience : [principal.audience];
  return audiences.includes('system-control') && principal.capabilities.includes(capability);
};
