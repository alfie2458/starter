import { randomUUID } from 'node:crypto';
import { assert } from '../../../packages/shared/src/errors.mjs';

const roles = new Set(['member','maintainer','security_reviewer','admin']);
export function inviteMember(input) {
  assert(input?.github_user_id && input?.workspace_id, 'INVALID_INVITATION', 'GitHub user and workspace are required');
  const role = input.role ?? 'member';
  assert(roles.has(role), 'INVALID_ROLE', 'Role is not allowlisted');
  return { id: randomUUID(), workspace_id: input.workspace_id, github_user_id: input.github_user_id, status: 'invited', role, invited_at: new Date().toISOString(), version: 1 };
}
export function canManageMembers(actor) { return ['maintainer','admin'].includes(actor?.role); }
