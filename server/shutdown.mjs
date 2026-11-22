export function installGracefulShutdown({ server, close = async () => {}, logger = console }) {
  let closing = false;
  const shutdown = async signal => {
    if (closing) return; closing = true; logger.info(`STARGRID shutdown requested: ${signal}`);
    const force = setTimeout(() => process.exit(1), 10_000); force.unref();
    await new Promise(resolve => server.close(resolve));
    await close(); clearTimeout(force); process.exit(0);
  };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
  return shutdown;
}
