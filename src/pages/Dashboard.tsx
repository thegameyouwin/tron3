import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { TrendingUp, Bot, RefreshCw, MessageCircle, History, Wallet, ArrowDown, ArrowUp, Eye, EyeOff, Copy, Check, DollarSign, Rocket, Calendar, Zap, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useWallets } from "@/hooks/useWallets";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders } from "@/hooks/useOrders";
import { useTransactions } from "@/hooks/useTransactions";
import { useAppStore } from "@/stores/useAppStore";
import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import GlobalChat from "@/components/GlobalChat";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";

// Helper: generate portfolio history (store in localStorage)
const getPortfolioHistory = () => {
  const saved = localStorage.getItem("portfolio_history");
  if (saved) return JSON.parse(saved);
  const today = new Date();
  const history = [];
  let value = 0;
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    value = value + (Math.random() - 0.5) * 200;
    history.push({ date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: Math.max(100, value) });
  }
  return history;
};

const Dashboard = () => {
  const { prices, loading: pricesLoading, refetch, getSymbol } = useCryptoPrices();
  const { wallets, getBalance, fetchWallets } = useWallets();
  const { orders, placeOrder, loading: ordersLoading } = useOrders();
  const { transactions } = useTransactions();
  const { user } = useAuth();
  const currency = useAppStore((s) => s.currency);
  const sym = currency === "inr" ? "₹" : "$";
  const [chatOpen, setChatOpen] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [portfolioData, setPortfolioData] = useState(() => getPortfolioHistory());
  const [quickTradeCoin, setQuickTradeCoin] = useState("bitcoin");
  const [quickTradeAmount, setQuickTradeAmount] = useState("");
  const [quickTradeSide, setQuickTradeSide] = useState<"buy" | "sell">("buy");
  const [copySuccess, setCopySuccess] = useState(false);
  const [userBots, setUserBots] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch user's bots
  useEffect(() => {
    const fetchUserBots = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("trading_bots")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "running");
      if (!error && data) setUserBots(data);
    };
    fetchUserBots();
  }, [user]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Update portfolio history when balance changes
  useEffect(() => {
    const updateHistory = () => {
      const total = wallets.reduce((sum, w) => {
        const price = w.crypto_id === "usdt" ? 1 : (prices.find(p => p.id === w.crypto_id)?.current_price ?? 0);
        return sum + w.balance * price;
      }, 0);
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
      setPortfolioData(prev => {
        const last = prev[prev.length - 1];
        if (last.date === today) {
          const newData = [...prev];
          newData[newData.length - 1].value = total;
          localStorage.setItem("portfolio_history", JSON.stringify(newData));
          return newData;
        }
        const newData = [...prev, { date: today, value: total }];
        if (newData.length > 30) newData.shift();
        localStorage.setItem("portfolio_history", JSON.stringify(newData));
        return newData;
      });
    };
    if (wallets.length && prices.length) updateHistory();
  }, [wallets, prices]);

  const topCoins = useMemo(() => prices.slice(0, 8), [prices]);

  const totalValue = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const price = w.crypto_id === "usdt" ? 1 : (prices.find(p => p.id === w.crypto_id)?.current_price ?? 0);
      return sum + w.balance * price;
    }, 0);
  }, [wallets, prices]);

  const usdtBalance = getBalance("usdt");
  const inOrders = useMemo(() => orders.filter(o => o.status === "open").reduce((sum, o) => sum + o.total, 0), [orders]);
  const pendingOrdersCount = useMemo(() => orders.filter(o => o.status === "open").length, [orders]);
  const profileName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Trader";
  const recentTx = useMemo(() => transactions.slice(0, 5), [transactions]);

  // Calculate 24h profit/loss based on holdings
  const totalProfitLoss = useMemo(() => {
    let total = 0;
    wallets.forEach(w => {
      if (w.crypto_id === "usdt") return;
      const coin = prices.find(p => p.id === w.crypto_id);
      if (coin?.price_change_percentage_24h) {
        const value = w.balance * coin.current_price;
        total += value * (coin.price_change_percentage_24h / 100);
      }
    });
    return total;
  }, [wallets, prices]);

  // Quick trade data
  const selectedCoin = prices.find(p => p.id === quickTradeCoin);
  const quickTradeCoinPrice = selectedCoin?.current_price || 0;
  const quickTradeSymbol = getSymbol(quickTradeCoin);
  const quickTradeUsdtBalance = getBalance("usdt");
  const quickTradeCoinBalance = getBalance(quickTradeCoin);
  const quickTradeTotal = Number(quickTradeAmount) * quickTradeCoinPrice;

  const canQuickTrade = () => {
    if (!quickTradeAmount || Number(quickTradeAmount) <= 0) return false;
    if (quickTradeSide === "buy" && quickTradeTotal > quickTradeUsdtBalance) return false;
    if (quickTradeSide === "sell" && Number(quickTradeAmount) > quickTradeCoinBalance) return false;
    return true;
  };

  const handleQuickTrade = async () => {
    if (!canQuickTrade()) {
      toast.error(quickTradeSide === "buy" ? "Insufficient USDT balance" : "Insufficient coin balance");
      return;
    }
    try {
      await placeOrder({
        crypto_id: quickTradeCoin,
        side: quickTradeSide,
        type: "market",
        price: quickTradeCoinPrice,
        amount: Number(quickTradeAmount),
      });
      await fetchWallets();
      toast.success(`${quickTradeSide === "buy" ? "Bought" : "Sold"} ${quickTradeAmount} ${quickTradeSymbol}`);
      setQuickTradeAmount("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const displayBalance = (val: string) => balanceVisible ? val : "****";

  const referralLink = `${window.location.origin}/register?ref=${user?.user_metadata?.referral_code || "default"}`;
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
    toast.success("Referral link copied");
  };

  // Loading state for prices
  if (pricesLoading && prices.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Balance Hero */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <button onClick={() => setBalanceVisible(!balanceVisible)} className="text-muted-foreground hover:text-foreground p-1">
              {balanceVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-4xl font-display font-bold text-foreground mb-1 tabular-nums">
            {displayBalance(`${sym}${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)}
          </p>
          <div className="flex items-center gap-3 mb-4">
            <p className="text-sm text-muted-foreground">Welcome back, {profileName}</p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${totalProfitLoss >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>
              {totalProfitLoss >= 0 ? "+" : ""}{sym}{Math.abs(totalProfitLoss).toFixed(2)} (24h)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: "Available", value: `${sym}${usdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
              { label: "In Orders", value: `${sym}${inOrders.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
              { label: "Crypto", value: `${sym}${(totalValue - usdtBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
            ].map(s => (
              <div key={s.label} className="bg-secondary/50 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-sm font-semibold text-foreground tabular-nums">{displayBalance(s.value)}</p>
              </div>
            ))}
          </div>

          {/* Portfolio Chart */}
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={portfolioData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#portfolioGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-3">
          <Link to="/deposit" className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-full bg-profit/10 flex items-center justify-center mx-auto mb-2">
              <ArrowDown className="h-5 w-5 text-profit" />
            </div>
            <p className="text-xs font-medium text-foreground">Deposit</p>
          </Link>
          <Link to="/withdraw" className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <ArrowUp className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-medium text-foreground">Withdraw</p>
          </Link>
          <Link to="/spot-trading" className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-xs font-medium text-foreground">Trade</p>
          </Link>
          <Link to="/bots" className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-all">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
              <Bot className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-xs font-medium text-foreground">Bots</p>
          </Link>
        </div>

        {/* Quick Trade Form - with dropdown */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Quick Trade</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Coin Dropdown */}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Coin</label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full h-9 rounded-lg bg-secondary border border-border px-3 flex items-center justify-between text-sm text-foreground"
                >
                  <div className="flex items-center gap-2">
                    {selectedCoin?.image && <img src={selectedCoin.image} alt={quickTradeSymbol} className="w-4 h-4 rounded-full" />}
                    <span>{quickTradeSymbol}</span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                {dropdownOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {prices.map(coin => (
                      <button
                        key={coin.id}
                        onClick={() => {
                          setQuickTradeCoin(coin.id);
                          setDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors"
                      >
                        <img src={coin.image} alt={coin.name} className="w-4 h-4 rounded-full" />
                        <span className="font-medium text-foreground">{getSymbol(coin.id)}</span>
                        <span className="text-muted-foreground ml-auto">${coin.current_price.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Side</label>
              <div className="flex gap-2">
                <Button size="sm" variant={quickTradeSide === "buy" ? "cta" : "outline"} className="flex-1" onClick={() => setQuickTradeSide("buy")}>Buy</Button>
                <Button size="sm" variant={quickTradeSide === "sell" ? "destructive" : "outline"} className="flex-1" onClick={() => setQuickTradeSide("sell")}>Sell</Button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Amount ({quickTradeSymbol})</label>
              <input
                type="number"
                value={quickTradeAmount}
                onChange={e => setQuickTradeAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground"
              />
              {quickTradeCoinPrice > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">≈ ${(Number(quickTradeAmount) * quickTradeCoinPrice).toFixed(2)} USD</p>
              )}
            </div>
            <div className="flex items-end">
              <Button
                variant={quickTradeSide === "buy" ? "cta" : "destructive"}
                size="sm"
                className="w-full h-9"
                onClick={handleQuickTrade}
                disabled={!quickTradeAmount || ordersLoading}
              >
                {quickTradeSide === "buy" ? "Buy" : "Sell"} {quickTradeSymbol}
              </Button>
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {quickTradeSide === "buy" ? (
              <span>Available: {sym}{quickTradeUsdtBalance.toFixed(2)} USDT</span>
            ) : (
              <span>Available: {quickTradeCoinBalance.toFixed(6)} {quickTradeSymbol}</span>
            )}
          </div>
        </div>

        {/* Market Watchlist */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Market Watchlist</h2>
            <Link to="/markets" className="text-xs text-primary hover:underline">View All →</Link>
          </div>
          {pricesLoading && prices.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <div key={i} className="bg-secondary rounded-xl p-4 animate-pulse h-20" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {topCoins.map(c => (
                <Link key={c.id} to={`/spot-trading?coin=${c.id}`} className="bg-secondary/50 rounded-xl p-3 text-center hover:bg-primary/5 hover:border-primary/30 border border-transparent transition-all">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <img src={c.image} alt={c.name} className="w-5 h-5 rounded-full" />
                    <p className="text-sm font-semibold text-foreground">{getSymbol(c.id)}</p>
                  </div>
                  <p className="text-base font-bold text-foreground">{sym}{c.current_price.toLocaleString()}</p>
                  <p className={`text-xs font-medium ${c.price_change_percentage_24h >= 0 ? "text-profit" : "text-loss"}`}>
                    {c.price_change_percentage_24h >= 0 ? "+" : ""}{c.price_change_percentage_24h.toFixed(2)}%
                  </p>
                </Link>
              ))}
            </div>
          )}
          <Button variant="outline" size="sm" className="w-full gap-2 mt-4" onClick={refetch}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Pending Orders & Bot Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Orders */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><History className="h-4 w-4" /> Pending Orders</h2>
              <Link to="/spot-trading" className="text-xs text-primary hover:underline">View All →</Link>
            </div>
            {pendingOrdersCount === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No pending orders</p>
              </div>
            ) : (
              <div className="space-y-2">
                {orders.filter(o => o.status === "open").slice(0, 3).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{getSymbol(order.crypto_id)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{order.side} • {order.type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{order.amount.toFixed(4)} @ {sym}{order.price.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Total: {sym}{order.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bot Performance */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2"><Bot className="h-4 w-4" /> Your Bots</h2>
              <Link to="/bots" className="text-xs text-primary hover:underline">Manage →</Link>
            </div>
            {userBots.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-muted-foreground text-sm">No active bots. <Link to="/bots" className="text-primary">Start a bot</Link></p>
              </div>
            ) : (
              <div className="space-y-2">
                {userBots.slice(0, 3).map(bot => (
                  <div key={bot.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bot.name}</p>
                      <p className="text-xs text-muted-foreground">{getSymbol(bot.crypto_id)}/USDT • {bot.strategy}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${bot.total_profit >= 0 ? "text-profit" : "text-loss"}`}>
                        {bot.total_profit >= 0 ? "+" : ""}{sym}{bot.total_profit.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">{bot.total_trades} trades</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Holdings & Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Holdings */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4">Your Holdings</h2>
            {wallets.filter(w => w.balance > 0).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No holdings yet. Deposit funds to get started!</p>
                <Link to="/deposit"><Button variant="gold" size="sm" className="mt-3">Deposit Now</Button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {wallets.filter(w => w.balance > 0).map(w => {
                  const coin = prices.find(p => p.id === w.crypto_id);
                  const price = w.crypto_id === "usdt" ? 1 : (coin?.current_price ?? 0);
                  const change = coin?.price_change_percentage_24h ?? 0;
                  const usdValue = w.balance * price;
                  return (
                    <div key={w.crypto_id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-3">
                        {coin?.image && <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full" />}
                        <div>
                          <p className="text-sm font-semibold text-foreground">{w.crypto_id === "usdt" ? "USDT" : getSymbol(w.crypto_id)}</p>
                          <p className="text-xs text-muted-foreground">{w.balance.toFixed(w.crypto_id === "usdt" ? 2 : 6)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground tabular-nums">{displayBalance(`${sym}${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`)}</p>
                        <p className={`text-xs font-medium ${change >= 0 ? "text-profit" : "text-loss"}`}>
                          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          {recentTx.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground">Recent Activity</h2>
                <Link to="/transactions" className="text-xs text-primary hover:underline">View All →</Link>
              </div>
              <div className="space-y-2">
                {recentTx.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{tx.type} — {getSymbol(tx.crypto_id)}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{sym}{tx.usd_amount.toLocaleString()}</p>
                      <span className={`text-xs font-medium ${tx.status === "completed" ? "text-profit" : tx.status === "rejected" ? "text-loss" : "text-primary"}`}>{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Referral Link */}
        {user?.user_metadata?.referral_code && (
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2"><Rocket className="h-4 w-4" /> Invite Friends, Earn Rewards</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground"
              />
              <Button variant="goldOutline" size="sm" onClick={copyReferralLink} className="gap-1">
                {copySuccess ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copySuccess ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Share this link and earn 10% of your friends' trading fees!</p>
          </div>
        )}

        {/* Market Tip */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
          <Calendar className="h-4 w-4 text-primary mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Market Tip</p>
            <p>Dollar‑cost averaging (DCA) helps reduce volatility risk. Consider setting up a DCA bot for long‑term accumulation.</p>
          </div>
        </div>
      </div>
      {chatOpen && <GlobalChat onClose={() => setChatOpen(false)} />}
    </DashboardLayout>
  );
};

export default Dashboard;
