import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useTheme } from "../contexts/ThemeContext";

export type StargridDashboard = inferRouterOutputs<AppRouter>["stargrid"]["dashboard"];
type DashboardState = {
  data: StargridDashboard;
  refreshing: boolean;
  syncStatus: "online" | "offline" | "error";
  newlyUnlocked: string[];
};
const DashboardContext = createContext<DashboardState | null>(null);

export function StargridProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();
  const query = trpc.stargrid.dashboard.useQuery(undefined, {
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 1,
  });
  const previousRef = useRef<StargridDashboard | null>(null);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string[]>([]);
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    if (query.data) setTheme(query.data.profile.theme);
  }, [query.data?.profile.theme, setTheme]);
  useEffect(() => {
    const online = () => setBrowserOnline(true);
    const offline = () => setBrowserOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); };
  }, []);
  const syncStatus: DashboardState["syncStatus"] = !browserOnline ? "offline" : query.isError ? "error" : "online";
  useEffect(() => {
    if (!query.data) return;
    const previous = previousRef.current;
    if (previous) {
      const priorIds = new Set(previous.buildings.filter(item => item.state?.unlockedAt).map(item => item.id));
      const unlocked = query.data.buildings.filter(item => item.state?.unlockedAt && !priorIds.has(item.id));
      if (unlocked.length) {
        setNewlyUnlocked(unlocked.map(item => item.id));
        window.setTimeout(() => setNewlyUnlocked([]), 2300);
        const labels = unlocked.map(item => item.name).slice(0, 3).join("、");
        toast.success("新的建造資格已解鎖", { description: `${labels}${unlocked.length > 3 ? ` 等 ${unlocked.length} 項設施` : ""}。建造前會顯示成本，不會自動扣除建材。` });
      }
    }
    previousRef.current = query.data;
  }, [query.data]);
  if (!query.data) return null;
  return <DashboardContext.Provider value={{ data: query.data, refreshing: query.isFetching, syncStatus, newlyUnlocked }}>{children}</DashboardContext.Provider>;
}

export function useStargrid() {
  const value = useContext(DashboardContext);
  if (!value) throw new Error("useStargrid must be used inside StargridProvider");
  return value;
}
