import { Activity, ArrowDown, ArrowRight, BookOpenCheck, Brain, CalendarCheck, Check, ChartNoAxesCombined, CircleHelp, Compass, Focus, LockKeyhole, Orbit, Target, Zap } from "lucide-react";
import { Link } from "wouter";
import { useStargrid } from "@/lib/stargrid-context";
import { useState } from "react";

const branches = [
  { id: "focus", name: "專注科技", subtitle: "FOCUS ENGINEERING", color: "cyan", icon: Focus, detail: "計時器與學習區段管理", link: "/study" },
  { id: "memory", name: "記憶科技", subtitle: "MEMORY SYSTEMS", color: "violet", icon: Brain, detail: "主動回想與間隔複習", link: "/study?kind=recall" },
  { id: "analysis", name: "分析科技", subtitle: "LEARNING ANALYTICS", color: "gold", icon: ChartNoAxesCombined, detail: "學習趨勢與每週回顧", link: "/study?kind=weekly_review" },
  { id: "planning", name: "規劃科技", subtitle: "STRATEGY DESIGN", color: "teal", icon: CalendarCheck, detail: "段考計畫與週回顧", link: "/study?kind=exam_plan" },
] as const;
const conditionName: Record<string, string> = { study_count: "有效學習任務", review_count: "有效複習", error_count: "錯題修正", recall_count: "主動回想", deep_count: "錯題修正或主動回想", study_days: "不同日期學習", weekly_review: "每週學習回顧", exam_plan: "考前規劃", exam_cycle: "考前規劃＋考後回顧", semester_review: "學期回顧", tutorial: "新手引導", restart: "中斷後再次學習" };
const branchIcons: Record<string, typeof Focus> = { study_count: Focus, review_count: BookOpenCheck, error_count: CircleHelp, recall_count: Brain, study_days: Orbit, weekly_review: ChartNoAxesCombined, exam_plan: Target, exam_cycle: Compass };

export default function Research() {
  const { data } = useStargrid();
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const unlockedCount = data.technologies.filter(item => item.progress?.unlockedAt).length;
  const allCount = data.technologies.length;
  return <div className="research-page page-enter">
    <section className="page-intro research-intro"><div><span className="section-index">RESEARCH / MILESTONES / YOUR PACE</span><h1>科技路線</h1><p>里程碑用來看見方法的累積。核心學習、任務管理及資料安全永遠不會被科技節點鎖住。</p></div><div className="tech-total"><span className="tech-total-orbit"><Orbit size={18} /></span><b>{unlockedCount}<small> / {allCount}</small></b><span>節點已解鎖</span></div></section>
    <div className="tech-legend"><span><i className="legend-node-open" />已解鎖</span><span><i className="legend-node-progress" />進行中</span><span><i className="legend-node-locked" />尚未解鎖</span><span className="tech-legend-note">所有路線都可瀏覽；條件不會限制基本學習功能。</span></div>
    <div className="tech-roadmap">{branches.map((branch, index) => {
      const Icon = branch.icon;
      const nodes = data.technologies.filter(item => item.branch === branch.id).sort((a, b) => a.sortOrder - b.sortOrder);
      return <section className={`tech-branch branch-${branch.color}`} key={branch.id}>
        <div className="branch-heading"><span className="branch-icon"><Icon size={19} /></span><div><span className="branch-subtitle">{branch.subtitle}</span><h2>{branch.name}</h2><p>{branch.detail}</p></div><span className="branch-index">0{index + 1}</span></div>
        <div className="branch-rail">{nodes.map((node, nodeIndex) => {
          const record = node.progress; const progress = Math.min(node.threshold, record?.progress ?? 0); const unlocked = Boolean(record?.unlockedAt); const conditionIcon = branchIcons[node.requirement] ?? Zap; const ConditionIcon = conditionIcon;
          return <div className={`tech-node-wrap ${unlocked ? "node-unlocked" : progress > 0 ? "node-progress" : "node-locked"}`} key={node.id}>
            <article className="tech-node"><div className="node-icon">{unlocked ? <Check size={17} /> : <ConditionIcon size={17} />}</div><div className="node-copy"><div className="node-title-row"><h3>{node.name}</h3><span className="node-state">{unlocked ? "已解鎖" : progress > 0 ? "進行中" : "尚未解鎖"}</span></div><p>{node.description}</p><div className="node-requirement"><span>{unlocked ? <Check size={12} /> : <LockKeyhole size={12} />}{conditionName[node.requirement] ?? node.requirement} · {node.threshold}{node.requirement === "study_days" ? " 日" : " 次"}</span><b>{progress} / {node.threshold}</b></div><div className="node-track"><i style={{ width: `${node.threshold ? progress / node.threshold * 100 : 0}%` }} /></div><button type="button" className="node-details-toggle" aria-expanded={expandedNode === node.id} onClick={() => setExpandedNode(expandedNode === node.id ? null : node.id)}>{expandedNode === node.id ? "收起節點詳情" : "查看解鎖條件與進度"}</button>{expandedNode === node.id && <div className="node-expanded-details" role="region" aria-label={`${node.name}條件與進度`}><p>條件：{conditionName[node.requirement] ?? node.requirement} {node.threshold}{node.requirement === "study_days" ? " 個不同日期" : " 次"}。目前已累積 {progress}，狀態：{unlocked ? "已解鎖" : "尚未解鎖"}。</p><Link href={branch.link} className="text-link">前往相應練習 <ArrowRight size={14} /></Link></div>}</div><span className="node-ordinal">{String(node.sortOrder).padStart(2, "0")}</span></article>
            {nodeIndex < nodes.length - 1 && <div className="node-connector"><ArrowDown size={13} /></div>}
          </div>;
        })}<Link href={branch.link} className="branch-action">前往練習 <ArrowRight size={14} /></Link></div>
      </section>;
    })}</div>
    <section className="safe-core-note"><span><Zap size={17} /></span><div><h2>學習核心始終開放</h2><p>記錄學習、管理任務、匯出資料及帳號安全都不依賴科技樹。節點只描述里程碑，不會把基本功能當成獎勵。</p></div><Link href="/study">立即開始一段學習 <ArrowRight size={14} /></Link></section>
    <p className="release-roadmap-note">本版可保存每週學習回顧摘要；週報趨勢圖與個人化推薦仍屬後續階段，尚未交付。</p>
  </div>;
}
