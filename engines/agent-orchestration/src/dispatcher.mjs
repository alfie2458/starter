import { selectAgent } from './scheduler.mjs';
import { reserveQuota, settleQuota } from './quota.mjs';

export async function dispatchWithFallback({ registry, quotaLedger, capability, tokens, window, fallback = [], invoke }) {
  const candidates = [selectAgent(registry, capability), ...registry.filter(agent => fallback.includes(agent.id))].filter((agent, index, list) => list.findIndex(item => item.id === agent.id) === index);
  let lastError;
  for (const agent of candidates) {
    if (agent.status !== 'normal') continue;
    let reservation;
    try {
      reservation = reserveQuota(agent, { tokens, window }, quotaLedger);
      const output = await invoke(agent);
      settleQuota(reservation, quotaLedger, 'committed');
      return { agent, output, reservation };
    } catch (error) {
      lastError = error; if (reservation) settleQuota(reservation, quotaLedger, 'released');
    }
  }
  throw lastError ?? new Error('NO_AGENT_AVAILABLE');
}
