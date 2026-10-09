import { useStargrid } from "@/lib/stargrid-context";
import { Building2, House, Library, TrainFront, Telescope, Zap, FlaskConical } from "lucide-react";

const icons: Record<string, typeof Building2> = { House, Library, Zap, FlaskConical, TrainFront, Telescope };

export function CityArtwork({ compact = false, onSelect }: { compact?: boolean; onSelect?: (id: string) => void }) {
  const { data, newlyUnlocked } = useStargrid();
  const built = new Set(data.buildings.filter(item => item.state?.builtAt).map(item => item.id));
  const unlocked = new Set(data.buildings.filter(item => item.state?.unlockedAt).map(item => item.id));
  const equipped = new Set(data.collectibles.filter(item => item.owned?.equipped).map(item => item.id));
  const points = [
    { id: "habitat", x: 190, y: 191, w: 100, h: 107, accent: "teal", shape: "habitat" },
    { id: "library", x: 344, y: 183, w: 98, h: 115, accent: "violet", shape: "tower" },
    { id: "power_tower", x: 496, y: 133, w: 78, h: 165, accent: "gold", shape: "power" },
    { id: "research_center", x: 627, y: 201, w: 112, h: 97, accent: "teal", shape: "lab" },
    { id: "sky_station", x: 794, y: 178, w: 100, h: 120, accent: "violet", shape: "station" },
    { id: "observatory", x: 947, y: 158, w: 92, h: 140, accent: "gold", shape: "observatory" },
  ];
  const renderBuilding = (p: typeof points[number]) => {
    const ready = built.has(p.id);
    const cls = `city-building ${ready ? "built" : unlocked.has(p.id) ? "unlocked" : "blueprint"} ${p.accent} ${newlyUnlocked.includes(p.id) && data.profile.animationsEnabled ? "newly-unlocked" : ""}`;
    const windows = Array.from({ length: 6 }, (_, i) => <rect key={i} x={p.x + 22 + (i % 3) * 20} y={p.y + 36 + Math.floor(i / 3) * 21} width="9" height="12" rx="2" className="city-window" />);
    return <g key={p.id} className={cls} role="button" tabIndex={0} aria-label={`${data.buildings.find(b => b.id === p.id)?.name ?? p.id}${ready ? "，已建造" : "，待解鎖或建造"}`} onClick={() => onSelect?.(p.id)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") onSelect?.(p.id); }}>
      <path d={`M${p.x} ${p.y + 25} l${p.w / 2} -25 l${p.w / 2} 25 v${p.h - 25} l-${p.w / 2} 25 l-${p.w / 2} -25 z`} className="building-face-front" />
      <path d={`M${p.x + p.w} ${p.y + 25} l${p.w / 2} -25 v${p.h - 25} l-${p.w / 2} 25 z`} className="building-face-side" />
      <path d={`M${p.x} ${p.y + 25} l${p.w / 2} -25 l${p.w / 2} 25 l-${p.w / 2} 25 z`} className="building-roof" />
      {p.shape === "power" && <><path d={`M${p.x + p.w / 2} ${p.y - 25} v-33`} className="building-spire" /><circle cx={p.x + p.w / 2} cy={p.y - 61} r="8" className="spire-orb" /></>}
      {p.shape === "observatory" && <><path d={`M${p.x + 12} ${p.y + 30} q${p.w / 2 - 10} -55 ${p.w - 24} 0`} className="dome-line" /><path d={`M${p.x + p.w / 2} ${p.y - 13} v34`} className="dome-line" /></>}
      {p.shape !== "power" && p.shape !== "observatory" && windows}
      <path d={`M${p.x + 17} ${p.y + p.h + 20} l${p.w / 2} 21 l${p.w / 2} -21`} className="building-shadow" />
      <text x={p.x + p.w / 2} y={p.y + p.h + 53} textAnchor="middle" className="city-building-label">{data.buildings.find(b => b.id === p.id)?.name}</text>
    </g>;
  };
  return (
    <div className={`city-canvas ${compact ? "compact" : ""} ${equipped.has("twilight_sky") ? "twilight" : ""}`}>
      <div className="skyline-label"><span className="sky-dot" /> GRID SECTOR 01 <span className="sky-line" /></div>
      <svg viewBox="0 0 1180 450" role="img" aria-label="Project STARGRID 原創等角城市插畫" className="city-svg">
        <defs><linearGradient id="skyFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sky-top)" /><stop offset="1" stopColor="var(--sky-bottom)" /></linearGradient><radialGradient id="cityGlow"><stop stopColor="var(--glow)" stopOpacity=".24" /><stop offset="1" stopColor="var(--glow)" stopOpacity="0" /></radialGradient></defs>
        <rect width="1180" height="450" rx="20" fill="url(#skyFade)" />
        <ellipse cx="655" cy="264" rx="423" ry="204" fill="url(#cityGlow)" />
        {Array.from({ length: 22 }, (_, i) => <circle key={i} cx={(i * 97 + 41) % 1110 + 35} cy={(i * 41 + 16) % 180 + 18} r={i % 4 === 0 ? 1.7 : 1} className="city-star" />)}
        <g className="city-grid"><path d="M30 326 L590 214 L1150 326 L590 442Z" /><path d="M30 358 L590 246 L1150 358" /><path d="M30 390 L590 278 L1150 390" /><path d="M170 298 L730 410 M310 270 L870 382 M450 242 L1010 354 M590 214 L1150 326" /><path d="M30 326 L30 389 M170 354 L170 417 M310 382 L310 445 M870 382 L870 445 M1010 354 L1010 417 M1150 326 L1150 389" /></g>
        <path d="M67 303 C246 250 348 334 511 286 S785 220 1050 279" className="city-transit-line" />
        <path d="M100 298 l8 -3 M1070 283 l8 3" className="transit-tick" />
        {equipped.has("skybridge") && <g className="city-decoration bridge-decoration"><path d="M270 218 Q315 188 363 217" /><path d="M278 222 Q316 201 356 221" /><path d="M281 221 v29 M354 221 v34" /></g>}
        {equipped.has("neon_tree") && <g className="city-decoration tree-decoration"><path d="M309 281 v-35" /><path d="M309 250 C282 249 286 227 302 230 C296 211 324 207 325 231 C344 226 345 248 319 252" /><circle cx="298" cy="240" r="3" /><circle cx="322" cy="230" r="3" /></g>}
        {equipped.has("holo_sign") && <g className="city-decoration sign-decoration"><path d="M40 228 v30 M71 228 v30" /><rect x="34" y="207" width="48" height="23" rx="3" /><text x="58" y="222" textAnchor="middle">STARGRID</text></g>}
        {equipped.has("sky_train") && <g className="city-decoration train-decoration"><rect x="581" y="229" width="51" height="15" rx="6" /><path d="M590 229 v9 M600 229 v9 M610 229 v9 M621 229 v9" /><circle cx="593" cy="247" r="2" /><circle cx="621" cy="247" r="2" /></g>}
        {equipped.has("drone_dock") && <g className="city-decoration drone-decoration"><path d="M430 143 h16 M438 135 v16 M432 137 l12 12 M444 137 l-12 12" /><circle cx="438" cy="143" r="5" /><path d="M438 150 v14" strokeDasharray="2 3" /></g>}
        <g className="distant-towers"><path d="M76 290 v-76 l25 -11 v87 M103 291 v-112 l22 -15 v133 M261 313 v-69 l26 -16 v83 M281 307 v-108 l31 -14 v116 M906 306 v-103 l18 -11 v114 M930 300 v-71 l26 -20 v91 M1073 300 v-105 l29 14 v91" /></g>
        {points.map(renderBuilding)}
        <g className="city-label-chip"><rect x="37" y="32" width="117" height="31" rx="8" /><circle cx="52" cy="47" r="3" /><text x="64" y="51">SECTOR 01</text></g>
      </svg>
      <div className="city-legend"><span><i className="legend-built" />已建造</span><span><i className="legend-blueprint" />待擴展</span><span className="city-art-note"><House size={13} />城市由學習慢慢生成</span></div>
      <div className="sr-only">{points.map(p => { const Icon = icons[data.buildings.find(b => b.id === p.id)?.icon ?? "Building2"] ?? Building2; return <Icon key={p.id} />; })}</div>
    </div>
  );
}
