import { randomUUID } from 'node:crypto';
import { validateAutomation } from './registry.mjs';

export function createAutomationExecutor({ notificationAdapter, calendarAdapter, runLedger = [] } = {}) {
  return {
    async execute(automation, context = {}) {
      validateAutomation(automation);
      const idempotencyKey = context.idempotency_key ?? randomUUID();
      const existing = runLedger.find(item => item.automation_id === automation.id && item.idempotency_key === idempotencyKey);
      if (existing) return { ...existing, duplicate: true };
      const run = { id: randomUUID(), automation_id: automation.id, automation_version: automation.version, idempotency_key: idempotencyKey, status: 'running', started_at: new Date().toISOString() };
      runLedger.push(run);
      const results = [];
      try {
        for (const action of automation.actions) {
          if (action.type === 'notification.enqueue') results.push(notificationAdapter?.enqueue(action.payload ?? {}));
          else if (action.type === 'calendar_event.create') results.push(await calendarAdapter?.create(action.payload ?? {}));
          else results.push({ accepted: true, action: action.type, mode: 'contract_only' });
        }
        Object.assign(run, { status: 'succeeded', finished_at: new Date().toISOString(), results });
      } catch (error) {
        Object.assign(run, { status: 'failed', finished_at: new Date().toISOString(), error_code: error.code ?? 'AUTOMATION_ACTION_FAILED' });
      }
      return run;
    }
  };
}
