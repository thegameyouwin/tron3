import DashboardLayout from "@/components/DashboardLayout";
import BotAnalyticsView from "@/components/BotAnalyticsView";
import DemoModeBanner from "@/components/DemoModeBanner";
import DemoModeToggle from "@/components/DemoModeToggle";
import { Bot, Search, Zap, Lock, Copy, Users, RotateCw, RefreshCw, Clock, TrendingUp, Activity, BarChart3, ChevronLeft, ChevronDown, ArrowLeft, Info, MessageSquare, Send, X, Wallet, CreditCard } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/stores/useAppStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { QRCodeSVG } from "qrcode.react";

// List of tradeable pairs (same as SpotTradingPage)
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

// Helper to get the user's bot IDs
async function getUserBotIds(userId: string) {
  const { data } = await supabase
    .from("trading_bots")
    .select("id")
    .eq("user_id", userId);
  return (data || []).map(b => b.id);
}

// Chat message type
interface ChatMessage {
  id: string;
  text: string;
  timestamp: Date;
  type: "bot" | "user" | "system";
}

const BotsPage = () => {
  const { getSymbol, prices } = useCryptoPrices();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { demoMode, demoBalance, setDemoBalance } = useAppStore();
  const { settings } = useSiteSettings();
  const [mainTab, setMainTab] = useState<"popular" | "ai">("popular");
  const [searchQuery, setSearchQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("All Tiers");
  const [strategyFilter, setStrategyFilter] = useState("All");
  const [bottomTab, setBottomTab] = useState<"running" | "history" | "pnl">("running");
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [viewingRunningBot, setViewingRunningBot] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [showParams, setShowParams] = useState(false);
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState("");
  const [selectedChartPair, setSelectedChartPair] = useState("bitcoin");
  const chartRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Get current price info for selected chart pair
  const selectedPairPrice = prices.find(p => p.id === selectedChartPair);
  const currentPrice = selectedPairPrice?.current_price ?? 0;
  const chartSymbol = getSymbol(selectedChartPair);
  const chartPairName = chartSymbol ? `${chartSymbol}/USDT` : "BTC/USDT";

  // Filter pairs for dropdown
  const filteredPairs = useMemo(() => {
    const q = pairSearch.toLowerCase();
    return TRADEABLE.filter(id => {
      const p = prices.find(pr => pr.id === id);
      if (!p) return false;
      return p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q);
    });
  }, [pairSearch, prices]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPairDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Fetch USDT wallet balance
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

  const usdtBalance = Number(usdtWallet?.balance || 0);

  // Fetch all platform bots (user_id is null)
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

  // Fetch user's own bots (running & history)
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

  // Fetch recent trades for user's bots (for history)
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

  // Fetch all public trades for the activity feed (chat)
  const { data: publicTrades = [] } = useQuery({
    queryKey: ["public_bot_trades"],
    queryFn: async () => {
      const { data } = await supabase.from("bot_trades").select("*").order("created_at", { ascending: false }).limit(30);
      return data || [];
    },
    refetchInterval: 5000,
  });

  // Add a system message to the chat when a new trade occurs
  useEffect(() => {
    if (publicTrades.length === 0) return;
    const lastTrade = publicTrades[0];
    // Avoid duplicate messages: check if we already have a message with the same trade id
    if (!chatMessages.some(m => m.id === lastTrade.id)) {
      const symbol = getSymbol(lastTrade.crypto_id);
      const side = lastTrade.side === "buy" ? "Long" : "Short";
      const message: ChatMessage = {
        id: lastTrade.id,
        text: `🤖 Bot executed ${side} order on ${symbol}/USDT at $${Number(lastTrade.price).toFixed(2)}`,
        timestamp: new Date(lastTrade.created_at),
        type: "bot",
      };
      setChatMessages(prev => [message, ...prev].slice(0, 100));
    }
  }, [publicTrades, getSymbol, chatMessages]);

  // Add welcome message when chat opens first time
  useEffect(() => {
    if (chatOpen && chatMessages.length === 0) {
      setChatMessages([
        {
          id: "welcome",
          text: "👋 Welcome to Bot Chat! I'll notify you of trades and bot events. Type `/status` to see your current bot summary.",
          timestamp: new Date(),
          type: "system",
        },
      ]);
    }
  }, [chatOpen, chatMessages]);

  // Simulated trade generator for running bots
  useEffect(() => {
    if (!myBots.length) return;

    const interval = setInterval(() => {
      myBots.forEach(async (bot: any) => {
        if (bot.status !== "running") return;

        const price = currentPrice || 60000;

        // Random realistic movement
        const change = (Math.random() - 0.5) * 0.02; // ±2%
        const tradePrice = price * (1 + change);

        const stakedAmount = bot.config?.staked_amount || 50;
        const amount = (stakedAmount / price) * (Math.random() * 0.2 + 0.1);

        const side = Math.random() > 0.5 ? "buy" : "sell";

        // Simulated PNL (slightly biased profit)
        const pnl = (Math.random() - 0.4) * 5;

        // Insert trade
        await supabase.from("bot_trades").insert({
          bot_id: bot.id,
          crypto_id: bot.crypto_id,
          price: tradePrice,
          amount,
          side,
          total: tradePrice * amount,
          pnl,
        });

        // Update bot profit and trade count
        await supabase
          .from("trading_bots")
          .update({
            total_profit: (bot.total_profit || 0) + pnl,
            total_trades: (bot.total_trades || 0) + 1,
          })
          .eq("id", bot.id);
      });
    }, 8000); // every 8 sec

    return () => clearInterval(interval);
  }, [myBots, currentPrice]);

  // Stake bot mutation
  const stakeBot = useMutation({
    mutationFn: async ({ bot, amount }: { bot: any; amount: number }) => {
      if (!user) throw new Error("Not authenticated");
      if (demoMode) {
        if (amount < bot.min_stake) throw new Error(`Minimum stake is $${bot.min_stake} USDT`);
        if (amount > demoBalance) throw new Error(`Insufficient demo balance. You have $${demoBalance.toFixed(2)} USDT`);
      } else {
        if (amount < bot.min_stake) throw new Error(`Minimum stake is $${bot.min_stake} USDT`);
        if (amount > usdtBalance) throw new Error(`Insufficient balance. You have $${usdtBalance.toFixed(2)} USDT`);
      }

      if (demoMode) {
        setDemoBalance(demoBalance - amount);
      } else {
        const walletId = usdtWallet?.id;
        if (!walletId) throw new Error("No USDT wallet found. Please deposit first.");
        const { error: walletErr } = await supabase
          .from("wallets")
          .update({ balance: usdtBalance - amount })
          .eq("id", walletId);
        if (walletErr) throw walletErr;
      }

      const { error } = await supabase.from("trading_bots").insert({
        name: bot.name,
        crypto_id: bot.crypto_id,
        strategy: bot.strategy,
        config: { ...((bot.config as any) || {}), staked_amount: amount },
        user_id: user.id,
        status: "running",
        tier: bot.tier || "free",
        description: bot.description || "",
        is_ai: bot.is_ai || false,
        min_stake: bot.min_stake || 30,
        daily_earn: bot.daily_earn || 0,
      } as any);
      if (error) throw error;

      await supabase.from("ledger_entries").insert({
        user_id: user.id,
        crypto_id: "usdt",
        amount: -amount,
        entry_type: "bot_stake",
        description: `Staked $${amount} USDT in ${bot.name}`,
      } as any);

      // Add chat message about staking
      setChatMessages(prev => [
        {
          id: Date.now().toString(),
          text: `✅ Staked $${amount} USDT in ${bot.name}. Bot is now running.`,
          timestamp: new Date(),
          type: "system",
        },
        ...prev,
      ]);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my_bots"] });
      queryClient.invalidateQueries({ queryKey: ["usdt_wallet"] });
      toast.success("Bot started! Your stake is now active.");
      setSelectedBot(null);
      setStakeAmount("");
      // After a short delay to let the bot appear in my_bots, show it
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["my_bots"] }).then(() => {
          // The newest running bot will appear in the running list
        });
      }, 1000);
    },
    onError: (err: any) => {
      if (err.message.includes("Insufficient balance")) {
        toast.error(err.message);
        // Redirect to deposit page after a short delay
        setTimeout(() => navigate("/deposit"), 1500);
      } else {
        toast.error(err.message);
      }
    },
  });

  // Unstake bot mutation (stops the bot and returns funds)
  const unstakeBot = useMutation({
    mutationFn: async (bot: any) => {
      if (!user) throw new Error("Not authenticated");
      const stakedAmount = Number((bot.config as any)?.staked_amount || 0);
      const profit = Number(bot.total_profit || 0);
      const returnAmount = stakedAmount + profit;

      // Credit USDT wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .or("crypto_id.eq.tether,crypto_id.eq.usdt")
        .limit(1)
        .maybeSingle();

      if (wallet) {
        await supabase.from("wallets").update({ balance: Number(wallet.balance) + returnAmount }).eq("id", wallet.id);
      } else {
        await supabase.from("wallets").insert({ user_id: user.id, crypto_id: "usdt", balance: returnAmount });
      }

      // Ledger entry
      await supabase.from("ledger_entries").insert({
        user_id: user.id,
        crypto_id: "usdt",
        amount: returnAmount,
        entry_type: "bot_unstake",
        description: `Unstaked $${stakedAmount.toFixed(2)} + $${profit.toFixed(2)} profit from ${bot.name}`,
      } as any);

      // Delete the user's bot instance
      await supabase.from("trading_bots").delete().eq("id", bot.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my_bots"] });
      queryClient.invalidateQueries({ queryKey: ["usdt_wallet"] });
      toast.success("Bot stopped & funds returned to your USDT wallet!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const runBotsNow = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("run-bots");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["my_bots"] });
      queryClient.invalidateQueries({ queryKey: ["public_bot_trades"] });
      toast.success(`Executed ${data?.executed || 0} trades!`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Filtered bots with sorting: free bots first, then others
  const filteredBots = useMemo(() => {
    let bots = platformBots;
    if (mainTab === "ai") bots = bots.filter((b: any) => b.is_ai);
    if (tierFilter !== "All Tiers") bots = bots.filter((b: any) => (b.tier || "free").toLowerCase() === tierFilter.toLowerCase());
    if (strategyFilter === "⚡ AI") {
      bots = bots.filter((b: any) => b.is_ai);
    } else if (strategyFilter !== "All") {
      const stratMap: Record<string, string> = { "Spot Grid": "market_making", "DCA": "trend_following", "Arbitrage": "arbitrage", "Momentum": "momentum", "Trend": "trend_following", "Scalping": "momentum" };
      const mapped = stratMap[strategyFilter];
      if (mapped) bots = bots.filter((b: any) => b.strategy === mapped);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      bots = bots.filter((b: any) => b.name.toLowerCase().includes(q) || b.crypto_id.toLowerCase().includes(q));
    }
    return bots.sort((a: any, b: any) => {
      const tierA = (a.tier || "free").toLowerCase();
      const tierB = (b.tier || "free").toLowerCase();
      const orderA = TIER_ORDER[tierA] ?? 99;
      const orderB = TIER_ORDER[tierB] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return b.total_profit - a.total_profit;
    });
  }, [platformBots, mainTab, tierFilter, strategyFilter, searchQuery]);

  const isPremiumTier = (bot: any) => {
    const tier = (bot.tier || "free").toLowerCase();
    return tier === "pro" || tier === "elite" || tier === "vip";
  };

  // Prepare data for PNL chart
  const pnlChartData = useMemo(() => {
    if (!userTrades.length) return [];
    // Group trades by date (YYYY-MM-DD)
    const dailyProfit: Record<string, number> = {};
    userTrades.forEach((trade: any) => {
      const date = new Date(trade.created_at).toISOString().split('T')[0];
      const profit = (trade.pnl || 0);
      dailyProfit[date] = (dailyProfit[date] || 0) + profit;
    });
    // Sort dates and compute cumulative
    const sortedDates = Object.keys(dailyProfit).sort();
    let cumulative = 0;
    return sortedDates.map(date => {
      cumulative += dailyProfit[date];
      return { date, profit: cumulative };
    });
  }, [userTrades]);

  // TradingView chart embedding
  useEffect(() => {
    if (!chartRef.current || !chartSymbol) return;
    while (chartRef.current.firstChild) {
      chartRef.current.removeChild(chartRef.current.firstChild);
    }
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${chartSymbol}USDT`,
      interval: "15",
      timezone: "Etc/UTC",
      theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      support_host: "https://www.tradingview.com",
    });
    chartRef.current.appendChild(script);
    return () => {
      if (chartRef.current) {
        chartRef.current.innerHTML = "";
      }
    };
  }, [chartSymbol]);

  const handleSelectBot = (bot: any) => {
    setSelectedBot(bot);
    setSelectedChartPair(bot.crypto_id);
  };

  // Chat command handler
  const handleSendMessage = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    // Add user message
    setChatMessages(prev => [
      {
        id: Date.now().toString(),
        text: msg,
        timestamp: new Date(),
        type: "user",
      },
      ...prev,
    ]);
    setChatInput("");

    // Process commands
    if (msg === "/status") {
      const runningBots = myBots.filter((b: any) => b.status === "running");
      if (runningBots.length === 0) {
        setChatMessages(prev => [
          {
            id: (Date.now() + 1).toString(),
            text: "📊 You have no running bots. Copy a bot from the list to start.",
            timestamp: new Date(),
            type: "bot",
          },
          ...prev,
        ]);
      } else {
        const totalProfit = runningBots.reduce((sum, b) => sum + (b.total_profit || 0), 0);
        const totalStaked = runningBots.reduce((sum, b) => sum + (b.config?.staked_amount || 0), 0);
        const summary = `📊 **Bot Status**\n- Active bots: ${runningBots.length}\n- Total staked: $${totalStaked.toFixed(2)}\n- Total profit: $${totalProfit.toFixed(2)}\n- Current USDT balance: $${usdtBalance.toFixed(2)}`;
        setChatMessages(prev => [
          {
            id: (Date.now() + 1).toString(),
            text: summary,
            timestamp: new Date(),
            type: "bot",
          },
          ...prev,
        ]);
      }
    } else if (msg === "/help") {
      const helpText = "🤖 **Available commands**\n- `/status` – Show your bot summary\n- `/help` – Show this help\n- `/clear` – Clear chat";
      setChatMessages(prev => [
        {
          id: (Date.now() + 1).toString(),
          text: helpText,
          timestamp: new Date(),
          type: "bot",
        },
        ...prev,
      ]);
    } else if (msg === "/clear") {
      setChatMessages([]);
    } else {
      // Generic response
      setChatMessages(prev => [
        {
          id: (Date.now() + 1).toString(),
          text: `I'm listening! Type \`/help\` for commands. (Your message: "${msg}")`,
          timestamp: new Date(),
          type: "bot",
        },
        ...prev,
      ]);
    }
  };

  const BotCard = ({ bot }: { bot: any }) => {
    const tier = (bot.tier || "free").toLowerCase();
    const stratLabel = STRATEGY_LABELS[bot.strategy] || bot.strategy;
    const premium = isPremiumTier(bot);
    const roi = calcROI(bot.total_profit, bot.config, bot.created_at);
    const winRate = calcWinRate(bot.total_trades, bot.total_profit);
    const runtime = formatRuntime(bot.created_at);

    return (
      <div className="bg-card border border-border rounded-xl p-3 sm:p-4 relative overflow-hidden cursor-pointer hover:border-primary/30 transition-colors" onClick={() => handleSelectBot(bot)}>
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_COLORS[tier] || TIER_COLORS.free}`}>{stratLabel}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${TIER_COLORS[tier] || TIER_COLORS.free}`}>{tier.charAt(0).toUpperCase() + tier.slice(1)}</span>
          {bot.is_ai && <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-amber-500/20 text-amber-400 border-amber-500/30">⚡ AI</span>}
          {premium && <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-primary/20 text-primary border-primary/30">💎 Premium</span>}
          {bot.total_profit > 200000 && <span className="ml-auto text-[10px] bg-loss/20 text-loss px-1.5 py-0.5 rounded-full font-bold">🔥 Hot</span>}
        </div>
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground truncate">{bot.name}</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{bot.description}</p>
          </div>
          <Sparkline />
        </div>
        <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-2 mt-3 mb-3">
          <div><p className="text-[10px] text-muted-foreground">PNL (USD)</p><p className="text-sm font-bold text-profit">+{bot.total_profit.toLocaleString()}</p></div>
          <div><p className="text-[10px] text-muted-foreground">ROI</p><p className="text-sm font-bold text-profit">+{roi.toFixed(2)}%/hr</p></div>
          <div><p className="text-[10px] text-muted-foreground">Runtime</p><p className="text-xs font-medium text-foreground">{runtime}</p></div>
          <div><p className="text-[10px] text-muted-foreground">Win Rate</p><p className="text-xs font-medium text-foreground">{winRate.toFixed(2)}%</p></div>
          <div><p className="text-[10px] text-muted-foreground">Daily Earn</p><p className="text-xs font-bold text-profit">{bot.daily_earn.toFixed(2)}%</p></div>
          <div><p className="text-[10px] text-muted-foreground">Min. Stake</p><p className="text-xs font-medium text-foreground">${bot.min_stake.toFixed(2)} USDT</p></div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3" /><span>{(bot.bot_users || 0).toLocaleString()} users</span><span className="mx-1">•</span><span>{bot.runs || 0} runs</span>
          </div>
          <Button size="sm" className="text-[11px] h-7 bg-profit hover:bg-profit/80 text-white gap-1" onClick={(e) => { e.stopPropagation(); handleSelectBot(bot); }}>
            <Copy className="h-3 w-3" /> Copy
          </Button>
        </div>
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

    return (
      <div className="flex flex-col h-full">
        <div className="px-3 sm:px-4 pt-4 pb-3 border-b border-border">
          <button onClick={() => { setSelectedBot(null); setStakeAmount(""); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs">Back to bots</span>
          </button>
          <div className="flex items-center gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">~ {stratLabel}</p>
              <h2 className="text-lg font-bold text-foreground">{pair}</h2>
            </div>
            {premium && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-primary/20 text-primary border-primary/30 ml-auto">💎 {(bot.tier || "pro").charAt(0).toUpperCase() + (bot.tier || "pro").slice(1)}</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-3 sm:mx-4 mt-3 p-3 bg-profit/10 border border-profit/20 rounded-lg">
            <p className="text-[11px] text-profit flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {premium && !demoMode
                ? "Premium bot requires a deposit to activate. Pay the stake amount to start."
                : "You are using a shared parameter. As market condition changes, bot may auto-adjust strategy within set range."}
            </p>
          </div>

          <div className="mx-3 sm:mx-4 mt-4">
            <h3 className="text-sm font-bold text-foreground mb-2">Basic Info</h3>
            <div className="bg-secondary/50 rounded-lg border border-border divide-y divide-border">
              {[
                { label: "PNL (USD)", value: `+${bot.total_profit.toLocaleString()}`, color: "text-profit" },
                { label: "ROI", value: `+${roi.toFixed(2)}%/hr`, color: "text-profit" },
                { label: "Daily Earn", value: `+${bot.daily_earn.toFixed(2)}%`, color: "text-profit" },
                { label: "Runtime", value: runtime, color: "text-foreground" },
                { label: "Win Rate", value: `${winRate.toFixed(2)}%`, color: "text-foreground" },
                { label: "Min. Stake", value: `$${bot.min_stake.toFixed(2)} USDT`, color: "text-foreground" },
                { label: "Tier", value: (bot.tier || "free").charAt(0).toUpperCase() + (bot.tier || "free").slice(1), color: premium ? "text-primary font-semibold" : "text-foreground" },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-xs text-muted-foreground">{row.label}</span>
                  <span className={`text-xs font-medium ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Premium Payment Flow */}
          {premium && !demoMode && paymentStep === "pay" ? (
            <div className="mx-3 sm:mx-4 mt-4 mb-4">
              <div className="bg-card border border-primary/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wallet className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Send Payment</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Send <span className="text-foreground font-bold">${stakeAmount || bot.min_stake} USDT</span> to the wallet below to activate your premium bot.
                </p>
                <div className="flex justify-center mb-3">
                  <div className="bg-white p-2 rounded-lg">
                    <QRCodeSVG value={depositAddress} size={120} />
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3 mb-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Deposit Address</p>
                  <p className="text-xs text-foreground font-mono break-all">{depositAddress}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(depositAddress);
                    toast.success("Address copied!");
                  }}
                  className="w-full text-xs py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors mb-3"
                >
                  Copy Address
                </button>
                <p className="text-[10px] text-muted-foreground text-center">
                  After sending, click "I've Paid" below. Our system will verify the transaction.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-3 sm:mx-4 mt-2 mb-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">Stake Amount</span>
                  <span className="text-xs text-muted-foreground">USDT</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <input
                    type="number"
                    value={stakeAmount}
                    onChange={e => setStakeAmount(e.target.value)}
                    placeholder={bot.min_stake.toFixed(2)}
                    className="w-full h-12 pl-7 pr-16 rounded-lg bg-secondary border border-border text-lg font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">USDT</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {[bot.min_stake, 100, 500].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setStakeAmount(amt.toString())}
                      className="flex-1 text-xs py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      ${amt}
                    </button>
                  ))}
                  <button
                    onClick={() => setStakeAmount(effectiveBalance.toFixed(2))}
                    className="flex-1 text-xs py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-muted-foreground">
                    {demoMode ? "Demo " : ""}Balance: <span className="text-foreground font-medium">${effectiveBalance.toFixed(2)}</span> USDT
                  </span>
                </div>
                {amount > 0 && amount < bot.min_stake && (
                  <p className="text-[11px] text-loss mt-1">Minimum stake is ${bot.min_stake.toFixed(2)} USDT</p>
                )}
                {amount > effectiveBalance && !premium && (
                  <p className="text-[11px] text-loss mt-1">Insufficient balance. <Link to="/deposit" className="text-primary hover:underline">Deposit →</Link></p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 border-t border-border">
          {premium && !demoMode && paymentStep === "pay" ? (
            <Button
              className="w-full h-12 text-sm font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
              onClick={() => {
                toast.success("Payment verification started. Bot will activate once confirmed.");
                setPaymentStep("monitoring");
                // In production, this would create a deposit_monitor and poll
                setTimeout(() => {
                  stakeBot.mutate({ bot, amount: Number(stakeAmount) || bot.min_stake });
                  setPaymentStep("info");
                }, 3000);
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" /> I've Paid — Verify & Start Bot
            </Button>
          ) : premium && !demoMode && paymentStep === "monitoring" ? (
            <Button className="w-full h-12 text-sm font-bold rounded-lg" disabled>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Verifying payment...
            </Button>
          ) : premium && !demoMode ? (
            <Button
              className="w-full h-12 text-sm font-bold bg-profit hover:bg-profit/90 text-white rounded-lg disabled:opacity-50"
              disabled={amount < bot.min_stake}
              onClick={() => setPaymentStep("pay")}
            >
              {amount >= bot.min_stake ? `Pay $${amount.toFixed(2)} to Activate` : "Enter Stake Amount"}
            </Button>
          ) : (
            <Button
              className="w-full h-12 text-sm font-bold bg-profit hover:bg-profit/90 text-white rounded-lg disabled:opacity-50"
              disabled={!canStake || stakeBot.isPending}
              onClick={() => stakeBot.mutate({ bot, amount })}
            >
              {stakeBot.isPending ? "Processing..." : canStake ? "Sign Terms & Start Bot" : amount > effectiveBalance ? "Insufficient Balance" : "Enter Stake Amount"}
            </Button>
          )}
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            By clicking, you agree to the bot's terms. Staked funds will be managed by the bot strategy.
          </p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <DemoModeBanner />
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
        {/* Top nav bar */}
        <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-card text-sm overflow-x-auto whitespace-nowrap">
          <Link to="/dashboard" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-1 text-foreground font-semibold">
            <Bot className="h-4 w-4" /> Trading Bots
          </div>
          <DemoModeToggle />
          {["Spot Grid", "Futures Grid", "DCA", "Arbitrage", "TWAP"].map(s => (
            <button key={s} className={`text-xs whitespace-nowrap transition-colors ${strategyFilter === s ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setStrategyFilter(strategyFilter === s ? "All" : s)}>{s}</button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{chartPairName}</span>
        </div>

        {/* Main content area: left chart + bottom tabs, right sidebar */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left side: chart area and bottom tabs */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Chart header with pair selector */}
            <div className="px-4 py-2 flex items-center gap-4 border-b border-border">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  {selectedPairPrice && (
                    <img src={selectedPairPrice.image} alt="" className="w-5 h-5 rounded-full" />
                  )}
                  <span className="text-sm font-bold text-foreground">{chartPairName}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${pairDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {pairDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
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
                    <div className="max-h-64 overflow-y-auto">
                      {filteredPairs.map(id => {
                        const p = prices.find(pr => pr.id === id);
                        if (!p) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              setSelectedChartPair(id);
                              setPairDropdownOpen(false);
                              setPairSearch("");
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary/80 transition-colors ${
                              selectedChartPair === id ? "bg-primary/10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <img src={p.image} alt="" className="w-5 h-5 rounded-full" />
                              <span className="font-medium text-foreground">
                                {getSymbol(id)}/USDT
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-foreground font-medium">
                                ${p.current_price.toLocaleString()}
                              </span>
                              <span
                                className={`ml-2 ${
                                  p.price_change_percentage_24h >= 0
                                    ? "text-profit"
                                    : "text-loss"
                                }`}
                              >
                                {p.price_change_percentage_24h >= 0 ? "+" : ""}
                                {p.price_change_percentage_24h.toFixed(2)}%
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground tabular-nums">
                  ${currentPrice.toLocaleString()}
                </span>
                {selectedPairPrice && (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      selectedPairPrice.price_change_percentage_24h >= 0
                        ? "bg-profit/10 text-profit"
                        : "bg-loss/10 text-loss"
                    }`}
                  >
                    {selectedPairPrice.price_change_percentage_24h >= 0 ? "+" : ""}
                    {selectedPairPrice.price_change_percentage_24h.toFixed(2)}%
                  </span>
                )}
              </div>
            </div>

            {/* Chart area - takes available space but ensures bottom tabs are visible */}
            <div className="flex-1 min-h-0 bg-background p-4">
              <div ref={chartRef} className="w-full h-full min-h-[300px]" />
            </div>

            {/* Bottom tabs - always visible */}
            <div className="border-t border-border bg-card flex-shrink-0">
              <div className="flex gap-6 px-4 overflow-x-auto">
                {(["running", "history", "pnl"] as const).map(t => (
                  <button key={t} className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${bottomTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`} onClick={() => setBottomTab(t)}>
                    {t === "running" ? "Running" : t === "history" ? "History" : "PNL Analysis"}
                  </button>
                ))}
              </div>
              <div className="p-4 overflow-auto max-h-[280px]">
                {bottomTab === "running" && (
                  <div>
                    {myBots.filter((b: any) => b.status === "running").length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No bots running. Copy a bot to get started.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {myBots.filter((b: any) => b.status === "running").map((bot: any) => {
                          const staked = Number((bot.config as any)?.staked_amount || 0);
                          const profit = Number(bot.total_profit || 0);
                          return (
                            <div key={bot.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border gap-2 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setViewingRunningBot(bot)}>
                              <div>
                                <p className="text-sm font-medium text-foreground">{bot.name}</p>
                                <p className="text-[11px] text-muted-foreground">{getSymbol(bot.crypto_id)}/USDT • Staked: ${staked.toFixed(2)}</p>
                              </div>
                              <div className="flex items-center justify-between sm:justify-end gap-3">
                                <div className="text-right">
                                  <p className={`text-sm font-bold ${profit >= 0 ? "text-profit" : "text-loss"}`}>{profit >= 0 ? "+" : ""}${profit.toFixed(2)}</p>
                                  <p className="text-[10px] text-muted-foreground">{bot.total_trades} trades</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-[10px] h-7 text-loss border-loss/30 hover:bg-loss/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Stop bot and withdraw $${(staked + profit).toFixed(2)} USDT?`)) {
                                      unstakeBot.mutate(bot);
                                    }
                                  }}
                                  disabled={unstakeBot.isPending}
                                >
                                  {unstakeBot.isPending ? "..." : "Unstake"}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                {bottomTab === "history" && (
                  <div className="overflow-x-auto">
                    {userTrades.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-8">No trade history yet.</p>
                    ) : (
                      <table className="w-full text-xs min-w-[500px]">
                        <thead><tr className="text-muted-foreground border-b border-border"><th className="text-left py-2">Pair</th><th className="text-left py-2">Position</th><th className="text-right py-2">Price</th><th className="text-right py-2">Amount</th><th className="text-right py-2">PNL</th><th className="text-right py-2">Time</th>   </tr></thead>
                        <tbody>
                          {userTrades.slice(0, 20).map((t: any) => (
                            <tr key={t.id} className="border-b border-border/30">
                              <td className="py-1.5 text-foreground">{getSymbol(t.crypto_id)}/USDT</td>
                              <td className={`py-1.5 font-medium ${t.side === "buy" ? "text-profit" : "text-loss"}`}>{t.side === "buy" ? "Long" : "Short"}</td>
                              <td className="py-1.5 text-right text-foreground">${Number(t.price).toLocaleString()}</td>
                              <td className="py-1.5 text-right text-foreground">{Number(t.amount).toFixed(4)}</td>
                              <td className={`py-1.5 text-right ${(t.pnl || 0) >= 0 ? "text-profit" : "text-loss"}`}>${(t.pnl || 0).toFixed(2)}</td>
                              <td className="py-1.5 text-right text-muted-foreground">{new Date(t.created_at).toLocaleTimeString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                {bottomTab === "pnl" && (
                  <div>
                    {pnlChartData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No PNL data available yet. Start a bot to see your profit over time.</p>
                      </div>
                    ) : (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={pnlChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" tick={{ fill: "#888" }} />
                            <YAxis tick={{ fill: "#888" }} />
                            <Tooltip
                              contentStyle={{ backgroundColor: "#1f1f1f", border: "1px solid #333" }}
                              labelStyle={{ color: "#fff" }}
                            />
                            <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar - shows on all screens; on mobile shows as full width when bot selected */}
          <div className={`${viewingRunningBot || selectedBot ? "flex w-full md:w-[320px] lg:w-[360px]" : "hidden md:flex w-[320px] lg:w-[360px]"} border-l border-border bg-card flex-col overflow-hidden shrink-0`}>
            {viewingRunningBot ? (
              <BotAnalyticsView
                bot={viewingRunningBot}
                onBack={() => setViewingRunningBot(null)}
                onUnstake={(bot) => {
                  unstakeBot.mutate(bot);
                  setViewingRunningBot(null);
                }}
                unstaking={unstakeBot.isPending}
              />
            ) : selectedBot ? (
              <BotDetailPanel bot={selectedBot} />
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <button className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${mainTab === "popular" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setMainTab("popular")}>Popular</button>
                  <button className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${mainTab === "ai" ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:text-foreground"}`} onClick={() => setMainTab("ai")}><Zap className="h-3.5 w-3.5" /> AI</button>
                  <button className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => runBotsNow.mutate()} disabled={runBotsNow.isPending}>
                    <RefreshCw className={`h-4 w-4 ${runBotsNow.isPending ? "animate-spin" : ""}`} />
                  </button>
                </div>

                <div className="px-4 pb-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input type="text" placeholder="Search bots by name, pair or type..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-8 pl-9 pr-3 rounded-lg bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="flex gap-1.5 px-4 pb-2 flex-wrap overflow-x-auto">
                  {TIER_FILTERS.map(t => (
                    <button key={t} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${tierFilter === t ? t === "All Tiers" ? "bg-primary/20 text-primary border-primary/30" : t === "Free" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : t === "Pro" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : t === "Elite" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" : "bg-amber-500/20 text-amber-400 border-amber-500/30" : "border-border text-muted-foreground hover:text-foreground"}`} onClick={() => setTierFilter(t)}>{t}</button>
                  ))}
                </div>

                <div className="flex gap-1.5 px-4 pb-3 flex-wrap overflow-x-auto">
                  {STRATEGY_FILTERS.map(s => (
                    <button key={s} className={`text-[10px] font-medium px-2 py-0.5 rounded border transition-colors whitespace-nowrap ${strategyFilter === s ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground"}`} onClick={() => setStrategyFilter(s)}>{s}</button>
                  ))}
                </div>

                {mainTab === "ai" && (
                  <div className="px-4 pb-3">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Zap className="h-3 w-3 text-primary" /><span className="font-semibold text-primary">AI-Powered Bots</span> — neural signal trading across all tiers
                    </p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                  {filteredBots.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">No bots found.</p>
                  ) : (
                    filteredBots.map((bot: any) => <BotCard key={bot.id} bot={bot} />)
                  )}
                </div>

                <div className="px-4 py-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3 text-primary" /> Daily win % refreshes every 4 hours. Results credited to wallet.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Chat Button & Panel - ensure it's above all content and responsive */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:bg-primary/90 transition-all z-50"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
      )}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bot className="h-4 w-4" /> Bot Chat
            </span>
            <button onClick={() => setChatOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.slice().reverse().map(msg => (
              <div key={msg.id} className={`text-xs ${msg.type === "user" ? "text-right" : "text-left"}`}>
                <div className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                  msg.type === "user" ? "bg-primary text-primary-foreground" :
                  msg.type === "system" ? "bg-muted text-muted-foreground" :
                  "bg-secondary text-foreground"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className="text-[9px] opacity-70 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendMessage()}
              placeholder="Type /help for commands..."
              className="flex-1 h-8 px-2 rounded-md bg-secondary text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleSendMessage}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

function Sparkline() {
  const points = Array.from({ length: 20 }, (_, i) => {
    const y = 20 + Math.sin(i * 0.5) * 8 + Math.random() * 6;
    return `${i * 5},${40 - y}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 95 40" className="w-16 h-8">
      <polyline fill="none" stroke="hsl(var(--profit))" strokeWidth="1.5" points={points} />
    </svg>
  );
}

export default BotsPage;
