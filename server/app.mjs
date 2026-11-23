import { createMemoryStore } from '../packages/shared/src/memory-store.mjs';
import { createTask, transitionTask } from '../engines/task/src/task-service.mjs';
import { validateTaskInput } from '../engines/task/src/validator.mjs';
import { createKnowledgeDraft, publishKnowledgeNote } from '../engines/knowledge/src/publisher.mjs';
import { createExamNotification, buildStudyPlan } from '../engines/exam-planner/src/planner.mjs';
import { validateAutomation } from '../engines/automation/src/registry.mjs';
import { selectAgent } from '../engines/agent-orchestration/src/scheduler.mjs';
import { registerAgent, publicAgent } from '../engines/agent-orchestration/src/registry.mjs';
import { dispatchWithFallback } from '../engines/agent-orchestration/src/dispatcher.mjs';
import { evaluateAchievements } from '../engines/gamification/src/achievements.mjs';
import { buildLeaderboard } from '../engines/gamification/src/leaderboard.mjs';
import { validatePointEvidence, correctAward } from '../engines/gamification/src/anti-abuse.mjs';
import { readiness } from './hardening.mjs';
import { requireWorkspaceAccess } from './workspace-auth.mjs';
import { createMetrics, createLogger } from './observability.mjs';
import { createIntegrationHub } from './integration.mjs';
import { createCoordinationEvent } from '../packages/shared/src/events.mjs';
import { awardPoints, balance } from '../engines/gamification/src/ledger.mjs';
import { validateCalendarEvent } from '../engines/calendar/src/validator.mjs';
import { validateNotification } from '../engines/notification/src/validator.mjs';
import { appendAudit, createAuditEvent } from '../packages/shared/src/audit.mjs';
import { CalendarAdapter } from '../engines/calendar/src/adapter.mjs';
import { NotificationAdapter } from '../engines/notification/src/adapter.mjs';
import { createAutomationExecutor } from '../engines/automation/src/executor.mjs';
import { randomUUID } from 'node:crypto';
import { createHttpServer, json } from './http.mjs';
import { authorize } from './auth.mjs';
import { createRateLimiter } from './rate-limit.mjs';

