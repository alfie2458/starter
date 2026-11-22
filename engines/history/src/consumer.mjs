import { appendAudit, createAuditEvent } from '../../../packages/shared/src/audit.mjs';

export function createHistoryConsumer(auditStore) {
  return async function consume(event) {
    const audit = createAuditEvent({ workspaceId: event.workspace_id, actorId: event.actor_id, action: event.type, aggregateType: event.aggregate_type, aggregateId: event.aggregate_id, metadata: { correlation_id: event.correlation_id, payload_schema_version: event.payload_schema_version } });
    appendAudit({ audit: auditStore }, audit);
    return audit;
  };
}
