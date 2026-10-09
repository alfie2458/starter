import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArrowRight, BookOpenCheck, Check, Clock3, Coffee, Focus, LoaderCircle, Plus, RotateCcw, Target, TimerReset, Zap } from "lucide-react";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { useStargrid } from "@/lib/stargrid-context";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const studyKinds = [
  { id: "micro", label: "微型學習", detail: "5 分鐘", icon: Zap },
  { id: "review", label: "一般複習", detail: "15 分鐘", icon: BookOpenCheck },
  { id: "focus", label: "專注學習", detail: "25 分鐘", icon: Focus },
  { id: "recall", label: "主動回想", detail: "不設限時", icon: Activity },
  { id: "error_fix", label: "錯題修正", detail: "再次作答", icon: RotateCcw },
  { id: "weekly_review", label: "每週回顧", detail: "整理一週", icon: Clock3 },
  { id: "exam_plan", label: "考前規劃", detail: "建立計畫", icon: Target },
  { id: "exam_review", label: "考後回顧", detail: "記錄策略", icon: BookOpenCheck },
  { id: "semester_review", label: "學期回顧", detail: "整理學期", icon: Activity },
] as const;
type StudyKind = (typeof studyKinds)[number]["id"];
const plannedFor = (kind: StudyKind) => kind === "micro" ? 5 : kind === "focus" ? 25 : 15;
const formatClock = (seconds: number) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, "0")}:${String(Math.max(0, seconds) % 60).padStart(2, "0")}`;
const formatTime = (date: Date | string) => new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" }).format(new Date(date));

export default function Study() {
  const { data } = useStargrid();
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const queryKind = params.get("kind") as StudyKind | null;
  const [kind, setKind] = useState<StudyKind>(studyKinds.some(item => item.id === queryKind) ? queryKind! : "review");
  const [now, setNow] = useState(Date.now());
  const [showRecord, setShowRecord] = useState(false);
  const [summary, setSummary] = useState("");
  const [manualMinutes, setManualMinutes] = useState(15);
  const [taskId, setTaskId] = useState<number | undefined>(() => Number(params.get("task")) || undefined);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubject, setTaskSubject] = useState("");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [localActiveSession, setLocalActiveSession] = useState<{
    id: string; kind: StudyKind; plannedMinutes: number; taskId: number | null; startedAt: Date | string;
  } | null>(null);
  const eventId = useRef<string | null>(null);
  const sessionId = useRef<string | null>(null);
  const utils = trpc.useUtils();
  const startMutation = trpc.stargrid.study.start.useMutation();
  const recordMutation = trpc.stargrid.study.record.useMutation();
  const addTaskMutation = trpc.stargrid.tasks.add.useMutation();
  const currentSession = data.activeSession ?? localActiveSession;
  const activeKind = currentSession?.kind ?? kind;
  const selectedTask = currentSession
    ? (data.activeTask?.id === currentSession.taskId ? data.activeTask : data.tasks.find(item => item.id === currentSession.taskId))
    : data.tasks.find(item => item.id === taskId);
  const activeTaskSyncPending = Boolean(currentSession?.taskId && !selectedTask);
  const isOnline = typeof navigator === "undefined" || navigator.onLine;
  const elapsed = currentSession ? Math.max(0, Math.floor((now - new Date(currentSession.startedAt).getTime()) / 1000)) : 0;
  const timeLeft = currentSession ? currentSession.plannedMinutes * 60 - elapsed : 0;
  const sessionMinutes = currentSession ? Math.max(1, Math.min(300, Math.floor(elapsed / 60))) : 0;
  const award = data.rewardOptions.find(item => item.id === (currentSession?.kind ?? kind) && item.enabled);
  const initialEntry = !currentSession && !showRecord;
  const setMessageFromError = (error: { message: string } | null) => error?.message ?? "這次操作沒有完成；請先確認雲端同步狀態，再使用相同紀錄重試。";

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);
  useEffect(() => {
    if (localActiveSession && data.activeSession?.id === localActiveSession.id) setLocalActiveSession(null);
  }, [data.activeSession?.id, localActiveSession?.id]);
  useEffect(() => {
    if (currentSession) {
      setKind(currentSession.kind);
      setTaskId(currentSession.taskId ?? undefined);
      setManualMinutes(Math.max(1, Math.min(currentSession.plannedMinutes, Math.floor((Date.now() - new Date(currentSession.startedAt).getTime()) / 60_000))));
    }
  }, [currentSession?.id]);

  const begin = async () => {
    if (!isOnline) return;
    const plannedMinutes = plannedFor(kind);
    const linkedTaskId = selectedTask?.kind === kind ? selectedTask.id : null;
    try {
      const id = crypto.randomUUID(); sessionId.current = id;
      const session = await startMutation.mutateAsync({ id, kind, plannedMinutes, taskId: linkedTaskId ?? undefined });
      setLocalActiveSession({ id: session.id, kind, plannedMinutes, taskId: linkedTaskId, startedAt: session.startedAt });
    } catch (error) { toast.error(setMessageFromError(error as { message: string })); return; }
    const refreshFailed = await utils.stargrid.dashboard.invalidate().then(() => false, () => true);
    toast.success("計時已開始。完成表單送出前，不會發放獎勵。");
    if (refreshFailed) toast.warning("計時已存入雲端，但畫面同步稍有延遲；請勿重開另一段計時。");
  };

  const openRecord = (complete: boolean) => {
    setShowRecord(true);
    setCompleted(complete);
    setManualMinutes(currentSession ? Math.max(1, Math.floor(elapsed / 60)) : plannedFor(kind));
  };
  const [completed, setCompleted] = useState(true);

  const saveRecord = async () => {
    if (!isOnline) return;
    if (completed && summary.trim().length < 12) { toast.error("請寫至少 12 個字的具體學習摘要，方便之後回顧。"); return; }
    eventId.current ??= crypto.randomUUID();
    try {
      const result = await recordMutation.mutateAsync({
        eventId: eventId.current,
        sessionId: currentSession?.id,
        taskId: selectedTask?.id,
        kind: activeKind,
        minutes: currentSession ? sessionMinutes : manualMinutes,
        summary: summary.trim(),
        completed,
      });
      eventId.current = null;
      sessionId.current = null;
      setLocalActiveSession(null);
      setSummary(""); setShowRecord(false); setCompleted(true);
      const refreshFailed = await utils.stargrid.dashboard.invalidate().then(() => false, () => true);
      if (!result.success) toast.error("雲端尚未確認本次學習記錄成功。");
      else if (result.alreadyRecorded) toast.info("這筆學習記錄先前已儲存，未重複發放獎勵。");
      else if (result.reward) toast.success(`已記錄：+${result.reward.xp} XP、+${result.reward.materials} 建材。`);
      else toast.success(completed ? "學習已記錄；這個類型目前沒有額外資源獎勵。" : "已保存部分完成記錄，沒有發放獎勵。下次可以重新開始。");
      if (refreshFailed) toast.warning("學習記錄已保存；首頁摘要暫時未更新，雲端恢復後會重新同步。不要再次建立同一筆記錄。");
    } catch (error) { toast.error(setMessageFromError(error as { message: string })); }
  };

  const addTask = async () => {
    if (taskTitle.trim().length < 3) { toast.error("任務名稱至少需要 3 個字。"); return; }
    try {
      await addTaskMutation.mutateAsync({ title: taskTitle.trim(), subject: taskSubject.trim() || undefined, kind });
      setTaskTitle(""); setTaskSubject(""); setShowTaskForm(false);
      const refreshFailed = await utils.stargrid.dashboard.invalidate().then(() => false, () => true);
      toast.success("任務已同步至雲端。");
      if (refreshFailed) toast.warning("任務已建立；畫面摘要稍後會重新同步。");
    } catch (error) { toast.error(setMessageFromError(error as { message: string })); }
  };

  return <div className="study-page page-enter">
    <section className="page-intro"><div><span className="section-index">LEARN / RECORD / RETURN</span><h1>學習工作台</h1><p>計時器只幫你掌握節奏；要領取獎勵，請完成學習摘要並提交真實紀錄。</p></div><div className="gentle-reminder"><Coffee size={17} /><span>休息或中斷<br /><b>不會扣除 XP 或建材</b></span></div></section>

    {currentSession && <section className="active-session-banner"><div className="active-session-copy"><span className="active-pulse" /><div><span className="section-index">雲端計時中 · {studyKinds.find(item => item.id === currentSession.kind)?.label}</span><b>{selectedTask?.title || (currentSession.taskId ? "任務同步中…" : "自由學習區段")}</b></div></div><div className="timer-display"><span className={timeLeft <= 0 ? "timer-over" : ""}>{timeLeft > 0 ? formatClock(timeLeft) : `+${formatClock(Math.abs(timeLeft))}`}</span><small>{timeLeft > 0 ? "剩餘" : "超時"}</small></div><div className="timer-actions"><Button className="button-cyan" onClick={() => openRecord(true)} disabled={activeTaskSyncPending}>記錄學習成果 <ArrowRight size={16} /></Button><Button variant="outline" onClick={() => openRecord(false)} disabled={activeTaskSyncPending}>結束並保留未完成</Button></div></section>}
    {activeTaskSyncPending && <div className="offline-warning" role="status"><span />計時區段已在雲端啟動，正在同步原任務；同步完成前請先保留此區段。</div>}

    <section className="study-workbench-grid">
      <div className="study-select-panel">
        <div className="card-topline"><span className="section-index">01 / 選擇一個練習</span><span className="muted-chip"><Activity size={12} />可自行安排節奏</span></div>
        <h2>今天想練習什麼？</h2><p className="panel-lead">一次記錄只會依一項對應規則核發，任務獎勵與時間獎勵不會重複計算。</p>
        <div className="study-kind-grid">{studyKinds.map(item => { const Icon = item.icon; return <button key={item.id} className={`kind-card ${kind === item.id ? "selected" : ""}`} onClick={() => { if (!currentSession) { setKind(item.id); setTaskId(undefined); } }} disabled={Boolean(currentSession)} aria-pressed={kind === item.id}><span className="kind-icon"><Icon size={18} /></span><span className="kind-title">{item.label}</span><small>{item.detail}</small>{kind === item.id && <span className="kind-check"><Check size={12} /></span>}</button>; })}</div>
        <div className="reward-preview"><div><span className="reward-preview-symbol">✳</span><span><b>完成後的初始獎勵</b><small>採伺服器端設定；累積 XP 不會被花掉</small></span></div><span className="reward-preview-value">{award ? `+${award.xp} XP · +${award.materials} 建材` : "學習紀錄與里程碑"}</span></div>
        {initialEntry && <div className="study-start-row"><Button className="button-cyan" onClick={begin} disabled={!isOnline || startMutation.isPending}>{startMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <TimerReset size={17} />}開始雲端計時</Button><button className="text-action" onClick={() => openRecord(true)}><Plus size={16} />補記已完成學習</button><span className="no-pressure-note">開始計時不會發放獎勵</span></div>}
        {!isOnline && <div className="offline-warning" role="status"><span />目前離線：新記錄不會標示為成功，請連線後再送出。</div>}
      </div>

      <aside className="task-list-panel"><div className="card-topline"><span className="section-index">02 / YOUR PLAN</span><button className="icon-action" aria-label="新增任務" onClick={() => setShowTaskForm(value => !value)}><Plus size={17} /></button></div><h2>今天的任務</h2><p className="panel-lead">舊任務會留在原日期，不會自動堆回今天。</p>
        {showTaskForm && <div className="task-create-form"><label>新任務<input value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="例如：整理光合作用筆記" maxLength={180} /></label><label>科目（選填）<input value={taskSubject} onChange={event => setTaskSubject(event.target.value)} placeholder="生物" maxLength={80} /></label><div className="task-form-actions"><Button size="sm" onClick={addTask} disabled={addTaskMutation.isPending}>儲存任務</Button><button className="text-action" onClick={() => setShowTaskForm(false)}>取消</button></div></div>}
        <div className="task-plan-list">{data.tasks.map((task, index) => <div className={`task-plan-item ${task.completedAt ? "done" : ""}`} key={task.id}><div className="task-number">{task.completedAt ? <Check size={13} /> : `0${index + 1}`}</div><div className="task-plan-copy"><b>{task.title}</b><small>{task.subject || "個人學習"} · {studyKinds.find(item => item.id === task.kind)?.label}</small></div>{!task.completedAt && <button className="task-go" title="選擇此任務" onClick={() => { setKind(task.kind as StudyKind); setTaskId(task.id); window.history.replaceState(null, "", `/study?kind=${task.kind}&task=${task.id}`); }}>{taskId === task.id ? <Check size={16} /> : <ArrowRight size={16} />}</button>}</div>)}
        {data.tasks.length === 0 && <div className="empty-small"><Clock3 size={16} /><span>目前沒有排定任務。可以新增任務，或自由開始一段學習。</span></div>}</div>
        <div className="task-week-stat"><span><Clock3 size={14} />今日累積</span><b>{data.stats.todayMinutes} 分鐘</b><small>以已儲存的完成記錄計算</small></div>
      </aside>
    </section>

    {showRecord && <section className="record-panel" aria-labelledby="record-heading"><div className="record-panel-heading"><div><span className="section-index">03 / REFLECT & SAVE</span><h2 id="record-heading">把學習成果記下來</h2><p>這份摘要用來幫助日後回想；獎勵由伺服器依選定類型及有效記錄計算。</p></div><button className="icon-action" onClick={() => setShowRecord(false)} aria-label="關閉記錄表單">×</button></div>
      <div className="record-context"><span className="mini-icon cyan"><BookOpenCheck size={16} /></span><span><b>{studyKinds.find(item => item.id === activeKind)?.label}</b><small>{selectedTask?.title || (currentSession?.taskId ? "任務同步中…" : "自由學習紀錄")}{currentSession ? ` · 計時已進行 ${sessionMinutes} 分鐘` : " · 手動補記"}</small></span></div>
      {!currentSession && <label className="record-minutes">實際學習分鐘數<input type="number" min="1" max="300" value={manualMinutes} onChange={event => setManualMinutes(Math.max(1, Math.min(300, Number(event.target.value) || 1)))} /></label>}
      <label className="record-summary">具體記錄你完成了什麼{completed && <small>（完成記錄至少 12 個字；部分完成不發放資源）</small>}<textarea value={summary} onChange={event => setSummary(event.target.value)} rows={4} maxLength={1000} placeholder="例如：用自己的話解釋了光合作用的兩個階段，並重做了課本第 4 題。" /></label>
      <div className="record-submit-row"><label className="partial-toggle"><input type="checkbox" checked={!completed} onChange={event => setCompleted(!event.target.checked)} /><span>這次先記部分完成（會保留紀錄，但不發獎勵）</span></label><Button className="button-cyan" onClick={saveRecord} disabled={!isOnline || recordMutation.isPending || activeTaskSyncPending || (currentSession && sessionMinutes < 1)}>{recordMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Check size={17} />}{completed ? "提交學習記錄" : "儲存部分完成"}</Button></div>
      {recordMutation.error && <div className="form-error" role="alert">{recordMutation.error.message}</div>}
    </section>}

    <section className="study-history-panel"><div className="section-heading compact-heading"><div><span className="section-index">RECENT / CLOUD RECORDS</span><h2>近期學習軌跡</h2></div><span className="cloud-mini"><span />雲端儲存</span></div>
      {data.recentRecords.length ? <div className="history-list">{data.recentRecords.slice(0, 5).map(record => <div className="history-row" key={record.id}><span className={`history-mark ${record.completed ? "complete" : "partial"}`}>{record.completed ? <Check size={14} /> : <Coffee size={14} />}</span><div><b>{studyKinds.find(item => item.id === record.kind)?.label ?? record.kind}</b><small>{record.summary}</small></div><span className="history-minutes">{record.minutes} min</span><span className="history-time">{formatTime(record.createdAt)}</span></div>)}</div> : <div className="empty-history"><div className="empty-orbit"><BookOpenCheck size={21} /></div><p>完成第一段學習並留下摘要，這裡就會出現你的學習軌跡。</p></div>}
    </section>
  </div>;
}
