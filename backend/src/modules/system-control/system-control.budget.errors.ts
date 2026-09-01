export type SystemControlBudgetErrorCode =
  | 'SYSTEM_CONTROL_BUDGET_POLICY_NOT_FOUND'
  | 'SYSTEM_CONTROL_BUDGET_POLICY_ID_REUSED'
  | 'SYSTEM_CONTROL_BUDGET_IDEMPOTENCY_KEY_REUSED'
  | 'SYSTEM_CONTROL_BUDGET_COMMAND_ID_REUSED'
  | 'SYSTEM_CONTROL_BUDGET_COMMAND_NOT_FOUND'
  | 'SYSTEM_CONTROL_BUDGET_INVALID_TRANSITION'
  | 'SYSTEM_CONTROL_BUDGET_IMPACT_BLOCKED'
  | 'SYSTEM_CONTROL_BUDGET_NO_ACTIVE_POLICY'
  | 'SYSTEM_CONTROL_BUDGET_RULE_MISSING'
  | 'SYSTEM_CONTROL_BUDGET_QUOTE_INVALID'
  | 'SYSTEM_CONTROL_BUDGET_HARD_LIMIT'
  | 'SYSTEM_CONTROL_BUDGET_RESERVATION_NOT_FOUND'
  | 'SYSTEM_CONTROL_BUDGET_CONVERSION_SNAPSHOT_NOT_FOUND'
  | 'SYSTEM_CONTROL_BUDGET_CONVERSION_SNAPSHOT_ID_REUSED'
  | 'SYSTEM_CONTROL_BUDGET_CONVERSION_IDEMPOTENCY_KEY_REUSED'
  | 'SYSTEM_CONTROL_BUDGET_CONVERSION_UNKNOWN'
  | 'SYSTEM_CONTROL_BUDGET_CONVERSION_EXPIRED'
  | 'SYSTEM_CONTROL_BUDGET_CONVERSION_UNSUPPORTED'
  | 'SYSTEM_CONTROL_BUDGET_CONVERSION_MISSING';

export class SystemControlBudgetError extends Error {
  constructor(
    readonly code: SystemControlBudgetErrorCode,
    message: string,
    readonly statusCode: 404 | 409 | 422,
    readonly action: string,
  ) { super(message); this.name = 'SystemControlBudgetError'; }
}

export const budgetNotFound = (message: string) => new SystemControlBudgetError('SYSTEM_CONTROL_BUDGET_POLICY_NOT_FOUND', message, 404, 'reload_budget_policy');
export const budgetCommandNotFound = (message: string) => new SystemControlBudgetError('SYSTEM_CONTROL_BUDGET_COMMAND_NOT_FOUND', message, 404, 'reload_budget_command');
export const budgetConflict = (code: SystemControlBudgetErrorCode, message: string, action = 'retry_with_new_idempotency_key') => new SystemControlBudgetError(code, message, 409, action);
export const budgetInvalid = (code: SystemControlBudgetErrorCode, message: string, action = 'review_budget_request') => new SystemControlBudgetError(code, message, 422, action);
export const conversionNotFound = (message: string) => new SystemControlBudgetError('SYSTEM_CONTROL_BUDGET_CONVERSION_SNAPSHOT_NOT_FOUND', message, 404, 'reload_conversion_snapshot');
export const conversionConflict = (code: 'SYSTEM_CONTROL_BUDGET_CONVERSION_SNAPSHOT_ID_REUSED' | 'SYSTEM_CONTROL_BUDGET_CONVERSION_IDEMPOTENCY_KEY_REUSED', message: string) => new SystemControlBudgetError(code, message, 409, 'retry_with_new_conversion_identity');
export const conversionInvalid = (code: 'SYSTEM_CONTROL_BUDGET_CONVERSION_UNKNOWN' | 'SYSTEM_CONTROL_BUDGET_CONVERSION_EXPIRED' | 'SYSTEM_CONTROL_BUDGET_CONVERSION_UNSUPPORTED' | 'SYSTEM_CONTROL_BUDGET_CONVERSION_MISSING', message: string, action = 'configure_cost_conversion') => new SystemControlBudgetError(code, message, 422, action);
