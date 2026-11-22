export class CalendarAdapter {
  async create(event) { return { ...event, sync_status: 'local_only' }; }
  async update(event) { return { ...event, sync_status: 'local_only' }; }
}
