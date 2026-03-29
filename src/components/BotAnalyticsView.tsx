import { ArrowLeft, Power, Settings, ChevronDown, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect, useRef } from "react";

const TRADEABLE = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
  "cardano", "polkadot", "dogecoin", "avalanche-2", "chainlink",
  "litecoin", "tron", "stellar"
] as const;

interface BotAnalyticsProps {
  bot: any;
  onBack: () => void;
  onUnstake?: (bot: any) => void;
  unstaking?: boolean;
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

function generateSignalCode(botId: string) {
  return `BOT-${botId.substring(0, 2).toUpperCase()}-${botId.substring(2, 10).toUpperCase()}`;
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}

export default function BotAnalyticsView({ bot, onBack, onUnstake, unstaking }: BotAnalyticsProps) {
  const { getSymbol, prices } = useCryptoPrices();
  const [activeTab, setActiveTab] = useState<"running" | "settings">("running");
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [botPhase, setBotPhase] = useState<"buying" | "selling">("buying");

  const stakedAmount = Number(bot.config?.staked_amount || 0);
  const profit = Number(bot.total_profit || 0);
  const pair = `${getSymbol(bot.crypto_id)}/USDT`;
  const stratLabel = bot.strategy === "market_making" ? "Grid" : bot.strategy;
  const returnAmount = stakedAmount + profit;
  const signalCode = generateSignalCode(bot.id);

  // Timer that counts up from bot start, resets every ~3 min cycle
  useEffect(() => {
    const interval = setInterval(() => {
      const totalSec = Math.floor((Date.now() - new Date(bot.created_at).getTime()) / 1000);
      const cycleSec = totalSec % 180; // 3 minute cycle
      setElapsed(cycleSec);
      setBotPhase(cycleSec < 90 ? "buying" : "selling");
    }, 1000);
    return () => clearInterval(interval);
  }, [bot.created_at]);

  const timerDisplay = `${Math.floor((180 - (elapsed % 180)) / 60)}:${String((180 - (elapsed % 180)) % 60).padStart(2, "0")}`;
  const progressPercent = ((elapsed % 180) / 180) * 100;

  // Filter pairs for switching
  const filteredPairs = useMemo(() => {
    const q = pairSearch.toLowerCase();
    return TRADEABLE.filter(id => {
      const p = prices.find(pr => pr.id === id);
      if (!p) return false;
      return p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q);
    });
  }, [pairSearch, prices]);

