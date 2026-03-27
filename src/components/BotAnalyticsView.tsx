import { ArrowLeft, TrendingUp, Clock, BarChart3, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface BotAnalyticsProps {
  bot: any;
  onBack: () => void;
}

function formatDuration(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export default function BotAnalyticsView({ bot, onBack }: BotAnalyticsProps) {
  const { getSymbol } = useCryptoPrices();
  const stakedAmount = Number(bot.config?.staked_amount || 0);
  const profit = Number(bot.total_profit || 0);
  const profitRate = stakedAmount > 0 ? ((profit / stakedAmount) * 100) : 0;
  const pair = `${getSymbol(bot.crypto_id)}/USDT`;
  const duration = formatDuration(bot.created_at);

  // Fetch trade history for this bot
  const { data: trades = [] } = useQuery({
    queryKey: ["bot_analytics_trades", bot.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bot_trades")
        .select("*")
        .eq("bot_id", bot.id)
        .order("created_at", { ascending: true })
        .limit(100);
      return data || [];
    },
    refetchInterval: 5000,
  });

  // Build cumulative PNL chart data
  const chartData = (() => {
    let cumulative = 0;
    return trades.map((t: any, i: number) => {
      cumulative += Number(t.pnl || 0);
      return {
        index: i,
        time: new Date(t.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        pnl: cumulative,
        price: Number(t.price),
      };
    });
  })();

  // Stats
  const totalTrades = bot.total_trades || 0;
  const buyTrades = trades.filter((t: any) => t.side === "buy").length;
  const sellTrades = trades.filter((t: any) => t.side === "sell").length;
  const avgTradeSize = trades.length > 0
    ? trades.reduce((s: number, t: any) => s + Number(t.total || 0), 0) / trades.length
    : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-card">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to Running Bots
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{bot.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {bot.is_ai && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">AI</span>}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">{bot.strategy === "market_making" ? "Grid" : bot.strategy}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Running</span>
          </div>
        </div>
      </div>

      {/* Profit Rate Hero */}
      <div className="px-4 py-6 flex items-center gap-6 border-b border-border bg-card">
        <div className="flex-1">
          <p className={`text-4xl font-bold tabular-nums ${profitRate >= 0 ? "text-emerald-400" : "text-destructive"}`}>
            {profitRate >= 0 ? "+" : ""}{profitRate.toFixed(2)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Profit Rate</p>
        </div>
        {/* Mini sparkline chart */}
        <div className="w-32 h-16">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.slice(-20)}>
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="pnl" stroke="hsl(var(--primary))" fill="url(#pnlGradient)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <MiniSparkline />
          )}
        </div>
      </div>

      {/* Key Stats */}
      <div className="overflow-y-auto flex-1">
        <div className="px-4 py-4">
          <div className="bg-card border border-border rounded-xl divide-y divide-border">
            {[
              { label: "Pair", value: pair },
              { label: "Investment", value: `${stakedAmount.toFixed(2)} USDT`, color: "text-foreground" },
              { label: "Profit Earned", value: `${profit >= 0 ? "+" : ""}${profit.toFixed(4)} USDT`, color: profit >= 0 ? "text-emerald-400" : "text-destructive" },
              { label: "Duration", value: duration },
              { label: "Total Trades", value: totalTrades.toLocaleString() },
              { label: "Buy/Sell", value: `${buyTrades} / ${sellTrades}` },
              { label: "Avg Trade Size", value: `$${avgTradeSize.toFixed(2)}` },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className={`text-sm font-medium ${row.color || "text-foreground"}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PNL Chart */}
        {chartData.length > 1 && (
          <div className="px-4 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Cumulative PNL
            </h3>
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="time" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line type="monotone" dataKey="pnl" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Recent Trades */}
        {trades.length > 0 && (
          <div className="px-4 pb-4">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Recent Trades
            </h3>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left px-3 py-2">Side</th>
                    <th className="text-right px-3 py-2">Price</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-right px-3 py-2">PNL</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(-10).reverse().map((t: any) => (
                    <tr key={t.id} className="border-b border-border/30">
                      <td className={`px-3 py-2 font-medium ${t.side === "buy" ? "text-emerald-400" : "text-destructive"}`}>
                        {t.side === "buy" ? "Long" : "Short"}
                      </td>
                      <td className="px-3 py-2 text-right text-foreground tabular-nums">${Number(t.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2 text-right text-foreground tabular-nums">{Number(t.amount).toFixed(4)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${(t.pnl || 0) >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                        {(t.pnl || 0) >= 0 ? "+" : ""}${Number(t.pnl || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MiniSparkline() {
  const points = Array.from({ length: 20 }, (_, i) => {
    const y = 20 + Math.sin(i * 0.5) * 8 + Math.random() * 6;
    return `${i * 5},${40 - y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 95 40" className="w-full h-full">
      <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" points={points} />
    </svg>
  );
}
