import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useWallets } from "@/hooks/useWallets";
import { useOrders } from "@/hooks/useOrders";
import { useAppStore } from "@/stores/useAppStore";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ArrowUpDown } from "lucide-react";

// Types
interface BotTrade {
  id: string;
  crypto_id: string;
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  total: number;
  created_at: string;
}

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

// Constants
const TRADEABLE = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
  "cardano", "polkadot", "dogecoin", "avalanche-2", "chainlink",
  "litecoin", "tron", "stellar"
] as const;

const ANON_NAMES = [
  "Trader_8x2k", "whale_93", "anon_7fG", "degen_42",
  "sniper_0x", "moon_lfg", "alpha_v3", "hodl_xx",
  "bot_delta", "quant_77"
] as const;

// Helper: deterministic pseudo‑random (0..1)
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Helper: generate order book based on current price and coin seed
function generateDeterministicBook(price: number, coinSeed: number): {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
} {
  if (!price) return { asks: [], bids: [] };

  const asks = Array.from({ length: 10 }, (_, i) => {
    const spread = (i + 1) * price * 0.0008;
    const seed = coinSeed + i + 100;
    const askPrice = price + spread + seededRandom(seed) * price * 0.0003;
    const amount = 0.01 + seededRandom(seed + 1) * 4.99;
    return {
      price: askPrice,
      amount,
      total: askPrice * amount,
    };
  });

  const bids = Array.from({ length: 10 }, (_, i) => {
    const spread = (i + 1) * price * 0.0008;
    const seed = coinSeed + i + 200;
    const bidPrice = price - spread - seededRandom(seed) * price * 0.0003;
    const amount = 0.01 + seededRandom(seed + 1) * 4.99;
    return {
      price: bidPrice,
      amount,
      total: bidPrice * amount,
    };
  });

  return {
    asks: asks.reverse(),   // highest ask first
    bids,                   // highest bid first
  };
}

const SpotTradingPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedCoin, setSelectedCoin] = useState(searchParams.get("coin") ?? "bitcoin");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amount, setAmount] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState("");
  const [swapped, setSwapped] = useState(false);
  const [amountUnit, setAmountUnit] = useState<"base" | "quote">(() => {
    const saved = localStorage.getItem("orderBookAmountUnit");
    return saved === "quote" ? "quote" : "base";
  });
  const chartRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { prices, getSymbol } = useCryptoPrices(10000);
  const { getBalance, fetchWallets, loading: walletsLoading } = useWallets();
  const { orders, placeOrder, loading: ordersLoading } = useOrders(selectedCoin);
  const currency = useAppStore((s) => s.currency);
  const sym = currency === "inr" ? "₹" : "$";

  const selectedPrice = prices.find(p => p.id === selectedCoin);
  const currentPrice = selectedPrice?.current_price ?? 0;
  const symbol = getSymbol(selectedCoin);

  // Determine effective price (for limit orders)
  const effectivePrice = useMemo(() => {
    if (orderType === "limit") {
      const parsed = Number(limitPrice);
      return !isNaN(parsed) && parsed > 0 ? parsed : currentPrice;
    }
    return currentPrice;
  }, [orderType, limitPrice, currentPrice]);

  const total = (Number(amount) || 0) * effectivePrice;

  const usdtBalance = getBalance("usdt");
  const coinBalance = getBalance(selectedCoin);
  const baseSymbol = swapped ? "USDT" : symbol;
  const quoteSymbol = swapped ? symbol : "USDT";

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

  // Filter pairs based on search
  const filteredPairs = useMemo(() => {
    const q = pairSearch.toLowerCase();
    return TRADEABLE.filter(id => {
      const p = prices.find(pr => pr.id === id);
      if (!p) return false;
      return p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q);
    });
  }, [pairSearch, prices]);

  // Bot trades query
  const { data: botTrades = [] } = useQuery({
    queryKey: ["bot_trades", selectedCoin],
    queryFn: async (): Promise<BotTrade[]> => {
      const { data, error } = await supabase
        .from("bot_trades")
        .select("*")
        .eq("crypto_id", selectedCoin)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map((t: any) => ({ ...t, side: t.side as 'buy' | 'sell', price: Number(t.price), amount: Number(t.amount), total: Number(t.total) }));
    },
    refetchInterval: 15000,
  });

  // Cumulative PnL (reverse order for chart / display)
  const cumulativePNL = useMemo(() => {
    let pnl = 0;
    return botTrades
      .map(t => {
        const val = t.side === "buy" ? -Number(t.total) : Number(t.total);
        pnl += val;
        return { ...t, cumulativePNL: pnl };
      })
      .reverse();
  }, [botTrades]);

  // Deterministic order book
  const coinSeed = useMemo(
    () => selectedCoin.split("").reduce((a, c) => a + c.charCodeAt(0), 0),
    [selectedCoin]
  );
  const orderBook = useMemo(
    () => generateDeterministicBook(currentPrice, coinSeed),
    [currentPrice, coinSeed]
  );
  const maxAskAmount = Math.max(...orderBook.asks.map(a => a.amount), 1);
  const maxBidAmount = Math.max(...orderBook.bids.map(b => b.amount), 1);

  // Toggle amount unit and save to localStorage
  const toggleAmountUnit = useCallback(() => {
    setAmountUnit(prev => {
      const newUnit = prev === "base" ? "quote" : "base";
      localStorage.setItem("orderBookAmountUnit", newUnit);
      return newUnit;
    });
  }, []);

  // Chart embedding (cleanup on unmount or symbol change)
  useEffect(() => {
    if (!chartRef.current || !symbol) return;

    // Clear previous chart
    while (chartRef.current.firstChild) {
      chartRef.current.removeChild(chartRef.current.firstChild);
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}USDT`,
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
  }, [symbol]);

  // Percent button logic
  const applyPercent = useCallback(
    (pct: number) => {
      if (side === "buy") {
        if (effectivePrice <= 0) {
          toast.error("Invalid price for calculating amount");
          return;
        }
        if (swapped) {
          // Amount in USDT
          const val = usdtBalance * (pct / 100);
          setAmount(val.toFixed(2));
        } else {
          // Amount in coin
          const val = (usdtBalance * (pct / 100)) / effectivePrice;
          setAmount(val.toFixed(8));
        }
      } else {
        // sell
        if (swapped) {
          // Amount in USDT (sell coin, get USDT)
          const val = coinBalance * (pct / 100) * effectivePrice;
          setAmount(val.toFixed(2));
        } else {
          // Amount in coin
          const val = coinBalance * (pct / 100);
          setAmount(val.toFixed(8));
        }
      }
    },
    [side, swapped, usdtBalance, coinBalance, effectivePrice]
  );

  // Handle order submission
  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }

    if (orderType === "limit") {
      const priceNum = Number(limitPrice);
      if (!priceNum || priceNum <= 0) {
        toast.error("Limit order requires a valid positive price");
        return;
      }
    }

    if (side === "buy" && total > usdtBalance) {
      toast.error(`Insufficient USDT balance (${sym}${usdtBalance.toFixed(2)})`);
      return;
    }

    if (side === "sell" && amt > coinBalance) {
      toast.error(`Insufficient ${symbol} balance (${coinBalance.toFixed(8)} ${symbol})`);
      return;
    }

    setSubmitting(true);
    try {
      await placeOrder({
        crypto_id: selectedCoin,
        side,
        type: orderType,
        price: effectivePrice,
        amount: amt,
      });
      await fetchWallets();
      toast.success(
        `${side === "buy" ? "Bought" : "Sold"} ${amt.toFixed(8)} ${symbol} at ${sym}${effectivePrice.toLocaleString()}`
      );
      setAmount("");
      if (orderType === "limit") setLimitPrice("");
    } catch (err: any) {
      toast.error(err.message || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-0">
        {/* Pair selector header */}
        <div className="border-b border-border bg-card sticky top-0 z-10">
          <div className="container flex flex-wrap items-center gap-3 py-2 px-4">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setPairDropdownOpen(!pairDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors"
              >
                {selectedPrice && (
                  <img src={selectedPrice.image} alt="" className="w-5 h-5 rounded-full" />
                )}
                <span className="text-base font-bold text-foreground">{symbol}/USDT</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    pairDropdownOpen ? "rotate-180" : ""
                  }`}
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
                            setSelectedCoin(id);
                            setPairDropdownOpen(false);
                            setPairSearch("");
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-secondary/80 transition-colors ${
                            selectedCoin === id ? "bg-primary/10" : ""
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

            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-foreground tabular-nums">
                {sym}{currentPrice.toLocaleString()}
              </span>
              {selectedPrice && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    selectedPrice.price_change_percentage_24h >= 0
                      ? "bg-profit/10 text-profit"
                      : "bg-loss/10 text-loss"
                  }`}
                >
                  {selectedPrice.price_change_percentage_24h >= 0 ? "+" : ""}
                  {selectedPrice.price_change_percentage_24h.toFixed(2)}%
                </span>
              )}
            </div>

            {cumulativePNL.length > 0 && (
              <div className="ml-auto flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Cumulative PNL:</span>
                <span
                  className={`font-bold tabular-nums ${
                    cumulativePNL[cumulativePNL.length - 1]?.cumulativePNL >= 0
                      ? "text-profit"
                      : "text-loss"
                  }`}
                >
                  {cumulativePNL[cumulativePNL.length - 1]?.cumulativePNL >= 0 ? "+" : ""}$
                  {cumulativePNL[cumulativePNL.length - 1]?.cumulativePNL.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="container mt-4 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
            {/* Chart */}
            <div className="md:col-span-2 lg:col-span-6 bg-card border border-border rounded-xl overflow-hidden">
              <div ref={chartRef} className="h-[400px]" />
            </div>

            {/* Order Book */}
            <div className="md:col-span-1 lg:col-span-3 bg-card border border-border rounded-xl p-4 overflow-hidden">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Order Book
              </h3>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5 px-1">
                <span>Price ({sym})</span>
                <button
                  onClick={toggleAmountUnit}
                  className="hover:text-primary transition-colors focus:outline-none"
                >
                  Amount ({amountUnit === "base" ? symbol : "USDT"})
                </button>
                <span>Total ({sym})</span>
              </div>

              {/* Asks */}
              <div className="space-y-px mb-1">
                {orderBook.asks.map((ask, idx) => {
                  const quoteAmount = ask.amount * ask.price;
                  const displayAmount = amountUnit === "base" ? ask.amount : quoteAmount;
                  return (
                    <div
                      key={`ask-${idx}`}
                      className="relative flex justify-between text-xs py-0.5 px-1 rounded-sm"
                    >
                      <div
                        className="absolute inset-0 bg-loss/5 rounded-sm"
                        style={{
                          width: `${(ask.amount / maxAskAmount) * 100}%`,
                          right: 0,
                          left: "auto",
                        }}
                      />
                      <span className="relative text-loss font-medium tabular-nums">
                        {ask.price.toFixed(2)}
                      </span>
                      <span className="relative text-muted-foreground tabular-nums">
                        {displayAmount.toFixed(amountUnit === "base" ? 4 : 2)}
                      </span>
                      <span className="relative text-muted-foreground tabular-nums">
                        {ask.total.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Current price */}
              <div className="py-2 text-center border-y border-border my-1">
                <span className="text-base font-bold text-foreground tabular-nums">
                  {sym}{currentPrice.toLocaleString()}
                </span>
              </div>

              {/* Bids */}
              <div className="space-y-px mt-1">
                {orderBook.bids.map((bid, idx) => {
                  const quoteAmount = bid.amount * bid.price;
                  const displayAmount = amountUnit === "base" ? bid.amount : quoteAmount;
                  return (
                    <div
                      key={`bid-${idx}`}
                      className="relative flex justify-between text-xs py-0.5 px-1 rounded-sm"
                    >
                      <div
                        className="absolute inset-0 bg-profit/5 rounded-sm"
                        style={{
                          width: `${(bid.amount / maxBidAmount) * 100}%`,
                          right: 0,
                          left: "auto",
                        }}
                      />
                      <span className="relative text-profit font-medium tabular-nums">
                        {bid.price.toFixed(2)}
                      </span>
                      <span className="relative text-muted-foreground tabular-nums">
                        {displayAmount.toFixed(amountUnit === "base" ? 4 : 2)}
                      </span>
                      <span className="relative text-muted-foreground tabular-nums">
                        {bid.total.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Recent trades */}
              {botTrades.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                    Live Trades
                  </p>
                  {botTrades.slice(0, 8).map((trade, idx) => (
                    <div key={trade.id} className="flex justify-between text-[11px] py-0.5">
                      <span className="text-muted-foreground/70 w-16 truncate">
                        {ANON_NAMES[idx % ANON_NAMES.length]}
                      </span>
                      <span className={trade.side === "buy" ? "text-profit" : "text-loss"}>
                        {trade.side === "buy" ? "Long" : "Short"}
                      </span>
                      <span
                        className={`tabular-nums ${
                          trade.side === "buy" ? "text-profit" : "text-loss"
                        }`}
                      >
                        {Number(trade.price).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {Number(trade.amount).toFixed(4)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Form */}
            <div className="md:col-span-1 lg:col-span-3 bg-card border border-border rounded-xl p-4">
              <div className="flex rounded-lg overflow-hidden border border-border mb-4">
                <button
                  onClick={() => setSide("buy")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    side === "buy"
                      ? "bg-profit text-white"
                      : "bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Long
                </button>
                <button
                  onClick={() => setSide("sell")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    side === "sell"
                      ? "bg-loss text-white"
                      : "bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Short
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOrderType("market")}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                    orderType === "market"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType("limit")}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                    orderType === "limit"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Limit
                </button>
              </div>

              <div className="space-y-3">
                {orderType === "limit" && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Price ({sym})
                    </label>
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={e => setLimitPrice(e.target.value)}
                      placeholder={currentPrice.toString()}
                      className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                      step="any"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Amount</label>
                    <button
                      onClick={() => setSwapped(!swapped)}
                      className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                    >
                      <ArrowUpDown className="h-3 w-3" />
                      {swapped ? `Switch to ${symbol}` : "Switch to USDT"}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 rounded-lg bg-secondary border border-border px-3 pr-16 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                      step="any"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                      {swapped ? "USDT" : symbol}
                    </span>
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => applyPercent(pct)}
                        className="flex-1 text-[10px] py-1 rounded-md bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    Total ({sym})
                  </label>
                  <div className="w-full h-10 rounded-lg bg-secondary border border-border px-3 flex items-center text-sm text-muted-foreground tabular-nums">
                    {total > 0
                      ? `${sym}${total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}`
                      : `${sym}0.00`}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Available:{" "}
                  {side === "buy"
                    ? `${sym}${usdtBalance.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })} USDT`
                    : `${coinBalance.toFixed(8)} ${symbol}`}
                </p>

                <Button
                  variant={side === "buy" ? "cta" : "destructive"}
                  className="w-full h-11"
                  onClick={handleSubmit}
                  disabled={submitting || walletsLoading || ordersLoading}
                >
                  {submitting
                    ? "Processing..."
                    : `${side === "buy" ? "Long" : "Short"} ${symbol}`}
                </Button>
              </div>
            </div>
          </div>

          {/* Orders table - responsive overflow */}
          <div className="bg-card border border-border rounded-xl p-4 mt-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              Your Orders
            </h3>
            {orders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                No orders yet — place your first trade above
              </p>
            ) : (
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2">Position</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-right py-2">Total</th>
                    <th className="text-right py-2">Status</th>
                    <th className="text-right py-2">Date</th>
                   </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 20).map(order => (
                    <tr
                      key={order.id}
                      className="border-b border-border/50 hover:bg-secondary/30"
                    >
                      <td
                        className={`py-2 font-semibold ${
                          order.side === "buy" ? "text-profit" : "text-loss"
                        }`}
                      >
                        {order.side === "buy" ? "Long" : "Short"}
                      </td>
                      <td className="py-2 text-foreground capitalize">
                        {order.type}
                      </td>
                      <td className="py-2 text-right text-foreground tabular-nums">
                        {sym}
                        {order.price.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-foreground tabular-nums">
                        {order.amount.toFixed(6)}
                      </td>
                      <td className="py-2 text-right text-foreground tabular-nums">
                        {sym}
                        {order.total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td
                        className={`py-2 text-right font-medium ${
                          order.status === "filled"
                            ? "text-profit"
                            : order.status === "cancelled"
                            ? "text-loss"
                            : "text-primary"
                        }`}
                      >
                        {order.status}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SpotTradingPage;
