import { ArrowLeft, Compass, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return <main className="not-found-page"><div className="not-found-card"><span className="not-found-orbit"><Compass size={26} /></span><span className="section-index">UNKNOWN COORDINATE / 404</span><h1>這個城市座標不存在</h1><p>這頁可能已移動，或網址輸入有誤。你的學習進度仍安全保存在雲端。</p><button onClick={() => setLocation("/")}><Home size={15} />回到城市總覽<ArrowLeft size={15} /></button></div></main>;
}
