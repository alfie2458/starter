export async function withBoundedRetry(operation, { attempts = 3, baseDelayMs = 25, shouldRetry = () => true, onRetry = () => {} } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try { return await operation(attempt); }
    catch (error) { lastError = error; if (attempt >= attempts || !shouldRetry(error, attempt)) throw error; onRetry({ attempt, error }); await new Promise(resolve => setTimeout(resolve, baseDelayMs * (2 ** (attempt - 1)))); }
  }
  throw lastError;
}
