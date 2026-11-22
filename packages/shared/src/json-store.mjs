import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const writeQueues = new Map();

export async function loadJsonStore(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; return structuredClone(fallback); }
}

export function saveJsonStore(file, value) {
  const previous = writeQueues.get(file) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    await rename(temp, file);
  });
  writeQueues.set(file, next.finally(() => { if (writeQueues.get(file) === next) writeQueues.delete(file); }));
  return next;
}
