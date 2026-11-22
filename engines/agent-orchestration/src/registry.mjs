import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../packages/shared/src/errors.mjs';

const statuses = new Set(['normal','observed','limited','paused','disabled']);

export function registerAgent(input) {
  if (!input?.provider || !input?.model) throw new DomainError('INVALID_AGENT', 'provider and model are required');
  if (!Array.isArray(input.capabilities) || input.capabilities.length === 0) throw new DomainError('INVALID_AGENT_CAPABILITIES', 'capabilities are required');
  return { id: input.id ?? randomUUID(), provider: input.provider, model: input.model, status: input.status ?? 'normal', capabilities: [...new Set(input.capabilities)], rpm_limit: input.rpm_limit ?? 0, tpm_limit: input.tpm_limit ?? 0, priority: input.priority ?? 100, version: 1, created_at: new Date().toISOString() };
}

export function publicAgent(agent) { const { secret, api_key, ...safe } = agent; return safe; }
export function assertAgentStatus(agent) { if (!statuses.has(agent.status)) throw new DomainError('INVALID_AGENT_STATUS', 'agent status is not allowed'); return agent; }
export const agentStatuses = [...statuses];
