import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const files = [
  ['knowledge-source.schema.json', ['id','workspace_id','kind','title','provenance','sharing','status','created_at','version']],
  ['knowledge-note.schema.json', ['id','workspace_id','source_id','title','body','status','publisher','created_at','version']],
  ['exam-notification.schema.json', ['id','workspace_id','title','exam_type','exam_at','scope','status','created_at','version']],
  ['study-plan.schema.json', ['id','workspace_id','learner_id','planner_version','items','status','created_at','version']],
];

test('Phase 2 schemas are valid JSON with explicit required fields', async () => {
  for (const [name, required] of files) {
    const schema = JSON.parse(await readFile(`packages/contracts/${name}`, 'utf8'));
    assert.equal(schema.type, 'object', name);
    assert.deepEqual(schema.required, required, name);
    assert.equal(schema.additionalProperties, false, name);
  }
});

test('publisher statuses require review-capable states', async () => {
  const schema = JSON.parse(await readFile('packages/contracts/knowledge-note.schema.json', 'utf8'));
  assert.deepEqual(schema.properties.status.enum, ['draft','needs_review','published','rejected','superseded']);
  assert.deepEqual(schema.properties.publisher.properties.kind.enum, ['human','rule-based','ai-candidate']);
});

test('exam planner preserves uncertainty state', async () => {
  const schema = JSON.parse(await readFile('packages/contracts/exam-notification.schema.json', 'utf8'));
  assert.ok(schema.properties.status.enum.includes('needs_review'));
  assert.ok(schema.properties.scope.required.includes('subjects'));
});
