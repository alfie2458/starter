import { ArrowRight, ArrowUpRight, BookOpenCheck, Building2, CalendarDays, Check, CircleDot, Clock3, Compass, Focus, Library, Sparkles, Target, Zap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CityArtwork } from "@/components/CityArtwork";
import { useStargrid } from "@/lib/stargrid-context";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const formatTime = (date: Date | string) => new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" }).format(new Date(date));

export default function Home() {
  const { data } = useStargrid();
  const utils = trpc.useUtils();
  const onboarding = trpc.stargrid.onboarding.complete.useMutation();
  const firstName = data.profile.displayName || "建設者";
  const date = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", month: "long", day: "numeric", weekday: "long" }).format(new Date());
  const finishedToday = data.tasks.filter(task => task.completedAt).length;
  const openTaskCount = data.tasks.filter(task => !task.completedAt).length;
  const recentBadge = data.achievements.find(item => item.earned);
  return <div className="dashboard-page page-enter">
    <section className="home-greeting">
      <div><span className="eyebrow">{date} <i className="eyebrow-dot" /></span><h1>早安，{firstName}<span className="greeting-spark">✳</span></h1><p>今天想先推進哪一小步？你的城市會照自己的節奏成長。</p></div>
      <div className="home-streak-note"><span className="note-pulse" /><span><b>休息不會扣除進度。</b><small>只要準備好了，再回來開始就好。</small></span></div>
    </section>

    {!data.profile.tutorialComplete && <section className="onboarding-card"><span className="onboarding-symbol">✳</span><div><span className="section-index">FIRST TRANSMISSION</span><h2>先認識你的城市</h2><p>學習紀錄由你自己決定何時送出；開始計時不會領獎。休息不扣資源，所有成果會隨帳號保存。</p></div><Button className="button-cyan" onClick={async () => { try { await onboarding.mutateAsync(); } catch (error) { toast.error(error instanceof Error ? error.message : "雲端尚未確認，請稍後重試。"); return; } const refreshFailed = await utils.stargrid.dashboard.invalidate().then(() => false, () => true); toast.success("引導已完成，居住艙已免費解鎖。"); if (refreshFailed) toast.warning("引導已保存；首頁摘要稍後會重新同步。"); }} disabled={onboarding.isPending}>{onboarding.isPending ? "正在同步…" : "完成引導並解鎖居住艙"}<ArrowRight size={15} /></Button></section>}

    <div className="home-overview-grid"><div className="home-focus-stack"><section className="focus-grid">
      <article className="focus-task-card">
        <div className="card-topline"><span className="section-index">01 / TODAY'S FOCUS</span><span className="focus-tag"><Target size={13} /> 今日主線</span></div>
        {data.mainTask ? <>
          <div className="task-card-body"><div className="task-type-icon"><BookOpenCheck size={21} /></div><div><div className="task-subject">{data.mainTask.subject || "個人學習"}</div><h2>{data.mainTask.title}</h2><p>一段有效的學習回顧，會記下你實際完成的內容。</p></div></div>
          <div className="task-card-meta"><span><Clock3 size={14} />預計 {data.mainTask.kind === "micro" ? 5 : data.mainTask.kind === "focus" ? 25 : 15} 分鐘</span><span className="reward-inline"><i>✳</i>完成記錄後依規則核發獎勵</span></div>
          <Link href={`/study?kind=${data.mainTask.kind}&task=${data.mainTask.id}`} className="primary-action">開始這段學習 <ArrowRight size={17} /></Link>
        </> : <>
          <div className="task-empty"><div className="empty-orbit"><Check size={25} /></div><div><h2>今天的主線已完成</h2><p>不用為了連續天數多做任務。想學時，可以自由記錄另一段練習。</p></div></div>
          <Link href="/study" className="secondary-action">自由記錄學習 <ArrowRight size={16} /></Link>
        </>}
      </article>

      <article className="day-progress-card">
        <div className="card-topline"><span className="section-index">02 / TODAY IN MOTION</span><CalendarDays size={17} className="muted-icon" /></div>
        <div className="day-progress-heading"><div><small>今日學習</small><div className="day-value">{data.stats.todayMinutes}<span> min</span></div></div><div className="progress-ring" style={{ "--ring-value": `${Math.min(100, data.stats.todayMinutes / 25 * 100)}%` } as React.CSSProperties}><b>{Math.min(100, Math.round(data.stats.todayMinutes / 25 * 100))}<small>%</small></b></div></div>
        <div className="linear-progress"><i style={{ width: `${Math.min(100, data.stats.todayMinutes / 25 * 100)}%` }} /></div>
        <div className="day-progress-foot"><span>{finishedToday} 個任務完成</span><span>{openTaskCount} 個待辦</span></div>
        <div className="quiet-note"><span className="quiet-dot" />目標是參考，不是每日考核。</div>
      </article>
    </section></div>

    <section className="city-home-section">
      <div className="section-heading"><div><span className="section-index">03 / YOUR CITY</span><h2>城市正在成形</h2><p>學習的痕跡，會在這裡慢慢亮起來。</p></div><Link href="/city" className="text-link">前往城市 <ArrowUpRight size={16} /></Link></div>
      <Link href="/city" className="home-city-link"><CityArtwork compact /></Link>
      <div className="city-summary-row"><span><Building2 size={15} /><b>{data.builtCount}</b> 座設施已建造</span>{data.nextBuilding ? <span className="next-city-goal"><CircleDot size={14} /><b>下一步</b>{data.nextBuilding.definition.name}：已達建造資格，準備 {data.nextBuilding.definition.cost} 建材</span> : <span className="next-city-goal"><Sparkles size={14} /><b>持續累積</b>探索下一個城市里程碑</span>}</div>
    </section></div>

    <section className="bottom-grid">
      <article className="mini-panel">
        <div className="mini-panel-heading"><span className="mini-icon cyan"><Zap size={16} /></span><div><h3>長期成長</h3><small>XP 永遠累積，不會被花掉</small></div></div>
        <div className="mini-stat"><b>{data.wallet.xp.toLocaleString()}</b><span>XP</span><small>等級 {data.wallet.level} 建設者</small></div>
        <div className="mini-panel-footer"><span className="level-track"><i style={{ width: `${data.wallet.levelProgress}%` }} /></span><Link href="/research">查看科技 <ArrowRight size={13} /></Link></div>
      </article>
      <article className="mini-panel">
        <div className="mini-panel-heading"><span className="mini-icon violet"><Library size={16} /></span><div><h3>最近的成長記錄</h3><small>每份成果只對應一項獎勵</small></div></div>
        {data.recentRewards.length > 0 ? <div className="recent-rewards">{data.recentRewards.slice(0, 2).map(item => <div className="reward-row" key={item.id}><span className="reward-bullet">✳</span><span><b>{item.rewardType.replaceAll("_", " ")}</b><small>{formatTime(item.createdAt)} · +{item.awardedXp} XP</small></span><em>+{item.materials} MAT</em></div>)}</div> : <div className="empty-small"><Focus size={16} /><span>完成一段學習並留下摘要後，獎勵會記錄在這裡。</span></div>}
      </article>
      <article className="mini-panel badge-panel">
        <div className="mini-panel-heading"><span className="mini-icon gold"><Sparkles size={16} /></span><div><h3>收藏進度</h3><small>由實際學習里程碑解鎖</small></div></div>
        {recentBadge ? <div className="badge-callout"><span>{recentBadge.icon === "Sparkles" ? "✦" : "◈"}</span><div><b>{recentBadge.name}</b><small>{recentBadge.description}</small></div></div> : <div className="empty-small"><Compass size={16} /><span>第一次有效學習後，就會開始記錄你的城市徽章。</span></div>}
        <Link href="/archive" className="mini-link">打開收藏圖鑑 <ArrowRight size={13} /></Link>
      </article>
    </section>
  </div>;
}
