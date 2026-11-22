import { randomUUID } from 'node:crypto';
import { assert } from '../../../packages/shared/src/errors.mjs';
import { createCoordinationEvent, appendEvent } from '../../../packages/shared/src/events.mjs';

const transitions = { inbox: ['todo','canceled'], todo: ['in_progress','blocked','canceled'], in_progress: ['blocked','done','todo','canceled'], blocked: ['todo','in_progress','canceled'], done: [], canceled: [] };

export function createTask(input, now = new Date().toISOString()) {
  assert(input?.workspace_id && input?.title, 'INVALID_TASK', 'workspace_id and title are required');
  return { id: input.id ?? randomUUID(), workspace_id: input.workspace_id, title: input.title, description: input.description ?? '', status: input.status ?? 'inbox', priority: input.priority ?? 'normal', labels: input.labels ?? [], version: 1, created_at: now, updated_at: now, archived_at: null };
}

export function transitionTask(task, nextStatus, actorId, eventStore, now = new Date().toISOString()) {
  assert(transitions[task.status]?.includes(nextStatus), 'INVALID_TASK_TRANSITION', `${task.status} -> ${nextStatus} is not allowed`);
  const updated = { ...task, status: nextStatus, version: task.version + 1, updated_at: now };
  appendEvent(eventStore, createCoordinationEvent({ workspaceId: task.workspace_id, type: 'task.status_changed', aggregateType: 'task', aggregateId: task.id, actorId, payload: { from: task.status, to: nextStatus }, now }));
  return updated;
}

export const taskTransitions = transitions;
