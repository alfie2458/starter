import { DomainError } from '../packages/shared/src/errors.mjs';

export function validateRuntimeConfig(config) {
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new DomainError('INVALID_PORT', 'PORT must be between 1 and 65535');
  if (!config.apiToken && !config.allowInsecureLocal) throw new DomainError('AUTH_NOT_CONFIGURED', 'STARGRID_API_TOKEN is required outside insecure local mode');
  if (config.maxBodyBytes < 1024 || config.maxBodyBytes > 10 * 1024 * 1024) throw new DomainError('INVALID_BODY_LIMIT', 'body limit is outside the safe range');
  if (config.rateLimit < 1 || config.rateWindowMs < 1000) throw new DomainError('INVALID_RATE_LIMIT', 'rate limit configuration is invalid');
  return Object.freeze(config);
}
