export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT ?? 3000),
    apiToken: env.STARGRID_API_TOKEN ?? '',
    identityMode: env.STARGRID_IDENTITY_MODE ?? 'service',
    requireWorkspaceAuth: env.STARGRID_REQUIRE_WORKSPACE_AUTH !== 'false',
    githubApiBase: env.STARGRID_GITHUB_API_BASE ?? 'https://api.github.com',
    serviceGithubUserId: env.STARGRID_SERVICE_GITHUB_USER_ID ?? '',
    serviceRole: env.STARGRID_SERVICE_ROLE ?? 'admin',
    requestTimeoutMs: Number(env.STARGRID_REQUEST_TIMEOUT_MS ?? 15_000),
    allowInsecureLocal: env.STARGRID_ALLOW_INSECURE_LOCAL === 'true',
    dataFile: env.STARGRID_DATA_FILE ?? '',
    maxBodyBytes: Number(env.STARGRID_MAX_BODY_BYTES ?? 1024 * 1024),
    rateLimit: Number(env.STARGRID_RATE_LIMIT ?? 120),
    rateWindowMs: Number(env.STARGRID_RATE_WINDOW_MS ?? 60_000),
  };
}
