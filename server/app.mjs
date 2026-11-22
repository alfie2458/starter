import { createMemoryStore } from '../packages/shared/src/memory-store.mjs';
import { createTask, transitionTask } from '../engines/task/src/task-service.mjs';
import { validateTaskInput } from '../engines/task/src/validator.mjs';
import { createKnowledgeDraft, publishKnowledgeNote } from '../engines/knowledge/src/publisher.mjs';
import { createExamNotification, buildStudyPlan } from '../engines/exam-planner/src/planner.mjs';
import { validateAutomation } from '../engines/automation/src/registry.mjs';
import { selectAgent } from '../engines/agent-orchestration/src/scheduler.mjs';
import { awardPoints, balance } from '../engines/gamification/src/ledger.mjs';
import { CalendarAdapter } from '../engines/calendar/src/adapter.mjs';
import { NotificationAdapter } from '../engines/notification/src/adapter.mjs';
import { createAutomationExecutor } from '../engines/automation/src/executor.mjs';
import { randomUUID } from 'node:crypto';
import { createHttpServer, json } from './http.mjs';
import { authorize } from './auth.mjs';
import { createRateLimiter } from './rate-limit.mjs';

export function createApp({ store = createMemoryStore(), config, persist = async () => {} } = {}) {
  const calendarAdapter = new CalendarAdapter();
  const notificationAdapter = new NotificationAdapter();
  const automationExecutor = createAutomationExecutor({ notificationAdapter, calendarAdapter });
  const save = async () => persist(store);
  const router = async (req, res, tools) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', service: 'stargrid', version: '3.0.0-alpha.1', request_id: req.context.requestId });
    if (req.method === 'GET' && url.pathname === '/events') return json(res, 200, store.events);
    if (req.method === 'GET' && url.pathname === '/tasks') {
      const workspaceId = url.searchParams.get('workspace_id');
      return json(res, 200, workspaceId ? store.tasks.filter(item => item.workspace_id === workspaceId) : store.tasks);
    }
    if (req.method === 'GET' && url.pathname.match(/^\/tasks\/[^/]+$/)) {
      const task = store.tasks.find(item => item.id === url.pathname.split('/')[2]);
      return task ? json(res, 200, task) : json(res, 404, { error: 'TASK_NOT_FOUND' });
    }
    const body = await tools.readBody(req);
    if (req.method === 'POST' && url.pathname === '/tasks') {
      validateTaskInput(body);
      const task = createTask(body);
      await persist({ ...store, tasks: [...store.tasks, task] });
      store.tasks.push(task);
      await save();
      return json(res, 201, task);
    }
    if (req.method === 'POST' && url.pathname.match(/^\/tasks\/[^/]+\/transition$/)) {
      const id=url.pathname.split('/')[2]; const task=store.tasks.find(item=>item.id===id);
      if(!task)return json(res,404,{error:'TASK_NOT_FOUND'});
      const nextEvents = [...store.events];
      const updated=transitionTask(task,body.status,body.actor_id ?? req.context.actorId,nextEvents);
      const nextTasks = store.tasks.map(item => item.id === id ? updated : item);
      await persist({ ...store, tasks: nextTasks, events: nextEvents });
      Object.assign(task,updated);
      store.events.splice(0, store.events.length, ...nextEvents);
      await save();
      return json(res,200,task);
    }
    if (req.method === 'GET' && url.pathname === '/knowledge') return json(res, 200, store.knowledge);
    if (req.method === 'POST' && url.pathname === '/knowledge/drafts') { const note=createKnowledgeDraft(body); store.knowledge.push(note); await save(); return json(res,201,note); }
    if (req.method === 'POST' && url.pathname.match(/^\/knowledge\/[^/]+\/publish$/)) { const id=url.pathname.split('/')[2]; const note=store.knowledge.find(item=>item.id===id); if(!note)return json(res,404,{error:'KNOWLEDGE_NOT_FOUND'}); const published=publishKnowledgeNote(note,body.actor_id ?? req.context.actorId); Object.assign(note,published); await save(); return json(res,200,note); }
    if (req.method === 'GET' && url.pathname === '/exams') return json(res, 200, store.exams);
    if (req.method === 'POST' && url.pathname === '/exams') { const exam=createExamNotification(body); store.exams.push(exam); await save(); return json(res,201,exam); }
    if (req.method === 'POST' && url.pathname === '/study-plans') { const exam=store.exams.find(item=>item.id===body.exam_id); if(!exam)return json(res,404,{error:'EXAM_NOT_FOUND'}); const plan=buildStudyPlan({exam,learnerId:body.learner_id,availableSlots:body.available_slots ?? []}); store.studyPlans.push(plan); await save(); return json(res,201,plan); }
    if (req.method === 'POST' && url.pathname === '/automations/validate') { const automation = validateAutomation(body); store.automations = store.automations.filter(item => item.id !== automation.id); store.automations.push(automation); await save(); return json(res,200,automation); }
    if (req.method === 'GET' && url.pathname === '/automations') return json(res,200,store.automations);
    if (req.method === 'POST' && url.pathname === '/automations/execute') { const automation = store.automations.find(item => item.id === body.automation_id); if (!automation) return json(res,404,{error:'AUTOMATION_NOT_FOUND'}); const run = await automationExecutor.execute(automation, body); store.notifications.push(...notificationAdapter.queue.splice(0)); store.calendar.push(...(run.results.filter(Boolean).filter(item => item.sync_status))); store.automations = store.automations; await save(); return json(res,201,run); }
    if (req.method === 'GET' && url.pathname === '/agents') return json(res,200,store.agents.map(({secret, ...agent}) => agent));
    if (req.method === 'POST' && url.pathname === '/agents/register') { const agent = { id: body.id ?? randomUUID(), provider: body.provider, model: body.model, status: body.status ?? 'normal', capabilities: body.capabilities ?? [], rpm_limit: body.rpm_limit ?? 0, tpm_limit: body.tpm_limit ?? 0, priority: body.priority ?? 100, version: 1 }; if (!agent.provider || !agent.model) return json(res,400,{error:'INVALID_AGENT'}); store.agents.push(agent); await save(); return json(res,201,agent); }
    if (req.method === 'POST' && url.pathname === '/agents/select') return json(res,200,selectAgent(store.agents,body.capability));
    if (req.method === 'POST' && url.pathname === '/calendar/events') { const event = await calendarAdapter.create({ id: body.id ?? randomUUID(), ...body }); store.calendar.push(event); await save(); return json(res,201,event); }
    if (req.method === 'GET' && url.pathname === '/calendar/events') return json(res,200,store.calendar);
    if (req.method === 'POST' && url.pathname === '/notifications') { const notification = notificationAdapter.enqueue(body); store.notifications.push(notification); await save(); return json(res,201,notification); }
    if (req.method === 'GET' && url.pathname === '/notifications') return json(res,200,store.notifications);
    if (req.method === 'POST' && url.pathname === '/gamification/award') { const result=awardPoints(body,store.gamification); if (result.accepted) await save(); return json(res,result.accepted?201:409,result); }
    if (req.method === 'GET' && url.pathname === '/gamification/balance') return json(res,200,{ member_id:url.searchParams.get('member_id'), currency:url.searchParams.get('currency') ?? 'xp', points:balance(store.gamification,url.searchParams.get('member_id'),url.searchParams.get('currency') ?? 'xp') });
    return json(res,404,{error:'NOT_FOUND'});
  };
  const limiter = createRateLimiter({ limit: config?.rateLimit, windowMs: config?.rateWindowMs });
  return { store, handler: router, server: createHttpServer(router, { authorize: (req) => authorize(req, config), rateLimit: limiter, maxBodyBytes: config?.maxBodyBytes }) };
}