  // Fetch trade history
  const { data: trades = [] } = useQuery({
    queryKey: ["bot_analytics_trades", bot.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("bot_trades")
        .select("*")
        .eq("bot_id", bot.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    refetchInterval: 3000,
  });

  // Stats
  const totalTrades = bot.total_trades || 0;
  const winRate = trades.length > 0
    ? ((trades.filter((t: any) => Number(t.pnl || 0) > 0).length / trades.length) * 100)
    : 0;

  const handleSwitchPair = async (newCryptoId: string) => {
    await supabase
      .from("trading_bots")
      .update({ crypto_id: newCryptoId })
      .eq("id", bot.id);
    setPairDropdownOpen(false);
    setPairSearch("");
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border bg-card">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-3 text-xs">
          <ArrowLeft className="h-4 w-4" /> Back to Running Bots
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{bot.name}</h2>
              <p className="text-xs text-muted-foreground">{pair} · {stratLabel}</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
            LIVE
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-card">
        <button
          onClick={() => setActiveTab("running")}
          className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === "running" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Running Bot
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === "settings" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <Settings className="h-3.5 w-3.5 inline mr-1" /> Settings
        </button>
      </div>

      {activeTab === "running" ? (
        <div className="flex-1 overflow-y-auto">
          {/* Execution Status Card */}
          <div className="mx-4 mt-4 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">Bot executing trades...</span>
              <span className="text-sm font-bold text-primary tabular-nums">{timerDisplay}</span>
            </div>
            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Staked</p>
                <p className="text-sm font-bold text-foreground">${stakedAmount.toFixed(2)}</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Win Rate</p>
                <p className="text-sm font-bold text-foreground">{winRate.toFixed(2)}%</p>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground mb-1">Profit</p>
                <p className={`text-sm font-bold ${profit > 0 ? "text-emerald-400" : profit < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {profit > 0 ? `+$${profit.toFixed(2)}` : profit < 0 ? `-$${Math.abs(profit).toFixed(2)}` : "Pending..."}
                </p>
              </div>
            </div>

            {/* Signal Code */}
            <div className="mt-3 bg-secondary/50 border border-border rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Signal Code</p>
              <p className="text-sm font-bold text-primary font-mono">{signalCode}</p>
            </div>
          </div>

          {/* Phase Banner */}
          <div className={`mx-4 mt-3 px-4 py-3 rounded-xl border flex items-center gap-2 ${
            botPhase === "buying"
              ? "bg-emerald-500/10 border-emerald-500/30"
              : "bg-destructive/10 border-destructive/30"
          }`}>
            {botPhase === "buying" ? (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">ACCUMULATING — BOT IS BUYING</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-xs font-bold text-destructive uppercase tracking-wide">DISTRIBUTING — BOT IS SELLING</span>
              </>
            )}
          </div>

          {/* Live Trade Feed */}
          <div className="mx-4 mt-3 mb-4 bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">Live Trade Feed</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-400">LIVE</span>
              </div>
            </div>
            {trades.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                Waiting for first trade...
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {trades.slice(0, 15).map((t: any) => {
                  const sym = getSymbol(t.crypto_id);
                  return (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        {t.side === "buy" ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-bold w-14">
                            <TrendingUp className="h-3 w-3" /> BUY
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive font-bold w-14">
                            <TrendingDown className="h-3 w-3" /> SELL
                          </span>
                        )}
                        <span className="text-foreground tabular-nums font-medium">
                          {Number(t.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-foreground tabular-nums">
                          {Number(t.amount).toFixed(4)} {sym}
                        </span>
                        <span className="text-muted-foreground tabular-nums w-8 text-right">
                          {timeAgo(t.created_at)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Settings Tab */
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            {/* Switch Pair */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" /> Switch Trading Pair
              </h3>
              <p className="text-xs text-muted-foreground mb-3">Current: <span className="text-foreground font-medium">{pair}</span></p>
              <div className="relative">
                <button
                  onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm text-foreground hover:border-primary/30 transition-colors"
                >
                  <span>{pair}</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${pairDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {pairDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2">
                      <input
                        type="text"
                        value={pairSearch}
                        onChange={e => setPairSearch(e.target.value)}
                        placeholder="Search pairs..."
                        className="w-full h-8 rounded-lg bg-secondary border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredPairs.map(id => {
                        const p = prices.find(pr => pr.id === id);
                        if (!p) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => handleSwitchPair(id)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary/80 transition-colors ${
                              bot.crypto_id === id ? "bg-primary/10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img src={p.image} alt="" className="w-5 h-5 rounded-full" />
                              <span className="font-medium text-foreground">{getSymbol(id)}/USDT</span>
                            </div>
                            <span className="text-foreground">${p.current_price.toLocaleString()}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bot Parameters */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Bot Parameters
              </h3>
              <div className="divide-y divide-border">
                {[
                  { label: "Strategy", value: bot.strategy === "market_making" ? "Spot Grid" : bot.strategy },
                  { label: "Spread", value: `${(bot.config?.spread_percent || 0.5)}%` },
                  { label: "Order Size", value: `${(bot.config?.order_size || 0.1)}` },
                  { label: "Max Orders", value: `${(bot.config?.max_orders || 5)}` },
                  { label: "Staked Amount", value: `$${stakedAmount.toFixed(2)} USDT` },
                  { label: "Duration", value: formatDuration(bot.created_at) },
                  { label: "Total Trades", value: totalTrades.toLocaleString() },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2.5">
                    <span className="text-xs text-muted-foreground">{row.label}</span>
                    <span className="text-xs font-medium text-foreground">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Withdrawal Summary */}
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Withdrawal Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Staked</span>
                  <span className="text-foreground">${stakedAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Profit/Loss</span>
                  <span className={profit >= 0 ? "text-emerald-400" : "text-destructive"}>{profit >= 0 ? "+" : ""}${profit.toFixed(2)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-foreground">Total Return</span>
                  <span className={returnAmount >= stakedAmount ? "text-emerald-400" : "text-destructive"}>${returnAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action */}
      <div className="p-4 border-t border-border bg-card">
        {onUnstake && (
          <Button
            className="w-full h-11 text-sm font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg"
            onClick={() => {
              if (confirm(`Stop bot and withdraw $${returnAmount.toFixed(2)} USDT?`)) {
                onUnstake(bot);
              }
            }}
            disabled={unstaking}
          >
            <Power className="h-4 w-4 mr-2" />
            {unstaking ? "Stopping..." : `Stop Bot & Withdraw $${returnAmount.toFixed(2)}`}
          </Button>
        )}
      </div>
    </div>
  );
}
