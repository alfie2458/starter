import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  addTask, buildOrUpgrade, exportUserData, finishTutorial, getDashboard, purchaseCollectible,
  recordStudy, setCollectibleEquipped, startStudySession, updatePreferences,
} from "./service";

const taskKind = z.enum(["micro", "review", "focus", "recall", "error_fix", "weekly_review", "exam_plan", "exam_review", "semester_review"]);
const toClientError = (error: unknown): never => {
  if (error instanceof TRPCError) throw error;
  if (error instanceof Error && /^(?:資料庫目前無法連線|錢包尚未準備|建材不足|找不到|尚未達成|這座建築|請先建造|你已經收藏|請先取得|這段學習|任務不存在|這項任務|學習類型|記錄分鐘數|.+至少需要記錄|這個交易識別碼|這個計時識別碼|你已有一段雲端計時|提交的任務|建築狀態已變更)/u.test(error.message)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
  }
  throw error;
};
const invoke = async <T>(work: () => Promise<T>): Promise<T> => {
  try { return await work(); } catch (error) { return toClientError(error); }
};

export const stargridRouter = router({
  dashboard: protectedProcedure.query(({ ctx }) => invoke(() => getDashboard(ctx.user.id))),
  onboarding: router({
    complete: protectedProcedure.mutation(({ ctx }) => invoke(() => finishTutorial(ctx.user.id))),
  }),
  profile: router({
    update: protectedProcedure.input(
      z.object({
        theme: z.enum(["dark", "light"]).optional(),
        animationsEnabled: z.boolean().optional(),
        displayName: z.string().trim().max(100).nullable().optional(),
      }).refine(value => Object.keys(value).length > 0),
    ).mutation(({ ctx, input }) => invoke(() => updatePreferences(ctx.user.id, input))),
    export: protectedProcedure.mutation(({ ctx }) => invoke(() => exportUserData(ctx.user.id))),
  }),
  tasks: router({
    add: protectedProcedure.input(z.object({
      title: z.string().trim().min(3).max(180),
      subject: z.string().trim().max(80).optional(),
      kind: taskKind,
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })).mutation(({ ctx, input }) => invoke(() => addTask(ctx.user.id, input))),
  }),
  study: router({
    start: protectedProcedure.input(z.object({
      id: z.string().uuid(), kind: taskKind, plannedMinutes: z.union([z.literal(5), z.literal(15), z.literal(25)]), taskId: z.number().int().positive().optional(),
    })).mutation(({ ctx, input }) => invoke(() => startStudySession(ctx.user.id, input))),
    record: protectedProcedure.input(z.object({
      eventId: z.string().uuid(), sessionId: z.string().uuid().optional(), taskId: z.number().int().positive().optional(),
      kind: taskKind, minutes: z.number().int().min(1).max(300), summary: z.string().trim().min(1).max(1000), completed: z.boolean(),
    }).refine(input => !input.completed || input.summary.trim().length >= 12, {
      message: "完成學習需填寫至少 12 個字的具體學習摘要。", path: ["summary"],
    })).mutation(({ ctx, input }) => invoke(() => recordStudy(ctx.user.id, input))),
  }),
  city: router({
    transact: protectedProcedure.input(z.object({ eventId: z.string().uuid(), buildingId: z.string().min(1).max(48), upgrade: z.boolean() }))
      .mutation(({ ctx, input }) => invoke(() => buildOrUpgrade(ctx.user.id, input))),
  }),
  collection: router({
    purchase: protectedProcedure.input(z.object({ eventId: z.string().uuid(), collectibleId: z.string().min(1).max(48) }))
      .mutation(({ ctx, input }) => invoke(() => purchaseCollectible(ctx.user.id, input))),
    equip: protectedProcedure.input(z.object({ collectibleId: z.string().min(1).max(48), equipped: z.boolean() }))
      .mutation(({ ctx, input }) => invoke(() => setCollectibleEquipped(ctx.user.id, input.collectibleId, input.equipped))),
  }),
});
