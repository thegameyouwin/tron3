import { Lock, Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TIER_COLORS, STRATEGY_LABELS, calcROI, calcWinRate, formatRuntime } from "./types";

interface BotCardProps {
  bot: any;
  locked: boolean;
  onSelect: (bot: any) => void;
}

const Sparkline = () => {
  const points = Array.from({ length: 20 }, (_, i) => {
    const y = 20 + Math.sin(i * 0.5) * 8 + Math.random() * 6;
    return `${i * 5},${40 - y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 95 40" className="w-16 h-8">
      <polyline fill="none" stroke="hsl(var(--profit))" strokeWidth="1.5" points={points} />
    </svg>
  );
};

export default function BotCard({ bot, locked, onSelect }: BotCardProps) {
  const tier = (bot.tier || "free").toLowerCase();
  const stratLabel = STRATEGY_LABELS[bot.strategy] || bot.strategy;
  const premium = ["pro", "elite", "vip"].includes(tier);
  const roi = calcROI(bot.total_profit, bot.config, bot.created_at);
  const winRate = calcWinRate(bot.total_trades, bot.total_profit);
  const runtime = formatRuntime(bot.created_at);

  return (
    <div
      className={`bg-card border border-border rounded-xl p-3 relative overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-md transition-all ${locked ? "opacity-70" : ""}`}
      onClick={() => onSelect(bot)}
    >
      {locked && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] font-bold ml-1">Upgrade to {tier}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_COLORS[tier]}`}>{stratLabel}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_COLORS[tier]}`}>{tier}</span>
        {bot.is_ai && <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-500/20 text-amber-400">⚡ AI</span>}
        {premium && <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-primary/20 text-primary">💎 Premium</span>}
      </div>
      <div className="flex justify-between items-start mb-1">
        <div>
          <h3 className="text-sm font-bold truncate">{bot.name}</h3>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{bot.description}</p>
        </div>
        <Sparkline />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 mb-3">
        <div><p className="text-[10px] text-muted-foreground">PNL</p><p className="text-sm font-bold text-profit">+{bot.total_profit.toLocaleString()}</p></div>
        <div><p className="text-[10px] text-muted-foreground">ROI</p><p className="text-sm font-bold text-profit">+{roi.toFixed(2)}%/hr</p></div>
        <div><p className="text-[10px] text-muted-foreground">Runtime</p><p className="text-xs font-medium">{runtime}</p></div>
        <div><p className="text-[10px] text-muted-foreground">Win Rate</p><p className="text-xs font-medium">{winRate.toFixed(2)}%</p></div>
        <div><p className="text-[10px] text-muted-foreground">Daily Earn</p><p className="text-xs font-bold text-profit">{bot.daily_earn.toFixed(2)}%</p></div>
        <div><p className="text-[10px] text-muted-foreground">Min. Stake</p><p className="text-xs font-medium">${bot.min_stake.toFixed(2)}</p></div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t">
        <div className="flex gap-1 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3" />{bot.bot_users || 0} users
        </div>
        <Button
          size="sm"
          className="text-[11px] h-7 bg-profit hover:bg-profit/80 text-white gap-1 shadow-sm"
          onClick={(e) => { e.stopPropagation(); onSelect(bot); }}
        >
          <Copy className="h-3 w-3" /> Copy
        </Button>
      </div>
    </div>
  );
}
