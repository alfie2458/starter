import { randomUUID } from 'node:crypto';

export function createCoordinationEvent({ workspaceId, type, aggregateType, aggregateId, payload, actorId = 'system', correlationId = randomUUID(), now = new Date().toISOString() }) {
  return { id: randomUUID(), workspace_id: workspaceId, type, aggregate_type: aggregateType, aggregate_id: aggregateId, payload_schema_version: '1.0', payload, occurred_at: now, actor_id: actorId, correlation_id: correlationId };
}

export function appendEvent(store, event) {
  if (store.some(item => item.id === event.id)) return { accepted: false, reason: 'duplicate_id' };
  if (store.some(item => item.correlation_id === event.correlation_id && item.type === event.type && item.aggregate_id === event.aggregate_id)) return { accepted: false, reason: 'duplicate_correlation' };
  store.push(Object.freeze(event));
  return { accepted: true, event };
}
