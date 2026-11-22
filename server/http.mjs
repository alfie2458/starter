import { createServer } from 'node:http';

export function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

export async function readBody(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { const error = new Error('INVALID_JSON'); error.statusCode = 400; throw error; }
}

export function createHttpServer(handler) {
  return createServer(async (req, res) => {
    try { await handler(req, res); }
    catch (error) { json(res, error.statusCode ?? 500, { error: error.code ?? error.message ?? 'INTERNAL_ERROR' }); }
  });
}
