import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.mjs';
import { createMemoryStore } from '../packages/shared/src/memory-store.mjs';

async function withServer(store, fn) {
  const app = createApp({ store, config: { requireWorkspaceAuth: true, allowInsecureLocal: true, identityMode: 'service', apiToken: 'auth-token', rateLimit: 0 } });
  await new Promise(resolve => app.server.listen(0, resolve));
  try { return await fn(`http://127.0.0.1:${app.server.address().port}`); }
  finally { await new Promise(resolve => app.server.close(resolve)); }
}

const headers = { authorization: 'Bearer auth-token', 'content-type': 'application/json' };

test('task transition cannot use an authorized workspace selector to mutate another workspace', async () => {
  const store = createMemoryStore();
  store.tasks.push({ id: 'task-b', workspace_id: 'workspace-b', title: 'secret', status: 'inbox', version: 1, description: '', priority: 'normal', labels: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(), archived_at: null });
  await withServer(store, async base => {
    const response = await fetch(`${base}/tasks/task-b/transition?workspace_id=workspace-a`, { method: 'POST', headers, body: JSON.stringify({ workspace_id: 'workspace-a', status: 'todo' }) });
    assert.equal(response.status, 404);
    assert.equal(store.tasks[0].status, 'inbox');
  });
});

test('study plan cannot read an exam from another workspace', async () => {
  const store = createMemoryStore();
  store.exams.push({ id: 'exam-b', workspace_id: 'workspace-b', title: 'secret', exam_type: 'quiz', exam_at: new Date().toISOString(), timezone: 'UTC', scope: { subjects: [] }, status: 'draft', created_at: new Date().toISOString(), version: 1 });
  await withServer(store, async base => {
    const response = await fetch(`${base}/study-plans`, { method: 'POST', headers, body: JSON.stringify({ workspace_id: 'workspace-a', exam_id: 'exam-b', learner_id: 'member-a' }) });
    assert.equal(response.status, 404);
    assert.equal(store.studyPlans.length, 0);
  });
});
