import { randomUUID } from 'node:crypto';

export function createEventQueue({ pending = [], deadLetters = [], maxAttempts = 3 } = {}) {
  return {
    pending, deadLetters, maxAttempts,
    enqueue(event) { const item = { id: randomUUID(), event, attempts: 0, status: 'pending', enqueued_at: new Date().toISOString() }; this.pending.push(item); return item; },
    async drain(handler) {
      const results = [];
      for (const item of [...this.pending.filter(entry => entry.status === 'pending')]) {
        item.attempts += 1;
        try { await handler(item.event); item.status = 'delivered'; results.push(item); }
        catch (error) { item.error = error.code ?? 'EVENT_DELIVERY_FAILED'; if (item.attempts >= this.maxAttempts) { item.status = 'dead_letter'; this.deadLetters.push(item); } results.push(item); }
      }
      this.pending = this.pending.filter(item => item.status === 'pending'); return results;
    }
  };
}
