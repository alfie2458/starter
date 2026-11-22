import { copyFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, join } from 'node:path';

const source = process.argv[2] ?? process.env.STARGRID_DATA_FILE;
const destination = process.argv[3] ?? process.env.STARGRID_BACKUP_DIR;
const retention = Number(process.argv[4] ?? process.env.STARGRID_BACKUP_RETENTION ?? 7);
if (!source || !destination) throw new Error('Usage: node scripts/backup-json-store.mjs <data-file> <backup-dir> [retention]');
const info = await stat(source); if (!info.isFile()) throw new Error('STARGRID_DATA_FILE is not a regular file');
const digest = createHash('sha256').update(await (await import('node:fs/promises')).readFile(source)).digest('hex');
await mkdir(destination, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replaceAll(':','-'); const target = join(destination, `${basename(source)}.${stamp}.bak`);
await copyFile(source, target); await (await import('node:fs/promises')).writeFile(`${target}.sha256`, `${digest}  ${basename(target)}\n`, { mode: 0o600 });
const backups = (await readdir(destination)).filter(name => name.endsWith('.bak')).sort().reverse();
for (const old of backups.slice(retention)) { await unlink(join(destination, old)); await unlink(join(destination, `${old}.sha256`)).catch(() => {}); }
console.log(JSON.stringify({ backup: target, sha256: digest, retained: Math.min(backups.length, retention) }));
