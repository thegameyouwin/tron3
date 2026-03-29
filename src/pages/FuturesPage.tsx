import DashboardLayout from "@/components/DashboardLayout";
import DemoModeBanner from "@/components/DemoModeBanner";
import DemoModeToggle from "@/components/DemoModeToggle";
import TradePopup, { emitTradeAlert } from "@/components/TradePopup";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useWallets } from "@/hooks/useWallets";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ArrowUpDown } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";

// List of tradeable pairs
const TRADEABLE = [
  "bitcoin", "ethereum", "solana", "binancecoin", "ripple",
  "cardano", "polkadot", "dogecoin", "avalanche-2", "chainlink",
  "litecoin", "tron", "stellar"
] as const;

// Helper: deterministic pseudo‑random
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Helper: generate deterministic order book for a given price and coin seed
function generateDeterministicBook(price: number, coinSeed: number) {
  if (!price) return { asks: [], bids: [] };
  const asks = Array.from({ length: 10 }, (_, i) => {
    const spread = (i + 1) * price * 0.0008;
    const seed = coinSeed + i + 100;
    return {
      price: price + spread + seededRandom(seed) * price * 0.0003,
      amount: 0.01 + seededRandom(seed + 1) * 4.99,
      total: 0,
    };
  }).map(a => ({ ...a, total: a.price * a.amount }));
  const bids = Array.from({ length: 10 }, (_, i) => {
    const spread = (i + 1) * price * 0.0008;
    const seed = coinSeed + i + 200;
    return {
      price: price - spread - seededRandom(seed) * price * 0.0003,
      amount: 0.01 + seededRandom(seed + 1) * 4.99,
      total: 0,
    };
  }).map(b => ({ ...b, total: b.price * b.amount }));
  return { asks: asks.reverse(), bids };
}

interface Position {
  id: string;
  pairId: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  amount: number;        // position size in quote currency (USDT)
  leverage: number;
  margin: number;        // amount / leverage
  liquidationPrice: number;
  timestamp: number;
}

