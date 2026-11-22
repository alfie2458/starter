export function readiness(store, config) {
  const checks = { store: Boolean(store), auth: Boolean(config?.apiToken || config?.allowInsecureLocal), collections: Array.isArray(store?.tasks) && Array.isArray(store?.events) };
  return { ready: Object.values(checks).every(Boolean), checks };
}

export function redactLog(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.replace(/(authorization|api[_-]?key|token|secret|password)\s*[:=]\s*[^,} ]+/gi, '$1:[REDACTED]');
}
