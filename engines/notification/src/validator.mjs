import { DomainError } from '../../../packages/shared/src/errors.mjs';

export function validateNotification(input) {
  if (!input || typeof input !== 'object') throw new DomainError('INVALID_NOTIFICATION', 'Notification must be an object');
  if (typeof input.workspace_id !== 'string' || typeof input.recipient_id !== 'string' || typeof input.message !== 'string') throw new DomainError('INVALID_NOTIFICATION', 'workspace_id, recipient_id and message are required');
  if (input.message.length > 4000) throw new DomainError('INVALID_NOTIFICATION', 'message is too long');
  return input;
}
