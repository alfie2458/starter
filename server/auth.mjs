import { resolveIdentity } from './identity.mjs';

export async function authorize(req, config) {
  if (req.url?.startsWith('/health')) return { ok: true, actorId: 'health-check', identity: { kind: 'health', actorId: 'health-check', role: 'system' } };
  const identity = await resolveIdentity(req, config);
  if (identity.ok === false) return identity;
  return { ok: true, actorId: identity.actorId, identity };
}
