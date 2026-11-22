import { randomUUID } from 'node:crypto';
import { assert } from '../../../packages/shared/src/errors.mjs';

export function selectAgent(registry, requiredCapability) {
  const candidates = registry.filter(agent => agent.status === 'normal' && agent.capabilities.includes(requiredCapability));
  assert(candidates.length > 0, 'NO_AGENT_AVAILABLE', `No active agent supports ${requiredCapability}`);
  return candidates.sort((a,b) => (a.priority ?? 100) - (b.priority ?? 100))[0];
}

export function reserveQuota(agent, request, ledger) {
  const used = ledger.filter(item => item.agent_id === agent.id && item.window === request.window).reduce((sum,item) => sum + item.tokens, 0);
  assert(used + request.tokens <= (agent.tpm_limit ?? Infinity), 'QUOTA_EXCEEDED', 'Agent quota exceeded');
  const reservation = { id: randomUUID(), agent_id: agent.id, window: request.window, tokens: request.tokens, status: 'reserved', created_at: new Date().toISOString() };
  ledger.push(reservation);
  return reservation;
}
