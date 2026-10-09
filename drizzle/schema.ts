import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Manus OAuth identity table supplied by the starter. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Per-user preferences and onboarding state. */
export const profiles = mysqlTable("profiles", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  displayName: varchar("displayName", { length: 100 }),
  tutorialComplete: boolean("tutorialComplete").default(false).notNull(),
  theme: mysqlEnum("theme", ["dark", "light"]).default("dark").notNull(),
  animationsEnabled: boolean("animationsEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  subject: varchar("subject", { length: 80 }),
  kind: mysqlEnum("kind", ["micro", "review", "focus", "recall", "error_fix", "weekly_review", "exam_plan", "exam_review", "semester_review"]).default("review").notNull(),
  dueDate: varchar("dueDate", { length: 10 }),
  systemKey: varchar("systemKey", { length: 48 }),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userDue: index("tasks_user_due_idx").on(table.userId, table.dueDate), uniqueSystemTask: uniqueIndex("tasks_user_system_key_unique").on(table.userId, table.systemKey) }));

export const studySessions = mysqlTable("study_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  taskId: int("taskId").references(() => tasks.id, { onDelete: "set null" }),
  kind: mysqlEnum("kind", ["micro", "review", "focus", "recall", "error_fix", "weekly_review", "exam_plan", "exam_review", "semester_review"]).notNull(),
  plannedMinutes: int("plannedMinutes").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  state: mysqlEnum("state", ["active", "completed", "partial", "abandoned"]).default("active").notNull(),
}, table => ({ userStarted: index("sessions_user_started_idx").on(table.userId, table.startedAt) }));

export const studyRecords = mysqlTable("study_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("sessionId", { length: 36 }).unique().references(() => studySessions.id, { onDelete: "set null" }),
  taskId: int("taskId").unique().references(() => tasks.id, { onDelete: "set null" }),
  kind: mysqlEnum("kind", ["micro", "review", "focus", "recall", "error_fix", "weekly_review", "exam_plan", "exam_review", "semester_review"]).notNull(),
  minutes: int("minutes").notNull(),
  summary: text("summary").notNull(),
  completed: boolean("completed").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userCreated: index("records_user_created_idx").on(table.userId, table.createdAt) }));

export const rewardDefinitions = mysqlTable("reward_definitions", {
  id: varchar("id", { length: 32 }).primaryKey(),
  label: varchar("label", { length: 100 }).notNull(),
  xp: int("xp").notNull(),
  materials: int("materials").notNull(),
  minMinutes: int("minMinutes").default(0).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const rewardEvents = mysqlTable("reward_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  studyRecordId: varchar("studyRecordId", { length: 36 }).notNull().unique().references(() => studyRecords.id, { onDelete: "cascade" }),
  rewardType: varchar("rewardType", { length: 32 }).notNull(),
  baseXp: int("baseXp").notNull(),
  awardedXp: int("awardedXp").notNull(),
  materials: int("materials").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userCreated: index("reward_user_created_idx").on(table.userId, table.createdAt) }));

export const userWallets = mysqlTable("user_wallets", {
  userId: int("userId").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  xp: int("xp").default(0).notNull(),
  materials: int("materials").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const walletTransactions = mysqlTable("wallet_transactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  referenceId: varchar("referenceId", { length: 36 }).notNull().unique(),
  kind: mysqlEnum("kind", ["reward", "build", "upgrade", "collectible"]).notNull(),
  xpDelta: int("xpDelta").default(0).notNull(),
  materialsDelta: int("materialsDelta").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userCreated: index("transactions_user_created_idx").on(table.userId, table.createdAt) }));

export const buildingDefinitions = mysqlTable("building_definitions", {
  id: varchar("id", { length: 48 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 48 }).notNull(),
  cost: int("cost").notNull(),
  unlockRule: varchar("unlockRule", { length: 32 }).notNull(),
  threshold: int("threshold").default(0).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export const userBuildings = mysqlTable("user_buildings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  buildingId: varchar("buildingId", { length: 48 }).notNull().references(() => buildingDefinitions.id),
  unlockedAt: timestamp("unlockedAt"),
  builtAt: timestamp("builtAt"),
  level: int("level").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ uniqueUserBuilding: uniqueIndex("user_building_unique").on(table.userId, table.buildingId) }));

export const buildingLogs = mysqlTable("building_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  buildingId: varchar("buildingId", { length: 48 }).notNull().references(() => buildingDefinitions.id),
  action: mysqlEnum("action", ["build", "upgrade"]).notNull(),
  level: int("level").notNull(),
  materialsDelta: int("materialsDelta").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({ userCreated: index("building_logs_user_created_idx").on(table.userId, table.createdAt) }));

export const collectibleDefinitions = mysqlTable("collectible_definitions", {
  id: varchar("id", { length: 48 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["decoration", "theme"]).notNull(),
  icon: varchar("icon", { length: 48 }).notNull(),
  unlockRule: varchar("unlockRule", { length: 32 }).notNull(),
  cost: int("cost").default(0).notNull(),
  rarity: varchar("rarity", { length: 24 }).default("一般").notNull(),
});

export const userCollectibles = mysqlTable("user_collectibles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  collectibleId: varchar("collectibleId", { length: 48 }).notNull().references(() => collectibleDefinitions.id),
  acquisitionEventId: varchar("acquisitionEventId", { length: 36 }).unique(),
  acquiredAt: timestamp("acquiredAt").defaultNow().notNull(),
  equipped: boolean("equipped").default(false).notNull(),
}, table => ({ uniqueUserCollectible: uniqueIndex("user_collectible_unique").on(table.userId, table.collectibleId) }));

export const achievementDefinitions = mysqlTable("achievement_definitions", {
  id: varchar("id", { length: 48 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 48 }).notNull(),
  condition: varchar("condition", { length: 32 }).notNull(),
  threshold: int("threshold").default(1).notNull(),
  rarity: varchar("rarity", { length: 24 }).default("一般").notNull(),
});

export const userAchievements = mysqlTable("user_achievements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  achievementId: varchar("achievementId", { length: 48 }).notNull().references(() => achievementDefinitions.id),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
}, table => ({ uniqueUserAchievement: uniqueIndex("user_achievement_unique").on(table.userId, table.achievementId) }));

export const technologyNodes = mysqlTable("technology_nodes", {
  id: varchar("id", { length: 48 }).primaryKey(),
  branch: mysqlEnum("branch", ["focus", "memory", "analysis", "planning"]).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  requirement: varchar("requirement", { length: 32 }).notNull(),
  threshold: int("threshold").default(1).notNull(),
  parentId: varchar("parentId", { length: 48 }),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export const userTechnologyProgress = mysqlTable("user_technology_progress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  nodeId: varchar("nodeId", { length: 48 }).notNull().references(() => technologyNodes.id),
  progress: int("progress").default(0).notNull(),
  unlockedAt: timestamp("unlockedAt"),
}, table => ({ uniqueUserNode: uniqueIndex("user_technology_node_unique").on(table.userId, table.nodeId) }));

export type Task = typeof tasks.$inferSelect;
export type StudyRecord = typeof studyRecords.$inferSelect;
