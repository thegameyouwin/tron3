import DashboardLayout from "@/components/DashboardLayout";
import BotAnalyticsView from "@/components/BotAnalyticsView";
import BotStopSummary from "@/components/BotStopSummary";
import DemoModeBanner from "@/components/DemoModeBanner";
import DemoModeToggle from "@/components/DemoModeToggle";
import TradePopup, { emitTradeAlert } from "@/components/TradePopup";
import { Bot, Search, Zap, Lock, Copy, Users, RotateCw, RefreshCw, Clock, TrendingUp, Activity, BarChart3, ChevronLeft, ChevronDown, ArrowLeft, Info, MessageSquare, Send, X, Wallet, CreditCard, StopCircle, Target, Timer } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { QRCodeSVG } from "qrcode.react";

// List of tradeable pairs
const TRADEABLE = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
  "cardano", "polkadot", "dogecoin", "avalanche-2", "chainlink",
  "litecoin", "tron", "stellar"
] as const;

const TIER_COLORS: Record<string, string> = {
  free: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  pro: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  elite: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  vip: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const STRATEGY_LABELS: Record<string, string> = {
  market_making: "Spot Grid",
  trend_following: "DCA",
  arbitrage: "Arbitrage",
  momentum: "Momentum",
};

const STRATEGY_FILTERS = ["All", "⚡ AI", "Spot Grid", "Futures Grid", "DCA", "Arbitrage", "Trend", "TWAP", "Scalping", "Momentum", "Breakout", "Range"];
const TIER_FILTERS = ["All Tiers", "Free", "Pro", "Elite", "VIP"];

const TIER_ORDER: Record<string, number> = {
  free: 1,
  pro: 2,
  elite: 3,
  vip: 4,
};

function formatRuntime(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${days}d ${hours}h ${mins}m`;
}

function calcROI(profit: number, config: any, createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = Math.max(ms / 3600000, 1);
  const investment = (config?.order_size || 0.1) * (config?.max_orders || 5) * 100;
  if (investment === 0) return 0;
  return (profit / Math.max(investment, 1)) / hours * 100;
}

function calcWinRate(trades: number, profit: number) {
  if (trades === 0) return 0;
  const base = 50 + (profit > 0 ? Math.min(profit / 5000, 40) : Math.max(-30, profit / 5000));
  return Math.min(99, Math.max(10, Math.round(base)));
}

async function getUserBotIds(userId: string) {
  const { data } = await supabase
    .from("trading_bots")
    .select("id")
    .eq("user_id", userId);
  return (data || []).map(b => b.id);
}

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: "bot" | "user" | "system";
}

interface AutoStopConfig {
  enabled: boolean;
  profitTarget?: number;
  lossLimit?: number;
  timeLimitMinutes?: number;
}

const BotsPage = () => {
  const { getSymbol, prices } = useCryptoPrices();
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { demoMode, demoBalance, setDemoBalance } = useAppStore();
  const { settings } = useSiteSettings();
  const accountTier = (profile as any)?.account_tier || "free";
  const [mainTab, setMainTab] = useState<"popular" | "ai">("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("All Tiers");
  const [strategyFilter, setStrategyFilter] = useState("All");
  const [bottomTab, setBottomTab] = useState<"running" | "history" | "pnl" | "bots">("running");
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [viewingRunningBot, setViewingRunningBot] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [showParams, setShowParams] = useState(false);
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState("");
  const [selectedChartPair, setSelectedChartPair] = useState("bitcoin");
  const chartRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const chartInitialized = useRef(false);

  // Auto-stop state
  const [autoStopEnabled, setAutoStopEnabled] = useState(false);
  const [profitTarget, setProfitTarget] = useState("");
  const [lossLimit, setLossLimit] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [botChatEnabled, setBotChatEnabled] = useState(true);
  const [stopSummary, setStopSummary] = useState<any>(null);

  // Data queries
  const { data: usdtWallet, refetch: refetchWallet } = useQuery({
    queryKey: ["usdt_wallet", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .eq("crypto_id", "tether")
        .maybeSingle();
      if (!data) {
        const { data: d2 } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .eq("crypto_id", "usdt")
          .maybeSingle();
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
      const { data } = await supabase
        .from("trading_bots")
        .select("*")
        .is("user_id", null)
        .order("total_profit", { ascending: false });
      return (data || []).map((b: any) => ({ ...b, total_profit: Number(b.total_profit), daily_earn: Number(b.daily_earn || 0), min_stake: Number(b.min_stake || 30) }));
    },
    refetchInterval: 10000,
  });

  const { data: myBots = [] } = useQuery({
    queryKey: ["my_bots", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("trading_bots")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
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
      const { data } = await supabase
        .from("bot_trades")
        .select("*")
        .in("bot_id", botIds)
        .order("created_at", { ascending: false })
        .limit(50);
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

  // Auto-stop monitoring effect (checks every 5 seconds for fast response)
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
        const createdAt = new Date(bot.created_at);
        const now = new Date();
        const minutesRunning = (now.getTime() - createdAt.getTime()) / 60000;

        let shouldStop = false;
        let reason = "";

        if (autoStop.profitTarget && profitPct >= autoStop.profitTarget) {
          shouldStop = true;
          reason = `Profit target of ${autoStop.profitTarget}% reached (${profitPct.toFixed(2)}%)`;
        } else if (autoStop.lossLimit && profitPct <= -autoStop.lossLimit) {
          shouldStop = true;
          reason = `Loss limit of ${autoStop.lossLimit}% hit (${profitPct.toFixed(2)}%)`;
        } else if (autoStop.timeLimitMinutes && minutesRunning >= autoStop.timeLimitMinutes) {
          shouldStop = true;
          reason = `Time limit of ${autoStop.timeLimitMinutes} minutes elapsed`;
        }

        if (shouldStop) {
          toast.info(`Auto-stopping ${bot.name}: ${reason}`);
          unstakeBot.mutate(bot);
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [myBots]);

  // Auto-navigation: when a new bot appears in myBots and status is running, navigate to its analytics
  useEffect(() => {
    if (!myBots.length) return;
    const now = Date.now();
    const newBot = myBots.find(b => b.status === "running" && (now - new Date(b.created_at).getTime() < 2000) && !viewingRunningBot);
    if (newBot) {
      setViewingRunningBot(newBot);
      toast.success(`${newBot.name} started! Opening analytics...`);
    }
  }, [myBots, viewingRunningBot]);

  // Chat: bot trade messages
  useEffect(() => {
    if (!botChatEnabled) return;
    if (publicTrades.length === 0) return;
    const lastTrade = publicTrades[0];
    if (!chatMessages.some(m => m.id === lastTrade.id)) {
      const symbol = getSymbol(lastTrade.crypto_id);
      const side = lastTrade.side === "buy" ? "Long 🔼" : "Short 🔽";
      const pnl = lastTrade.pnl ? (lastTrade.pnl > 0 ? `+$${lastTrade.pnl.toFixed(2)}` : `-$${Math.abs(lastTrade.pnl).toFixed(2)}`) : "";
      const messageText = `🤖 **Bot Trade** | ${symbol}/USDT ${side} at $${Number(lastTrade.price).toFixed(2)} | Amount: ${Number(lastTrade.amount).toFixed(4)} | PnL: ${pnl}`;
      setChatMessages(prev => [{ id: lastTrade.id, text: messageText, timestamp: new Date(lastTrade.created_at), type: "bot" as const }, ...prev].slice(0, 150));
    }
  }, [publicTrades, getSymbol, botChatEnabled, chatMessages]);

  useEffect(() => {
    if (chatOpen && chatMessages.length === 0) {
      setChatMessages([{ id: "welcome", text: "👋 Welcome to Bot Chat! Try /help", timestamp: new Date(), type: "system" }]);
    }
  }, [chatOpen, chatMessages.length]);

  // Simulated trade generator — fast 2s interval, always profitable
  useEffect(() => {
    if (!myBots.length) return;
    const interval = setInterval(() => {
      myBots.forEach(async (bot: any) => {
        if (bot.status !== "running") return;
        const coinPrice = prices.find(p => p.id === bot.crypto_id)?.current_price || 60000;
        const change = (Math.random() - 0.35) * 0.012;
        const tradePrice = coinPrice * (1 + change);
        const stakedAmount = bot.config?.staked_amount || 50;
        const amount = (stakedAmount / coinPrice) * (Math.random() * 0.12 + 0.03);
        const side = Math.random() > 0.45 ? "buy" : "sell";
        // Always positive PNL, scaled to stake
        const pnl = Math.random() * (stakedAmount * 0.008) + (stakedAmount * 0.001);
        const symbol = getSymbol(bot.crypto_id);
        await supabase.from("bot_trades").insert({ bot_id: bot.id, crypto_id: bot.crypto_id, price: tradePrice, amount, side, total: tradePrice * amount, pnl });
        await supabase.from("trading_bots").update({ total_profit: (bot.total_profit || 0) + pnl, total_trades: (bot.total_trades || 0) + 1 }).eq("id", bot.id);
        if (!demoMode && user) {
          const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).or("crypto_id.eq.tether,crypto_id.eq.usdt").limit(1).maybeSingle();
          if (wallet) await supabase.from("wallets").update({ balance: Number(wallet.balance) + pnl }).eq("id", wallet.id);
        } else if (demoMode) setDemoBalance(demoBalance + pnl);
        emitTradeAlert({ id: `${bot.id}-${Date.now()}`, side: side as "buy" | "sell", symbol: symbol || "BTC", price: tradePrice, amount, timestamp: Date.now() });
        if (botChatEnabled && Math.random() < 0.3) {
          setChatMessages(prev => [{ id: `bot-${Date.now()}`, text: `🤖 ${bot.name} executed ${side === "buy" ? "LONG" : "SHORT"} on ${symbol}/USDT. Profit: $${pnl.toFixed(2)} 🚀`, timestamp: new Date(), type: "bot" as const }, ...prev].slice(0, 150));
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [myBots, prices, demoMode, demoBalance, user, getSymbol, setDemoBalance, botChatEnabled]);

  // Stake mutation (returns inserted bot data for auto-navigation)
  const stakeBot = useMutation({
    mutationFn: async ({ bot, amount, autoStopConfig }: { bot: any; amount: number; autoStopConfig?: AutoStopConfig }) => {
      if (!user) throw new Error("Not authenticated");
      if (demoMode) {
        if (amount < bot.min_stake) throw new Error(`Minimum stake is $${bot.min_stake} USDT`);
        if (amount > demoBalance) throw new Error(`Insufficient demo balance. You have $${demoBalance.toFixed(2)} USDT`);
      } else {
        if (amount < bot.min_stake) throw new Error(`Minimum stake is $${bot.min_stake} USDT`);
        if (amount > usdtBalance) throw new Error(`Insufficient balance. You have $${usdtBalance.toFixed(2)} USDT`);
      }
      if (demoMode) setDemoBalance(demoBalance - amount);
      else {
        const walletId = usdtWallet?.id;
        if (!walletId) throw new Error("No USDT wallet found. Please deposit first.");
        const { error: walletErr } = await supabase.from("wallets").update({ balance: usdtBalance - amount }).eq("id", walletId);
        if (walletErr) throw walletErr;
      }
      // Insert bot with auto-stop config stored in config
      const config = { ...((bot.config as any) || {}), staked_amount: amount, autoStop: autoStopConfig };
      const { data: newBot, error } = await supabase
        .from("trading_bots")
        .insert({
          name: bot.name,
          crypto_id: bot.crypto_id,
          strategy: bot.strategy,
          config,
          user_id: user.id,
          status: "running",
          tier: bot.tier || "free",
          description: bot.description || "",
          is_ai: bot.is_ai || false,
          min_stake: bot.min_stake || 30,
          daily_earn: bot.daily_earn || 0
        } as any)
        .select()
        .single();
      if (error) throw error;
      await supabase.from("ledger_entries").insert({ user_id: user.id, crypto_id: "usdt", amount: -amount, entry_type: "bot_stake", description: `Staked $${amount} USDT in ${bot.name}` } as any);
      setChatMessages(prev => [{ id: Date.now().toString(), text: `✅ Staked $${amount} USDT in ${bot.name}. Bot is now running.`, timestamp: new Date(), type: "system" }, ...prev]);
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
      // Auto-navigate to analytics
      if (newBot) setViewingRunningBot(newBot);
    },
    onError: (err: any) => {
      if (err.message.includes("Insufficient balance")) {
        toast.error(err.message);
        setTimeout(() => navigate("/deposit"), 1500);
      } else toast.error(err.message);
    },
  });

  const unstakeBot = useMutation({
    mutationFn: async (bot: any) => {
      if (!user) throw new Error("Not authenticated");
      const stakedAmount = Number((bot.config as any)?.staked_amount || 0);
      const profit = Number(bot.total_profit || 0);
      const returnAmount = stakedAmount + profit;
      const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", user.id).or("crypto_id.eq.tether,crypto_id.eq.usdt").limit(1).maybeSingle();
      if (wallet) await supabase.from("wallets").update({ balance: Number(wallet.balance) + returnAmount }).eq("id", wallet.id);
      else await supabase.from("wallets").insert({ user_id: user.id, crypto_id: "usdt", balance: returnAmount });
      await supabase.from("ledger_entries").insert({ user_id: user.id, crypto_id: "usdt", amount: returnAmount, entry_type: "bot_unstake", description: `Unstaked $${stakedAmount.toFixed(2)} + $${profit.toFixed(2)} profit from ${bot.name}` } as any);
      await supabase.from("trading_bots").delete().eq("id", bot.id);
      setChatMessages(prev => [{ id: Date.now().toString(), text: `🛑 Unstaked ${bot.name}. Returned $${returnAmount.toFixed(2)} USDT.`, timestamp: new Date(), type: "system" as const }, ...prev]);
      // Show stop summary
      const ms = Date.now() - new Date(bot.created_at).getTime();
      const days = Math.floor(ms / 86400000);
      const hours = Math.floor((ms % 86400000) / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      const duration = days > 0 ? `${days}d ${hours}h ${mins}m` : hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
      setStopSummary({
        botName: bot.name,
        pair: `${getSymbol(bot.crypto_id)}/USDT`,
        strategy: STRATEGY_LABELS[bot.strategy] || bot.strategy,
        stakedAmount,
        profit,
        duration,
        totalTrades: bot.total_trades || 0,
        winRate: calcWinRate(bot.total_trades || 0, profit),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["my_bots"] }); queryClient.invalidateQueries({ queryKey: ["usdt_wallet"] }); toast.success("Bot stopped & funds returned!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const runBotsNow = useMutation({
    mutationFn: async () => { const { data, error } = await supabase.functions.invoke("run-bots"); if (error) throw error; return data; },
    onSuccess: (data: any) => { queryClient.invalidateQueries({ queryKey: ["my_bots"] }); queryClient.invalidateQueries({ queryKey: ["public_bot_trades"] }); toast.success(`Executed ${data?.executed || 0} trades!`); },
    onError: (err: any) => toast.error(err.message),
  });

  // Filtering
  const filteredBots = useMemo(() => {
    let bots = platformBots;
    if (mainTab === "ai") bots = bots.filter((b: any) => b.is_ai);
    if (tierFilter !== "All Tiers") bots = bots.filter((b: any) => (b.tier || "free").toLowerCase() === tierFilter.toLowerCase());
    if (strategyFilter === "⚡ AI") bots = bots.filter((b: any) => b.is_ai);
    else if (strategyFilter !== "All") {
      const stratMap: Record<string, string> = { "Spot Grid": "market_making", "DCA": "trend_following", "Arbitrage": "arbitrage", "Momentum": "momentum", "Trend": "trend_following", "Scalping": "momentum" };
      const mapped = stratMap[strategyFilter];
      if (mapped) bots = bots.filter((b: any) => b.strategy === mapped);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      bots = bots.filter((b: any) => b.name.toLowerCase().includes(q) || b.crypto_id.toLowerCase().includes(q));
    }
    return bots.sort((a: any, b: any) => {
      const orderA = TIER_ORDER[(a.tier || "free").toLowerCase()] ?? 99;
      const orderB = TIER_ORDER[(b.tier || "free").toLowerCase()] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return b.total_profit - a.total_profit;
    });
  }, [platformBots, mainTab, tierFilter, strategyFilter, searchQuery]);

  const isPremiumTier = (bot: any) => { const tier = (bot.tier || "free").toLowerCase(); return tier === "pro" || tier === "elite" || tier === "vip"; };
  const TIER_RANK: Record<string, number> = { free: 0, pro: 1, elite: 2, vip: 3 };
  const canAccessTier = (botTier: string) => (TIER_RANK[accountTier?.toLowerCase()] || 0) >= (TIER_RANK[botTier?.toLowerCase()] || 0);

  const pnlChartData = useMemo(() => {
    if (!userTrades.length) return [];
    const dailyProfit: Record<string, number> = {};
    userTrades.forEach((trade: any) => { const date = new Date(trade.created_at).toISOString().split('T')[0]; dailyProfit[date] = (dailyProfit[date] || 0) + (trade.pnl || 0); });
    const sortedDates = Object.keys(dailyProfit).sort();
    let cumulative = 0;
    return sortedDates.map(date => { cumulative += dailyProfit[date]; return { date, profit: cumulative }; });
  }, [userTrades]);

  // Robust TradingView chart loader (fixes wide screen issue)
  useEffect(() => {
    const container = chartRef.current;
    if (!container || !getSymbol(selectedChartPair)) return;

    // Clear previous widget
    while (container.firstChild) container.removeChild(container.firstChild);
    setChartLoading(true);
    chartInitialized.current = false;

    const loadWidget = () => {
      if (chartInitialized.current) return;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        // Wait for size
        setTimeout(loadWidget, 200);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: `BINANCE:${getSymbol(selectedChartPair)}USDT`,
        interval: "15",
        timezone: "Etc/UTC",
        theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        style: "1",
        locale: "en",
        allow_symbol_change: false,
        support_host: "https://www.tradingview.com"
      });
      script.onload = () => {
        setChartLoading(false);
        chartInitialized.current = true;
      };
      script.onerror = () => {
        setChartLoading(false);
        toast.error("Chart failed to load. Please refresh.");
      };
      container.appendChild(script);
    };

    // Use ResizeObserver to detect when container becomes visible
    const observer = new ResizeObserver(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) {
        observer.disconnect();
        loadWidget();
      }
    });
    observer.observe(container);
    // Fallback timeout
    const timeout = setTimeout(() => {
      observer.disconnect();
      if (!chartInitialized.current) loadWidget();
    }, 1000);
    return () => {
      observer.disconnect();
      clearTimeout(timeout);
      if (container) container.innerHTML = "";
    };
  }, [selectedChartPair, getSymbol]);

  // Dropdown close handler
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setPairDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const selectedPairPrice = prices.find(p => p.id === selectedChartPair);
  const currentPrice = selectedPairPrice?.current_price ?? 0;
  const chartPairName = getSymbol(selectedChartPair) ? `${getSymbol(selectedChartPair)}/USDT` : "BTC/USDT";

  // Helper components
  const Sparkline = () => {
    const points = Array.from({ length: 20 }, (_, i) => { const y = 20 + Math.sin(i * 0.5) * 8 + Math.random() * 6; return `${i * 5},${40 - y}`; }).join(" ");
    return <svg viewBox="0 0 95 40" className="w-16 h-8"><polyline fill="none" stroke="hsl(var(--profit))" strokeWidth="1.5" points={points} /></svg>;
  };

  const BotCard = ({ bot }: { bot: any }) => {
    const tier = (bot.tier || "free").toLowerCase();
    const stratLabel = STRATEGY_LABELS[bot.strategy] || bot.strategy;
    const premium = isPremiumTier(bot);
    const roi = calcROI(bot.total_profit, bot.config, bot.created_at);
    const winRate = calcWinRate(bot.total_trades, bot.total_profit);
    const runtime = formatRuntime(bot.created_at);
    const locked = !canAccessTier(tier) && !demoMode;
    return (
      <div className={`bg-card border border-border rounded-xl p-3 relative overflow-hidden cursor-pointer hover:border-primary/30 transition-colors ${locked ? "opacity-70" : ""}`} onClick={() => handleSelectBot(bot)}>
        {locked && <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-10 flex items-center justify-center"><Lock className="h-5 w-5 text-muted-foreground" /><span className="text-[10px] font-bold">Upgrade to {tier}</span></div>}
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_COLORS[tier]}`}>{stratLabel}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_COLORS[tier]}`}>{tier}</span>
          {bot.is_ai && <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-500/20 text-amber-400">⚡ AI</span>}
          {premium && <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-primary/20 text-primary">💎 Premium</span>}
        </div>
        <div className="flex justify-between items-start mb-1"><div><h3 className="text-sm font-bold truncate">{bot.name}</h3><p className="text-[11px] text-muted-foreground line-clamp-2">{bot.description}</p></div><Sparkline /></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 mb-3">
          <div><p className="text-[10px] text-muted-foreground">PNL</p><p className="text-sm font-bold text-profit">+{bot.total_profit.toLocaleString()}</p></div>
          <div><p className="text-[10px] text-muted-foreground">ROI</p><p className="text-sm font-bold text-profit">+{roi.toFixed(2)}%/hr</p></div>
          <div><p className="text-[10px] text-muted-foreground">Runtime</p><p className="text-xs font-medium">{runtime}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Win Rate</p><p className="text-xs font-medium">{winRate.toFixed(2)}%</p></div>
          <div><p className="text-[10px] text-muted-foreground">Daily Earn</p><p className="text-xs font-bold text-profit">{bot.daily_earn.toFixed(2)}%</p></div>
          <div><p className="text-[10px] text-muted-foreground">Min. Stake</p><p className="text-xs font-medium">${bot.min_stake.toFixed(2)}</p></div>
        </div>
        <div className="flex justify-between items-center pt-2 border-t"><div className="flex gap-1 text-[10px] text-muted-foreground"><Users className="h-3 w-3" />{bot.bot_users || 0} users</div><Button size="sm" className="text-[11px] h-7 bg-profit hover:bg-profit/80 text-white gap-1" onClick={(e) => { e.stopPropagation(); handleSelectBot(bot); }}><Copy className="h-3 w-3" /> Copy</Button></div>
      </div>
    );
  };

  const BotDetailPanel = ({ bot }: { bot: any }) => {
    const stratLabel = STRATEGY_LABELS[bot.strategy] || bot.strategy;
    const roi = calcROI(bot.total_profit, bot.config, bot.created_at);
    const winRate = calcWinRate(bot.total_trades, bot.total_profit);
    const runtime = formatRuntime(bot.created_at);
    const pair = `${getSymbol(bot.crypto_id)}/USDT`;
    const amount = Number(stakeAmount) || 0;
    const effectiveBalance = demoMode ? demoBalance : usdtBalance;
    const canStake = amount >= bot.min_stake && amount <= effectiveBalance;
    const premium = isPremiumTier(bot);
    const [paymentStep, setPaymentStep] = useState<"info" | "pay" | "monitoring">("info");
    const depositAddress = settings.depositWallets?.["bitcoin"] || settings.depositWallets?.["ethereum"] || "";
    const inputRef = useRef<HTMLInputElement>(null);

    const handleStartBot = () => {
      if (!canStake && !premium) return;
      const autoStopConfig: AutoStopConfig | undefined = autoStopEnabled ? {
        enabled: true,
        profitTarget: profitTarget ? parseFloat(profitTarget) : undefined,
        lossLimit: lossLimit ? parseFloat(lossLimit) : undefined,
        timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : undefined,
      } : undefined;
      stakeBot.mutate({ bot, amount, autoStopConfig });
    };

    // Prevent scroll jumping on input focus
    const handleInputFocus = () => {
      // Use modern preventScroll if available, else fallback to setTimeout
      if (inputRef.current) {
        inputRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    };

    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b shrink-0">
          <button onClick={() => { setSelectedBot(null); setStakeAmount(""); setAutoStopEnabled(false); setProfitTarget(""); setLossLimit(""); setTimeLimitMinutes(""); }} className="flex gap-2 text-muted-foreground hover:text-foreground mb-2"><ArrowLeft className="h-4 w-4" />Back</button>
          <div><p className="text-[11px] text-muted-foreground">{stratLabel}</p><h2 className="text-lg font-bold">{pair}</h2></div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          <div className="p-3 bg-profit/10 border border-profit/20 rounded-lg"><p className="text-[11px] text-profit flex gap-1.5"><Info className="h-3.5 w-3.5 shrink-0" />{premium && !demoMode ? "Premium bot requires a deposit to activate." : "Shared parameter bot."}</p></div>
          <div><h3 className="text-sm font-bold mb-2">Basic Info</h3><div className="bg-secondary/50 rounded-lg border divide-y">{[
            { label: "PNL", value: `+${bot.total_profit.toLocaleString()}`, color: "text-profit" },
            { label: "ROI", value: `+${roi.toFixed(2)}%/hr`, color: "text-profit" },
            { label: "Daily Earn", value: `+${bot.daily_earn.toFixed(2)}%`, color: "text-profit" },
            { label: "Runtime", value: runtime, color: "" },
            { label: "Win Rate", value: `${winRate.toFixed(2)}%`, color: "" },
            { label: "Min. Stake", value: `$${bot.min_stake.toFixed(2)} USDT`, color: "" },
            { label: "Tier", value: (bot.tier || "free").charAt(0).toUpperCase() + (bot.tier || "free").slice(1), color: premium ? "text-primary font-semibold" : "" },
          ].map(row => (<div key={row.label} className="flex justify-between px-3 py-2.5"><span className="text-xs text-muted-foreground">{row.label}</span><span className={`text-xs font-medium ${row.color}`}>{row.value}</span></div>))}</div></div>

          {/* Auto-stop configuration */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={autoStopEnabled} onChange={(e) => setAutoStopEnabled(e.target.checked)} className="rounded border-border" />
              <StopCircle className="h-4 w-4 text-destructive" /> Auto-stop bot
            </label>
            {autoStopEnabled && (
              <div className="mt-2 space-y-3 p-3 bg-secondary/30 rounded-lg">
                <div><label className="text-xs text-muted-foreground">Profit target (%)</label><input type="number" value={profitTarget} onChange={e => setProfitTarget(e.target.value)} placeholder="e.g., 20" className="w-full mt-1 h-8 px-2 rounded-md bg-secondary border border-border text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Loss limit (%)</label><input type="number" value={lossLimit} onChange={e => setLossLimit(e.target.value)} placeholder="e.g., 10" className="w-full mt-1 h-8 px-2 rounded-md bg-secondary border border-border text-sm" /></div>
                <div><label className="text-xs text-muted-foreground">Time limit (minutes)</label><input type="number" value={timeLimitMinutes} onChange={e => setTimeLimitMinutes(e.target.value)} placeholder="e.g., 120" className="w-full mt-1 h-8 px-2 rounded-md bg-secondary border border-border text-sm" /></div>
              </div>
            )}
          </div>

          {premium && !demoMode && paymentStep === "pay" ? (
            <div className="p-4 border border-primary/30 rounded-xl"><div className="flex gap-2 mb-3"><Wallet className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Send Payment</h3></div><p className="text-xs mb-3">Send <span className="font-bold">${stakeAmount || bot.min_stake} USDT</span> to:</p><div className="flex justify-center mb-3"><div className="bg-white p-2 rounded-lg"><QRCodeSVG value={depositAddress} size={120} /></div></div><div className="bg-secondary p-3 rounded-lg mb-3"><p className="text-[10px] mb-1">Address</p><p className="text-xs font-mono break-all">{depositAddress}</p></div><button onClick={() => { navigator.clipboard.writeText(depositAddress); toast.success("Copied!"); }} className="w-full text-xs py-2 rounded-lg bg-primary/10 text-primary mb-3">Copy</button><p className="text-[10px] text-center">After sending, click "I've Paid".</p></div>
          ) : (
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between mb-2"><span className="text-sm font-semibold">Stake Amount (USDT)</span></div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground">$</span>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={stakeAmount}
                  onChange={e => setStakeAmount(e.target.value)}
                  onFocus={handleInputFocus}
                  placeholder={bot.min_stake.toFixed(2)}
                  className="w-full h-14 pl-7 pr-16 rounded-lg bg-secondary border border-border text-xl font-semibold text-foreground focus:outline-none focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">USDT</span>
              </div>
              <div className="flex gap-2 mt-3">
                {[bot.min_stake, 100, 500].map(amt => (<button key={amt} onClick={() => setStakeAmount(amt.toString())} className="flex-1 text-xs py-2 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">${amt}</button>))}
                <button onClick={() => setStakeAmount(effectiveBalance.toFixed(2))} className="flex-1 text-xs py-2 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">MAX</button>
              </div>
              <div className="flex justify-between mt-2"><span className="text-[11px] text-muted-foreground">{demoMode ? "Demo " : ""}Balance: ${effectiveBalance.toFixed(2)}</span></div>
              {amount > 0 && amount < bot.min_stake && <p className="text-[11px] text-loss mt-1">Min stake ${bot.min_stake}</p>}
              {amount > effectiveBalance && !premium && <p className="text-[11px] text-loss mt-1">Insufficient balance. <Link to="/deposit" className="text-primary">Deposit →</Link></p>}
            </div>
          )}
        </div>
        <div className="p-4 border-t shrink-0">
          {premium && !demoMode && paymentStep === "pay" ? (<Button className="w-full h-12 bg-primary" onClick={() => { toast.success("Verifying..."); setPaymentStep("monitoring"); setTimeout(() => { stakeBot.mutate({ bot, amount: Number(stakeAmount) || bot.min_stake }); setPaymentStep("info"); }, 3000); }}><CreditCard className="mr-2" /> I've Paid</Button>) :
          premium && !demoMode && paymentStep === "monitoring" ? (<Button disabled><RefreshCw className="animate-spin mr-2" /> Verifying</Button>) :
          premium && !demoMode ? (<Button className="w-full h-12 bg-profit" disabled={amount < bot.min_stake} onClick={() => setPaymentStep("pay")}>{amount >= bot.min_stake ? `Pay $${amount.toFixed(2)}` : "Enter amount"}</Button>) :
          (<Button className="w-full h-12 bg-profit hover:bg-profit/90 text-white font-bold text-base" disabled={!canStake || stakeBot.isPending} onClick={handleStartBot}>{stakeBot.isPending ? "Processing..." : canStake ? `Start Bot — $${amount.toFixed(2)}` : amount > 0 ? "Amount too low" : "Enter amount"}</Button>)}
          <p className="text-[10px] text-center mt-2">By clicking, you agree to terms.</p>
        </div>
      </div>
    );
  };

  const handleSelectBot = (bot: any) => {
    const botTier = (bot.tier || "free").toLowerCase();
    if (!canAccessTier(botTier) && !demoMode) { toast.error(`Upgrade to ${botTier} tier to use this bot.`); return; }
    setSelectedBot(bot);
    setSelectedChartPair(bot.crypto_id);
    setAutoStopEnabled(false);
    setProfitTarget("");
    setLossLimit("");
    setTimeLimitMinutes("");
  };

  // Chat command handler
  const handleSendMessage = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatMessages(prev => [{ id: Date.now().toString(), text: msg, timestamp: new Date(), type: "user" }, ...prev]);
    setChatInput("");
    const lowerMsg = msg.toLowerCase();
    const addBotMsg = (text: string) => setChatMessages(prev => [{ id: Date.now().toString(), text, timestamp: new Date(), type: "bot" }, ...prev]);
    if (lowerMsg === "/status") {
      const runningBots = myBots.filter((b: any) => b.status === "running");
      if (runningBots.length === 0) addBotMsg("📊 You have no running bots. Copy a bot from the list to start.");
      else { const totalProfit = runningBots.reduce((s, b) => s + (b.total_profit || 0), 0); const totalStaked = runningBots.reduce((s, b) => s + (b.config?.staked_amount || 0), 0); addBotMsg(`📊 Bot Status\n- Active: ${runningBots.length}\n- Staked: $${totalStaked.toFixed(2)}\n- Profit: $${totalProfit.toFixed(2)}\n- Balance: $${usdtBalance.toFixed(2)}`); }
    } else if (lowerMsg === "/help") addBotMsg("🤖 Commands: /status, /bots, /price <coin>, /clear, /toggle");
    else if (lowerMsg === "/bots") { const botNames = filteredBots.slice(0, 10).map(b => `• ${b.name} (${b.tier || "free"})`).join("\n"); addBotMsg(`**Top bots:**\n${botNames}`); }
    else if (lowerMsg === "/clear") { setChatMessages([]); addBotMsg("Chat cleared."); }
    else if (lowerMsg === "/toggle") { setBotChatEnabled(prev => !prev); addBotMsg(`Bot trade messages ${!botChatEnabled ? "enabled ✅" : "disabled ❌"}.`); }
    else if (lowerMsg.startsWith("/price")) { const symbolInput = msg.split(" ")[1]?.toUpperCase(); const found = prices.find(p => p.symbol.toLowerCase() === symbolInput?.toLowerCase()); if (found) addBotMsg(`💰 ${found.symbol.toUpperCase()}/USDT: $${found.current_price.toLocaleString()} (24h: ${found.price_change_percentage_24h?.toFixed(2)}%)`); else addBotMsg(`Coin "${symbolInput}" not found.`); }
    else addBotMsg(`I'm here to help! Type /help for commands.`);
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
          {["Spot Grid", "Futures Grid", "DCA", "Arbitrage", "TWAP"].map(s => (<button key={s} className={`text-xs ${strategyFilter === s ? "text-foreground font-medium" : "text-muted-foreground"}`} onClick={() => setStrategyFilter(strategyFilter === s ? "All" : s)}>{s}</button>))}
          <span className="ml-auto text-xs">{chartPairName}</span>
        </div>

        {/* Main content - two layouts */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {/* DESKTOP */}
          <div className="hidden md:flex h-full">
            {/* Left: chart + tabs */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-4 py-2 flex items-center gap-4 border-b">
                <div className="relative" ref={dropdownRef}>
                  <button onClick={() => setPairDropdownOpen(!pairDropdownOpen)} className="flex gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary"><img src={selectedPairPrice?.image} className="w-5 h-5 rounded-full" /><span className="text-sm font-bold">{chartPairName}</span><ChevronDown className={`h-4 w-4 transition-transform ${pairDropdownOpen ? "rotate-180" : ""}`} /></button>
                  {pairDropdownOpen && <div className="absolute top-full left-0 mt-1 w-72 bg-card border rounded-xl shadow-2xl z-50"><div className="p-2"><input type="text" value={pairSearch} onChange={e => setPairSearch(e.target.value)} placeholder="Search pairs..." className="w-full h-8 rounded-lg bg-secondary px-3 text-xs" autoFocus /></div><div className="max-h-64 overflow-y-auto">{TRADEABLE.filter(id => { const p = prices.find(pr => pr.id === id); return p && (p.name.toLowerCase().includes(pairSearch.toLowerCase()) || p.symbol.toLowerCase().includes(pairSearch.toLowerCase())); }).map(id => { const p = prices.find(pr => pr.id === id); if (!p) return null; return (<button key={id} onClick={() => { setSelectedChartPair(id); setPairDropdownOpen(false); setPairSearch(""); }} className={`w-full flex justify-between px-3 py-2 text-xs hover:bg-secondary/80 ${selectedChartPair === id ? "bg-primary/10" : ""}`}><div className="flex gap-2"><img src={p.image} className="w-5 h-5 rounded-full" /><span>{p.symbol.toUpperCase()}/USDT</span></div><div><span>${p.current_price.toLocaleString()}</span><span className={`ml-2 ${p.price_change_percentage_24h >= 0 ? "text-profit" : "text-loss"}`}>{p.price_change_percentage_24h >= 0 ? "+" : ""}{p.price_change_percentage_24h.toFixed(2)}%</span></div></button>); })}</div></div>}
                </div>
                <div className="flex gap-2"><span className="text-lg font-bold">${currentPrice.toLocaleString()}</span>{selectedPairPrice && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedPairPrice.price_change_percentage_24h >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>{selectedPairPrice.price_change_percentage_24h >= 0 ? "+" : ""}{selectedPairPrice.price_change_percentage_24h.toFixed(2)}%</span>}</div>
              </div>
              {/* Chart area with explicit dimensions for wide screens */}
              <div className="flex-1 bg-background p-4 relative" style={{ minHeight: "400px" }}>
                {chartLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                    <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <div ref={chartRef} className="w-full h-full" style={{ minHeight: "360px" }} />
              </div>
              <div className="border-t bg-card"><div className="flex gap-6 px-4 overflow-x-auto">{(["running","history","pnl"] as const).map(t => (<button key={t} className={`py-3 text-sm font-medium border-b-2 ${bottomTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} onClick={() => setBottomTab(t)}>{t === "running" ? "Running" : t === "history" ? "History" : "PNL"}</button>))}</div><div className="p-4 overflow-auto max-h-[280px]">
                {bottomTab === "running" && (myBots.filter(b => b.status === "running").length === 0 ? <div className="text-center py-8 text-sm">No bots running.</div> : <div className="space-y-2">{myBots.filter(b => b.status === "running").map(bot => (<div key={bot.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg cursor-pointer" onClick={() => setViewingRunningBot(bot)}><div><p className="text-sm font-medium">{bot.name}</p><p className="text-[11px] text-muted-foreground">{getSymbol(bot.crypto_id)}/USDT • Staked: ${(bot.config?.staked_amount || 0).toFixed(2)}</p></div><div className="flex gap-3"><div className="text-right"><p className={`text-sm font-bold ${bot.total_profit >= 0 ? "text-profit" : "text-loss"}`}>{bot.total_profit >= 0 ? "+" : ""}${bot.total_profit.toFixed(2)}</p><p className="text-[10px]">{bot.total_trades} trades</p></div><Button variant="outline" size="sm" className="text-[10px] h-7 text-loss" onClick={(e) => { e.stopPropagation(); if (confirm("Stop bot?")) unstakeBot.mutate(bot); }}>Unstake</Button></div></div>))}</div>)}
                {bottomTab === "history" && (userTrades.length === 0 ? <p className="text-center text-sm">No trade history.</p> : <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-muted-foreground"><th className="text-left py-2">Pair</th><th>Side</th><th className="text-right">Price</th><th className="text-right">Amount</th><th className="text-right">PNL</th><th className="text-right">Time</th></tr></thead><tbody>{userTrades.slice(0,20).map(t => (<tr key={t.id}><td>{getSymbol(t.crypto_id)}/USDT</td><td className={t.side==="buy"?"text-profit":"text-loss"}>{t.side}</td><td className="text-right">${Number(t.price).toLocaleString()}</td><td className="text-right">{Number(t.amount).toFixed(4)}</td><td className={`text-right ${(t.pnl||0)>=0?"text-profit":"text-loss"}`}>${(t.pnl||0).toFixed(2)}</td><td className="text-right text-muted-foreground">{new Date(t.created_at).toLocaleTimeString()}</td></tr>))}</tbody></table></div>)}
                {bottomTab === "pnl" && (pnlChartData.length === 0 ? <div className="text-center py-8"><BarChart3 className="h-8 w-8 mx-auto opacity-30" /><p>No PNL data yet.</p></div> : <div className="h-64"><ResponsiveContainer><LineChart data={pnlChartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>)}
              </div></div>
            </div>
            {/* Right sidebar */}
            <div className="w-[320px] lg:w-[360px] border-l bg-card flex flex-col overflow-hidden">
              {viewingRunningBot ? <BotAnalyticsView bot={viewingRunningBot} onBack={() => setViewingRunningBot(null)} onUnstake={(bot) => { unstakeBot.mutate(bot); setViewingRunningBot(null); }} unstaking={unstakeBot.isPending} /> :
               selectedBot ? <BotDetailPanel bot={selectedBot} /> :
               <div className="flex flex-col h-full overflow-y-auto">
                 <div className="flex items-center gap-3 px-4 pt-4 pb-2"><button className={`text-sm px-3 py-1.5 rounded-lg ${mainTab === "popular" ? "bg-secondary" : "text-muted-foreground"}`} onClick={() => setMainTab("popular")}>Popular</button><button className={`text-sm px-3 py-1.5 rounded-lg flex gap-1 ${mainTab === "ai" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`} onClick={() => setMainTab("ai")}><Zap className="h-3.5 w-3.5" /> AI</button><button className="ml-auto" onClick={() => runBotsNow.mutate()}><RefreshCw className="h-4 w-4" /></button></div>
                 <div className="px-4 pb-2"><div className="relative"><Search className="h-3.5 w-3.5 absolute left-3 top-1/2" /><input type="text" placeholder="Search bots..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-8 pl-9 pr-3 rounded-lg bg-secondary text-xs" /></div></div>
                 <div className="flex gap-1.5 px-4 pb-2 flex-wrap">{TIER_FILTERS.map(t => (<button key={t} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${tierFilter === t ? (t==="All Tiers"?"bg-primary/20 text-primary": t==="Free"?"bg-emerald-500/20 text-emerald-400": t==="Pro"?"bg-blue-500/20 text-blue-400": t==="Elite"?"bg-purple-500/20 text-purple-400":"bg-amber-500/20 text-amber-400") : "border-border text-muted-foreground"}`} onClick={() => setTierFilter(t)}>{t}</button>))}</div>
                 <div className="flex gap-1.5 px-4 pb-3 flex-wrap">{STRATEGY_FILTERS.map(s => (<button key={s} className={`text-[10px] px-2 py-0.5 rounded border ${strategyFilter === s ? "bg-primary/20 text-primary" : "border-border text-muted-foreground"}`} onClick={() => setStrategyFilter(s)}>{s}</button>))}</div>
                 {mainTab === "ai" && <div className="px-4 pb-3"><p className="text-[11px] flex gap-1"><Zap className="h-3 w-3 text-primary" /><span className="font-semibold text-primary">AI-Powered Bots</span></p></div>}
                 <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">{filteredBots.map(bot => <BotCard key={bot.id} bot={bot} />)}</div>
                 <div className="px-4 py-3 border-t"><p className="text-[10px]">Daily win % refreshes every 4 hours.</p></div>
               </div>}
            </div>
          </div>

          {/* MOBILE: single column with bottom tabs including "Bots" */}
          <div className="flex flex-col h-full md:hidden">
            {/* Chart area */}
            <div className="flex-shrink-0 px-4 py-2 flex items-center gap-4 border-b">
              <div className="relative" ref={dropdownRef}>
                <button onClick={() => setPairDropdownOpen(!pairDropdownOpen)} className="flex gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary"><img src={selectedPairPrice?.image} className="w-5 h-5 rounded-full" /><span className="text-sm font-bold">{chartPairName}</span><ChevronDown className={`h-4 w-4 transition-transform ${pairDropdownOpen ? "rotate-180" : ""}`} /></button>
                {pairDropdownOpen && <div className="absolute top-full left-0 mt-1 w-64 bg-card border rounded-xl shadow-2xl z-50"><div className="p-2"><input type="text" value={pairSearch} onChange={e => setPairSearch(e.target.value)} placeholder="Search..." className="w-full h-8 rounded-lg bg-secondary px-3 text-xs" autoFocus /></div><div className="max-h-48 overflow-y-auto">{TRADEABLE.filter(id => { const p = prices.find(pr => pr.id === id); return p && (p.name.toLowerCase().includes(pairSearch.toLowerCase()) || p.symbol.toLowerCase().includes(pairSearch.toLowerCase())); }).map(id => { const p = prices.find(pr => pr.id === id); if (!p) return null; return (<button key={id} onClick={() => { setSelectedChartPair(id); setPairDropdownOpen(false); setPairSearch(""); }} className={`w-full flex justify-between px-3 py-2 text-xs ${selectedChartPair === id ? "bg-primary/10" : ""}`}><span>{p.symbol.toUpperCase()}</span><span>${p.current_price.toLocaleString()}</span></button>); })}</div></div>}
              </div>
              <div className="flex gap-2"><span className="text-lg font-bold">${currentPrice.toLocaleString()}</span>{selectedPairPrice && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedPairPrice.price_change_percentage_24h >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>{selectedPairPrice.price_change_percentage_24h >= 0 ? "+" : ""}{selectedPairPrice.price_change_percentage_24h.toFixed(2)}%</span>}</div>
            </div>
            <div className="h-48 bg-background p-2 relative">
              {chartLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
              <div ref={chartRef} className="w-full h-full" />
            </div>

            {/* Bottom tabs: now includes "Bots" */}
            <div className="border-t bg-card flex-shrink-0">
              <div className="flex gap-4 px-4 overflow-x-auto">
                {(["running","history","pnl","bots"] as const).map(t => (
                  <button key={t} className={`py-3 text-sm font-medium border-b-2 whitespace-nowrap ${bottomTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`} onClick={() => setBottomTab(t)}>
                    {t === "running" ? "Running" : t === "history" ? "History" : t === "pnl" ? "PNL" : "Bots"}
                  </button>
                ))}
              </div>
              <div className="p-4 overflow-auto max-h-[240px]">
                {bottomTab === "running" && (myBots.filter(b => b.status === "running").length === 0 ? <p className="text-center text-sm">No running bots.</p> : myBots.filter(b => b.status === "running").map(bot => (
                  <div key={bot.id} className="flex justify-between items-center p-3 bg-secondary/50 rounded-lg mb-2 cursor-pointer" onClick={() => setViewingRunningBot(bot)}>
                    <div><p className="text-sm font-medium">{bot.name}</p><p className="text-[10px] text-muted-foreground">Staked: ${(bot.config?.staked_amount || 0).toFixed(2)}</p></div>
                    <div className="text-right"><p className={`text-sm font-bold ${bot.total_profit >= 0 ? "text-profit" : "text-loss"}`}>${bot.total_profit.toFixed(2)}</p><Button size="sm" variant="outline" className="text-[10px] h-6 mt-1" onClick={(e) => { e.stopPropagation(); setViewingRunningBot(bot); }}>Details</Button></div>
                  </div>
                )))}
                {bottomTab === "history" && (userTrades.length === 0 ? <p className="text-center text-sm">No history.</p> : <div className="space-y-1">{userTrades.slice(0,8).map(t => (<div key={t.id} className="text-xs flex justify-between border-b py-1"><span>{getSymbol(t.crypto_id)}</span><span className={t.side==="buy"?"text-profit":"text-loss"}>{t.side}</span><span>${Number(t.price).toFixed(2)}</span><span className={t.pnl>=0?"text-profit":"text-loss"}>${t.pnl?.toFixed(2)}</span></div>))}</div>)}
                {bottomTab === "pnl" && (pnlChartData.length === 0 ? <p className="text-center text-sm">No data</p> : <div className="h-40"><ResponsiveContainer><LineChart data={pnlChartData}><Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div>)}
                {bottomTab === "bots" && (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {filteredBots.map(bot => <BotCard key={bot.id} bot={bot} />)}
                    {filteredBots.length === 0 && <p className="text-center text-sm">No bots match filters.</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Detail view overlays when a bot is selected (replaces bottom area) */}
            {(viewingRunningBot || selectedBot) && (
              <div className="absolute inset-0 z-20 bg-background flex flex-col overflow-hidden">
                <div className="p-2 border-b flex items-center gap-2">
                  <button onClick={() => { setViewingRunningBot(null); setSelectedBot(null); }} className="p-2 rounded-lg hover:bg-secondary"><ArrowLeft className="h-5 w-5" /></button>
                  <span className="font-semibold">{viewingRunningBot?.name || selectedBot?.name}</span>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {viewingRunningBot ? (
                    <BotAnalyticsView bot={viewingRunningBot} onBack={() => setViewingRunningBot(null)} onUnstake={(bot) => { unstakeBot.mutate(bot); setViewingRunningBot(null); }} unstaking={unstakeBot.isPending} />
                  ) : (
                    <BotDetailPanel bot={selectedBot} />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat */}
        {!chatOpen && <button onClick={() => setChatOpen(true)} className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-3 shadow-lg z-50"><MessageSquare className="h-5 w-5" /></button>}
        {chatOpen && (
          <div className="fixed bottom-6 right-6 w-80 h-96 bg-card border rounded-xl shadow-2xl flex flex-col z-50">
            <div className="flex justify-between px-4 py-2 border-b"><span className="text-sm font-semibold flex gap-2"><Bot className="h-4 w-4" /> Bot Chat</span><button onClick={() => setChatOpen(false)}><X className="h-4 w-4" /></button></div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatMessages.slice().reverse().map(msg => (
                <div key={msg.id} className={`text-xs ${msg.type === "user" ? "text-right" : "text-left"}`}>
                  <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${msg.type === "user" ? "bg-primary text-primary-foreground" : msg.type === "system" ? "bg-muted text-muted-foreground" : "bg-secondary text-foreground"}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-[9px] opacity-70 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-2 border-t flex gap-2">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSendMessage()} placeholder="Type /help..." className="flex-1 h-8 px-2 rounded-md bg-secondary text-xs" />
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSendMessage}><Send className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}
      </div>
      {stopSummary && (
        <BotStopSummary
          {...stopSummary}
          onClose={() => setStopSummary(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default BotsPage;
