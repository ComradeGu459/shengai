import type { SystemControlPrincipal } from '../system-control/system-control.auth.js';

export type FeedbackPrincipal = SystemControlPrincipal & Readonly<{
  projectIds?: readonly string[];
}>;

export const FEEDBACK_CREATE = 'feedback:create';
export const SYSTEM_CONTROL_FEEDBACK_READ = 'system-control:feedback:read';
export const SYSTEM_CONTROL_FEEDBACK_WRITE = 'system-control:feedback:write';

const hasAudience = (principal: SystemControlPrincipal | null | undefined, audience: string) => {
  if (!principal || !principal.subject.trim()) return false;
  const audiences = Array.isArray(principal.audience) ? principal.audience : [principal.audience];
  return audiences.includes(audience);
};

export const canCreateFeedback = (principal: SystemControlPrincipal | null | undefined) =>
  (hasAudience(principal, 'employee') || hasAudience(principal, 'system-control')) && Boolean(principal?.capabilities.includes(FEEDBACK_CREATE));

export const canReadFeedback = (principal: SystemControlPrincipal | null | undefined) =>
  hasAudience(principal, 'system-control') && Boolean(principal?.capabilities.includes(SYSTEM_CONTROL_FEEDBACK_READ));

export const canWriteFeedback = (principal: SystemControlPrincipal | null | undefined) =>
  hasAudience(principal, 'system-control') && Boolean(principal?.capabilities.includes(SYSTEM_CONTROL_FEEDBACK_WRITE));

export const principalSurface = (principal: SystemControlPrincipal) => hasAudience(principal, 'employee') ? 'employee' as const : 'system_control' as const;
