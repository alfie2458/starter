export const REWARDS = [
  { id: "micro", label: "5 分鐘微型學習", xp: 8, materials: 2, minMinutes: 5, enabled: true },
  { id: "review", label: "15 分鐘一般複習", xp: 20, materials: 5, minMinutes: 15, enabled: true },
  { id: "focus", label: "25 分鐘專注學習", xp: 30, materials: 7, minMinutes: 25, enabled: true },
  { id: "recall", label: "一組主動回想練習", xp: 12, materials: 3, minMinutes: 0, enabled: true },
  { id: "error_fix", label: "錯題修正並再次作答", xp: 15, materials: 4, minMinutes: 0, enabled: true },
  { id: "weekly_review", label: "每週學習回顧", xp: 25, materials: 8, minMinutes: 0, enabled: true },
] as const;

export type RewardDefinition = (typeof REWARDS)[number];

export const BUILDINGS = [
  { id: "habitat", name: "居住艙", description: "城市的第一處安全基地。記錄你的學習出發點，無需花費建材。", icon: "House", cost: 0, unlockRule: "tutorial", threshold: 1, sortOrder: 1 },
  { id: "library", name: "資料圖書館", description: "把反覆閱讀與整理的知識，保存成城市的記憶。", icon: "Library", cost: 30, unlockRule: "review_count", threshold: 5, sortOrder: 2 },
  { id: "power_tower", name: "能源塔", description: "每一段有效學習，都為城市帶來穩定能量。", icon: "Zap", cost: 45, unlockRule: "study_count", threshold: 10, sortOrder: 3 },
  { id: "research_center", name: "研究中心", description: "以主動回想和修正錯誤，深入理解複雜概念。", icon: "FlaskConical", cost: 55, unlockRule: "deep_count", threshold: 5, sortOrder: 4 },
  { id: "sky_station", name: "空中交通站", description: "在不同的日子慢慢累積學習，不必連續登入。", icon: "TrainFront", cost: 70, unlockRule: "study_days", threshold: 7, sortOrder: 5 },
  { id: "observatory", name: "觀測站", description: "把考前計畫與考後回顧連起來，找到適合自己的策略。", icon: "Telescope", cost: 90, unlockRule: "exam_cycle", threshold: 1, sortOrder: 6 },
] as const;

export const COLLECTIBLES = [
  { id: "holo_sign", name: "全息招牌", description: "為城市入口裝上一道柔和的青色訊號。", category: "decoration" as const, icon: "PanelsTopLeft", unlockRule: "purchase", cost: 18, rarity: "一般" },
  { id: "neon_tree", name: "霓虹樹", description: "一株由光線勾勒的城市植栽。", category: "decoration" as const, icon: "Trees", unlockRule: "purchase", cost: 22, rarity: "一般" },
  { id: "sky_train", name: "空中列車站", description: "連接城市裡不同的學習區域。", category: "decoration" as const, icon: "TrainFront", unlockRule: "purchase", cost: 28, rarity: "精良" },
  { id: "drone_dock", name: "無人機停靠站", description: "讓知識沿著另一條路徑抵達城市。", category: "decoration" as const, icon: "Drone", unlockRule: "purchase", cost: 24, rarity: "精良" },
  { id: "skybridge", name: "玻璃天橋", description: "以一道光廊連起兩棟建築。", category: "decoration" as const, icon: "Waypoints", unlockRule: "purchase", cost: 32, rarity: "稀有" },
  { id: "twilight_sky", name: "暮色天空", description: "切換為沉靜的晚霞主題。", category: "theme" as const, icon: "CloudSun", unlockRule: "purchase", cost: 35, rarity: "稀有" },
] as const;

export const ACHIEVEMENTS = [
  { id: "first_connection", name: "初次連線", description: "完成第一次有效學習任務。", icon: "Sparkles", condition: "study_count", threshold: 1, rarity: "一般" },
  { id: "knowledge_collector", name: "知識採集者", description: "完成 10 次有效複習。", icon: "BookOpenCheck", condition: "review_count", threshold: 10, rarity: "精良" },
  { id: "debug_engineer", name: "除錯工程師", description: "完成 10 次錯題修正。", icon: "Bug", condition: "error_count", threshold: 10, rarity: "精良" },
  { id: "steady_power", name: "穩定供能", description: "在 5 個不同日期完成學習。", icon: "BatteryCharging", condition: "study_days", threshold: 5, rarity: "精良" },
  { id: "system_restart", name: "系統重啟", description: "中斷後再次開始並完成學習。", icon: "RotateCcw", condition: "restart", threshold: 1, rarity: "一般" },
  { id: "semester_builder", name: "學期建設者", description: "完成一次學期回顧。", icon: "Landmark", condition: "semester_review", threshold: 1, rarity: "稀有" },
] as const;

export const TECHNOLOGIES = [
  { id: "focus_rhythm", branch: "focus" as const, name: "專注節奏", description: "使用計時器為一段專注學習預留時間。", requirement: "study_count", threshold: 1, parentId: null, sortOrder: 1 },
  { id: "focus_blocks", branch: "focus" as const, name: "區段管理", description: "完成 5 段有效學習，建立自己的節奏。", requirement: "study_count", threshold: 5, parentId: "focus_rhythm", sortOrder: 2 },
  { id: "memory_recall", branch: "memory" as const, name: "主動回想", description: "完成 3 組主動回想練習。", requirement: "recall_count", threshold: 3, parentId: null, sortOrder: 1 },
  { id: "memory_spacing", branch: "memory" as const, name: "間隔複習", description: "在 3 個不同日期完成複習。", requirement: "study_days", threshold: 3, parentId: "memory_recall", sortOrder: 2 },
  { id: "analysis_trends", branch: "analysis" as const, name: "趨勢觀測", description: "累積 5 次有效學習後查看個人趨勢。", requirement: "study_count", threshold: 5, parentId: null, sortOrder: 1 },
  { id: "analysis_weekly", branch: "analysis" as const, name: "週報脈絡", description: "完成一次每週學習回顧。", requirement: "weekly_review", threshold: 1, parentId: "analysis_trends", sortOrder: 2 },
  { id: "planning_exam", branch: "planning" as const, name: "段考路線圖", description: "記錄一次考前規劃。", requirement: "exam_plan", threshold: 1, parentId: null, sortOrder: 1 },
  { id: "planning_review", branch: "planning" as const, name: "回顧閉環", description: "完成考前規劃與考後回顧。", requirement: "exam_cycle", threshold: 1, parentId: "planning_exam", sortOrder: 2 },
] as const;

export type RewardId = RewardDefinition["id"];
export const REWARD_BY_ID = Object.fromEntries(REWARDS.map(item => [item.id, item])) as Record<string, RewardDefinition>;
