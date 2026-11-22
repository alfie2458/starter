import { timingSafeEqual } from 'node:crypto';

function sameSecret(actual, expected) {
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authorize(req, config) {
  if (req.url?.startsWith('/health')) return { ok: true, actorId: 'health-check' };
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (config.apiToken && sameSecret(token, config.apiToken)) return { ok: true, actorId: 'api-token' };
  if (!config.apiToken && config.allowInsecureLocal) return { ok: true, actorId: 'local-development' };
  return { ok: false, statusCode: config.apiToken ? 401 : 503, error: config.apiToken ? 'UNAUTHORIZED' : 'AUTH_NOT_CONFIGURED' };
}
