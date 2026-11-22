import { access, copyFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
const backup = process.argv[2]; const target = process.argv[3] ?? process.env.STARGRID_DATA_FILE;
if (!backup || !target) throw new Error('Usage: node scripts/restore-json-store.mjs <backup-file> <data-file>');
await access(backup); await mkdir(dirname(target), { recursive: true });
const temp = `${target}.restore-${process.pid}`; await copyFile(backup, temp); await rename(temp, target);
console.log(JSON.stringify({ restored: target, source: backup }));
