import { createMemoryStore } from '../packages/shared/src/memory-store.mjs';
import { createTask, transitionTask } from '../engines/task/src/task-service.mjs';
import { createKnowledgeDraft, publishKnowledgeNote } from '../engines/knowledge/src/publisher.mjs';
import { createExamNotification, buildStudyPlan } from '../engines/exam-planner/src/planner.mjs';
import { validateAutomation } from '../engines/automation/src/registry.mjs';
import { selectAgent } from '../engines/agent-orchestration/src/scheduler.mjs';
import { awardPoints, balance } from '../engines/gamification/src/ledger.mjs';
import { createHttpServer, json } from './http.mjs';
import { authorize } from './auth.mjs';
import { createRateLimiter } from './rate-limit.mjs';

export function createApp({ store = createMemoryStore(), config } = {}) {
  const router = async (req, res, tools) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', service: 'stargrid', version: '3.0.0-alpha.1', request_id: req.context.requestId });
    if (req.method === 'GET' && url.pathname === '/events') return json(res, 200, store.events);
    const body = await tools.readBody(req);
    if (req.method === 'POST' && url.pathname === '/tasks') { const task = createTask(body); store.tasks.push(task); return json(res, 201, task); }
    if (req.method === 'POST' && url.pathname.match(/^\/tasks\/[^/]+\/transition$/)) { const id=url.pathname.split('/')[2]; const task=store.tasks.find(item=>item.id===id); if(!task)return json(res,404,{error:'TASK_NOT_FOUND'}); const updated=transitionTask(task,body.status,body.actor_id ?? req.context.actorId,store.events); Object.assign(task,updated); return json(res,200,task); }
    if (req.method === 'POST' && url.pathname === '/knowledge/drafts') { const note=createKnowledgeDraft(body); store.knowledge.push(note); return json(res,201,note); }
    if (req.method === 'POST' && url.pathname.match(/^\/knowledge\/[^/]+\/publish$/)) { const id=url.pathname.split('/')[2]; const note=store.knowledge.find(item=>item.id===id); if(!note)return json(res,404,{error:'KNOWLEDGE_NOT_FOUND'}); const published=publishKnowledgeNote(note,body.actor_id ?? req.context.actorId); Object.assign(note,published); return json(res,200,note); }
    if (req.method === 'POST' && url.pathname === '/exams') { const exam=createExamNotification(body); store.exams.push(exam); return json(res,201,exam); }
    if (req.method === 'POST' && url.pathname === '/study-plans') { const exam=store.exams.find(item=>item.id===body.exam_id); if(!exam)return json(res,404,{error:'EXAM_NOT_FOUND'}); const plan=buildStudyPlan({exam,learnerId:body.learner_id,availableSlots:body.available_slots ?? []}); store.studyPlans.push(plan); return json(res,201,plan); }
    if (req.method === 'POST' && url.pathname === '/automations/validate') return json(res,200,validateAutomation(body));
    if (req.method === 'POST' && url.pathname === '/agents/select') return json(res,200,selectAgent(store.agents,body.capability));
    if (req.method === 'POST' && url.pathname === '/gamification/award') { const result=awardPoints(body,store.gamification); return json(res,result.accepted?201:409,result); }
    if (req.method === 'GET' && url.pathname === '/gamification/balance') return json(res,200,{ member_id:url.searchParams.get('member_id'), currency:url.searchParams.get('currency') ?? 'xp', points:balance(store.gamification,url.searchParams.get('member_id'),url.searchParams.get('currency') ?? 'xp') });
    return json(res,404,{error:'NOT_FOUND'});
  };
  const limiter = createRateLimiter({ limit: config?.rateLimit, windowMs: config?.rateWindowMs });
  return { store, handler: router, server: createHttpServer(router, { authorize: (req) => authorize(req, config), rateLimit: limiter, maxBodyBytes: config?.maxBodyBytes }) };
}
