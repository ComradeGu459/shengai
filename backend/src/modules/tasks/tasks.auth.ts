import type { FastifyRequest } from 'fastify';
import type { SystemControlPrincipal } from '../system-control/system-control.auth.js';

export const TASKS_READ = 'tasks:read';

export type TaskPrincipal = SystemControlPrincipal & Readonly<{
  projectIds?: readonly string[];
}>;

export type TaskPrincipalResolver = (
  request: FastifyRequest,
) => TaskPrincipal | null | Promise<TaskPrincipal | null>;

export const canReadTasks = (principal: TaskPrincipal | null | undefined) => {
  if (!principal || !principal.subject.trim()) return false;
  const audiences = Array.isArray(principal.audience) ? principal.audience : [principal.audience];
  return audiences.includes('employee') && principal.capabilities.includes(TASKS_READ);
};

export const visibleProjectIds = (principal: TaskPrincipal) => {
  if (!principal.projectIds) return null;
  return principal.projectIds.filter((id) => id.trim().length > 0);
};
