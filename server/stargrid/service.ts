import { and, asc, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  achievementDefinitions, buildingDefinitions, buildingLogs, collectibleDefinitions,
  profiles, rewardDefinitions, rewardEvents, studyRecords, studySessions, tasks,
  technologyNodes, userAchievements, userBuildings, userCollectibles, userTechnologyProgress,
  userWallets, walletTransactions,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { ACHIEVEMENTS, BUILDINGS, COLLECTIBLES, REWARDS, TECHNOLOGIES } from "./catalog";

const TZ = "Asia/Taipei";
const dayKey = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
const todayBounds = (now = new Date()) => {
  const key = dayKey(now);
  const start = new Date(`${key}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000), key };
};
const requireDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("資料庫目前無法連線，請稍後重試；尚未儲存任何變更。");
  return db;
};

async function ensureCatalog(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  await db.insert(rewardDefinitions).ignore().values(REWARDS.map(item => ({ ...item })));
  await db.insert(buildingDefinitions).ignore().values(BUILDINGS.map(item => ({ ...item })));
  await db.insert(collectibleDefinitions).ignore().values(COLLECTIBLES.map(item => ({ ...item })));
  await db.insert(achievementDefinitions).ignore().values(ACHIEVEMENTS.map(item => ({ ...item })));
  await db.insert(technologyNodes).ignore().values(TECHNOLOGIES.map(item => ({ ...item })));
}

async function ensureUserState(userId: number) {
  const db = await requireDb();
  await ensureCatalog(db);
  await db.insert(profiles).ignore().values({ userId });
  await db.insert(userWallets).ignore().values({ userId, xp: 0, materials: 0 });
  const today = todayBounds();
  await db.insert(tasks).ignore().values({
    userId, title: "完成一段 15 分鐘複習", subject: "今日主線", kind: "review",
    dueDate: today.key, systemKey: `daily-review-${today.key}`,
  });
  await db.insert(userBuildings).ignore().values(BUILDINGS.map(building => ({ userId, buildingId: building.id })));
  await db.insert(userTechnologyProgress).ignore().values(TECHNOLOGIES.map(node => ({ userId, nodeId: node.id, progress: 0 })));
}

type Stats = {
  studyCount: number; reviewCount: number; errorCount: number; recallCount: number;
  deepCount: number; distinctDays: number; weeklyReviewCount: number; examPlanCount: number;
  examReviewCount: number; semesterReviewCount: number; restarted: boolean;
  todayMinutes: number; todayXp: number; todayBaseXp: number;
};

async function collectStats(userId: number): Promise<Stats> {
  const db = await requireDb();
  const records = await db.select().from(studyRecords).where(eq(studyRecords.userId, userId)).orderBy(asc(studyRecords.createdAt));
  const completed = records.filter(record => record.completed);
  const days = new Set(completed.map(record => dayKey(record.createdAt)));
  const partialTimes = records.filter(record => !record.completed).map(record => record.createdAt.getTime());
  const restarted = completed.some(record => partialTimes.some(time => time < record.createdAt.getTime() && record.createdAt.getTime() - time <= 30 * 24 * 60 * 60 * 1000));
  const today = todayBounds();
  const todayRecords = records.filter(record => record.createdAt >= today.start && record.createdAt < today.end);
  const earnedToday = await db.select().from(rewardEvents).where(and(eq(rewardEvents.userId, userId), gte(rewardEvents.createdAt, today.start), lt(rewardEvents.createdAt, today.end)));
  return {
    studyCount: completed.length,
    reviewCount: completed.filter(record => record.kind === "review").length,
    errorCount: completed.filter(record => record.kind === "error_fix").length,
    recallCount: completed.filter(record => record.kind === "recall").length,
    deepCount: completed.filter(record => record.kind === "error_fix" || record.kind === "recall").length,
    distinctDays: days.size,
    weeklyReviewCount: completed.filter(record => record.kind === "weekly_review").length,
    examPlanCount: completed.filter(record => record.kind === "exam_plan").length,
    examReviewCount: completed.filter(record => record.kind === "exam_review").length,
    semesterReviewCount: completed.filter(record => record.kind === "semester_review").length,
    restarted,
    todayMinutes: todayRecords.reduce((sum, record) => sum + record.minutes, 0),
    todayXp: earnedToday.reduce((sum, event) => sum + event.awardedXp, 0),
    todayBaseXp: earnedToday.reduce((sum, event) => sum + event.baseXp, 0),
  };
}

function requirementProgress(requirement: string, stats: Stats, tutorialComplete: boolean): number {
  const values: Record<string, number> = {
    study_count: stats.studyCount,
    review_count: stats.reviewCount,
    error_count: stats.errorCount,
    recall_count: stats.recallCount,
    deep_count: stats.deepCount,
    study_days: stats.distinctDays,
    weekly_review: stats.weeklyReviewCount,
    exam_plan: stats.examPlanCount,
    semester_review: stats.semesterReviewCount,
    tutorial: tutorialComplete ? 1 : 0,
    exam_cycle: stats.examPlanCount > 0 && stats.examReviewCount > 0 ? 1 : 0,
    restart: stats.restarted ? 1 : 0,
  };
  return values[requirement] ?? 0;
}

async function syncProgress(userId: number, stats?: Stats) {
  const db = await requireDb();
  const currentStats = stats ?? await collectStats(userId);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const tutorialComplete = Boolean(profile?.tutorialComplete);
  for (const definition of BUILDINGS) {
    const progress = requirementProgress(definition.unlockRule, currentStats, tutorialComplete);
    if (progress >= definition.threshold) {
      await db.update(userBuildings).set({ unlockedAt: new Date() }).where(and(eq(userBuildings.userId, userId), eq(userBuildings.buildingId, definition.id), isNull(userBuildings.unlockedAt)));
    }
  }
  for (const definition of ACHIEVEMENTS) {
    if (requirementProgress(definition.condition, currentStats, tutorialComplete) >= definition.threshold) {
      await db.insert(userAchievements).ignore().values({ userId, achievementId: definition.id });
    }
  }
  for (const definition of TECHNOLOGIES) {
    const progress = requirementProgress(definition.requirement, currentStats, tutorialComplete);
    const parent = definition.parentId ? TECHNOLOGIES.find(item => item.id === definition.parentId) : undefined;
    const parentReady = !parent || requirementProgress(parent.requirement, currentStats, tutorialComplete) >= parent.threshold;
    await db.update(userTechnologyProgress).set({
      progress,
      ...(progress >= definition.threshold && parentReady ? { unlockedAt: new Date() } : {}),
    }).where(and(eq(userTechnologyProgress.userId, userId), eq(userTechnologyProgress.nodeId, definition.id)));
  }
}

export async function getDashboard(userId: number) {
  await ensureUserState(userId);
  const stats = await collectStats(userId);
  await syncProgress(userId, stats);
  const db = await requireDb();
  const today = todayBounds();
  const [profileRows, walletRows, todayTasks, allBuildingDefs, buildingRows, collectibleDefs, ownedCollectibles, achievementDefs, earnedAchievements, nodeDefs, nodeProgress, recentRecords, recentRewards, transactions, activeSessions, rewardOptions] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1),
    db.select().from(tasks).where(and(eq(tasks.userId, userId), eq(tasks.dueDate, today.key))).orderBy(asc(tasks.createdAt)),
    db.select().from(buildingDefinitions).orderBy(asc(buildingDefinitions.sortOrder)),
    db.select().from(userBuildings).where(eq(userBuildings.userId, userId)),
    db.select().from(collectibleDefinitions).orderBy(asc(collectibleDefinitions.category)),
    db.select().from(userCollectibles).where(eq(userCollectibles.userId, userId)),
    db.select().from(achievementDefinitions),
    db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(desc(userAchievements.earnedAt)),
    db.select().from(technologyNodes).orderBy(asc(technologyNodes.sortOrder)),
    db.select().from(userTechnologyProgress).where(eq(userTechnologyProgress.userId, userId)),
    db.select().from(studyRecords).where(eq(studyRecords.userId, userId)).orderBy(desc(studyRecords.createdAt)).limit(8),
    db.select().from(rewardEvents).where(eq(rewardEvents.userId, userId)).orderBy(desc(rewardEvents.createdAt)).limit(5),
    db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(desc(walletTransactions.createdAt)).limit(12),
    db.select().from(studySessions).where(and(eq(studySessions.userId, userId), eq(studySessions.state, "active"))).orderBy(desc(studySessions.startedAt)).limit(1),
    db.select().from(rewardDefinitions).orderBy(asc(rewardDefinitions.minMinutes)),
  ]);
  const activeTaskRows = activeSessions[0]?.taskId
    ? await db.select().from(tasks).where(and(eq(tasks.id, activeSessions[0].taskId), eq(tasks.userId, userId))).limit(1)
    : [];
  const ownedBuildingMap = new Map(buildingRows.map(item => [item.buildingId, item]));
  const ownedCollectibleMap = new Map(ownedCollectibles.map(item => [item.collectibleId, item]));
  const earnedMap = new Map(earnedAchievements.map(item => [item.achievementId, item]));
  const technologyMap = new Map(nodeProgress.map(item => [item.nodeId, item]));
  const builtCount = buildingRows.filter(item => item.builtAt).length;
  const nextBuilding = allBuildingDefs.map(definition => ({ definition, state: ownedBuildingMap.get(definition.id) })).find(item => item.state?.unlockedAt && !item.state.builtAt);
  const level = Math.floor(walletRows[0]?.xp! / 100) + 1;
  return {
    profile: profileRows[0],
    activeSession: activeSessions[0] ?? null,
    activeTask: activeTaskRows[0] ?? null,
    rewardOptions,
    wallet: { xp: walletRows[0]?.xp ?? 0, materials: walletRows[0]?.materials ?? 0, level, levelProgress: (walletRows[0]?.xp ?? 0) % 100, levelNext: 100 },
    stats,
    tasks: todayTasks,
    mainTask: todayTasks.find(task => !task.completedAt) ?? null,
    buildings: allBuildingDefs.map(definition => ({ ...definition, state: ownedBuildingMap.get(definition.id) ?? null, progress: requirementProgress(definition.unlockRule, stats, Boolean(profileRows[0]?.tutorialComplete)) })),
    builtCount,
    nextBuilding: nextBuilding ?? null,
    collectibles: collectibleDefs.map(definition => ({ ...definition, owned: ownedCollectibleMap.get(definition.id) ?? null })),
    achievements: achievementDefs.map(definition => ({ ...definition, earned: earnedMap.get(definition.id) ?? null })),
    technologies: nodeDefs.map(definition => ({ ...definition, progress: technologyMap.get(definition.id) ?? null })),
    recentRecords,
    recentRewards,
    transactions,
  };
}

export async function finishTutorial(userId: number) {
  await ensureUserState(userId);
  const db = await requireDb();
  await db.update(profiles).set({ tutorialComplete: true }).where(eq(profiles.userId, userId));
  await syncProgress(userId);
  return { success: true };
}

export async function updatePreferences(userId: number, input: { theme?: "dark" | "light"; animationsEnabled?: boolean; displayName?: string | null }) {
  await ensureUserState(userId);
  const db = await requireDb();
  await db.update(profiles).set(input).where(eq(profiles.userId, userId));
  return { success: true };
}

export async function exportUserData(userId: number) {
  const db = await requireDb();
  const [profile, wallet, taskRows, sessions, records, rewards, ledger, buildings, buildingHistory, collectibles, achievements, technologies] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1),
    db.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(asc(tasks.createdAt)),
    db.select().from(studySessions).where(eq(studySessions.userId, userId)).orderBy(asc(studySessions.startedAt)),
    db.select().from(studyRecords).where(eq(studyRecords.userId, userId)).orderBy(asc(studyRecords.createdAt)),
    db.select().from(rewardEvents).where(eq(rewardEvents.userId, userId)).orderBy(asc(rewardEvents.createdAt)),
    db.select().from(walletTransactions).where(eq(walletTransactions.userId, userId)).orderBy(asc(walletTransactions.createdAt)),
    db.select().from(userBuildings).where(eq(userBuildings.userId, userId)).orderBy(asc(userBuildings.createdAt)),
    db.select().from(buildingLogs).where(eq(buildingLogs.userId, userId)).orderBy(asc(buildingLogs.createdAt)),
    db.select().from(userCollectibles).where(eq(userCollectibles.userId, userId)).orderBy(asc(userCollectibles.acquiredAt)),
    db.select().from(userAchievements).where(eq(userAchievements.userId, userId)).orderBy(asc(userAchievements.earnedAt)),
    db.select().from(userTechnologyProgress).where(eq(userTechnologyProgress.userId, userId)),
  ]);
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    accountId: userId,
    profile: profile[0] ?? null,
    wallet: wallet[0] ?? null,
    tasks: taskRows,
    studySessions: sessions,
    studyRecords: records,
    rewardEvents: rewards,
    walletTransactions: ledger,
    userBuildings: buildings,
    buildingLogs: buildingHistory,
    userCollectibles: collectibles,
    userAchievements: achievements,
    technologyProgress: technologies,
  };
}

export async function addTask(userId: number, input: { title: string; subject?: string; kind: typeof tasks.$inferInsert.kind; dueDate?: string }) {
  await ensureUserState(userId);
  const db = await requireDb();
  const [result] = await db.insert(tasks).values({ userId, title: input.title, subject: input.subject, kind: input.kind, dueDate: input.dueDate ?? todayBounds().key });
  return { id: result.insertId, success: true };
}

export async function startStudySession(userId: number, input: { id: string; kind: NonNullable<typeof studySessions.$inferInsert.kind>; plannedMinutes: number; taskId?: number }) {
  await ensureUserState(userId);
  const db = await requireDb();
  return db.transaction(async tx => {
    await tx.select().from(userWallets).where(eq(userWallets.userId, userId)).for("update").limit(1);
    const [existing] = await tx.select().from(studySessions).where(and(eq(studySessions.id, input.id), eq(studySessions.userId, userId))).limit(1);
    if (existing) {
      if (existing.kind !== input.kind || existing.plannedMinutes !== input.plannedMinutes || existing.taskId !== (input.taskId ?? null)) throw new Error("這個計時識別碼已用於其他操作，請重新載入後再試。");
      return { id: existing.id, startedAt: existing.startedAt, reused: true };
    }
    const [active] = await tx.select().from(studySessions).where(and(eq(studySessions.userId, userId), eq(studySessions.state, "active"))).orderBy(desc(studySessions.startedAt)).limit(1);
    if (active) throw new Error("你已有一段雲端計時正在進行；請先完成或保留那筆學習紀錄。");
    if (input.taskId) {
      const [task] = await tx.select().from(tasks).where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId))).for("update").limit(1);
      if (!task || task.completedAt) throw new Error("這項任務不存在或已完成。");
      if (task.kind !== input.kind) throw new Error("學習類型必須符合所選任務。");
    }
    await tx.insert(studySessions).values({ id: input.id, userId, kind: input.kind, plannedMinutes: input.plannedMinutes, taskId: input.taskId ?? null, state: "active" });
    return { id: input.id, startedAt: new Date(), reused: false };
  });
}

export async function recordStudy(userId: number, input: {
  eventId: string; sessionId?: string; taskId?: number; kind: NonNullable<typeof studyRecords.$inferInsert.kind>;
  minutes: number; summary: string; completed: boolean;
}) {
  await ensureUserState(userId);
  const db = await requireDb();
  try {
    const result = await db.transaction(async tx => {
      const [walletForTransaction] = await tx.select().from(userWallets).where(eq(userWallets.userId, userId)).for("update").limit(1);
      if (!walletForTransaction) throw new Error("錢包尚未準備完成；學習記錄未完成。");
      if (!input.sessionId) {
        const [activeSession] = await tx.select().from(studySessions).where(and(eq(studySessions.userId, userId), eq(studySessions.state, "active"))).limit(1);
        if (activeSession) throw new Error("你已有一段雲端計時正在進行；請先完成或保留該區段，再補記其他學習。");
      }
      if (input.sessionId) {
        const [session] = await tx.select().from(studySessions).where(and(eq(studySessions.id, input.sessionId), eq(studySessions.userId, userId))).for("update").limit(1);
        if (!session) throw new Error("找不到這段學習計時，請重新載入後再試。");
        if (session.state !== "active") throw new Error("這段學習已經結束，請勿重複提交。");
        if (session.kind !== input.kind) throw new Error("學習類型必須與計時開始時選擇的類型相同。");
        if (session.taskId !== (input.taskId ?? null)) throw new Error("提交的任務與開始計時時選擇的任務不同。");
        const elapsedMinutes = Math.floor((Date.now() - session.startedAt.getTime()) / 60_000) + 1;
        if (input.minutes > Math.max(1, elapsedMinutes)) throw new Error("記錄分鐘數不可超過計時區段實際經過的時間。");
      }
      if (input.taskId) {
        const [task] = await tx.select().from(tasks).where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId))).for("update").limit(1);
        if (!task || task.completedAt) throw new Error("任務不存在或已完成。");
        if (task.kind !== input.kind) throw new Error("學習類型必須符合所選任務。");
      }
      await tx.insert(studyRecords).values({
        id: input.eventId, userId, sessionId: input.sessionId ?? null,
        taskId: input.completed ? input.taskId ?? null : null,
        kind: input.kind, minutes: input.minutes, summary: input.summary.trim(), completed: input.completed,
      });
      if (input.sessionId) {
        await tx.update(studySessions).set({ state: input.completed ? "completed" : "partial", endedAt: new Date() }).where(and(eq(studySessions.id, input.sessionId), eq(studySessions.userId, userId)));
      }
      if (input.completed && input.taskId) {
        await tx.update(tasks).set({ completedAt: new Date() }).where(and(eq(tasks.id, input.taskId), eq(tasks.userId, userId), isNull(tasks.completedAt)));
      }
      let reward: { baseXp: number; xp: number; materials: number; label: string } | null = null;
      if (input.completed) {
        const [definition] = await tx.select().from(rewardDefinitions).where(eq(rewardDefinitions.id, input.kind)).limit(1);
        if (definition?.enabled) {
          if (input.minutes < definition.minMinutes) throw new Error(`${definition.label}至少需要記錄 ${definition.minMinutes} 分鐘；學習記錄尚未完成。`);
          const today = todayBounds();
          const priorRewards = await tx.select({ baseXp: rewardEvents.baseXp }).from(rewardEvents).where(and(eq(rewardEvents.userId, userId), gte(rewardEvents.createdAt, today.start), lt(rewardEvents.createdAt, today.end)));
          const priorBaseXp = priorRewards.reduce((sum, event) => sum + event.baseXp, 0);
          const awardedXp = priorBaseXp >= 100 ? Math.max(1, Math.floor(definition.xp * 0.5)) : definition.xp;
          await tx.insert(rewardEvents).values({ id: input.eventId, userId, studyRecordId: input.eventId, rewardType: input.kind, baseXp: definition.xp, awardedXp, materials: definition.materials });
          await tx.update(userWallets).set({
            xp: sql`${userWallets.xp} + ${awardedXp}`,
            materials: sql`${userWallets.materials} + ${definition.materials}`,
          }).where(eq(userWallets.userId, userId));
          await tx.insert(walletTransactions).values({
            id: input.eventId, userId, referenceId: input.eventId, kind: "reward",
            xpDelta: awardedXp, materialsDelta: definition.materials,
          });
          reward = { baseXp: definition.xp, xp: awardedXp, materials: definition.materials, label: definition.label };
        }
      }
      const [wallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1);
      return { success: true, alreadyRecorded: false, completed: input.completed, reward, wallet };
    });
    await syncProgress(userId);
    return result;
  } catch (error) {
    // Idempotent retry: resolve the committed record after a duplicate-key or
    // network retry; never make the UI infer success from a failed write.
    const [existing] = await db.select().from(studyRecords).where(and(eq(studyRecords.id, input.eventId), eq(studyRecords.userId, userId))).limit(1);
    if (existing) {
      const [rewardEvent] = await db.select().from(rewardEvents).where(and(eq(rewardEvents.studyRecordId, existing.id), eq(rewardEvents.userId, userId))).limit(1);
      const [wallet] = await db.select().from(userWallets).where(eq(userWallets.userId, userId)).limit(1);
      const samePayload = existing.sessionId === (input.sessionId ?? null)
        && existing.taskId === (input.completed ? input.taskId ?? null : null)
        && existing.kind === input.kind && existing.minutes === input.minutes
        && existing.summary === input.summary.trim() && existing.completed === input.completed;
      if (!samePayload) throw error;
      return {
        success: true, alreadyRecorded: true, completed: existing.completed,
        reward: rewardEvent ? { baseXp: rewardEvent.baseXp, xp: rewardEvent.awardedXp, materials: rewardEvent.materials, label: rewardEvent.rewardType } : null,
        wallet,
      };
    }
    throw error;
  }
}

async function readMaterialReplay(source: any, userId: number, eventId: string, kind: "build" | "upgrade" | "collectible", targetId: string, actionName?: "build" | "upgrade") {
  const [prior] = await source.select().from(walletTransactions).where(and(eq(walletTransactions.id, eventId), eq(walletTransactions.userId, userId))).limit(1);
  if (!prior) return null;
  if (prior.kind !== kind || prior.materialsDelta > 0) throw new Error("這個交易識別碼已用於其他操作，請重新載入後再試。");
  if (kind === "collectible") {
    const [owned] = await source.select().from(userCollectibles).where(and(eq(userCollectibles.userId, userId), eq(userCollectibles.collectibleId, targetId), eq(userCollectibles.acquisitionEventId, eventId))).limit(1);
    if (!owned) throw new Error("這個交易識別碼已用於其他操作，請重新載入後再試。");
    return { success: true as const, alreadyRecorded: true, materialsSpent: -prior.materialsDelta };
  }
  if (!actionName) throw new Error("建築交易缺少操作類型。");
  const [log] = await source.select().from(buildingLogs).where(and(eq(buildingLogs.id, eventId), eq(buildingLogs.userId, userId), eq(buildingLogs.buildingId, targetId), eq(buildingLogs.action, actionName))).limit(1);
  if (!log || prior.materialsDelta !== log.materialsDelta) throw new Error("這個交易識別碼已用於其他操作，請重新載入後再試。");
  return { success: true as const, alreadyRecorded: true, level: log.level, materialsSpent: -prior.materialsDelta };
}

async function performMaterialPurchase(userId: number, eventId: string, materials: number, kind: "build" | "upgrade" | "collectible", targetId: string, actionName: "build" | "upgrade" | undefined, action: (tx: any) => Promise<void>) {
  const db = await requireDb();
  let alreadyRecorded = false;
  try {
    await db.transaction(async tx => {
      const replay = await readMaterialReplay(tx, userId, eventId, kind, targetId, actionName);
      if (replay) {
        if (replay.materialsSpent !== materials) throw new Error("這個交易識別碼已用於其他操作，請重新載入後再試。");
        alreadyRecorded = true;
        return;
      }
      const [wallet] = await tx.select().from(userWallets).where(eq(userWallets.userId, userId)).for("update").limit(1);
      if (!wallet || wallet.materials < materials) throw new Error(`建材不足，需要 ${materials}，目前有 ${wallet?.materials ?? 0}。`);
      await action(tx);
      await tx.update(userWallets).set({ materials: sql`${userWallets.materials} - ${materials}` }).where(and(eq(userWallets.userId, userId), gte(userWallets.materials, materials)));
      await tx.insert(walletTransactions).values({ id: eventId, userId, referenceId: eventId, kind, xpDelta: 0, materialsDelta: -materials });
    });
  } catch (error) {
    const replay = await readMaterialReplay(db, userId, eventId, kind, targetId, actionName);
    if (!replay || replay.materialsSpent !== materials) throw error;
    alreadyRecorded = true;
  }
  return { success: true, alreadyRecorded };
}

export async function buildOrUpgrade(userId: number, input: { eventId: string; buildingId: string; upgrade: boolean }) {
  await ensureUserState(userId);
  const db = await requireDb();
  const kind = input.upgrade ? "upgrade" : "build";
  const actionName = input.upgrade ? "upgrade" : "build";
  const replay = await readMaterialReplay(db, userId, input.eventId, kind, input.buildingId, actionName);
  if (replay) return { ...replay, level: replay.level ?? 1 };
  const [definition] = await db.select().from(buildingDefinitions).where(eq(buildingDefinitions.id, input.buildingId)).limit(1);
  if (!definition) throw new Error("找不到這座建築。");
  const [current] = await db.select().from(userBuildings).where(and(eq(userBuildings.userId, userId), eq(userBuildings.buildingId, input.buildingId))).limit(1);
  if (!current?.unlockedAt) throw new Error("尚未達成這座建築的解鎖條件。");
  if (!input.upgrade && current.builtAt) throw new Error("這座建築已經建造，請選擇升級。");
  if (input.upgrade && !current.builtAt) throw new Error("請先建造這座建築。");
  const level = current.level + 1;
  const cost = input.upgrade ? Math.max(10, 15 * current.level) : definition.cost;
  const transaction = await performMaterialPurchase(userId, input.eventId, cost, kind, input.buildingId, actionName, async tx => {
    const [fresh] = await tx.select().from(userBuildings).where(and(eq(userBuildings.userId, userId), eq(userBuildings.buildingId, input.buildingId))).for("update").limit(1);
    if (!fresh?.unlockedAt || (input.upgrade ? !fresh.builtAt : Boolean(fresh.builtAt))) throw new Error("建築狀態已變更，請重新整理城市後再試。");
    if (input.upgrade && fresh.level !== current.level) throw new Error("建築狀態已變更，請重新整理城市後再試。");
    if (input.upgrade) await tx.update(userBuildings).set({ level }).where(and(eq(userBuildings.userId, userId), eq(userBuildings.buildingId, input.buildingId)));
    else await tx.update(userBuildings).set({ builtAt: new Date(), level: 1 }).where(and(eq(userBuildings.userId, userId), eq(userBuildings.buildingId, input.buildingId)));
    await tx.insert(buildingLogs).values({ id: input.eventId, userId, buildingId: input.buildingId, action: input.upgrade ? "upgrade" : "build", level, materialsDelta: -cost });
  });
  return { success: true, level, materialsSpent: cost, alreadyRecorded: transaction.alreadyRecorded };
}

export async function purchaseCollectible(userId: number, input: { eventId: string; collectibleId: string }) {
  await ensureUserState(userId);
  const db = await requireDb();
  const replay = await readMaterialReplay(db, userId, input.eventId, "collectible", input.collectibleId);
  if (replay) return replay;
  const [definition] = await db.select().from(collectibleDefinitions).where(eq(collectibleDefinitions.id, input.collectibleId)).limit(1);
  if (!definition) throw new Error("找不到這件收藏品。");
  const [owned] = await db.select().from(userCollectibles).where(and(eq(userCollectibles.userId, userId), eq(userCollectibles.collectibleId, input.collectibleId))).limit(1);
  if (owned) throw new Error("你已經收藏這件物品了。");
  const transaction = await performMaterialPurchase(userId, input.eventId, definition.cost, "collectible", input.collectibleId, undefined, async tx => {
    await tx.insert(userCollectibles).values({ userId, collectibleId: input.collectibleId, acquisitionEventId: input.eventId });
  });
  return { success: true, materialsSpent: definition.cost, alreadyRecorded: transaction.alreadyRecorded };
}

export async function setCollectibleEquipped(userId: number, collectibleId: string, equipped: boolean) {
  const db = await requireDb();
  const [owned] = await db.select().from(userCollectibles).where(and(eq(userCollectibles.userId, userId), eq(userCollectibles.collectibleId, collectibleId))).limit(1);
  if (!owned) throw new Error("請先取得這件收藏品。");
  await db.update(userCollectibles).set({ equipped }).where(and(eq(userCollectibles.userId, userId), eq(userCollectibles.collectibleId, collectibleId)));
  return { success: true };
}
