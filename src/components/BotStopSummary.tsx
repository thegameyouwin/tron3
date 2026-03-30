import { X, TrendingUp, Clock, Coins, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BotStopSummaryProps {
  botName: string;
  pair: string;
  strategy: string;
  stakedAmount: number;
  profit: number;
  duration: string;
  totalTrades: number;
  winRate: number;
  onClose: () => void;
}

export default function BotStopSummary({
  botName, pair, strategy, stakedAmount, profit, duration, totalTrades, winRate, onClose
}: BotStopSummaryProps) {
  const totalReturn = stakedAmount + profit;
  const profitRate = stakedAmount > 0 ? (profit / stakedAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/20 to-accent/20 p-6 text-center relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">{botName}</h2>
          <p className="text-xs text-muted-foreground mt-1">{strategy}</p>
        </div>

        {/* Profit Rate */}
        <div className="text-center py-4 border-b border-border">
          <p className={`text-3xl font-bold ${profit >= 0 ? "text-emerald-400" : "text-destructive"}`}>
            {profit >= 0 ? "+" : ""}{profitRate.toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground">Profit Rate</p>
        </div>

        {/* Details */}
        <div className="p-4 space-y-3">
          {[
            { label: "Pair", value: pair, icon: <Coins className="h-3.5 w-3.5" /> },
            { label: "Investment", value: `${stakedAmount.toFixed(2)} USDT` },
            { label: "Profit Earned", value: `${profit >= 0 ? "+" : ""}${profit.toFixed(4)} USDT`, color: profit >= 0 ? "text-emerald-400" : "text-destructive" },
            { label: "Total Return", value: `${totalReturn.toFixed(2)} USDT`, color: "text-foreground font-bold" },
            { label: "Duration", value: duration, icon: <Clock className="h-3.5 w-3.5" /> },
            { label: "Total Trades", value: totalTrades.toLocaleString() },
            { label: "Win Rate", value: `${winRate.toFixed(2)}%`, icon: <TrendingUp className="h-3.5 w-3.5" /> },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">{row.icon}{row.label}</span>
              <span className={row.color || "text-foreground"}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button className="w-full" onClick={onClose}>Done</Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">Funds returned to your USDT wallet</p>
        </div>
      </div>
    </div>
  );
}
