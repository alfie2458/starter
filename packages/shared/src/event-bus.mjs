import { appendEvent } from './events.mjs';

export function createEventBus({ eventStore = [], auditStore = [] } = {}) {
  const handlers = new Map();
  return {
    on(type, handler) { if (!handlers.has(type)) handlers.set(type, []); handlers.get(type).push(handler); return () => handlers.get(type).splice(handlers.get(type).indexOf(handler), 1); },
    async publish(event, context = {}) {
      const accepted = appendEvent(eventStore, event);
      if (!accepted.accepted) return { accepted: false, reason: accepted.reason };
      const results = [];
      for (const handler of handlers.get(event.type) ?? []) results.push(await handler(event, context));
      return { accepted: true, results };
    },
    events: eventStore,
    audit: auditStore,
  };
}
