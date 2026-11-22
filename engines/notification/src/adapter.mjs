import { randomUUID } from 'node:crypto';
export class NotificationAdapter {
  constructor() { this.queue = []; }
  enqueue(message) {
    const item = { id: randomUUID(), ...message, status: 'queued', created_at: new Date().toISOString() };
    this.queue.push(item);
    return item;
  }
}
