import { randomUUID } from 'node:crypto';

export function evaluateAchievements({ memberId, ledger, rules = [] }) {
  const earned = [];
  for (const rule of rules) {
    const points = ledger.filter(item => item.member_id === memberId && item.event_type === rule.event_type).reduce((sum,item) => sum + item.points, 0);
    if (points >= rule.threshold) earned.push({ id: randomUUID(), member_id: memberId, achievement_id: rule.id, rule_version: rule.version ?? '1.0', earned_at: new Date().toISOString() });
  }
  return earned;
}
