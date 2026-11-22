import { createEventBus } from '../packages/shared/src/event-bus.mjs';
import { createHistoryConsumer } from '../engines/history/src/consumer.mjs';
import { withBoundedRetry } from '../packages/shared/src/retry.mjs';

export function createIntegrationHub(store) {
  const bus = createEventBus({ eventStore: store.events, auditStore: store.audit });
  bus.on('task.created', createHistoryConsumer(store.audit));
  bus.on('task.status_changed', createHistoryConsumer(store.audit));
  bus.on('calendar.created', createHistoryConsumer(store.audit));
  bus.on('notification.queued', createHistoryConsumer(store.audit));
  bus.on('automation.executed', createHistoryConsumer(store.audit));
  return {
    bus,
    async publish(event, context) { return withBoundedRetry(() => bus.publish(event, context), { attempts: 2, shouldRetry: error => error?.code !== 'UNAUTHORIZED' }); },
  };
}
