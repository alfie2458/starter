import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

export async function readBody(req, maxBytes = 1024 * 1024) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > maxBytes) { const error = new Error('BODY_TOO_LARGE'); error.statusCode = 413; throw error; } }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { const error = new Error('INVALID_JSON'); error.statusCode = 400; throw error; }
}

export function createHttpServer(handler, { authorize, rateLimit, maxBodyBytes = 1024 * 1024 } = {}) {
  return createServer(async (req, res) => {
    const requestId = req.headers['x-request-id']?.toString().slice(0, 100) || randomUUID();
    res.setHeader('x-request-id', requestId);
    try {
      const auth = authorize?.(req) ?? { ok: true, actorId: 'anonymous' };
      if (!auth.ok) return json(res, auth.statusCode ?? 401, { error: auth.error, request_id: requestId });
      const clientKey = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      const quota = rateLimit?.(clientKey);
      if (quota && !quota.allowed) return json(res, 429, { error: 'RATE_LIMITED', request_id: requestId }, { 'retry-after': String(Math.ceil((quota.retryAfterMs ?? 1000) / 1000)) });
      req.context = { requestId, actorId: auth.actorId };
      await handler(req, res, { readBody: (request) => readBody(request, maxBodyBytes) });
    } catch (error) { json(res, error.statusCode ?? 500, { error: error.code ?? error.message ?? 'INTERNAL_ERROR', request_id: requestId }); }
  });
}
