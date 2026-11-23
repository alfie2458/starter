import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../packages/shared/src/errors.mjs';

const statuses = new Set(['normal','observed','limited','paused','disabled']);

export function registerAgent(input) {
  if (!input?.provider || !input?.model) throw new DomainError('INVALID_AGENT', 'provider and model are required');
  if (!Array.isArray(input.capabilities) || input.capabilities.length === 0) throw new DomainError('INVALID_AGENT_CAPABILITIES', 'capabilities are required');
  const status = input.status ?? 'normal';
  assertAgentStatus({ status });
  for (const field of ['rpm_limit', 'tpm_limit', 'priority']) {
    const value = input[field] ?? (field === 'priority' ? 100 : 0);
    if (!Number.isInteger(value) || (field !== 'priority' && value < 0)) throw new DomainError('INVALID_AGENT_LIMIT', `${field} must be an integer with a non-negative limit`);
  }
  if (input.capabilities.some(capability => typeof capability !== 'string' || capability.length === 0)) throw new DomainError('INVALID_AGENT_CAPABILITIES', 'capabilities must be non-empty strings');
  return { id: input.id ?? randomUUID(), workspace_id: input.workspace_id ?? null, provider: input.provider, model: input.model, execution_mode: input.execution_mode ?? 'mock', status, capabilities: [...new Set(input.capabilities)], rpm_limit: input.rpm_limit ?? 0, tpm_limit: input.tpm_limit ?? 0, priority: input.priority ?? 100, version: 1, created_at: new Date().toISOString() };
}

export function publicAgent(agent) { const { secret, api_key, apiKey, token, access_token, ...safe } = agent; return safe; }
export function assertAgentStatus(agent) { if (!statuses.has(agent.status)) throw new DomainError('INVALID_AGENT_STATUS', 'agent status is not allowed'); return agent; }
export const agentStatuses = [...statuses];
