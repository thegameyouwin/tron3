import DashboardLayout from "@/components/DashboardLayout";
import BotAnalyticsView from "@/components/BotAnalyticsView";
import BotStopSummary from "@/components/BotStopSummary";
import DemoModeBanner from "@/components/DemoModeBanner";
import DemoModeToggle from "@/components/DemoModeToggle";
import TradePopup, { emitTradeAlert } from "@/components/TradePopup";

import BotCard from "@/components/bots/BotCard";
import BotDetailPanel from "@/components/bots/BotDetailPanel";
import BotFilters from "@/components/bots/BotFilters";
import BotChat from "@/components/bots/BotChat";
import TradingViewChart from "@/components/bots/TradingViewChart";
import PairSelector from "@/components/bots/PairSelector";
import {
  AutoStopConfig, ChatMessage, STRATEGY_LABELS, TIER_ORDER, TIER_RANK,
  calcWinRate, formatRuntime,
} from "@/components/bots/types";

import { Bot, ChevronLeft, ArrowLeft, BarChart3 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useIsMobile } from "@/hooks/use-mobile";

async function getUserBotIds(userId: string) {
  const { data } = await supabase.from("trading_bots").select("id").eq("user_id", userId);
  return (data || []).map((b) => b.id);
}

const BotsPage = () => {
  const { getSymbol, prices } = useCryptoPrices();
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { demoMode, demoBalance, setDemoBalance } = useAppStore();
  const { settings } = useSiteSettings();
  const isMobile = useIsMobile();
  const accountTier = (profile as any)?.account_tier || "free";

  // UI state
  const [mainTab, setMainTab] = useState<"popular" | "ai">("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("All Tiers");
  const [strategyFilter, setStrategyFilter] = useState("All");
  const [bottomTab, setBottomTab] = useState<"running" | "history" | "pnl" | "bots">("running");
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [viewingRunningBot, setViewingRunningBot] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [selectedChartPair, setSelectedChartPair] = useState("bitcoin");
  const [stopSummary, setStopSummary] = useState<any>(null);

  // Auto-stop state
  const [autoStopEnabled, setAutoStopEnabled] = useState(false);
  const [profitTarget, setProfitTarget] = useState("");
  const [lossLimit, setLossLimit] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [botChatEnabled, setBotChatEnabled] = useState(true);

  // ─── Data queries ───
  const { data: usdtWallet } = useQuery({
    queryKey: ["usdt_wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from("wallets").select("*").eq("user_id", user.id).eq("crypto_id", "tether").maybeSingle();
      if (!data) {
        const { data: d2 } = await supabase.from("wallets").select("*").eq("user_id", user.id).eq("crypto_id", "usdt").maybeSingle();
        return d2;
      }
      return data;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: platformBots = [] } = useQuery({
    queryKey: ["platform_bots_all"],
    queryFn: async () => {
      const { data } = await supabase.from("trading_bots").select("*").is("user_id", null).order("total_profit", { ascending: false });
      return (data || []).map((b: any) => ({ ...b, total_profit: Number(b.total_profit), daily_earn: Number(b.daily_earn || 0), min_stake: Number(b.min_stake || 30) }));
    },
    refetchInterval: 10000,
  });

  const { data: myBots = [] } = useQuery({
    queryKey: ["my_bots", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("trading_bots").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return (data || []).map((b: any) => ({ ...b, total_profit: Number(b.total_profit) }));
    },
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: userTrades = [] } = useQuery({
    queryKey: ["user_bot_trades", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const botIds = await getUserBotIds(user.id);
      if (botIds.length === 0) return [];
      const { data } = await supabase.from("bot_trades").select("*").in("bot_id", botIds).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  const { data: publicTrades = [] } = useQuery({
    queryKey: ["public_bot_trades"],
    queryFn: async () => {
      const { data } = await supabase.from("bot_trades").select("*").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
    refetchInterval: 5000,
  });

  const usdtBalance = Number(usdtWallet?.balance || 0);
  const canAccessTier = (botTier: string) => (TIER_RANK[accountTier?.toLowerCase()] || 0) >= (TIER_RANK[botTier?.toLowerCase()] || 0);

  // ─── Auto-stop monitoring ───
  useEffect(() => {
    if (!myBots.length) return;
    const interval = setInterval(() => {
      myBots.forEach((bot: any) => {
        if (bot.status !== "running") return;
        const autoStop = bot.config?.autoStop as AutoStopConfig;
        if (!autoStop?.enabled) return;
        const profit = bot.total_profit || 0;
        const staked = bot.config?.staked_amount || 0;
        const profitPct = staked > 0 ? (profit / staked) * 100 : 0;
        const minutesRunning = (Date.now() - new Date(bot.created_at).getTime()) / 60000;
        let shouldStop = false;
        let reason = "";
        if (autoStop.profitTarget && profitPct >= autoStop.profitTarget) { shouldStop = true; reason = `Profit target ${autoStop.profitTarget}% reached`; }
        else if (autoStop.lossLimit && profitPct <= -autoStop.lossLimit) { shouldStop = true; reason = `Loss limit ${autoStop.lossLimit}% hit`; }
        else if (autoStop.timeLimitMinutes && minutesRunning >= autoStop.timeLimitMinutes) { shouldStop = true; reason = `Time limit ${autoStop.timeLimitMinutes}min elapsed`; }
        if (shouldStop) { toast.info(`Auto-stopping ${bot.name}: ${reason}`); unstakeBot.mutate(bot); }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [myBots]);

  // Auto-navigate to new bot
  useEffect(() => {
    if (!myBots.length) return;
    const now = Date.now();
    const newBot = myBots.find((b) => b.status === "running" && now - new Date(b.created_at).getTime() < 2000 && !viewingRunningBot);
    if (newBot) { setViewingRunningBot(newBot); toast.success(`${newBot.name} started!`); }
  }, [myBots, viewingRunningBot]);

  // Chat: bot trade messages
  useEffect(() => {
    if (!botChatEnabled || publicTrades.length === 0) return;
    const lastTrade = publicTrades[0];
    if (!chatMessages.some((m) => m.id === lastTrade.id)) {
      const symbol = getSymbol(lastTrade.crypto_id);
      const side = lastTrade.side === "buy" ? "Long 🔼" : "Short 🔽";
      const pnl = lastTrade.pnl ? (lastTrade.pnl > 0 ? `+$${lastTrade.pnl.toFixed(2)}` : `-$${Math.abs(lastTrade.pnl).toFixed(2)}`) : "";
      setChatMessages((prev) => [
        { id: lastTrade.id, text: `🤖 ${symbol}/USDT ${side} at $${Number(lastTrade.price).toFixed(2)} | PnL: ${pnl}`, timestamp: new Date(lastTrade.created_at), type: "bot" as const },
        ...prev,
      ].slice(0, 150));
    }
  }, [publicTrades, getSymbol, botChatEnabled, chatMessages]);

  // Simulated trade generator
  useEffect(() => {
    if (!myBots.length) return;
    const interval = setInterval(() => {
      myBots.forEach(async (bot: any) => {
        if (bot.status !== "running") return;
        const coinPrice = prices.find((p) => p.id === bot.crypto_id)?.current_price || 60000;
        const change = (Math.random() - 0.35) * 0.012;
        const tradePrice = coinPrice * (1 + change);
        const stakedAmount = bot.config?.staked_amount || 50;
        const amount = (stakedAmount / coinPrice) * (Math.random() * 0.12 + 0.03);
        const side = Math.random() > 0.45 ? "buy" : "sell";
        const pnl = Math.random() * (stakedAmount * 0.008) + (stakedAmount * 0.001);
        const symbol = getSymbol(bot.crypto_id);

        await supabase.from("bot_trades").insert({ bot_id: bot.id, crypto_id: bot.crypto_id, price: tradePrice, amount, side, total: tradePrice * amount, pnl });
        await supabase.from("trading_bots").update({ total_profit: (bot.total_profit || 0) + pnl, total_trades: (bot.total_trades || 0) + 1 }).eq("id", bot.id);

        if (!demoMode && user) {
          const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).or("crypto_id.eq.tether,crypto_id.eq.usdt").limit(1).maybeSingle();
          if (wallet) await supabase.from("wallets").update({ balance: Number(wallet.balance) + pnl }).eq("id", wallet.id);
        } else if (demoMode) {
          setDemoBalance(demoBalance + pnl);
        }

        emitTradeAlert({ id: `${bot.id}-${Date.now()}`, side: side as "buy" | "sell", symbol: symbol || "BTC", price: tradePrice, amount, timestamp: Date.now() });
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [myBots, prices, demoMode, demoBalance, user, getSymbol, setDemoBalance]);

  // ─── Mutations ───
  const stakeBot = useMutation({
    mutationFn: async ({ bot, amount, autoStopConfig }: { bot: any; amount: number; autoStopConfig?: AutoStopConfig }) => {
      if (!user) throw new Error("Not authenticated");
      const balance = demoMode ? demoBalance : usdtBalance;
      if (amount < bot.min_stake) throw new Error(`Minimum stake is $${bot.min_stake} USDT`);
      if (amount > balance) throw new Error(demoMode ? "Insufficient demo balance" : `Insufficient balance. You have $${usdtBalance.toFixed(2)} USDT`);

      if (demoMode) {
        setDemoBalance(demoBalance - amount);
      } else {
        const walletId = usdtWallet?.id;
        if (!walletId) throw new Error("No USDT wallet found. Deposit first.");
        await supabase.from("wallets").update({ balance: usdtBalance - amount }).eq("id", walletId);
      }

      const config = { ...((bot.config as any) || {}), staked_amount: amount, autoStop: autoStopConfig };
      const { data: newBot, error } = await supabase
        .from("trading_bots")
        .insert({
          name: bot.name, crypto_id: bot.crypto_id, strategy: bot.strategy, config,
          user_id: user.id, status: "running", tier: bot.tier || "free",
          description: bot.description || "", is_ai: bot.is_ai || false,
          min_stake: bot.min_stake || 30, daily_earn: bot.daily_earn || 0,
        } as any)
        .select().single();
      if (error) throw error;

      await supabase.from("ledger_entries").insert({
        user_id: user.id, crypto_id: "usdt", amount: -amount,
        entry_type: "bot_stake", description: `Staked $${amount} USDT in ${bot.name}`,
      } as any);

      return newBot;
    },
    onSuccess: (newBot) => {
      queryClient.invalidateQueries({ queryKey: ["my_bots"] });
      queryClient.invalidateQueries({ queryKey: ["usdt_wallet"] });
      toast.success("Bot started!");
      setSelectedBot(null);
      setStakeAmount("");
      setAutoStopEnabled(false);
      setProfitTarget("");
      setLossLimit("");
      setTimeLimitMinutes("");
      if (newBot) setViewingRunningBot(newBot);
    },
    onError: (err: any) => {
      if (err.message.includes("Insufficient")) { toast.error(err.message); setTimeout(() => navigate("/deposit"), 1500); }
      else toast.error(err.message);
    },
  });

  const unstakeBot = useMutation({
    mutationFn: async (bot: any) => {
      if (!user) throw new Error("Not authenticated");
      const stakedAmount = Number(bot.config?.staked_amount || 0);
      const profit = Number(bot.total_profit || 0);
      const returnAmount = stakedAmount + profit;

      if (demoMode) {
        setDemoBalance(demoBalance + returnAmount);
      } else {
        const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).or("crypto_id.eq.tether,crypto_id.eq.usdt").limit(1).maybeSingle();
        if (wallet) {
          await supabase.from("wallets").update({ balance: Number(wallet.balance) + returnAmount }).eq("id", wallet.id);
        } else {
          await supabase.from("wallets").insert({ user_id: user.id, crypto_id: "usdt", balance: returnAmount });
        }
      }

      await supabase.from("ledger_entries").insert({
        user_id: user.id, crypto_id: "usdt", amount: returnAmount,
        entry_type: "bot_unstake", description: `Unstaked $${stakedAmount.toFixed(2)} + $${profit.toFixed(2)} profit from ${bot.name}`,
      } as any);
      await supabase.from("trading_bots").delete().eq("id", bot.id);

      const ms = Date.now() - new Date(bot.created_at).getTime();
      const days = Math.floor(ms / 86400000);
      const hours = Math.floor((ms % 86400000) / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const duration = days > 0 ? `${days}d ${hours}h ${mins}m` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

      setStopSummary({
        botName: bot.name,
        pair: `${getSymbol(bot.crypto_id)}/USDT`,
        strategy: STRATEGY_LABELS[bot.strategy] || bot.strategy,
        stakedAmount, profit, duration,
        totalTrades: bot.total_trades || 0,
        winRate: calcWinRate(bot.total_trades || 0, profit),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_bots"] });
      queryClient.invalidateQueries({ queryKey: ["usdt_wallet"] });
      setViewingRunningBot(null);
      toast.success("Bot stopped & funds returned!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const runBotsNow = useMutation({
    mutationFn: async () => { const { data, error } = await supabase.functions.invoke("run-bots"); if (error) throw error; return data; },
    onSuccess: (data: any) => { queryClient.invalidateQueries({ queryKey: ["my_bots"] }); toast.success(`Executed ${data?.executed || 0} trades!`); },
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Filtering ───
  const filteredBots = useMemo(() => {
    let bots = platformBots;
    if (mainTab === "ai") bots = bots.filter((b: any) => b.is_ai);
    if (tierFilter !== "All Tiers") bots = bots.filter((b: any) => (b.tier || "free").toLowerCase() === tierFilter.toLowerCase());
    if (strategyFilter === "⚡ AI") bots = bots.filter((b: any) => b.is_ai);
    else if (strategyFilter !== "All") {
      const stratMap: Record<string, string> = { "Spot Grid": "market_making", DCA: "trend_following", Arbitrage: "arbitrage", Momentum: "momentum", Trend: "trend_following", Scalping: "momentum" };
      const mapped = stratMap[strategyFilter];
      if (mapped) bots = bots.filter((b: any) => b.strategy === mapped);
    }
    if (searchQuery) { const q = searchQuery.toLowerCase(); bots = bots.filter((b: any) => b.name.toLowerCase().includes(q) || b.crypto_id.toLowerCase().includes(q)); }
    return bots.sort((a: any, b: any) => {
      const oa = TIER_ORDER[(a.tier || "free").toLowerCase()] ?? 99;
      const ob = TIER_ORDER[(b.tier || "free").toLowerCase()] ?? 99;
      if (oa !== ob) return oa - ob;
      return b.total_profit - a.total_profit;
    });
  }, [platformBots, mainTab, tierFilter, strategyFilter, searchQuery]);

  const pnlChartData = useMemo(() => {
    if (!userTrades.length) return [];
    const dailyProfit: Record<string, number> = {};
    userTrades.forEach((trade: any) => { const date = new Date(trade.created_at).toISOString().split("T")[0]; dailyProfit[date] = (dailyProfit[date] || 0) + (trade.pnl || 0); });
    const sortedDates = Object.keys(dailyProfit).sort();
    let cumulative = 0;
    return sortedDates.map((date) => { cumulative += dailyProfit[date]; return { date, profit: cumulative }; });
  }, [userTrades]);

  // ─── Derived values ───
  const selectedPairPrice = prices.find((p) => p.id === selectedChartPair);
  const currentPrice = selectedPairPrice?.current_price ?? 0;
  const chartPairName = getSymbol(selectedChartPair) ? `${getSymbol(selectedChartPair)}/USDT` : "BTC/USDT";
  const effectiveBalance = demoMode ? demoBalance : usdtBalance;
  const depositAddress = settings.depositWallets?.["bitcoin"] || settings.depositWallets?.["ethereum"] || "";

  // ─── Handlers ───
  const handleSelectBot = useCallback((bot: any) => {
    const botTier = (bot.tier || "free").toLowerCase();
    if (!canAccessTier(botTier) && !demoMode) { toast.error(`Upgrade to ${botTier} tier to use this bot.`); return; }
    setSelectedBot(bot);
    setSelectedChartPair(bot.crypto_id);
    setAutoStopEnabled(false); setProfitTarget(""); setLossLimit(""); setTimeLimitMinutes("");
  }, [demoMode, accountTier]);

  const handleStartBot = useCallback((autoStopConfig?: AutoStopConfig) => {
    if (!selectedBot) return;
    stakeBot.mutate({ bot: selectedBot, amount: Number(stakeAmount) || 0, autoStopConfig });
  }, [selectedBot, stakeAmount, stakeBot]);

  const handleChatSend = useCallback((msg: string) => {
    setChatMessages((prev) => [{ id: Date.now().toString(), text: msg, timestamp: new Date(), type: "user" }, ...prev]);
    const lower = msg.toLowerCase();
    const addBotMsg = (text: string) => setChatMessages((prev) => [{ id: (Date.now() + 1).toString(), text, timestamp: new Date(), type: "bot" }, ...prev]);
    if (lower === "/status") {
      const running = myBots.filter((b: any) => b.status === "running");
      if (running.length === 0) addBotMsg("📊 No running bots.");
      else { const tp = running.reduce((s, b) => s + (b.total_profit || 0), 0); const ts = running.reduce((s, b) => s + (b.config?.staked_amount || 0), 0); addBotMsg(`📊 Active: ${running.length} | Staked: $${ts.toFixed(2)} | Profit: $${tp.toFixed(2)}`); }
    } else if (lower === "/help") addBotMsg("🤖 /status /bots /price <coin> /clear /toggle");
    else if (lower === "/bots") addBotMsg(`**Top bots:**\n${filteredBots.slice(0, 10).map((b) => `• ${b.name} (${b.tier})`).join("\n")}`);
    else if (lower === "/clear") { setChatMessages([]); addBotMsg("Chat cleared."); }
    else if (lower === "/toggle") { setBotChatEnabled((prev) => !prev); addBotMsg(`Bot messages ${!botChatEnabled ? "enabled ✅" : "disabled ❌"}.`); }
    else if (lower.startsWith("/price")) { const sym = msg.split(" ")[1]?.toUpperCase(); const found = prices.find((p) => p.symbol.toLowerCase() === sym?.toLowerCase()); if (found) addBotMsg(`💰 ${found.symbol.toUpperCase()}: $${found.current_price.toLocaleString()}`); else addBotMsg(`Coin "${sym}" not found.`); }
    else addBotMsg("Type /help for commands.");
  }, [myBots, filteredBots, prices, botChatEnabled]);

  // ─── Bottom tab content (shared between desktop and mobile) ───
  const renderBottomContent = () => {
    if (bottomTab === "running") {
      const running = myBots.filter((b) => b.status === "running");
      if (running.length === 0) return <div className="text-center py-8 text-sm text-muted-foreground">No bots running.</div>;
      return (
        <div className="space-y-2">
          {running.map((bot) => (
            <div key={bot.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg cursor-pointer hover:bg-secondary/70 transition-colors" onClick={() => setViewingRunningBot(bot)}>
              <div>
                <p className="text-sm font-medium">{bot.name}</p>
                <p className="text-[11px] text-muted-foreground">{getSymbol(bot.crypto_id)}/USDT • Staked: ${(bot.config?.staked_amount || 0).toFixed(2)}</p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="text-right">
                  <p className={`text-sm font-bold ${bot.total_profit >= 0 ? "text-profit" : "text-loss"}`}>{bot.total_profit >= 0 ? "+" : ""}${bot.total_profit.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">{bot.total_trades} trades</p>
                </div>
                <Button variant="outline" size="sm" className="text-[10px] h-7 text-loss hover:bg-loss/10" onClick={(e) => { e.stopPropagation(); if (confirm("Stop bot?")) unstakeBot.mutate(bot); }}>
                  Unstake
                </Button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (bottomTab === "history") {
      if (userTrades.length === 0) return <p className="text-center text-sm text-muted-foreground">No trade history.</p>;
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-muted-foreground"><th className="text-left py-2">Pair</th><th>Side</th><th className="text-right">Price</th><th className="text-right">Amount</th><th className="text-right">PNL</th><th className="text-right">Time</th></tr></thead>
            <tbody>
              {userTrades.slice(0, 20).map((t) => (
                <tr key={t.id} className="border-b border-border/30">
                  <td>{getSymbol(t.crypto_id)}/USDT</td>
                  <td className={t.side === "buy" ? "text-profit" : "text-loss"}>{t.side}</td>
                  <td className="text-right">${Number(t.price).toLocaleString()}</td>
                  <td className="text-right">{Number(t.amount).toFixed(4)}</td>
                  <td className={`text-right ${(t.pnl || 0) >= 0 ? "text-profit" : "text-loss"}`}>${(t.pnl || 0).toFixed(2)}</td>
                  <td className="text-right text-muted-foreground">{new Date(t.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (bottomTab === "pnl") {
      if (pnlChartData.length === 0) return <div className="text-center py-8 text-muted-foreground"><BarChart3 className="h-8 w-8 mx-auto opacity-30 mb-2" /><p>No PNL data yet.</p></div>;
      return (
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={pnlChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <RechartsTooltip />
              <Line type="monotone" dataKey="profit" stroke="hsl(var(--profit))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    if (bottomTab === "bots") {
      if (filteredBots.length === 0) return <p className="text-center text-sm text-muted-foreground">No bots match.</p>;
      return (
        <div className="space-y-3">
          {filteredBots.map((bot) => (
            <BotCard key={bot.id} bot={bot} locked={!canAccessTier((bot.tier || "free").toLowerCase()) && !demoMode} onSelect={handleSelectBot} />
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <DashboardLayout>
      <TradePopup />
      <DemoModeBanner />
      <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-0px)] overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-4 py-2 border-b bg-card text-sm overflow-x-auto whitespace-nowrap">
          <Link to="/dashboard" className="flex gap-1 text-muted-foreground hover:text-foreground"><ChevronLeft className="h-4 w-4" /> Dashboard</Link>
          <div className="flex gap-1 font-semibold"><Bot className="h-4 w-4" /> Trading Bots</div>
          <DemoModeToggle />
          <span className="ml-auto text-xs">{chartPairName}</span>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          {/* ─── DESKTOP ─── */}
          <div className="hidden md:flex h-full">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-4 py-2 flex items-center gap-4 border-b">
                <PairSelector
                  selectedPair={selectedChartPair}
                  onSelectPair={setSelectedChartPair}
                  prices={prices}
                  getSymbol={getSymbol}
                  currentPrice={currentPrice}
                  priceChange24h={selectedPairPrice?.price_change_percentage_24h}
                  pairImage={selectedPairPrice?.image}
                  chartPairName={chartPairName}
                />
              </div>
              {/* Chart — TradingView on desktop */}
              <div className="flex-1 bg-background min-h-[450px]">
                <TradingViewChart symbol={getSymbol(selectedChartPair) || "BTC"} />
              </div>

              {/* Bottom tabs */}
              <div className="border-t bg-card">
                <div className="flex gap-6 px-4 overflow-x-auto">
                  {(["running", "history", "pnl"] as const).map((t) => (
                    <button key={t} className={`py-3 text-sm font-medium border-b-2 transition-colors ${bottomTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setBottomTab(t)}>
                      {t === "running" ? "Running" : t === "history" ? "History" : "PNL"}
                    </button>
                  ))}
                </div>
                <div className="p-4 overflow-auto max-h-[280px]">{renderBottomContent()}</div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="w-[320px] lg:w-[360px] border-l bg-card flex flex-col overflow-hidden">
              {viewingRunningBot ? (
                <BotAnalyticsView bot={viewingRunningBot} onBack={() => setViewingRunningBot(null)} onUnstake={(bot) => unstakeBot.mutate(bot)} unstaking={unstakeBot.isPending} />
              ) : selectedBot ? (
                <BotDetailPanel
                  bot={selectedBot}
                  stakeAmount={stakeAmount} setStakeAmount={setStakeAmount}
                  autoStopEnabled={autoStopEnabled} setAutoStopEnabled={setAutoStopEnabled}
                  profitTarget={profitTarget} setProfitTarget={setProfitTarget}
                  lossLimit={lossLimit} setLossLimit={setLossLimit}
                  timeLimitMinutes={timeLimitMinutes} setTimeLimitMinutes={setTimeLimitMinutes}
                  effectiveBalance={effectiveBalance} demoMode={demoMode}
                  depositAddress={depositAddress} isPending={stakeBot.isPending}
                  onBack={() => { setSelectedBot(null); setStakeAmount(""); }}
                  onStartBot={handleStartBot} getSymbol={getSymbol}
                />
              ) : (
                <div className="flex flex-col h-full overflow-y-auto">
                  <BotFilters
                    mainTab={mainTab} setMainTab={setMainTab}
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    tierFilter={tierFilter} setTierFilter={setTierFilter}
                    strategyFilter={strategyFilter} setStrategyFilter={setStrategyFilter}
                    onRunAll={() => runBotsNow.mutate()}
                  />
                  <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                    {filteredBots.map((bot) => (
                      <BotCard key={bot.id} bot={bot} locked={!canAccessTier((bot.tier || "free").toLowerCase()) && !demoMode} onSelect={handleSelectBot} />
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t text-[10px] text-muted-foreground">Daily win % refreshes every 4 hours.</div>
                </div>
              )}
            </div>
          </div>

          {/* ─── MOBILE ─── */}
          <div className="flex flex-col h-full md:hidden">
            <div className="flex-shrink-0 px-4 py-2 flex items-center gap-4 border-b overflow-x-auto">
              <PairSelector
                selectedPair={selectedChartPair}
                onSelectPair={setSelectedChartPair}
                prices={prices}
                getSymbol={getSymbol}
                currentPrice={currentPrice}
                priceChange24h={selectedPairPrice?.price_change_percentage_24h}
                pairImage={selectedPairPrice?.image}
                chartPairName={chartPairName}
              />
            </div>
            {/* MOBILE CHART — NOW USING TRADINGVIEW (same as desktop) */}
            <div className="h-64 bg-background">
              <TradingViewChart symbol={getSymbol(selectedChartPair) || "BTC"} />
            </div>

            {/* Bottom tabs with "Bots" tab */}
            <div className="border-t bg-card flex-1 flex flex-col min-h-0">
              <div className="flex gap-4 px-4 overflow-x-auto shrink-0">
                {(["running", "history", "pnl", "bots"] as const).map((t) => (
                  <button key={t} className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${bottomTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} onClick={() => setBottomTab(t)}>
                    {t === "running" ? "Running" : t === "history" ? "History" : t === "pnl" ? "PNL" : "Bots"}
                  </button>
                ))}
              </div>
              <div className="p-4 overflow-auto flex-1">{renderBottomContent()}</div>
            </div>

            {/* Mobile overlay for bot details */}
            {(viewingRunningBot || selectedBot) && (
              <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
                <div className="p-3 border-b flex items-center gap-2 shrink-0 safe-top">
                  <button onClick={() => { setViewingRunningBot(null); setSelectedBot(null); }} className="p-2 rounded-lg hover:bg-secondary">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <span className="font-semibold text-sm truncate">{viewingRunningBot?.name || selectedBot?.name}</span>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  {viewingRunningBot ? (
                    <BotAnalyticsView bot={viewingRunningBot} onBack={() => setViewingRunningBot(null)} onUnstake={(bot) => unstakeBot.mutate(bot)} unstaking={unstakeBot.isPending} />
                  ) : (
                    <BotDetailPanel
                      bot={selectedBot}
                      stakeAmount={stakeAmount} setStakeAmount={setStakeAmount}
                      autoStopEnabled={autoStopEnabled} setAutoStopEnabled={setAutoStopEnabled}
                      profitTarget={profitTarget} setProfitTarget={setProfitTarget}
                      lossLimit={lossLimit} setLossLimit={setLossLimit}
                      timeLimitMinutes={timeLimitMinutes} setTimeLimitMinutes={setTimeLimitMinutes}
                      effectiveBalance={effectiveBalance} demoMode={demoMode}
                      depositAddress={depositAddress} isPending={stakeBot.isPending}
                      onBack={() => { setSelectedBot(null); setStakeAmount(""); }}
                      onStartBot={handleStartBot} getSymbol={getSymbol}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat */}
        <BotChat messages={chatMessages} onSend={handleChatSend} />
      </div>

      {/* Stop Summary Modal */}
      {stopSummary && <BotStopSummary {...stopSummary} onClose={() => setStopSummary(null)} />}
    </DashboardLayout>
  );
};

export default BotsPage;
