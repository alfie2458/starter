import { assert } from '../../../packages/shared/src/errors.mjs';

export function awardPoints(event, ledger, limits = { xp: 500, coin: 100 }) {
  assert(event?.member_id && event?.event_type && Number.isInteger(event.points), 'INVALID_POINT_EVENT', 'Point event is incomplete');
  if (ledger.some(item => item.id === event.id)) return { accepted: false, reason: 'duplicate' };
  const today = event.occurred_at.slice(0, 10);
  const total = ledger.filter(item => item.member_id === event.member_id && item.currency === event.currency && item.occurred_at.startsWith(today)).reduce((sum,item) => sum + item.points, 0);
  const limit = limits[event.currency] ?? 0;
  if (total + event.points > limit) return { accepted: false, reason: 'daily_limit' };
  ledger.push(Object.freeze(event));
  return { accepted: true, event };
}

export function balance(ledger, memberId, currency) { return ledger.filter(item => item.member_id === memberId && item.currency === currency).reduce((sum,item) => sum + item.points, 0); }
