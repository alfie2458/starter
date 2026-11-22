import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { createMemoryStore } from '../packages/shared/src/memory-store.mjs';
import { loadJsonStore, saveJsonStore } from '../packages/shared/src/json-store.mjs';
import { validateRuntimeConfig } from './config-validation.mjs';
import { installGracefulShutdown } from './shutdown.mjs';

const config = validateRuntimeConfig(loadConfig());
const fallback = createMemoryStore();
const store = config.dataFile ? await loadJsonStore(config.dataFile, fallback) : fallback;
for (const key of ['members', 'eventQueue', 'deadLetters']) if (!Array.isArray(store[key])) store[key] = [];
for (const key of ['members', 'eventQueue', 'deadLetters']) if (!Array.isArray(store[key])) store[key] = [];
const persist = config.dataFile ? (next) => saveJsonStore(config.dataFile, next) : async () => {};
const { server } = createApp({ config, store, persist });
server.listen(config.port, () => console.log(`STARGRID API listening on :${config.port}`));
installGracefulShutdown({ server, close: async () => { if (config.dataFile) await saveJsonStore(config.dataFile, store); } });
