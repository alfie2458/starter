import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const required = [
  'README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'CODEOWNERS',
  'docs/phase-1.md', 'packages/contracts/task.schema.json',
  'packages/contracts/automation.schema.json', '.github/workflows/ci.yml'
];
for (const file of required) await readFile(file, 'utf8');
const forbidden = new RegExp(['ghp_', 'github_pat_', 'sk-[A-Za-z0-9]', 'BEGIN (?:RSA|OPENSSH) PRIVATE KEY', 'AKIA[A-Z0-9]{16}'].join('|'));
async function walk(dir) { const out=[]; for (const e of await readdir(dir,{withFileTypes:true})) { if (['.git','node_modules'].includes(e.name)) continue; const p=join(dir,e.name); e.isDirectory()?out.push(...await walk(p)):out.push(p); } return out; }
for (const file of await walk('.')) {
  if (file === 'scripts/check-repository.mjs') continue;
  if (forbidden.test(await readFile(file,'utf8').catch(()=>''))) throw new Error(`Potential secret pattern in ${file}`);
}
console.log(`repository check passed (${required.length} required files)`);
