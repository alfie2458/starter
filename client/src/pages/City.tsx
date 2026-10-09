import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Building2, Check, CircleHelp, Clock3, LoaderCircle, LockKeyhole, Minus, Plus, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CityArtwork } from "@/components/CityArtwork";
import { useStargrid } from "@/lib/stargrid-context";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const conditionCopy: Record<string, string> = {
  tutorial: "完成新手引導",
  review_count: "完成 5 次有效複習",
  study_count: "完成 10 次有效學習任務",
  deep_count: "完成 5 次錯題修正或主動回想",
  study_days: "在 7 個不同日期完成有效學習（不必連續）",
  exam_cycle: "完成考前規劃及考後回顧",
};

export default function City() {
  const { data } = useStargrid();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const mutation = trpc.stargrid.city.transact.useMutation();
  const eventRef = useRef<{ key: string; id: string } | null>(null);
  const selected = data.buildings.find(item => item.id === selectedId) ?? data.buildings.find(item => item.state?.unlockedAt && !item.state.builtAt) ?? data.buildings[0];
  const builtList = data.buildings.filter(item => item.state?.builtAt);
  const readyCount = data.buildings.filter(item => item.state?.unlockedAt && !item.state.builtAt).length;
  const isOnline = typeof navigator === "undefined" || navigator.onLine;

  const transact = async (upgrade: boolean) => {
    if (!selected) return;
    const key = `${selected.id}:${upgrade ? "upgrade" : "build"}`;
    if (!eventRef.current || eventRef.current.key !== key) eventRef.current = { key, id: crypto.randomUUID() };
    let result: Awaited<ReturnType<typeof mutation.mutateAsync>>;
    try {
      result = await mutation.mutateAsync({ eventId: eventRef.current.id, buildingId: selected.id, upgrade });
      eventRef.current = null;
    } catch (error) { toast.error(error instanceof Error ? error.message : "雲端尚未確認交易，沒有顯示建造成功。請檢查網路後重試。"); return; }
    const refreshFailed = await utils.stargrid.dashboard.invalidate().then(() => false, () => true);
    toast.success(upgrade ? `${selected.name}已升級至 Lv.${result.level}。` : `${selected.name}已建造完成，城市將保留這項成果。`);
    if (refreshFailed) toast.warning("城市交易已保存；版面稍後會重新同步，請勿再次建立相同交易。");
  };

  return <div className="city-page page-enter">
    <section className="page-intro city-intro"><div><span className="section-index">CITY / BUILD / EXPAND</span><h1>你的城市版圖</h1><p>先解鎖建造資格，再決定要不要花建材。已建成的設施不會因休息而損壞。</p></div><div className="city-count-chip"><Building2 size={16} /><b>{builtList.length}</b><span>座已建造</span><i /> <b>{readyCount}</b><span>個可建造</span></div></section>

    <section className="city-map-panel"><div className="card-topline"><span className="section-index">STARGRID / SECTOR 01 — CENTRAL DISTRICT</span><span className="map-live"><i />已同步城市版圖</span></div><CityArtwork onSelect={setSelectedId} /><div className="map-caption"><span><Sparkles size={14} />每個亮起的地標，都來自真實記錄的學習行動。</span><span>SECTOR 01 · {builtList.length} / {data.buildings.length}</span></div></section>

    <section className="city-detail-grid">
      <div className="building-list-panel"><div className="section-heading compact-heading"><div><span className="section-index">STRUCTURE CATALOG</span><h2>建築清單</h2></div><span className="count-mini">{data.buildings.length} 項設施</span></div>
        <div className="building-list">{data.buildings.map((item, index) => {
          const state = item.state; const built = Boolean(state?.builtAt); const unlocked = Boolean(state?.unlockedAt); const progress = Math.min(item.threshold, item.progress);
          return <button key={item.id} className={`building-row ${item.id === selected?.id ? "selected" : ""} ${built ? "built" : unlocked ? "ready" : "locked"}`} onClick={() => setSelectedId(item.id)}>
            <span className="building-row-index">0{index + 1}</span><span className="building-row-icon">{built ? <Check size={17} /> : unlocked ? <Building2 size={17} /> : <LockKeyhole size={16} />}</span><span className="building-row-copy"><b>{item.name}</b><small>{built ? `已建造 · Lv.${state?.level}` : unlocked ? "已解鎖 · 可建造" : conditionCopy[item.unlockRule]}</small></span><span className="building-row-cost">{built ? <span className="built-pill">建成</span> : `${item.cost} MAT`}</span><ArrowRight size={15} className="row-arrow" />
            {!unlocked && <span className="sr-only">進度 {progress} / {item.threshold}</span>}
          </button>;
        })}</div>
      </div>

      {selected && <aside className="building-detail-panel"><div className="building-detail-top"><span className="building-detail-index">STRUCTURE / {selected.sortOrder.toString().padStart(2, "0")}</span><span className={`building-status ${selected.state?.builtAt ? "status-built" : selected.state?.unlockedAt ? "status-ready" : "status-locked"}`}>{selected.state?.builtAt ? "已建造" : selected.state?.unlockedAt ? "可建造" : "未解鎖"}</span></div><div className={`building-detail-art ${selected.state?.builtAt ? "art-built" : ""}`}><span className="art-grid-lines" /><Building2 size={54} strokeWidth={1.2} /><span className="art-orbit" /><span className="art-code">SG–{selected.sortOrder.toString().padStart(2, "0")}</span></div><h2>{selected.name}</h2><p>{selected.description}</p>
        <div className="detail-spec-list"><div><span><CircleHelp size={13} />解鎖條件</span><b>{conditionCopy[selected.unlockRule]}</b>{!selected.state?.unlockedAt && <small className="condition-progress">目前進度：{Math.min(selected.threshold, selected.progress)} / {selected.threshold}</small>}</div><div><span><Wrench size={13} />建造成本</span><b>{selected.cost === 0 ? "免費" : `${selected.cost} 建材`}</b></div>{selected.state?.builtAt && <div><span><Sparkles size={13} />目前等級</span><b>Lv.{selected.state.level}</b></div>}</div>
        {!selected.state?.unlockedAt ? <div className="locked-explainer"><LockKeyhole size={15} /><span>達成學習條件後會解鎖資格；資源不會自動扣除。</span></div> : !selected.state?.builtAt ? <Button className="button-cyan detail-build-button" onClick={() => void transact(false)} disabled={!isOnline || mutation.isPending || data.wallet.materials < selected.cost}>{mutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Building2 size={16} />}建造這項設施 {selected.cost > 0 && <span>· {selected.cost} MAT</span>}</Button> : <div className="upgrade-box"><div><span><Plus size={14} />升級至 Lv.{selected.state.level + 1}</span><small>升級成本 {Math.max(10, 15 * selected.state.level)} 建材</small></div><Button variant="outline" onClick={() => void transact(true)} disabled={!isOnline || mutation.isPending || data.wallet.materials < Math.max(10, 15 * selected.state.level)}>{mutation.isPending ? <LoaderCircle className="spin" size={15} /> : <ArrowUpRight size={15} />}升級</Button></div>}
        <div className="retention-note"><Clock3 size={13} />城市建築永久保留，不因休息或未登入而損壞。</div>
      </aside>}
    </section>
  </div>;
}
