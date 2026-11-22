import { DomainError } from '../../../packages/shared/src/errors.mjs';

export function validateCalendarEvent(input) {
  if (!input || typeof input !== 'object') throw new DomainError('INVALID_CALENDAR_EVENT', 'Calendar event must be an object');
  for (const field of ['workspace_id', 'title', 'start_at', 'end_at', 'timezone']) if (typeof input[field] !== 'string' || !input[field]) throw new DomainError('INVALID_CALENDAR_EVENT', `${field} is required`);
  if (input.all_day !== undefined && typeof input.all_day !== 'boolean') throw new DomainError('INVALID_CALENDAR_EVENT', 'all_day must be boolean');
  if (Date.parse(input.end_at) <= Date.parse(input.start_at)) throw new DomainError('INVALID_CALENDAR_RANGE', 'end_at must be later than start_at');
  return input;
}
