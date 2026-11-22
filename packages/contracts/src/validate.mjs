import { DomainError } from '../../shared/src/errors.mjs';

export function requireFields(value, fields, label = 'object') {
  if (!value || typeof value !== 'object') throw new DomainError('INVALID_OBJECT', `${label} must be an object`);
  for (const field of fields) if (value[field] === undefined || value[field] === null || value[field] === '') throw new DomainError('MISSING_FIELD', `${label}.${field} is required`, { field });
  return value;
}

export function validateStatus(value, field, allowed) {
  if (!allowed.includes(value[field])) throw new DomainError('INVALID_STATUS', `${field} must be one of ${allowed.join(', ')}`, { field, allowed });
  return value;
}
