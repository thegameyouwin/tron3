import { Search, Zap, RefreshCw } from "lucide-react";
import { TIER_FILTERS, STRATEGY_FILTERS, inputCls } from "./types";

interface BotFiltersProps {
  mainTab: "popular" | "ai";
  setMainTab: (t: "popular" | "ai") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  tierFilter: string;
  setTierFilter: (t: string) => void;
  strategyFilter: string;
  setStrategyFilter: (s: string) => void;
  onRunAll: () => void;
}

export default function BotFilters({
  mainTab, setMainTab, searchQuery, setSearchQuery,
  tierFilter, setTierFilter, strategyFilter, setStrategyFilter, onRunAll,
}: BotFiltersProps) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${mainTab === "popular" ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setMainTab("popular")}
        >
          Popular
        </button>
        <button
          className={`text-sm px-3 py-1.5 rounded-lg flex gap-1 transition-colors ${mainTab === "ai" ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setMainTab("ai")}
        >
          <Zap className="h-3.5 w-3.5" /> AI
        </button>
        <button className="ml-auto hover:text-primary transition-colors" onClick={onRunAll} title="Run all bots">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="px-4 pb-2">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bots..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputCls} h-8 pl-9 pr-3 text-xs`}
          />
        </div>
      </div>
      <div className="flex gap-1.5 px-4 pb-2 flex-wrap">
        {TIER_FILTERS.map((t) => (
          <button
            key={t}
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors ${
              tierFilter === t
                ? t === "All Tiers" ? "bg-primary/20 text-primary border-primary/30"
                : t === "Free" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : t === "Pro" ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                : t === "Elite" ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            }`}
            onClick={() => setTierFilter(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 px-4 pb-3 flex-wrap">
        {STRATEGY_FILTERS.map((s) => (
          <button
            key={s}
            className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
              strategyFilter === s
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-border text-muted-foreground hover:border-muted-foreground"
            }`}
            onClick={() => setStrategyFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </>
  );
}