export function createApp({ store = createMemoryStore(), config, persist = async () => {} } = {}) {
  const metrics = createMetrics(); const logger = createLogger();
  for (const key of ['automationRuns', 'audit', 'calendar', 'notifications']) if (!Array.isArray(store[key])) store[key] = [];
  const calendarAdapter = new CalendarAdapter();
  const notificationAdapter = new NotificationAdapter();
  const automationExecutor = createAutomationExecutor({ notificationAdapter, calendarAdapter, runLedger: store.automationRuns });
  const save = async () => persist(store);
  const integration = createIntegrationHub(store);
  const router = async (req, res, tools) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', service: 'stargrid', version: '3.0.0-alpha.1', request_id: req.context.requestId });
    if (req.method === 'GET' && url.pathname === '/ready') { const result = readiness(store, config); return json(res, result.ready ? 200 : 503, result); }
    if (req.method === 'GET' && url.pathname === '/metrics') return json(res, 200, metrics.snapshot());
    // Read the body and authorize the workspace before any data-route lookup.
    // Service identities may operate without a workspace, as supported by the
    // existing workspace-auth contract; user identities may not.
    const body = await tools.readBody(req);
    const workspaceId = body.workspace_id ?? url.searchParams.get('workspace_id');
    if (config?.requireWorkspaceAuth && !workspaceId && req.context.identity?.kind !== 'service') throw Object.assign(new Error('WORKSPACE_REQUIRED'), { code: 'WORKSPACE_REQUIRED', statusCode: 400 });
    if (config?.requireWorkspaceAuth && workspaceId) requireWorkspaceAccess({ store, identity: req.context.identity, workspaceId });
    const scoped = (items) => workspaceId ? items.filter(item => item.workspace_id === workspaceId) : items;
    const scopedAgents = (items) => workspaceId ? items.filter(item => item.workspace_id == null || item.workspace_id === workspaceId) : items;
    const sameWorkspace = (item) => !workspaceId || item?.workspace_id === workspaceId;

    if (req.method === 'GET' && url.pathname === '/events') return json(res, 200, scoped(store.events));
    if (req.method === 'GET' && url.pathname === '/tasks') {
      return json(res, 200, scoped(store.tasks));
    }
    if (req.method === 'GET' && url.pathname.match(/^\/tasks\/[^/]+$/)) {
      const task = store.tasks.find(item => item.id === url.pathname.split('/')[2]);
      if (task && workspaceId && task.workspace_id !== workspaceId) return json(res, 404, { error: 'TASK_NOT_FOUND' });
      return task ? json(res, 200, task) : json(res, 404, { error: 'TASK_NOT_FOUND' });
    }
    if (req.method === 'POST' && url.pathname === '/events/publish') { const event = createCoordinationEvent({ workspaceId: body.workspace_id, type: body.type, aggregateType: body.aggregate_type, aggregateId: body.aggregate_id, payload: body.payload ?? {}, actorId: req.context.actorId, correlationId: body.correlation_id }); const result = await integration.publish(event, req.context); await save(); return json(res, result.accepted ? 201 : 200, result); }
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
      if(!task || !sameWorkspace(task))return json(res,404,{error:'TASK_NOT_FOUND'});
      const nextEvents = [...store.events];
      const updated=transitionTask(task,body.status,body.actor_id ?? req.context.actorId,nextEvents);
      const nextTasks = store.tasks.map(item => item.id === id ? updated : item);
      await persist({ ...store, tasks: nextTasks, events: nextEvents });
      Object.assign(task,updated);
      store.events.splice(0, store.events.length, ...nextEvents);
      await save();
      return json(res,200,task);
    }
    if (req.method === 'GET' && url.pathname === '/knowledge') return json(res, 200, scoped(store.knowledge));
    if (req.method === 'POST' && url.pathname === '/knowledge/drafts') { const note=createKnowledgeDraft(body); store.knowledge.push(note); await save(); return json(res,201,note); }
    if (req.method === 'POST' && url.pathname.match(/^\/knowledge\/[^/]+\/publish$/)) { const id=url.pathname.split('/')[2]; const note=store.knowledge.find(item=>item.id===id); if(!note || !sameWorkspace(note))return json(res,404,{error:'KNOWLEDGE_NOT_FOUND'}); const published=publishKnowledgeNote(note,body.actor_id ?? req.context.actorId); Object.assign(note,published); await save(); return json(res,200,note); }
    if (req.method === 'GET' && url.pathname === '/exams') return json(res, 200, scoped(store.exams));
    if (req.method === 'POST' && url.pathname === '/exams') { const exam=createExamNotification(body); store.exams.push(exam); await save(); return json(res,201,exam); }
    if (req.method === 'POST' && url.pathname === '/study-plans') { const exam=store.exams.find(item=>item.id===body.exam_id); if(!exam || !sameWorkspace(exam))return json(res,404,{error:'EXAM_NOT_FOUND'}); const plan=buildStudyPlan({exam,learnerId:body.learner_id,availableSlots:body.available_slots ?? []}); store.studyPlans.push(plan); await save(); return json(res,201,plan); }
    if (req.method === 'POST' && url.pathname === '/automations/validate') { const automation = validateAutomation(body); store.automations = store.automations.filter(item => item.id !== automation.id); store.automations.push(automation); await save(); return json(res,200,automation); }
    if (req.method === 'GET' && url.pathname === '/automations') return json(res,200,scoped(store.automations));
    if (req.method === 'GET' && url.pathname === '/automation-runs') return json(res,200,scoped(store.automationRuns));
    if (req.method === 'GET' && url.pathname === '/audit') return json(res,200,scoped(store.audit ?? []));
    if (req.method === 'POST' && url.pathname === '/automations/execute') { const automation = store.automations.find(item => item.id === body.automation_id); if (!automation || !sameWorkspace(automation)) return json(res,404,{error:'AUTOMATION_NOT_FOUND'}); const run = await automationExecutor.execute(automation, body); store.notifications.push(...notificationAdapter.queue.splice(0)); store.calendar.push(...(run.results ?? []).filter(Boolean).filter(item => item.sync_status)); if (!store.automationRuns.some(item => item.id === run.id)) store.automationRuns.push(run); appendAudit(store, createAuditEvent({ workspaceId: automation.workspace_id, actorId: req.context.actorId, action: 'automation.executed', aggregateType: 'automation', aggregateId: automation.id, metadata: { run_id: run.id, status: run.status } })); await save(); return json(res,run.duplicate ? 200 : 201,run); }
    if (req.method === 'GET' && url.pathname === '/agents') return json(res,200,scopedAgents(store.agents).map(publicAgent));
    if (req.method === 'POST' && url.pathname === '/agents/register') { const agent = registerAgent(body); store.agents.push(agent); await save(); return json(res,201,publicAgent(agent)); }
    if (req.method === 'POST' && url.pathname === '/agents/dispatch') { const result = await dispatchWithFallback({ registry: scopedAgents(store.agents), quotaLedger: store.quota, capability: body.capability, tokens: body.tokens ?? 0, window: body.window ?? new Date().toISOString().slice(0,13), fallback: body.fallback ?? [], invoke: async agent => ({ accepted: true, execution_mode: 'mock', provider_kind: 'mock', provider: agent.provider, model: agent.model, input_ref: body.input_ref ?? null }), onAttempt: async ({ agent, reservation, status, error }) => appendAudit(store, createAuditEvent({ workspaceId: body.workspace_id ?? agent.workspace_id ?? null, actorId: req.context.actorId, action: 'agent.invocation', aggregateType: 'agent', aggregateId: agent.id, metadata: { capability: body.capability, provider: agent.provider, model: agent.model, execution_mode: agent.execution_mode ?? 'mock', reservation_id: reservation.id, status, error_code: error?.code ?? error?.message ?? null } })) }); await save(); return json(res,201,{ ...result, agent: publicAgent(result.agent) }); }
    if (req.method === 'POST' && url.pathname === '/agents/select') return json(res,200,publicAgent(selectAgent(scopedAgents(store.agents),body.capability)));
    if (req.method === 'POST' && url.pathname === '/calendar/events') { validateCalendarEvent(body); const event = await calendarAdapter.create({ id: body.id ?? randomUUID(), ...body }); store.calendar.push(event); appendAudit(store, createAuditEvent({ workspaceId: event.workspace_id, actorId: req.context.actorId, action: 'calendar.created', aggregateType: 'calendar_event', aggregateId: event.id })); await save(); return json(res,201,event); }
    if (req.method === 'GET' && url.pathname === '/calendar/events') return json(res,200,scoped(store.calendar));
    if (req.method === 'POST' && url.pathname === '/notifications') { validateNotification(body); const notification = notificationAdapter.enqueue(body); store.notifications.push(notification); appendAudit(store, createAuditEvent({ workspaceId: body.workspace_id, actorId: req.context.actorId, action: 'notification.queued', aggregateType: 'notification', aggregateId: notification.id })); await save(); return json(res,201,notification); }
    if (req.method === 'GET' && url.pathname === '/notifications') return json(res,200,scoped(store.notifications));
    if (req.method === 'POST' && url.pathname === '/gamification/award') { validatePointEvidence(body); const result=awardPoints(body,scoped(store.gamification)); if (result.accepted) await save(); return json(res,result.accepted?201:409,result); }
    if (req.method === 'GET' && url.pathname === '/gamification/leaderboard') return json(res,200,buildLeaderboard(scoped(store.gamification),{ currency: url.searchParams.get('currency') ?? 'xp', limit: Number(url.searchParams.get('limit') ?? 20) }));
    if (req.method === 'POST' && url.pathname === '/gamification/achievements/evaluate') { const earned = evaluateAchievements({ memberId: body.member_id, ledger: scoped(store.gamification), rules: body.rules ?? [] }); store.achievements.push(...earned); await save(); return json(res,201,earned); }
    if (req.method === 'POST' && url.pathname === '/gamification/corrections') { const correction = correctAward(body, scoped(store.gamification)); store.corrections.push(correction); await save(); return json(res,201,correction); }
    if (req.method === 'GET' && url.pathname === '/gamification/balance') return json(res,200,{ member_id:url.searchParams.get('member_id'), currency:url.searchParams.get('currency') ?? 'xp', points:balance(scoped(store.gamification),url.searchParams.get('member_id'),url.searchParams.get('currency') ?? 'xp') });
    return json(res,404,{error:'NOT_FOUND'});
  };
  const limiter = createRateLimiter({ limit: config?.rateLimit, windowMs: config?.rateWindowMs });
  return { store, handler: router, metrics, logger, server: createHttpServer(router, { authorize: (req) => authorize(req, config), rateLimit: limiter, maxBodyBytes: config?.maxBodyBytes, requestTimeoutMs: config?.requestTimeoutMs, metrics, logger }) };
}
