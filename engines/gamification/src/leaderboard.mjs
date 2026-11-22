export function buildLeaderboard(ledger, { currency = 'xp', limit = 20 } = {}) {
  const totals = new Map();
  for (const item of ledger) if (item.currency === currency) totals.set(item.member_id, (totals.get(item.member_id) ?? 0) + item.points);
  return [...totals.entries()].sort((a,b) => b[1] - a[1]).slice(0, limit).map(([member_id, points], index) => ({ rank: index + 1, member_id, points, currency }));
}
