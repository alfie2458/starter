import { useRef, useState } from "react";
import { ArrowRight, BadgeCheck, BookMarked, Building2, CalendarCheck, ChartNoAxesCombined, Check, CircleHelp, Flower2, Focus, Gem, LoaderCircle, LockKeyhole, PanelsTopLeft, Orbit, Sparkles, Trees, Waypoints, CloudSun, TrainFront, RadioTower, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useStargrid } from "@/lib/stargrid-context";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const iconMap: Record<string, typeof PanelsTopLeft> = { PanelsTopLeft, Trees, TrainFront, Drone: RadioTower, Waypoints, CloudSun, Sparkles, BookOpenCheck: BookMarked, BookOpenCheckIcon: BookMarked, Bug: CircleHelp, BatteryCharging: Gem, RotateCcw: ArrowRight, Landmark: Building2 };
type Tab = "buildings" | "decorations" | "technology" | "achievements";

export default function Archive() {
  const { data } = useStargrid();
  const [tab, setTab] = useState<Tab>("buildings");
  const [busyId, setBusyId] = useState<string | null>(null);
  const eventRef = useRef<string | null>(null);
  const utils = trpc.useUtils();
  const purchase = trpc.stargrid.collection.purchase.useMutation();
  const equip = trpc.stargrid.collection.equip.useMutation();
  const isOnline = typeof navigator === "undefined" || navigator.onLine;
  const ownedDecorations = data.collectibles.filter(item => item.owned);
  const eligibleCount = data.collectibles.length + data.achievements.length + data.buildings.filter(item => item.state?.builtAt).length;

  const buy = async (id: string) => {
    setBusyId(id); eventRef.current ??= crypto.randomUUID();
    try {
      const result = await purchase.mutateAsync({ eventId: eventRef.current, collectibleId: id });
      eventRef.current = null;
      const refreshFailed = await utils.stargrid.dashboard.invalidate().then(() => false, () => true);
      toast.success(`已將收藏加入雲端圖鑑${result.materialsSpent ? `，使用 ${result.materialsSpent} 建材` : ""}。`);
      if (refreshFailed) toast.warning("收藏交易已保存；圖鑑稍後會重新同步，請勿重複購買。");
    } catch (error) { toast.error(error instanceof Error ? error.message : "雲端未確認購買成功，請檢查同步狀態後重試。"); }
    finally { setBusyId(null); }
  };
  const toggleEquip = async (id: string, current: boolean) => {
    setBusyId(id);
    try {
      await equip.mutateAsync({ collectibleId: id, equipped: !current });
      const refreshFailed = await utils.stargrid.dashboard.invalidate().then(() => false, () => true);
      toast.success(!current ? "已將裝飾加入城市配置。" : "已從城市配置移除裝飾。");
      if (refreshFailed) toast.warning("配置已保存；城市預覽稍後會重新同步。");
    } catch (error) { toast.error(error instanceof Error ? error.message : "裝飾狀態尚未同步，請稍後重試。"); }
    finally { setBusyId(null); }
  };

  return <div className="archive-page page-enter">
    <section className="page-intro"><div><span className="section-index">COLLECT / KEEP / REMEMBER</span><h1>收藏圖鑑</h1><p>稀有度只是收藏分類，不代表付費價值。所有徽章都來自真實達成條件。</p></div><div className="archive-count"><span className="archive-count-symbol">✧</span><b>{eligibleCount}</b><span>項城市收藏</span></div></section>
    <div className="archive-tabs" role="tablist" aria-label="收藏分類">{([ ["buildings", "建築圖鑑", Building2], ["decorations", "城市裝飾", Flower2], ["technology", "科技樹", Orbit], ["achievements", "成就徽章", BadgeCheck] ] as const).map(([id, label, Icon]) => <button role="tab" aria-selected={tab === id} className={tab === id ? "archive-tab active" : "archive-tab"} onClick={() => setTab(id)} key={id}><Icon size={16} />{label}<span>{id === "buildings" ? data.buildings.length : id === "decorations" ? data.collectibles.length : id === "technology" ? data.technologies.length : data.achievements.length}</span></button>)}</div>

    {tab === "buildings" && <section className="collection-grid">{data.buildings.map((item, index) => {
      const Icon = iconMap[item.icon] ?? Building2; const built = Boolean(item.state?.builtAt); const unlocked = Boolean(item.state?.unlockedAt);
      return <article key={item.id} className={`collection-card ${built ? "collection-owned" : unlocked ? "collection-ready" : "collection-locked"}`}><div className="collection-card-top"><span className="collection-card-index">SG–{String(index + 1).padStart(2, "0")}</span>{built ? <span className="collection-state owned"><Check size={12} />已建造</span> : unlocked ? <span className="collection-state ready">可建造</span> : <span className="collection-state locked"><LockKeyhole size={11} />未解鎖</span>}</div><div className="collection-art"><span className="collection-art-glow" /><Icon size={38} strokeWidth={1.25} /></div><h2>{item.name}</h2><p>{item.description}</p><div className="collection-card-foot"><span>{built ? `建築等級 Lv.${item.state?.level}` : `建造成本 ${item.cost} MAT`}</span><span>{item.state?.unlockedAt ? "條件已達成" : `${Math.min(item.progress, item.threshold)} / ${item.threshold}`}</span></div></article>;
    })}</section>}

    {tab === "decorations" && <><div className="collection-note"><Sparkles size={15} /><span>使用累積的建材收藏裝飾；購入成功以伺服器資料為準。已有裝飾可以加入或移出城市配置。</span></div><section className="collection-grid">{data.collectibles.map((item, index) => {
      const Icon = iconMap[item.icon] ?? PanelsTopLeft; const owned = Boolean(item.owned);
      return <article key={item.id} className={`collection-card ${owned ? "collection-owned" : "collection-locked"}`}><div className="collection-card-top"><span className="collection-card-index">DEC–{String(index + 1).padStart(2, "0")}</span><span className={`rarity-tag rarity-${item.rarity}`}>{item.rarity}</span></div><div className="collection-art decoration-art"><span className="collection-art-glow" /><Icon size={36} strokeWidth={1.35} /></div><h2>{item.name}</h2><p>{item.description}</p><div className="collection-card-foot"><span>{owned ? `收藏於 ${new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "numeric", day: "numeric" }).format(new Date(item.owned!.acquiredAt))}` : `成本 ${item.cost} MAT`}</span>{owned ? <Button variant="outline" size="sm" onClick={() => void toggleEquip(item.id, item.owned!.equipped)} disabled={busyId === item.id}>{busyId === item.id ? <LoaderCircle className="spin" size={13} /> : item.owned!.equipped ? <Check size={13} /> : <PlusIcon />} {item.owned!.equipped ? "已配置" : "配置裝飾"}</Button> : <Button size="sm" onClick={() => void buy(item.id)} disabled={!isOnline || busyId === item.id || data.wallet.materials < item.cost}>{busyId === item.id ? <LoaderCircle className="spin" size={13} /> : <Gem size={13} />}收藏</Button>}</div></article>;
    })}</section></>}

    {tab === "technology" && <><div className="collection-note"><Orbit size={15} /><span>科技節點只描述學習里程碑，不會鎖住基本學習、任務管理、資料匯出或帳號安全。</span><Link href="/research" className="text-link">查看完整路線 <ArrowRight size={14} /></Link></div><section className="collection-grid">{data.technologies.map((item, index) => {
      const branchName = ({ focus: "專注科技", memory: "記憶科技", analysis: "分析科技", planning: "規劃科技" } as Record<string, string>)[item.branch] ?? item.branch;
      const BranchIcon = ({ focus: Focus, memory: Brain, analysis: ChartNoAxesCombined, planning: CalendarCheck } as Record<string, typeof Focus>)[item.branch] ?? Orbit;
      const progress = item.progress?.progress ?? 0; const unlocked = Boolean(item.progress?.unlockedAt);
      return <article key={item.id} className={`collection-card ${unlocked ? "collection-owned" : "collection-locked"}`}><div className="collection-card-top"><span className="collection-card-index">TECH–{String(index + 1).padStart(2, "0")}</span><span className={`collection-state ${unlocked ? "owned" : "locked"}`}>{unlocked ? <><Check size={12} />已解鎖</> : <><LockKeyhole size={11} />條件累積中</>}</span></div><div className="collection-art"><span className="collection-art-glow" /><BranchIcon size={36} strokeWidth={1.35} /></div><h2>{item.name}</h2><p>{item.description}</p><div className="collection-card-foot"><span>{branchName}</span><span>{Math.min(progress, item.threshold)} / {item.threshold}</span></div></article>;
    })}</section></>}

    {tab === "achievements" && <><div className="achievement-progress"><div><span className="section-index">MILESTONE COLLECTION</span><h2>每枚徽章，都對應一段真實歷程</h2></div><b>{data.achievements.filter(item => item.earned).length}<small> / {data.achievements.length}</small></b></div><section className="collection-grid badge-grid">{data.achievements.map((item, index) => {
      const Icon = iconMap[item.icon] ?? Sparkles; const earned = Boolean(item.earned);
      return <article key={item.id} className={`badge-card ${earned ? "earned" : "locked"}`}><div className="badge-card-index">BADGE / {String(index + 1).padStart(2, "0")}</div><div className="badge-icon-wrap"><span className="badge-glow" /><Icon size={30} strokeWidth={1.5} />{earned && <span className="badge-check"><Check size={11} /></span>}</div><span className={`rarity-tag rarity-${item.rarity}`}>{item.rarity}</span><h2>{item.name}</h2><p>{item.description}</p>{earned ? <small className="earned-date">取得時間：{new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "long", day: "numeric" }).format(new Date(item.earned!.earnedAt))}</small> : <small className="pending-date"><LockKeyhole size={12} />達成條件後自動收藏</small>}</article>;
    })}</section></>}
    <footer className="archive-footer"><Check size={14} />收藏與徽章由已登入帳號的學習紀錄和伺服器進度計算，不會因離線或登出而消失。</footer>
  </div>;
}

function PlusIcon() { return <ArrowRight size={13} />; }
