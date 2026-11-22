import { randomUUID } from 'node:crypto';

export function createAuditEvent({ workspaceId, actorId = 'system', action, aggregateType, aggregateId, metadata = {}, now = new Date().toISOString() }) {
  return Object.freeze({ id: randomUUID(), workspace_id: workspaceId, actor_id: actorId, action, aggregate_type: aggregateType, aggregate_id: aggregateId, metadata, occurred_at: now });
}

export function appendAudit(store, event) {
  if (!store.audit) store.audit = [];
  if (!store.audit.some(item => item.id === event.id)) store.audit.push(event);
  return event;
}
