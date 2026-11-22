import { randomUUID } from 'node:crypto';
import { assert } from '../../../packages/shared/src/errors.mjs';

export function createKnowledgeDraft({ workspaceId, sourceId, title, body, subject = '', keyPoints = [], uncertainties = [], publisherKind = 'ai-candidate', publisherVersion = 'phase-2.1', confidence = 0, now = new Date().toISOString() }) {
  assert(workspaceId && sourceId && title && body, 'INVALID_KNOWLEDGE_DRAFT', 'workspaceId, sourceId, title and body are required');
  const status = uncertainties.length || confidence < 0.8 ? 'needs_review' : 'draft';
  return { id: randomUUID(), workspace_id: workspaceId, source_id: sourceId, title, body, subject, key_points: keyPoints, uncertainties, status, publisher: { kind: publisherKind, version: publisherVersion, confidence }, created_at: now, version: 1 };
}

export function publishKnowledgeNote(note, actorId, now = new Date().toISOString()) {
  assert(note.status === 'draft' || note.status === 'needs_review', 'INVALID_PUBLISH_STATE', 'Only draft or reviewed notes can be published');
  assert(actorId, 'MISSING_ACTOR', 'Publishing requires an actor');
  return { ...note, status: 'published', published_by: actorId, published_at: now, version: note.version + 1 };
}
