const cache = new Map();

export function bearerToken(req) {
  const value = req.headers.authorization ?? '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

export async function resolveIdentity(req, config) {
  const token = bearerToken(req);
  if (config.apiToken && token === config.apiToken) return { kind: 'service', actorId: 'api-token', github_user_id: config.serviceGithubUserId ?? null, role: config.serviceRole ?? 'admin' };
  if (config.identityMode !== 'github' || !token) return config.allowInsecureLocal ? { kind: 'local', actorId: 'local-development', role: 'admin' } : { ok: false, statusCode: 401, error: 'UNAUTHORIZED' };
  if (cache.has(token)) return cache.get(token);
  const response = await fetch(`${config.githubApiBase}/user`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'stargrid-api' } });
  if (!response.ok) return { ok: false, statusCode: 401, error: 'INVALID_GITHUB_IDENTITY' };
  const user = await response.json();
  const identity = { kind: 'github', actorId: `github:${user.id}`, github_user_id: String(user.id), login: user.login, role: 'member' };
  cache.set(token, identity); return identity;
}
