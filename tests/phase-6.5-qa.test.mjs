import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApp } from '../server/app.mjs';
import { requireWorkspaceAccess } from '../server/workspace-auth.mjs';
import { DomainError } from '../packages/shared/src/errors.mjs';
import { createMemoryStore } from '../packages/shared/src/memory-store.mjs';
import { loadJsonStore, saveJsonStore } from '../packages/shared/src/json-store.mjs';
import { dispatchWithFallback } from '../engines/agent-orchestration/src/dispatcher.mjs';
import { reserveQuota, settleQuota } from '../engines/agent-orchestration/src/quota.mjs';

const execFileAsync = promisify(execFile);
const repoRoot = new URL('..', import.meta.url).pathname;

async function withServer(store, fn) {
  const app = createApp({
    store,
    config: {
      requireWorkspaceAuth: true,
      allowInsecureLocal: true,
      identityMode: 'service',
      apiToken: 'qa-token',
      rateLimit: 100,
    },
  });
  await new Promise(resolve => app.server.listen(0, resolve));
  try {
    return await fn(`http://127.0.0.1:${app.server.address().port}`);
  } finally {
    await new Promise(resolve => app.server.close(resolve));
  }
}

const headers = {
  authorization: 'Bearer qa-token',
  'content-type': 'application/json',
};

function task(id, workspace_id, status = 'inbox') {
  const now = new Date().toISOString();
  return { id, workspace_id, title: id, status, version: 1, description: '', priority: 'normal', labels: [], created_at: now, updated_at: now, archived_at: null };
}

test('all JavaScript modules pass Node syntax checking', async () => {
  const { stdout } = await execFileAsync('find', ['server', 'engines', 'packages', 'scripts', 'tests', '-type', 'f', '-name', '*.mjs', '-print'], { cwd: repoRoot });
  const files = stdout.trim().split('\n').filter(Boolean);
  assert.ok(files.length > 0);
  for (const file of files) await execFileAsync(process.execPath, ['--check', file], { cwd: repoRoot });
});

test('workspace authorization permits active members and rejects non-members', () => {
  const store = { members: [{ workspace_id: 'w1', github_user_id: '42', status: 'active', role: 'member' }] };
  const identity = { kind: 'github', actorId: 'github:42', github_user_id: '42' };
  assert.equal(requireWorkspaceAccess({ store, identity, workspaceId: 'w1' }).role, 'member');
  assert.throws(
    () => requireWorkspaceAccess({ store, identity, workspaceId: 'w2' }),
    error => error instanceof DomainError && error.code === 'WORKSPACE_FORBIDDEN',
  );
});

test('API integration enforces workspace requirement and cross-workspace isolation', async () => {
  const store = createMemoryStore();
  store.tasks.push(task('task-w1', 'w1'), task('task-w2', 'w2'));
  store.events.push({ id: 'event-w1', workspace_id: 'w1' }, { id: 'event-w2', workspace_id: 'w2' });
  await withServer(store, async base => {
    const serviceList = await fetch(`${base}/tasks`, { headers });
    assert.equal(serviceList.status, 200);
    assert.deepEqual((await serviceList.json()).map(item => item.id), ['task-w1', 'task-w2']);

    const list = await fetch(`${base}/tasks?workspace_id=w1`, { headers });
    assert.equal(list.status, 200);
    assert.deepEqual((await list.json()).map(item => item.id), ['task-w1']);

    const hidden = await fetch(`${base}/tasks/task-w2?workspace_id=w1`, { headers });
    assert.equal(hidden.status, 404);

    const events = await fetch(`${base}/events?workspace_id=w1`, { headers });
    assert.equal(events.status, 200);
    assert.deepEqual((await events.json()).map(item => item.id), ['event-w1']);

    const transition = await fetch(`${base}/tasks/task-w2/transition?workspace_id=w1`, {
      method: 'POST', headers, body: JSON.stringify({ workspace_id: 'w1', status: 'done' }),
    });
    assert.equal(transition.status, 404);
    assert.equal(store.tasks.find(item => item.id === 'task-w2').status, 'inbox');
  });
});

test('agent selection and dispatch cannot use another workspace agent', async () => {
  const store = createMemoryStore();
  store.agents.push(
    { id: 'shared', workspace_id: null, provider: 'fixture', model: 'shared', execution_mode: 'mock', status: 'normal', capabilities: ['summarize'], priority: 10, tpm_limit: 100 },
    { id: 'w1-agent', workspace_id: 'w1', provider: 'fixture', model: 'w1', execution_mode: 'mock', status: 'normal', capabilities: ['summarize'], priority: 1, tpm_limit: 100 },
    { id: 'w2-agent', workspace_id: 'w2', provider: 'fixture', model: 'w2', execution_mode: 'mock', status: 'normal', capabilities: ['summarize'], priority: 1, tpm_limit: 100 },
  );
  await withServer(store, async base => {
    const select = await fetch(`${base}/agents/select`, { method: 'POST', headers, body: JSON.stringify({ workspace_id: 'w1', capability: 'summarize' }) });
    assert.equal(select.status, 200);
    assert.equal((await select.json()).id, 'w1-agent');
    const dispatch = await fetch(`${base}/agents/dispatch`, { method: 'POST', headers, body: JSON.stringify({ workspace_id: 'w1', capability: 'summarize', tokens: 1, window: 'agent-isolation' }) });
    assert.equal(dispatch.status, 201);
    assert.equal((await dispatch.json()).agent.id, 'w1-agent');
  });
});

