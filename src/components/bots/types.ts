export interface AutoStopConfig {
  enabled: boolean;
  profitTarget?: number;
  lossLimit?: number;
  timeLimitMinutes?: number;
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: "bot" | "user" | "system";
}

export const TRADEABLE = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
  "cardano", "polkadot", "dogecoin", "avalanche-2", "chainlink",
  "litecoin", "tron", "stellar",
] as const;

export const TIER_COLORS: Record<string, string> = {
  free: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pro: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  elite: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  vip: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

export const STRATEGY_LABELS: Record<string, string> = {
  market_making: "Spot Grid",
  trend_following: "DCA",
  arbitrage: "Arbitrage",
  momentum: "Momentum",
};

export const STRATEGY_FILTERS = [
  "All", "⚡ AI", "Spot Grid", "Futures Grid", "DCA",
  "Arbitrage", "Trend", "TWAP", "Scalping", "Momentum", "Breakout", "Range",
];

export const TIER_FILTERS = ["All Tiers", "Free", "Pro", "Elite", "VIP"];
export const TIER_ORDER: Record<string, number> = { free: 1, pro: 2, elite: 3, vip: 4 };
export const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2, vip: 3 };

/** Shared input class for consistent styling */
export const inputCls =
  "w-full rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all";

export function formatRuntime(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${days}d ${hours}h ${mins}m`;
}

export function calcROI(profit: number, config: any, createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = Math.max(ms / 3600000, 1);
  const investment = (config?.order_size || 0.1) * (config?.max_orders || 5) * 100;
  if (investment === 0) return 0;
  return ((profit / Math.max(investment, 1)) / hours) * 100;
}

export function calcWinRate(trades: number, profit: number) {
  if (trades === 0) return 0;
  const base = 50 + (profit > 0 ? Math.min(profit / 5000, 40) : Math.max(-30, profit / 5000));
  return Math.min(99, Math.max(10, Math.round(base)));
}