const FuturesPage = () => {
  const [searchParams] = useSearchParams();
  const [selectedCoin, setSelectedCoin] = useState(searchParams.get("coin") || "bitcoin");
  const [side, setSide] = useState<"long" | "short">("long");
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [amount, setAmount] = useState("");           // in USDT
  const [leverage, setLeverage] = useState(10);
  const [limitPrice, setLimitPrice] = useState("");
  const [pairDropdownOpen, setPairDropdownOpen] = useState(false);
  const [pairSearch, setPairSearch] = useState("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [amountUnit, setAmountUnit] = useState<"base" | "quote">(() => {
    const saved = localStorage.getItem("futuresOrderBookAmountUnit");
    return saved === "quote" ? "quote" : "base";
  });
  const chartRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { prices, getSymbol } = useCryptoPrices(10000);
  const { wallets, getBalance, fetchWallets, loading: walletsLoading } = useWallets();
  const { currency, demoMode, demoBalance, setDemoBalance } = useAppStore();
  const sym = currency === "inr" ? "₹" : "$";

  const selectedPrice = prices.find(p => p.id === selectedCoin);
  const currentPrice = selectedPrice?.current_price ?? 0;
  const symbol = getSymbol(selectedCoin);
  const pairName = `${symbol}/USDT`;

  // Effective price for limit orders
  const effectivePrice = orderType === "limit" ? Number(limitPrice) || currentPrice : currentPrice;
  const margin = Number(amount) / leverage;   // USDT margin required
  const totalPositionSize = Number(amount);    // position size in USDT

  // Calculate liquidation price
  const liquidationPrice = useMemo(() => {
    if (!effectivePrice || leverage <= 0) return 0;
    if (side === "long") {
      return effectivePrice * (1 - 1 / leverage);
    } else {
      return effectivePrice * (1 + 1 / leverage);
    }
  }, [effectivePrice, leverage, side]);

  // USDT balance
  const realUsdtBalance = getBalance("usdt");
  const usdtBalance = demoMode ? demoBalance : realUsdtBalance;

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

  // Deterministic order book for the selected pair
  const coinSeed = selectedCoin.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const orderBook = useMemo(
    () => generateDeterministicBook(currentPrice, coinSeed),
    [currentPrice, coinSeed]
  );
  const maxAskAmount = Math.max(...orderBook.asks.map(a => a.amount), 1);
  const maxBidAmount = Math.max(...orderBook.bids.map(b => b.amount), 1);

  // Toggle amount unit and save to localStorage
  const toggleAmountUnit = () => {
    setAmountUnit(prev => {
      const newUnit = prev === "base" ? "quote" : "base";
      localStorage.setItem("futuresOrderBookAmountUnit", newUnit);
      return newUnit;
    });
  };

  // TradingView chart embedding
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

  // Open a position
  const openPosition = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid positive amount (USDT)");
      return;
    }
    if (margin <= 0) {
      toast.error("Invalid margin calculation");
      return;
    }
    if (margin > usdtBalance) {
      toast.error(`Insufficient USDT balance. Required: ${sym}${margin.toFixed(2)}`);
      return;
    }
    if (leverage < 1 || leverage > 100) {
      toast.error("Leverage must be between 1x and 100x");
      return;
    }
    if (orderType === "limit" && (!limitPrice || Number(limitPrice) <= 0)) {
      toast.error("Enter a valid limit price");
      return;
    }

    if (demoMode) {
      setDemoBalance(demoBalance - margin);
    } else {
      const usdtWallet = wallets.find(w => w.crypto_id === "usdt");
      if (usdtWallet) {
        await supabase.from("wallets").update({ balance: realUsdtBalance - margin }).eq("id", usdtWallet.id);
      }
      await fetchWallets();
    }

    const newPosition: Position = {
      id: Date.now().toString(),
      pairId: selectedCoin,
      symbol,
      side,
      entryPrice: effectivePrice,
      amount: totalPositionSize,
      leverage,
      margin,
      liquidationPrice,
      timestamp: Date.now(),
    };
    setPositions(prev => [newPosition, ...prev]);
    toast.success(`${demoMode ? "[DEMO] " : ""}${side === "long" ? "Long" : "Short"} position opened: ${totalPositionSize} USDT @ ${effectivePrice} (${leverage}x)`);
    setAmount("");
    if (orderType === "limit") setLimitPrice("");
  };

  // Close a position
  const closePosition = async (pos: Position) => {
    let pnl = 0;
    if (pos.side === "long") {
      pnl = (currentPrice - pos.entryPrice) / pos.entryPrice * pos.amount;
    } else {
      pnl = (pos.entryPrice - currentPrice) / pos.entryPrice * pos.amount;
    }
    if (demoMode) {
      setDemoBalance(demoBalance + pos.margin + pnl);
    } else {
      const finalBalance = realUsdtBalance + pos.margin + pnl;
      const usdtWallet = wallets.find(w => w.crypto_id === "usdt");
      if (usdtWallet) {
        await supabase.from("wallets").update({ balance: finalBalance }).eq("id", usdtWallet.id);
      }
      await fetchWallets();
    }
    setPositions(prev => prev.filter(p => p.id !== pos.id));
    toast.success(`${demoMode ? "[DEMO] " : ""}Position closed. PnL: ${pnl >= 0 ? "+" : ""}${sym}${pnl.toFixed(2)}`);
  };

  return (
    <DashboardLayout>
      <DemoModeBanner />
      <div className="p-0">
        {/* Header with pair selector */}
        <div className="border-b border-border bg-card sticky top-0 z-10">
          <div className="container flex flex-wrap items-center gap-2 sm:gap-3 py-2 px-3 sm:px-4">
            <DemoModeToggle />
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

            <div className="ml-auto text-xs text-muted-foreground">
              Funding: 0.01%
            </div>
          </div>
        </div>

        <div className="container mt-4 px-2 sm:px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
            {/* Chart */}
            <div className="lg:col-span-6 bg-card border border-border rounded-xl overflow-hidden">
              <div ref={chartRef} className="h-[280px] sm:h-[400px]" />
            </div>

            {/* Order Book */}
            <div className="hidden md:block lg:col-span-3 bg-card border border-border rounded-xl p-3 sm:p-4 overflow-hidden">
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
                    <div key={`ask-${idx}`} className="relative flex justify-between text-xs py-0.5 px-1 rounded-sm">
                      <div
                        className="absolute inset-0 bg-loss/5 rounded-sm"
                        style={{ width: `${(ask.amount / maxAskAmount) * 100}%`, right: 0, left: "auto" }}
                      />
                      <span className="relative text-loss font-medium tabular-nums">{ask.price.toFixed(2)}</span>
                      <span className="relative text-muted-foreground tabular-nums">
                        {displayAmount.toFixed(amountUnit === "base" ? 4 : 2)}
                      </span>
                      <span className="relative text-muted-foreground tabular-nums">{ask.total.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

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
                    <div key={`bid-${idx}`} className="relative flex justify-between text-xs py-0.5 px-1 rounded-sm">
                      <div
                        className="absolute inset-0 bg-profit/5 rounded-sm"
                        style={{ width: `${(bid.amount / maxBidAmount) * 100}%`, right: 0, left: "auto" }}
                      />
                      <span className="relative text-profit font-medium tabular-nums">{bid.price.toFixed(2)}</span>
                      <span className="relative text-muted-foreground tabular-nums">
                        {displayAmount.toFixed(amountUnit === "base" ? 4 : 2)}
                      </span>
                      <span className="relative text-muted-foreground tabular-nums">{bid.total.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Form */}
            <div className="lg:col-span-3 bg-card border border-border rounded-xl p-3 sm:p-4">
              {/* Long/Short toggle */}
              <div className="flex rounded-lg overflow-hidden border border-border mb-4">
                <button
                  onClick={() => setSide("long")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    side === "long" ? "bg-profit text-white" : "bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Long
                </button>
                <button
                  onClick={() => setSide("short")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    side === "short" ? "bg-loss text-white" : "bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  Short
                </button>
              </div>

              {/* Market/Limit */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOrderType("market")}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                    orderType === "market" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Market
                </button>
                <button
                  onClick={() => setOrderType("limit")}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition-all ${
                    orderType === "limit" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Limit
                </button>
              </div>

              <div className="space-y-3">
                {/* Leverage Slider */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Leverage</span>
                    <span className="font-bold text-foreground">{leverage}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={leverage}
                    onChange={e => setLeverage(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                    <span>1x</span><span>25x</span><span>50x</span><span>100x</span>
                  </div>
                </div>

                {orderType === "limit" && (
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Limit Price ({sym})</label>
                    <input
                      type="number"
                      value={limitPrice}
                      onChange={e => setLimitPrice(e.target.value)}
                      placeholder={currentPrice.toString()}
                      className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                {/* Amount (USDT) */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Amount (USDT)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                {/* Margin & Liquidation */}
                <div className="bg-secondary/50 rounded-lg p-3 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Margin Required</span>
                    <span className="text-foreground tabular-nums">{sym}{margin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Liquidation Price</span>
                    <span className={liquidationPrice && liquidationPrice > 0 ? (side === "long" ? "text-loss" : "text-loss") : "text-foreground"}>
                      {liquidationPrice ? sym + liquidationPrice.toFixed(2) : "—"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {demoMode ? "Demo" : "Available"} USDT: {sym}{usdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>

                <Button
                  variant={side === "long" ? "cta" : "destructive"}
                  className="w-full h-11"
                  onClick={openPosition}
                  disabled={walletsLoading || !amount || Number(amount) <= 0}
                >
                  {side === "long" ? "Open Long" : "Open Short"}
                </Button>
              </div>
            </div>
          </div>

          {/* Open Positions */}
          <div className="bg-card border border-border rounded-xl p-4 mt-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Open Positions</h3>
            {positions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <ArrowUpDown className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No open positions. Open a futures position above.</p>
              </div>
            ) : (
              <table className="w-full text-xs min-w-[800px]">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left py-2">Pair</th>
                    <th className="text-left py-2">Side</th>
                    <th className="text-right py-2">Entry</th>
                    <th className="text-right py-2">Mark</th>
                    <th className="text-right py-2">Amount</th>
                    <th className="text-right py-2">Leverage</th>
                    <th className="text-right py-2">Margin</th>
                    <th className="text-right py-2">Liquidation</th>
                    <th className="text-right py-2">PnL (USDT)</th>
                    <th className="text-right py-2"></th>
                   </tr>
                </thead>
                <tbody>
                  {positions.map(pos => {
                    let pnl = 0;
                    if (pos.side === "long") {
                      pnl = (currentPrice - pos.entryPrice) / pos.entryPrice * pos.amount;
                    } else {
                      pnl = (pos.entryPrice - currentPrice) / pos.entryPrice * pos.amount;
                    }
                    const pnlPercent = (pnl / pos.margin) * 100;
                    return (
                      <tr key={pos.id} className="border-b border-border/50 hover:bg-secondary/30">
                        <td className="py-2 text-foreground font-medium">{pos.symbol}/USDT</td>
                        <td className={`py-2 font-semibold ${pos.side === "long" ? "text-profit" : "text-loss"}`}>
                          {pos.side === "long" ? "Long" : "Short"}
                        </td>
                        <td className="py-2 text-right text-foreground tabular-nums">{sym}{pos.entryPrice.toFixed(2)}</td>
                        <td className="py-2 text-right text-foreground tabular-nums">{sym}{currentPrice.toFixed(2)}</td>
                        <td className="py-2 text-right text-foreground tabular-nums">{pos.amount.toFixed(2)} USDT</td>
                        <td className="py-2 text-right text-foreground tabular-nums">{pos.leverage}x</td>
                        <td className="py-2 text-right text-foreground tabular-nums">{sym}{pos.margin.toFixed(2)}</td>
                        <td className="py-2 text-right text-loss tabular-nums">{sym}{pos.liquidationPrice.toFixed(2)}</td>
                        <td className={`py-2 text-right font-bold tabular-nums ${pnl >= 0 ? "text-profit" : "text-loss"}`}>
                          {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                        </td>
                        <td className="py-2 text-right">
                          <Button size="sm" variant="ghost" onClick={() => closePosition(pos)} className="text-xs h-7">
                            Close
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Available Futures Markets */}
          <div className="bg-card border border-border rounded-xl p-4 mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Available Futures Markets</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {prices.slice(0, 12).map(coin => (
                <div
                  key={coin.id}
                  onClick={() => setSelectedCoin(coin.id)}
                  className="bg-secondary/50 rounded-xl p-3 text-center hover:border-primary/30 border border-transparent transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <img src={coin.image} alt={coin.name} className="w-5 h-5 rounded-full" />
                    <span className="text-sm font-semibold text-foreground">{getSymbol(coin.id)}/USDT</span>
                  </div>
                  <p className="text-base font-bold text-foreground">${coin.current_price.toLocaleString()}</p>
                  <p className={`text-xs ${coin.price_change_percentage_24h >= 0 ? "text-profit" : "text-loss"}`}>
                    {coin.price_change_percentage_24h >= 0 ? "+" : ""}{coin.price_change_percentage_24h.toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FuturesPage;
