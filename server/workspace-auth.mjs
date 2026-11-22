import { DomainError } from '../packages/shared/src/errors.mjs';

export function requireWorkspaceAccess({ store, identity, workspaceId, roles = [] }) {
  if (!workspaceId) throw new DomainError('WORKSPACE_REQUIRED', 'workspace_id is required');
  if (identity?.kind === 'service' || identity?.kind === 'local') return identity;
  const member = (store.members ?? []).find(item => item.workspace_id === workspaceId && item.github_user_id === identity?.github_user_id && item.status === 'active');
  if (!member) throw new DomainError('WORKSPACE_FORBIDDEN', 'identity is not a member of this workspace');
  if (roles.length && !roles.includes(member.role)) throw new DomainError('ROLE_FORBIDDEN', 'role is not allowed for this operation');
  return { ...identity, role: member.role };
}
