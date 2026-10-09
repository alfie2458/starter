import { useEffect, useState } from "react";
import { Check, Download, Eye, LogOut, Moon, Palette, Radio, Sun, UserRound, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStargrid } from "@/lib/stargrid-context";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";

export default function SettingsPage() {
  const { data } = useStargrid();
  const auth = useAuth();
  const utils = trpc.useUtils();
  const update = trpc.stargrid.profile.update.useMutation();
  const exportData = trpc.stargrid.profile.export.useMutation();
  const { setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(data.profile.displayName || "");
  const [saved, setSaved] = useState(false);
  useEffect(() => setDisplayName(data.profile.displayName || ""), [data.profile.displayName]);
  const save = async (input: { theme?: "dark" | "light"; animationsEnabled?: boolean; displayName?: string | null }) => {
    try { await update.mutateAsync(input); }
    catch (error) { toast.error(error instanceof Error ? error.message : "偏好設定尚未同步，請確認網路後再試。"); return; }
    if (input.theme) setTheme(input.theme);
    const refreshFailed = await utils.stargrid.dashboard.invalidate().then(() => false, () => true);
    setSaved(true); window.setTimeout(() => setSaved(false), 1800);
    toast.success("偏好設定已儲存至雲端帳號。");
    if (refreshFailed) toast.warning("設定已保存；此裝置的摘要稍後會重新同步。");
  };
  const isOnline = typeof navigator === "undefined" || navigator.onLine;
  const downloadData = async () => {
    try {
      const result = await exportData.mutateAsync();
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `stargrid-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("已匯出目前帳號的雲端資料 JSON。");
    } catch (error) { toast.error(error instanceof Error ? error.message : "資料匯出尚未完成，請稍後重試。"); }
  };
  return <div className="settings-page page-enter">
    <section className="page-intro"><div><span className="section-index">PREFERENCES / PRIVACY / CONTROL</span><h1>偏好設定</h1><p>這些設定會跟隨登入帳號，在不同裝置同步。</p></div><span className="settings-cloud"><Radio size={15} />ACCOUNT SYNC</span></section>
    <section className="settings-content-grid"><div className="settings-main">
      <article className="settings-card"><div className="settings-card-heading"><span className="settings-heading-icon"><Palette size={17} /></span><div><h2>城市介面</h2><p>選擇你閱讀和探索城市的舒適方式。</p></div></div>
        <div className="setting-row"><div className="setting-copy"><b>色彩主題</b><small>變更整個應用程式的背景與文字對比。</small></div><div className="segmented-choice"><button className={data.profile.theme === "dark" ? "chosen" : ""} onClick={() => void save({ theme: "dark" })} disabled={!isOnline || update.isPending}><Moon size={14} />深色</button><button className={data.profile.theme === "light" ? "chosen" : ""} onClick={() => void save({ theme: "light" })} disabled={!isOnline || update.isPending}><Sun size={14} />淺色</button></div></div>
        <div className="setting-row"><div className="setting-copy"><b>減少動態效果</b><small>關閉非必要動畫，保留所有互動與確認內容。</small></div><button className={`setting-switch ${!data.profile.animationsEnabled ? "on" : ""}`} aria-pressed={!data.profile.animationsEnabled} onClick={() => void save({ animationsEnabled: !data.profile.animationsEnabled })} disabled={!isOnline || update.isPending}><span />{!data.profile.animationsEnabled ? "已降低" : "標準"}</button></div>
      </article>
      <article className="settings-card"><div className="settings-card-heading"><span className="settings-heading-icon violet"><UserRound size={17} /></span><div><h2>城市建設者</h2><p>更新首頁顯示名稱；個人資料僅連結於目前登入帳號。</p></div></div><label className="display-name-field">顯示名稱<input value={displayName} onChange={event => setDisplayName(event.target.value)} maxLength={100} placeholder="例如：星海探索者" /></label><div className="settings-form-footer"><span>最多 100 個字元</span><Button onClick={() => void save({ displayName: displayName.trim() || null })} disabled={!isOnline || update.isPending}>{saved ? <Check size={15} /> : null}儲存顯示名稱</Button></div></article>
      <article className="settings-card"><div className="settings-card-heading"><span className="settings-heading-icon"><Eye size={17} /></span><div><h2>減壓與資料規則</h2><p>我們把學習優先放在城市機制前面。</p></div></div><div className="principle-list"><div><Check size={15} /><span>休息、延期、考差或中斷，不會扣除 XP 或建材。</span></div><div><Check size={15} /><span>不要求連續登入、每日固定任務數或保持在線。</span></div><div><Check size={15} /><span>獎勵由伺服器帳本確認；雲端失敗時不顯示成功。</span></div><div><Check size={15} /><span>基本學習、任務管理及帳號安全，不會被科技樹鎖住。</span></div></div></article>
      <article className="settings-card export-card"><div className="settings-card-heading"><span className="settings-heading-icon violet"><Download size={17} /></span><div><h2>匯出個人資料</h2><p>下載目前登入帳號的學習、獎勵帳本、建築、收藏與設定資料。</p></div></div><Button variant="outline" onClick={downloadData} disabled={!isOnline || exportData.isPending}>{exportData.isPending ? "正在準備資料…" : <><Download size={15} />下載 JSON</>}</Button></article>
    </div>
    <aside className="settings-aside"><div className="account-card"><span className="account-card-halo"><Waves size={22} /></span><span className="section-index">AUTHENTICATED ACCOUNT</span><h2>{data.profile.displayName || "城市建設者"}</h2><p>等級 {data.wallet.level} · {data.wallet.xp.toLocaleString()} 累積 XP</p><div className="account-card-status"><i /> Manus OAuth 已登入</div><Button variant="outline" className="settings-signout" onClick={async () => { try { await auth.logout(); window.location.href = "/"; } catch { toast.error("登出未完成；請確認網路後再試。") } }}><LogOut size={15} />登出帳號</Button></div>
      <div className="settings-note"><span>?</span><div><b>離線時會發生什麼？</b><p>雲端未確認前，學習表單不會顯示成功或領獎。連線恢復後可在工作台重新提交同一筆記錄。</p></div></div>
      <div className="settings-note data-note"><span>↗</span><div><b>資料保存方式</b><p>學習成果、XP、建材、建築與收藏存於伺服器資料庫，不依賴此瀏覽器的本機儲存。</p></div></div>
    </aside></section>
  </div>;
}
