import { Link, useLocation } from "wouter";
import { Archive, BookOpen, Building2, ChartNoAxesCombined, Compass, Home, LogOut, Settings, Sparkles, Sun, Moon, Wifi, WifiOff } from "lucide-react";
import { useStargrid } from "@/lib/stargrid-context";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

const nav = [
  { href: "/", label: "城市總覽", icon: Home },
  { href: "/study", label: "學習工作台", icon: BookOpen },
  { href: "/city", label: "建造城市", icon: Building2 },
  { href: "/archive", label: "收藏圖鑑", icon: Archive },
  { href: "/research", label: "科技路線", icon: Compass },
];

export function StargridShell({ children }: { children: ReactNode }) {
  const { data, refreshing, syncStatus } = useStargrid();
  const [location] = useLocation();
  const auth = useAuth();
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const theme = data.profile.theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.motion = data.profile.animationsEnabled ? "full" : "reduced";
  }, [data.profile.theme, data.profile.animationsEnabled]);
  const signOut = async () => {
    try {
      await auth.logout();
      window.location.href = "/";
    } catch {
      toast.error("登出未完成，請確認網路後再試。未清除帳號前請勿共用裝置。");
    }
  };
  const currentNav = nav.find(item => item.href === location) ?? nav[0];
  const date = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "long", day: "numeric", weekday: "long" }).format(clock);
  return (
    <div className="stargrid-app">
      <aside className="desktop-rail">
        <Link href="/" className="brand-mark" aria-label="STARGRID 城市總覽">
          <span className="brand-symbol"><i /><i /><i /></span><span className="brand-word">STAR<span>GRID</span><small>LEARNING CITY</small></span>
        </Link>
        <div className="rail-label">工作區</div>
        <nav className="rail-nav" aria-label="主導覽">
          {nav.map(item => {
            const Icon = item.icon; const active = location === item.href;
            return <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{active && <span className="nav-indicator" />}</Link>;
          })}
        </nav>
        <div className="rail-bottom">
          <div className="rail-tip"><span className="tip-orbit">✳</span><p>每一次有效練習，都是城市新座標。</p></div>
          <Link href="/settings" className={`nav-link settings-link ${location === "/settings" ? "active" : ""}`}><Settings size={18} /><span>偏好設定</span></Link>
          <button className="nav-link signout-link" onClick={signOut}><LogOut size={18} /><span>登出帳號</span></button>
          <div className="account-row"><span className="account-avatar">{(data.profile.displayName || "星").slice(0, 1)}</span><span className="account-copy"><b>{data.profile.displayName || "城市建設者"}</b><small>等級 {data.wallet.level} 建設者</small></span><Sparkles size={15} className="account-glint" /></div>
        </div>
      </aside>

      <main className="main-stage">
        <header className="topbar">
          <div className="topbar-heading"><div className="eyebrow">PROJECT STARGRID <span className="eyebrow-dot" /></div><div className="page-title">{currentNav.label}</div></div>
          <div className="topbar-right">
            <span className="date-chip">{date}</span>
            <span className={`sync-chip ${syncStatus}`} title={syncStatus === "offline" ? "離線：尚未送出的操作不會顯示為已同步" : syncStatus === "error" ? "最近一次雲端讀取失敗；目前顯示最後成功同步的資料" : refreshing ? "正在確認雲端狀態" : "已連線至雲端資料"}>
              {syncStatus === "online" ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{syncStatus === "offline" ? "離線" : syncStatus === "error" ? "同步有誤" : refreshing ? "同步中" : "雲端連線"}</span><i />
            </span>
            <Link href="/settings" className="mobile-profile" aria-label="偏好設定">{(data.profile.displayName || "星").slice(0, 1)}</Link>
          </div>
        </header>
        <div className="resource-strip" aria-label="城市資源">
          <div className="resource-item xp-resource"><span className="resource-symbol">✳</span><span><small>累積 XP</small><b>{data.wallet.xp.toLocaleString()}</b></span><span className="resource-divider" /><span className="resource-level">Lv.{data.wallet.level}</span></div>
          <div className="resource-item material-resource"><span className="resource-symbol">▧</span><span><small>建材庫存</small><b>{data.wallet.materials.toLocaleString()}</b></span><span className="resource-unit">MAT</span></div>
          <div className="resource-level-track"><div><span>距離等級 {data.wallet.level + 1}</span><b>{data.wallet.levelProgress}<small> / 100 XP</small></b></div><span className="level-track"><i style={{ width: `${data.wallet.levelProgress}%` }} /></span></div>
        </div>
        <section className="page-content">{children}</section>
      </main>
      <nav className="mobile-nav" aria-label="手機主導覽">
        {nav.slice(0, 5).map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={location === item.href ? "mobile-nav-item active" : "mobile-nav-item"}><Icon size={19} /><span>{item.href === "/" ? "總覽" : item.href === "/study" ? "學習" : item.href === "/city" ? "城市" : item.href === "/archive" ? "收藏" : "科技"}</span></Link>; })}
      </nav>
      <div className="sr-only"><Sun /><Moon /><ChartNoAxesCombined /></div>
    </div>
  );
}
