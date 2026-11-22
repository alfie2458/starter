import { randomUUID } from 'node:crypto';
import { validateAutomation } from './registry.mjs';

export function createAutomationExecutor({ notificationAdapter, calendarAdapter } = {}) {
  return {
    async execute(automation, context = {}) {
      validateAutomation(automation);
      const run = { id: randomUUID(), automation_id: automation.id, automation_version: automation.version, idempotency_key: context.idempotency_key ?? randomUUID(), status: 'running', started_at: new Date().toISOString() };
      const results = [];
      for (const action of automation.actions) {
        if (action.type === 'notification.enqueue') results.push(notificationAdapter?.enqueue(action.payload ?? {}));
        else if (action.type === 'calendar_event.create') results.push(await calendarAdapter?.create(action.payload ?? {}));
        else results.push({ accepted: true, action: action.type, mode: 'contract_only' });
      }
      return { ...run, status: 'succeeded', finished_at: new Date().toISOString(), results };
    }
  };
}
