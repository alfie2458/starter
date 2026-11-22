export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT ?? 3000),
    apiToken: env.STARGRID_API_TOKEN ?? '',
    allowInsecureLocal: env.STARGRID_ALLOW_INSECURE_LOCAL === 'true',
    dataFile: env.STARGRID_DATA_FILE ?? '',
    maxBodyBytes: Number(env.STARGRID_MAX_BODY_BYTES ?? 1024 * 1024),
    rateLimit: Number(env.STARGRID_RATE_LIMIT ?? 120),
    rateWindowMs: Number(env.STARGRID_RATE_WINDOW_MS ?? 60_000),
  };
}
