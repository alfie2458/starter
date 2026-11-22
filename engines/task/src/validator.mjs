import { DomainError } from '../../../packages/shared/src/errors.mjs';

export const taskStatuses = ['inbox', 'todo', 'in_progress', 'blocked', 'done', 'canceled'];
export const taskPriorities = ['low', 'normal', 'high', 'urgent'];

export function validateTaskInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new DomainError('INVALID_TASK_INPUT', 'Task body must be an object');
  if (typeof input.workspace_id !== 'string' || input.workspace_id.trim() === '') throw new DomainError('INVALID_TASK_WORKSPACE', 'workspace_id is required');
  if (typeof input.title !== 'string' || input.title.trim() === '' || input.title.length > 200) throw new DomainError('INVALID_TASK_TITLE', 'title must be a non-empty string of at most 200 characters');
  if (input.status !== undefined && !taskStatuses.includes(input.status)) throw new DomainError('INVALID_TASK_STATUS', 'status is not allowed');
  if (input.priority !== undefined && !taskPriorities.includes(input.priority)) throw new DomainError('INVALID_TASK_PRIORITY', 'priority is not allowed');
  if (input.labels !== undefined && (!Array.isArray(input.labels) || input.labels.some(label => typeof label !== 'string'))) throw new DomainError('INVALID_TASK_LABELS', 'labels must be an array of strings');
  if (input.description !== undefined && (typeof input.description !== 'string' || input.description.length > 10000)) throw new DomainError('INVALID_TASK_DESCRIPTION', 'description must be a string of at most 10000 characters');
  return input;
}
