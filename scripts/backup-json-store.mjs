import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const source = process.argv[2] ?? process.env.STARGRID_DATA_FILE;
const destination = process.argv[3] ?? process.env.STARGRID_BACKUP_DIR;
if (!source || !destination) throw new Error('Usage: node scripts/backup-json-store.mjs <data-file> <backup-dir>');
const info = await stat(source); if (!info.isFile()) throw new Error('STARGRID_DATA_FILE is not a regular file');
await mkdir(destination, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replaceAll(':','-');
const target = join(destination, `${basename(source)}.${stamp}.bak`);
await copyFile(source, target);
console.log(JSON.stringify({ backup: target, bytes: info.size }));
