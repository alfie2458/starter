export function createMetrics() {
  const counters = new Map(); const timings = new Map();
  return {
    increment(name, value = 1) { counters.set(name, (counters.get(name) ?? 0) + value); },
    observe(name, milliseconds) { const values = timings.get(name) ?? []; values.push(milliseconds); timings.set(name, values.slice(-1000)); },
    snapshot() { return { counters: Object.fromEntries(counters), timings: Object.fromEntries([...timings].map(([key, values]) => [key, { count: values.length, avg_ms: values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0, max_ms: Math.max(0, ...values) }])) }; }
  };
}

export function createLogger() {
  return { info(event, fields = {}) { console.log(JSON.stringify({ level: 'info', event, ...safeFields(fields), at: new Date().toISOString() })); }, error(event, fields = {}) { console.error(JSON.stringify({ level: 'error', event, ...safeFields(fields), at: new Date().toISOString() })); } };
}
function safeFields(fields) { const copy = { ...fields }; for (const key of ['authorization','token','api_key','secret','password']) if (key in copy) copy[key] = '[REDACTED]'; return copy; }