test('agent quota reserves, commits, and rejects over-limit requests', () => {
  const agent = { id: 'agent-a', tpm_limit: 10 };
  const ledger = [];
  const reservation = reserveQuota(agent, { tokens: 6, window: '2026-11-23T17' }, ledger, '2026-11-23T17:00:00.000Z');
  assert.equal(reservation.status, 'reserved');
  settleQuota(reservation, ledger, 'committed');
  assert.equal(ledger[0].status, 'committed');
  assert.throws(() => reserveQuota(agent, { tokens: 5, window: '2026-11-23T17' }, ledger), error => error.code === 'QUOTA_EXCEEDED');
});

test('agent dispatch falls back after invocation failure and releases failed quota', async () => {
  const registry = [
    { id: 'primary', status: 'normal', capabilities: ['summarize'], priority: 1, tpm_limit: 100 },
    { id: 'fallback', status: 'normal', capabilities: ['summarize'], priority: 2, tpm_limit: 100 },
  ];
  const quota = [];
  const invoked = [];
  const result = await dispatchWithFallback({
    registry, quotaLedger: quota, capability: 'summarize', tokens: 3, window: 'fixed-window', fallback: ['fallback'],
    invoke: async agent => { invoked.push(agent.id); if (agent.id === 'primary') throw new Error('provider unavailable'); return { ok: true }; },
  });
  assert.equal(result.agent.id, 'fallback');
  assert.deepEqual(invoked, ['primary', 'fallback']);
  assert.deepEqual(quota.map(item => [item.agent_id, item.status]), [['primary', 'released'], ['fallback', 'committed']]);
});

test('JSON persistence writes valid data and supports concurrent last-write ordering', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stargrid-qa-'));
  const file = join(dir, 'nested', 'store.json');
  try {
    const fallback = createMemoryStore();
    const initial = await loadJsonStore(file, fallback);
    assert.deepEqual(initial, fallback);
    await Promise.all([
      saveJsonStore(file, { revision: 1, tasks: [] }),
      saveJsonStore(file, { revision: 2, tasks: [task('persisted', 'w1')] }),
    ]);
    const loaded = await loadJsonStore(file, {});
    assert.equal(loaded.revision, 2);
    assert.equal(loaded.tasks[0].id, 'persisted');
    assert.equal((await readFile(file, 'utf8')).endsWith('\n'), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('agent registry rejects invalid status, limits, and capabilities', async () => {
  const { registerAgent } = await import('../engines/agent-orchestration/src/registry.mjs');
  assert.throws(() => registerAgent({ provider: 'p', model: 'm', capabilities: ['x'], status: 'unknown' }), error => error.code === 'INVALID_AGENT_STATUS');
  assert.throws(() => registerAgent({ provider: 'p', model: 'm', capabilities: ['x'], tpm_limit: -1 }), error => error.code === 'INVALID_AGENT_LIMIT');
  assert.throws(() => registerAgent({ provider: 'p', model: 'm', capabilities: [null] }), error => error.code === 'INVALID_AGENT_CAPABILITIES');
});

test('agent API redacts credentials and identifies mock invocation with audit records', async () => {
  const store = createMemoryStore();
  store.agents.push({ id: 'mock-agent', workspace_id: 'w1', provider: 'fixture', model: 'fixture-v1', execution_mode: 'mock', status: 'normal', capabilities: ['summarize'], priority: 1, tpm_limit: 100, api_key: 'must-not-leak' });
  await withServer(store, async base => {
    const select = await fetch(`${base}/agents/select`, { method: 'POST', headers, body: JSON.stringify({ workspace_id: 'w1', capability: 'summarize' }) });
    assert.equal(select.status, 200);
    assert.equal((await select.json()).api_key, undefined);
    const dispatch = await fetch(`${base}/agents/dispatch`, { method: 'POST', headers, body: JSON.stringify({ workspace_id: 'w1', capability: 'summarize', tokens: 2, window: 'qa-window', input_ref: 'opaque-ref' }) });
    assert.equal(dispatch.status, 201);
    const result = await dispatch.json();
    assert.equal(result.output.execution_mode, 'mock');
    assert.equal(result.output.provider_kind, 'mock');
    assert.equal(result.agent.api_key, undefined);
    assert.equal(store.audit.at(-1).action, 'agent.invocation');
    assert.equal(store.audit.at(-1).metadata.execution_mode, 'mock');
    assert.equal(store.audit.at(-1).metadata.input_ref, undefined);
  });
});

test('explicit fallback must support the requested capability', async () => {
  const registry = [
    { id: 'primary', status: 'normal', capabilities: ['summarize'], priority: 1, tpm_limit: 100 },
    { id: 'wrong-capability', status: 'normal', capabilities: ['translate'], priority: 2, tpm_limit: 100 },
  ];
  await assert.rejects(() => dispatchWithFallback({ registry, quotaLedger: [], capability: 'summarize', tokens: 1, window: 'qa-window', fallback: ['wrong-capability'], invoke: async () => { throw new Error('primary failed'); } }), /primary failed/);
});
