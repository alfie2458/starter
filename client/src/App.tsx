import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import { startLogin } from "./const";
import { trpc } from "./lib/trpc";
import { StargridProvider } from "./lib/stargrid-context";
import { StargridShell } from "./components/StargridShell";
import { ArrowUpRight, LoaderCircle, Radio, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lazy, Suspense, useState } from "react";

const Home = lazy(() => import("./pages/Home"));
const Study = lazy(() => import("./pages/Study"));
const City = lazy(() => import("./pages/City"));
const Archive = lazy(() => import("./pages/Archive"));
const Research = lazy(() => import("./pages/Research"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function LoggedOut() {
  const [error, setError] = useState("");
  const goLogin = () => {
    try { startLogin(); } catch (cause) { setError(cause instanceof Error ? cause.message : "目前無法開始登入，請稍後重試。"); }
  };
  return <main className="login-screen"><div className="login-grid" />
    <div className="login-top"><div className="brand-mark"><span className="brand-symbol"><i /><i /><i /></span><span className="brand-word">STAR<span>GRID</span><small>LEARNING CITY</small></span></div><span className="login-caption">A STUDY CITY, BUILT ONE SESSION AT A TIME</span></div>
    <section className="login-content"><div className="login-kicker"><span /> YOUR CITY, YOUR PACE</div><h1>把每一次<br /><em>有效學習</em>，變成<br />一座城市的成長。</h1><p>完成一段真實的練習，收進 XP 與建材。城市會記得你走過的路，也讓你照自己的節奏前進。</p>
      <button className="login-button" onClick={goLogin}>使用 Manus 帳號登入 <ArrowUpRight size={18} /></button>
      {error && <div className="login-error" role="alert">{error}</div>}
      <div className="login-trust"><span><ShieldCheck size={14} />學習資料與帳號綁定</span><span><Radio size={14} />城市進度跨裝置同步</span></div>
    </section>
    <div className="login-bottom"><span>PROJECT STARGRID / 2.0</span><span>學習是核心，城市慢慢長大。</span></div>
  </main>;
}

function AuthGate() {
  const auth = useAuth();
  const dashboard = trpc.stargrid.dashboard.useQuery(undefined, { enabled: auth.isAuthenticated, retry: 1, refetchInterval: 20_000, refetchOnWindowFocus: true });
  if (auth.loading) return <div className="loading-screen"><LoaderCircle className="spin" size={25} /><span>正在確認帳號狀態…</span></div>;
  if (!auth.isAuthenticated) return <LoggedOut />;
  if (dashboard.isLoading && !dashboard.data) return <div className="loading-screen"><LoaderCircle className="spin" size={25} /><span>正在同步你的城市…</span></div>;
  if (dashboard.isError && !dashboard.data) return <div className="loading-screen"><div className="sync-failure"><RefreshCw size={24} /><h2>目前無法同步雲端資料</h2><p>尚未確認這次資料讀取成功。請確認網路或稍後重試；不會以本機假資料代替你的城市。</p><Button variant="outline" onClick={() => void dashboard.refetch()}>重新連線</Button></div></div>;
  if (!dashboard.data) return <LoggedOut />;
  return <StargridProvider><StargridShell><Suspense fallback={<div className="loading-screen" role="status"><LoaderCircle className="spin" size={24} /><span>正在載入工作區…</span></div>}><Switch>
    <Route path="/" component={Home} />
    <Route path="/study" component={Study} />
    <Route path="/city" component={City} />
    <Route path="/archive" component={Archive} />
    <Route path="/research" component={Research} />
    <Route path="/settings" component={SettingsPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></Suspense></StargridShell></StargridProvider>;
}

function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster richColors /><AuthGate /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
export default App;
