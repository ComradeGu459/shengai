export class TaskNotFoundError extends Error {
  readonly statusCode = 404 as const;
  readonly code = 'TASK_NOT_FOUND' as const;

  constructor() {
    super('任务不存在或当前身份无权查看。');
    this.name = 'TaskNotFoundError';
  }
}
