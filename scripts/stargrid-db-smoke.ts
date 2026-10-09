import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { users } from "../drizzle/schema";
import { getDb } from "../server/db";
import {
  buildOrUpgrade,
  addTask,
  finishTutorial,
  getDashboard,
  purchaseCollectible,
  recordStudy,
  startStudySession,
} from "../server/stargrid/service";

async function main() {
  const maybeDb = await getDb();
  if (!maybeDb) throw new Error("DATABASE_URL is unavailable; STARGRID DB smoke test cannot run.");
  const db = maybeDb;
  const testOpenIds: string[] = [];

  async function createDisposableUser(label: string) {
    const openId = `stargrid-smoke-${label}-${randomUUID()}`;
    testOpenIds.push(openId);
    await db.insert(users).values({ openId, name: `STARGRID smoke ${label}`, role: "user" });
    const [user] = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
    if (!user) throw new Error("Could not create disposable STARGRID smoke user.");
    return user.id;
  }

  try {
    const userId = await createDisposableUser("primary");
    const otherUserId = await createDisposableUser("isolation");

    let dashboard = await getDashboard(userId);
    assert.equal(dashboard.wallet.xp, 0, "new account starts with 0 XP");
    assert.equal(dashboard.wallet.materials, 0, "new account starts with 0 materials");
    await finishTutorial(userId);
    dashboard = await getDashboard(userId);
    assert.ok(dashboard.buildings.find(item => item.id === "habitat")?.state?.unlockedAt, "tutorial unlocks the free habitat");

    const reviewTask = dashboard.tasks.find(task => !task.completedAt && task.kind === "review");
    assert.ok(reviewTask, "new account receives a review task");
    const crossDateTask = await addTask(userId, { title: "跨日區段任務", subject: "smoke", kind: "review", dueDate: "2020-01-01" });
    const sessionId = randomUUID();
    const startInput = { id: sessionId, kind: "review" as const, plannedMinutes: 15, taskId: crossDateTask.id };
    await startStudySession(userId, startInput);
    dashboard = await getDashboard(userId);
    assert.equal(dashboard.wallet.xp, 0, "starting a timer grants no reward");
    assert.ok(!dashboard.tasks.some(task => task.id === crossDateTask.id), "past-dated task is not piled back into today's list");
    assert.equal(dashboard.activeTask?.id, crossDateTask.id, "active session still exposes its linked past-dated task");
    assert.equal((await startStudySession(userId, startInput)).reused, true, "same timer id is safely replayable");
    await assert.rejects(
      () => startStudySession(userId, { ...startInput, id: randomUUID() }),
      /已有一段雲端計時/u,
      "one account cannot hold two active cloud sessions",
    );
    await assert.rejects(
      () => recordStudy(userId, { eventId: randomUUID(), kind: "review", minutes: 15, summary: "另一筆不可在計時中補記的完整學習摘要。", completed: true }),
      /雲端計時正在進行/u,
      "no manual record may race an active cloud session",
    );
    const partialEventId = randomUUID();
    const partialResult = await recordStudy(userId, {
      eventId: partialEventId, sessionId, taskId: crossDateTask.id, kind: "review", minutes: 1,
      summary: "本次只完成部分練習，沒有送出完整複習摘要。", completed: false,
    });
    assert.equal(partialResult.reward, null, "partial study records do not grant resources");
    dashboard = await getDashboard(userId);
    assert.equal(dashboard.wallet.materials, 0, "partial study leaves wallet unchanged");
    assert.equal(dashboard.tasks.find(task => task.id === reviewTask.id)?.completedAt, null, "partial study does not complete its linked task");
    const mismatchedTask = await addTask(userId, { title: "錯誤類型任務", subject: "smoke", kind: "focus" });
    await assert.rejects(
      () => startStudySession(userId, { id: randomUUID(), kind: "review", plannedMinutes: 15, taskId: mismatchedTask.id }),
      /學習類型必須符合所選任務/u,
      "session cannot be linked to a task of a different study kind",
    );

    let replayInput: Parameters<typeof recordStudy>[1] | undefined;
    for (let index = 0; index < 7; index += 1) {
      const input = {
        eventId: randomUUID(), taskId: index === 0 ? reviewTask.id : undefined, kind: "review" as const, minutes: 15,
        summary: `隔離整合測試第 ${index + 1} 段：完成並摘要一般複習的具體內容。`, completed: true,
      };
      const result = await recordStudy(userId, input);
      assert.ok(result.success);
      assert.equal(result.reward?.xp, index < 5 ? 20 : 10, `review ${index + 1} follows the 100 XP reference and 50% taper`);
      if (index === 0) replayInput = input;
    }
    assert.ok(replayInput);
    assert.equal((await recordStudy(userId, replayInput)).alreadyRecorded, true, "duplicate record event is idempotent");

    dashboard = await getDashboard(userId);
    assert.equal(dashboard.wallet.xp, 120, "XP keeps increasing after the daily reference rather than hard-capping");
    assert.equal(dashboard.wallet.materials, 35, "review materials are ledgered exactly once per activity");
    assert.ok(dashboard.buildings.find(item => item.id === "library")?.state?.unlockedAt, "five valid reviews unlock the data library");
    assert.ok(dashboard.tasks.find(task => task.id === reviewTask.id)?.completedAt, "a completed review updates its linked cloud task");

    const buildEventId = randomUUID();
    const firstBuild = await buildOrUpgrade(userId, { eventId: buildEventId, buildingId: "library", upgrade: false });
    assert.equal(firstBuild.level, 1);
    assert.equal(firstBuild.alreadyRecorded, false);
    const retriedBuild = await buildOrUpgrade(userId, { eventId: buildEventId, buildingId: "library", upgrade: false });
    assert.equal(retriedBuild.alreadyRecorded, true, "retrying a committed build returns the existing ledger event");
    dashboard = await getDashboard(userId);
    assert.ok(dashboard.buildings.find(item => item.id === "library")?.state?.builtAt, "building persists in cloud state");
    assert.equal(dashboard.wallet.materials, 5, "retry does not deduct construction materials twice");
    await assert.rejects(
      () => purchaseCollectible(userId, { eventId: randomUUID(), collectibleId: "holo_sign" }),
      /建材不足/u,
      "insufficient materials block purchases",
    );
    assert.equal((await getDashboard(userId)).wallet.materials, 5, "a rejected purchase does not alter the wallet");

    const otherDashboard = await getDashboard(otherUserId);
    assert.equal(otherDashboard.wallet.xp, 0, "second account cannot see another account's XP");
    assert.equal(otherDashboard.wallet.materials, 0, "second account cannot see another account's materials");
    assert.equal(otherDashboard.builtCount, 0, "second account cannot see another account's buildings");
    assert.equal(otherDashboard.recentRecords.length, 0, "second account cannot see another account's study records");

    console.log("STARGRID DB smoke: PASS — tutorial unlock, no start reward, one active timer, partial/no reward, reward idempotency, taper without cap, building unlock/build retry, insufficient-funds protection, account isolation.");
  } finally {
    for (const openId of testOpenIds) await db.delete(users).where(eq(users.openId, openId));
    await db.$client.end();
  }
}

main().catch(error => {
  console.error("STARGRID DB smoke: FAIL", error);
  process.exitCode = 1;
});
