import { randomUUID } from 'node:crypto';
import { assert } from '../../../packages/shared/src/errors.mjs';

export const triggerTypes = new Set(['task.created','task.status_changed','calendar_event.started','schedule']);
export const actionTypes = new Set(['task.create','task.update','calendar_event.create','notification.enqueue']);

export function validateAutomation(automation) {
  assert(automation?.trigger?.type && triggerTypes.has(automation.trigger.type), 'UNSAFE_TRIGGER', 'Trigger is not allowlisted');
  assert(Array.isArray(automation.actions) && automation.actions.length > 0, 'EMPTY_ACTIONS', 'Automation requires an action');
  for (const action of automation.actions) assert(actionTypes.has(action.type), 'UNSAFE_ACTION', `Action ${action.type} is not allowlisted`);
  assert(!automation.timeout_seconds || automation.timeout_seconds <= 300, 'TIMEOUT_TOO_LARGE', 'Automation timeout is capped at 300 seconds');
  return { ...automation, status: automation.status ?? 'draft', version: automation.version ?? 1 };
}

export function createRun(automation, idempotencyKey, now = new Date().toISOString()) {
  assert(idempotencyKey, 'MISSING_IDEMPOTENCY_KEY', 'Automation runs require an idempotency key');
  return { id: randomUUID(), automation_id: automation.id, automation_version: automation.version, idempotency_key: idempotencyKey, status: 'queued', started_at: null, finished_at: null, error_code: null, created_at: now };
}
