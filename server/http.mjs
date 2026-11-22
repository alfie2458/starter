import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

export function json(res, status, body, headers = {}) {
  if (res.writableEnded) return;
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...headers });
  res.end(JSON.stringify(body));
}

export async function readBody(req, maxBytes = 1024 * 1024) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > maxBytes) { const error = new Error('BODY_TOO_LARGE'); error.statusCode = 413; throw error; } }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { const error = new Error('INVALID_JSON'); error.statusCode = 400; throw error; }
}

export function createHttpServer(handler, { authorize, rateLimit, maxBodyBytes = 1024 * 1024, requestTimeoutMs = 15_000, metrics, logger } = {}) {
  return createServer(async (req, res) => {
    const started = Date.now(); const requestId = req.headers['x-request-id']?.toString().slice(0, 100) || randomUUID();
    res.setHeader('x-request-id', requestId); req.setTimeout(requestTimeoutMs, () => { if (!res.writableEnded) json(res, 408, { error: 'REQUEST_TIMEOUT', request_id: requestId }); req.destroy(); });
    try {
      const auth = await (authorize?.(req) ?? { ok: true, actorId: 'anonymous' });
      if (!auth.ok) return json(res, auth.statusCode ?? 401, { error: auth.error, request_id: requestId });
      const clientKey = req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
      const quota = rateLimit?.(`${auth.actorId ?? 'anonymous'}:${clientKey}`);
      if (quota && !quota.allowed) return json(res, 429, { error: 'RATE_LIMITED', request_id: requestId }, { 'retry-after': String(Math.ceil((quota.retryAfterMs ?? 1000) / 1000)) });
      req.context = { requestId, actorId: auth.actorId, identity: auth.identity };
      await handler(req, res, { readBody: (request) => readBody(request, maxBodyBytes) });
      metrics?.increment('http.requests.total'); metrics?.observe(`http.request.${req.method}`, Date.now() - started);
      logger?.info('http.request', { request_id: requestId, method: req.method, path: req.url, status: res.statusCode });
    } catch (error) {
      metrics?.increment('http.errors.total'); logger?.error('http.error', { request_id: requestId, code: error.code ?? error.message });
      json(res, error.statusCode ?? 500, { error: error.code ?? error.message ?? 'INTERNAL_ERROR', request_id: requestId });
    }
  });
}
