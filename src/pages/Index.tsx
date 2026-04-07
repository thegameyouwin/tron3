// Live Trade Simulator with Active Users and 24h Platform Volume
const TradeSimulator = ({ prices }: { prices: any[] }) => {
  const [trades, setTrades] = useState<any[]>([]);
  const tradesRef = useRef<any[]>([]);
  
  // 24h Platform Volume (starts at ~1.2B, will rise toward 2.79B+)
  const volume24hRef = useRef(1_200_000_000);
  
  // Active users state (minimum 10k)
  const [activeUsers, setActiveUsers] = useState<number>(() => {
    // Random starting value between 12,000 and 28,000
    return Math.floor(Math.random() * (28000 - 12000 + 1) + 12000);
  });

  // Update active users every 40 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => {
        const changePercent = (Math.random() * 20) - 8; // -8% to +12%
        let newValue = Math.floor(prev * (1 + changePercent / 100));
        newValue = Math.min(Math.max(newValue, 10000), 150000);
        return newValue;
      });
    }, 40000);
    return () => clearInterval(interval);
  }, []);

  // Simulate trades and accumulate volume
  useEffect(() => {
    if (prices.length === 0) return;
    const interval = setInterval(() => {
      const coin = prices[Math.floor(Math.random() * Math.min(prices.length, 8))];
      if (!coin) return;
      const side = Math.random() > 0.5 ? "buy" : "sell";
      const spread = (Math.random() - 0.5) * 0.002 * coin.current_price;
      const price = coin.current_price + spread;
      const amount = (0.001 + Math.random() * 2).toFixed(4);
      const total = price * Number(amount);
      
      // Add trade total to 24h volume
      volume24hRef.current += total;
      
      // Optional: keep volume rising realistically, no artificial cap
      // but it will naturally exceed 2.79B quickly; you can slow it down by dividing increment if needed
      
      const trade = {
        id: Date.now() + Math.random(),
        symbol: coin.symbol.toUpperCase(),
        image: coin.image,
        side,
        price,
        amount: Number(amount),
        total,
        user: anonUsers[Math.floor(Math.random() * anonUsers.length)],
        time: new Date(),
      };
      tradesRef.current = [trade, ...tradesRef.current.slice(0, 14)];
      setTrades([...tradesRef.current]);
    }, 800 + Math.random() * 1200);
    return () => clearInterval(interval);
  }, [prices]);

  const currentVolume = volume24hRef.current;

  return (
    <section className="py-12">
      <div className="container">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-display font-bold text-foreground">Live Trades</h2>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-profit opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-profit" />
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2 bg-card/50 px-3 py-1.5 rounded-full border border-border/50">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-muted-foreground">Active Users:</span>
              <span className="font-bold tabular-nums text-foreground">{activeUsers.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Platform Volume 24h:</span>
              <span className="font-bold tabular-nums text-sm sm:text-base text-profit">
                ${formatLargeNumber(currentVolume)}
              </span>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Table Header - hidden on mobile */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border">
            <div className="col-span-2">Trader</div>
            <div className="col-span-2">Pair</div>
            <div className="col-span-2">Position</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-right">Time</div>
          </div>
          {/* Scrollable table body */}
          <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
            <div className="min-w-[600px] sm:min-w-full">
              {trades.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Waiting for live trades...
                </div>
              ) : (
                trades.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                    className={`grid grid-cols-12 gap-4 px-4 py-2 text-xs border-b border-border/30 ${i === 0 ? "bg-primary/5" : ""}`}
                  >
                    <div className="col-span-2 text-muted-foreground/70 truncate">{t.user}</div>
                    <div className="col-span-2 flex items-center gap-2">
                      <img src={t.image} alt={t.symbol} className="w-4 h-4 rounded-full" />
                      <span className="font-medium text-foreground">{t.symbol}/USDT</span>
                    </div>
                    <div className="col-span-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.side === "buy" ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>
                        {t.side === "buy" ? "LONG" : "SHORT"}
                      </span>
                    </div>
                    <div className={`col-span-2 text-right font-medium tabular-nums ${t.side === "buy" ? "text-profit" : "text-loss"}`}>
                      ${t.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="col-span-2 text-right text-muted-foreground tabular-nums">{t.amount}</div>
                    <div className="col-span-2 text-right text-muted-foreground tabular-nums">
                      {t.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
