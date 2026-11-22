import { randomUUID } from 'node:crypto';
import { assert } from '../../../packages/shared/src/errors.mjs';

export function createExamNotification(input, now = new Date().toISOString()) {
  assert(input?.workspace_id && input?.title && input?.exam_at, 'INVALID_EXAM', 'workspace_id, title and exam_at are required');
  const uncertain = !input.scope?.subjects?.length || input.scope.subjects.some(subject => subject.includes('?'));
  return { id: input.id ?? randomUUID(), workspace_id: input.workspace_id, title: input.title, exam_type: input.exam_type ?? 'quiz', exam_at: input.exam_at, timezone: input.timezone ?? 'UTC', scope: input.scope ?? { subjects: [] }, status: uncertain ? 'needs_review' : 'draft', created_at: now, version: 1 };
}

export function buildStudyPlan({ exam, learnerId, availableSlots, plannerVersion = 'phase-2.1' }) {
  assert(exam?.status !== 'canceled', 'EXAM_CANCELED', 'Cannot plan a canceled exam');
  const items = availableSlots.map((slot, index) => ({ id: randomUUID(), kind: index === availableSlots.length - 1 ? 'exam_prep' : 'review', title: `Review ${exam.scope.subjects.join(', ')}`, scheduled_start: slot.start, scheduled_end: slot.end, source_ref: exam.id, locked: false }));
  return { id: randomUUID(), workspace_id: exam.workspace_id, learner_id: learnerId, planner_version: plannerVersion, items, status: 'draft', created_at: new Date().toISOString(), version: 1 };
}
