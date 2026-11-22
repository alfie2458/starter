import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { createMemoryStore } from '../packages/shared/src/memory-store.mjs';
import { loadJsonStore, saveJsonStore } from '../packages/shared/src/json-store.mjs';

const config = loadConfig();
const fallback = createMemoryStore();
const store = config.dataFile ? await loadJsonStore(config.dataFile, fallback) : fallback;
const persist = config.dataFile ? (next) => saveJsonStore(config.dataFile, next) : async () => {};
const { server } = createApp({ config, store, persist });
server.listen(config.port, () => console.log(`STARGRID API listening on :${config.port}`));
