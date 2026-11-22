import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../packages/shared/src/errors.mjs';

export function validatePointEvidence(event) {
  if (!event.evidence_ref || event.evidence_ref.length > 500) throw new DomainError('MISSING_POINT_EVIDENCE', 'point events require a bounded evidence reference');
  if (event.points <= 0) throw new DomainError('INVALID_POINT_VALUE', 'point awards must be positive');
  return event;
}

export function correctAward({ originalId, memberId, points, reason, actorId }, ledger) {
  if (!reason || !actorId) throw new DomainError('INVALID_CORRECTION', 'correction reason and actor are required');
  const original = ledger.find(item => item.id === originalId && item.member_id === memberId);
  if (!original) throw new DomainError('AWARD_NOT_FOUND', 'original award not found');
  const correction = { id: randomUUID(), member_id: memberId, event_type: 'correction', rule_version: '1.0', points: -Math.abs(points ?? original.points), currency: original.currency, evidence_ref: `correction:${originalId}`, correction_reason: reason, corrected_by: actorId, occurred_at: new Date().toISOString() };
  ledger.push(correction); return correction;
}
