import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../packages/shared/src/errors.mjs';

export function reserveQuota(agent, request, ledger, now = new Date().toISOString()) {
  if (!Number.isInteger(request?.tokens) || request.tokens < 0 || !request.window) throw new DomainError('INVALID_QUOTA_REQUEST', 'tokens must be a non-negative integer and window is required');
  const used = ledger.filter(item => item.agent_id === agent.id && item.window === request.window && item.status !== 'released').reduce((sum,item) => sum + item.tokens, 0);
  if (agent.tpm_limit > 0 && used + request.tokens > agent.tpm_limit) throw new DomainError('QUOTA_EXCEEDED', 'agent token quota exceeded');
  const reservation = { id: randomUUID(), agent_id: agent.id, window: request.window, tokens: request.tokens, status: 'reserved', created_at: now };
  ledger.push(reservation); return reservation;
}
export function settleQuota(reservation, ledger, status = 'committed') {
  const item = ledger.find(entry => entry.id === reservation.id);
  if (!item) throw new DomainError('RESERVATION_NOT_FOUND', 'quota reservation not found');
  if (!['committed','released'].includes(status)) throw new DomainError('INVALID_QUOTA_SETTLEMENT', 'invalid quota settlement');
  item.status = status; item.settled_at = new Date().toISOString(); return item;
}
