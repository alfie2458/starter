import { createApp } from './app.mjs';
import { loadConfig } from './config.mjs';
import { createMemoryStore } from '../packages/shared/src/memory-store.mjs';

const config = loadConfig();
const { server } = createApp({ config, store: createMemoryStore() });
server.listen(config.port, () => console.log(`STARGRID API listening on :${config.port}`));
