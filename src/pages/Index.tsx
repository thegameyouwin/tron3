import Navbar from "@/components/Navbar";
import TickerBar from "@/components/TickerBar";
import Footer from "@/components/Footer";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useAppStore } from "@/stores/useAppStore";
import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, TrendingUp, ArrowRight, Flame, Activity, Shield, Zap, Globe, Users, BarChart3, Smartphone, Download } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, useScroll, useTransform } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const HERO_COINS = ["bitcoin", "ethereum", "tether", "binancecoin", "chainlink"];



// Helper to format large numbers (e.g., 2.79B)
const formatLargeNumber = (num: number): string => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  return num.toLocaleString();
};

// Recent Market Activity - shows real price data, no fake trades
const MarketActivity = ({ prices }: { prices: any[] }) => {
  const topMovers = useMemo(() => {
    if (!prices.length) return [];
    return [...prices]
      .sort((a, b) => Math.abs(b.price_change_percentage_24h) - Math.abs(a.price_change_percentage_24h))
      .slice(0, 8);
  }, [prices]);

  if (!topMovers.length) return null;

  return (
    <section className="py-12">
      <div className="container">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground">Top Movers (24h)</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {topMovers.map((coin) => (
            <Link
              key={coin.id}
              to={`/coin/${coin.id}`}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all group"
            >
              <div className="flex items-center gap-2 mb-2">
                <img src={coin.image} alt={coin.name} className="w-6 h-6 rounded-full" />
                <span className="text-sm font-semibold text-foreground">{coin.symbol.toUpperCase()}</span>
              </div>
              <p className="text-sm font-bold text-foreground">${coin.current_price.toLocaleString()}</p>
              <p className={`text-xs font-medium mt-0.5 ${coin.price_change_percentage_24h >= 0 ? "text-profit" : "text-loss"}`}>
                {coin.price_change_percentage_24h >= 0 ? "▲" : "▼"} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// Stats Counter Component (unchanged)
const StatsCounter = ({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const end = value;
          const duration = 2000;
          const stepTime = 20;
          const steps = duration / stepTime;
          const increment = end / steps;
          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, stepTime);
          observer.disconnect();
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-foreground">{count.toLocaleString()}{suffix}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
};

const Index = () => {
  const { prices, loading, getSymbol } = useCryptoPrices(30000);
  const currency = useAppStore((s) => s.currency);
  const sym = currency === "inr" ? "₹" : "$";
  const [search, setSearch] = useState("");
  const { t } = useTranslation();
  const { scrollYProgress } = useScroll();
  // opacity is unused but harmless
  useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const filteredPrices = useMemo(() => {
    if (!search.trim()) return prices.slice(0, 20);
    const q = search.toLowerCase();
    return prices.filter((p) => p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q));
  }, [prices, search]);

  const heroCoins = prices.filter((p) => HERO_COINS.includes(p.id));
  const trendingCoins = prices.slice(0, 5);

  const features = [
    { icon: Shield, title: "Secure & Trusted", desc: "Industry-leading security with multi-layer protection and cold storage." },
    { icon: Zap, title: "Lightning Fast", desc: "Execute trades in milliseconds with our high-performance matching engine." },
    { icon: Globe, title: "Global Access", desc: "Trade from anywhere in the world with 24/7 support." },
    { icon: BarChart3, title: "Advanced Charts", desc: "Professional trading tools with TradingView integration." },
  ];

  const wallets = [
    { name: "Trust Wallet", logo: "https://assets.coingecko.com/coins/images/11085/small/Trust.png" },
    { name: "SafePal", logo: "https://assets.coingecko.com/coins/images/13905/small/sfp.png" },
    { name: "Binance", logo: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png" },
    { name: "Bybit", logo: "https://assets.coingecko.com/markets/images/698/small/bybit_spot.png" },
    { name: "OKX", logo: "https://assets.coingecko.com/markets/images/96/small/WeChat_Image_20220117220452.png" },
    { name: "Coinbase", logo: "https://assets.coingecko.com/markets/images/23/small/Coinbase_Coin_Primary.png" },
    { name: "MetaMask", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MetaMask_Fox.svg/200px-MetaMask_Fox.svg.png" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <TickerBar />

      {/* Hero Section (unchanged) */}
      <section className="pt-32 pb-20 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary mb-6">
              <TrendingUp className="h-3.5 w-3.5" />
              {t("hero.badge")}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight mb-6">
              {t("hero.title")}{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{t("hero.highlight")}</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-xl mx-auto">
              {t("hero.subtitle")}
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/auth">
                <Button variant="hero" size="xl" className="gap-2">
                  {t("hero.getStarted")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/#crypto">
                <Button variant="goldOutline" size="lg">{t("hero.exploreMarkets")}</Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 max-w-4xl mx-auto"
          >
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
              : heroCoins.map((coin, idx) => (
                  <Link
                    key={coin.id}
                    to={`/coin/${coin.id}`}
                    className="group relative bg-card/60 backdrop-blur-sm border border-border rounded-2xl p-4 text-center hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-2"
                  >
                    {idx === 0 && <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">#1</span>}
                    <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full mx-auto mb-2 ring-2 ring-border group-hover:ring-primary/30 transition-all" />
                    <p className="text-xs font-bold text-foreground">{getSymbol(coin.id)}</p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{sym}{coin.current_price.toLocaleString()}</p>
                    <p className={`text-xs font-medium mt-0.5 ${coin.price_change_percentage_24h >= 0 ? "text-profit" : "text-loss"}`}>
                      {coin.price_change_percentage_24h >= 0 ? "▲" : "▼"} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </p>
                  </Link>
                ))}
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gradient-to-b from-card/50 to-transparent">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatsCounter value={50} label="Supported Cryptos" suffix="+" />
            <StatsCounter value={14} label="Languages" suffix="" />
            <StatsCounter value={7} label="Deposit Networks" suffix="" />
            <StatsCounter value={24} label="Support Hours" suffix="/7" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold">Why Choose <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Us</span></h2>
            <p className="text-muted-foreground mt-2">Experience the future of crypto trading</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6 text-center hover:border-primary/30 transition-all hover:-translate-y-1"
              >
                <feature.icon className="h-10 w-10 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Market Activity - Real data */}
      <MarketActivity prices={prices} />

      {/* Search Bar */}
      <section id="crypto" className="py-8">
        <div className="container max-w-3xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="w-full h-12 rounded-2xl bg-card border border-border pl-12 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Crypto Table (unchanged) */}
      <section className="py-8">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold">
                {t("common.topCryptos").split(" ")[0]}{" "}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t("common.topCryptos").split(" ").slice(1).join(" ")}
                </span>
              </h2>
              <p className="text-muted-foreground text-sm mt-1">{t("common.livePrices")}</p>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
              <div className="hidden sm:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">#</div>
                <div className="col-span-4">{t("markets.name") || "Name"}</div>
                <div className="col-span-3 text-right">{t("trading.price") || "Price"}</div>
                <div className="col-span-2 text-right">{t("markets.change") || "24h Change"}</div>
                <div className="col-span-2 text-right">{t("markets.marketCap") || "Market Cap"}</div>
              </div>
              {filteredPrices.map((coin, idx) => (
                <Link
                  key={coin.id}
                  to={`/coin/${coin.id}`}
                  className="grid grid-cols-12 gap-4 items-center px-5 py-4 hover:bg-primary/5 transition-colors group"
                >
                  <div className="col-span-1 text-sm text-muted-foreground font-medium">{idx + 1}</div>
                  <div className="col-span-5 sm:col-span-4 flex items-center gap-3">
                    <img src={coin.image} alt={coin.name} className="w-8 h-8 rounded-full ring-1 ring-border" />
                    <div>
                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{coin.name}</p>
                      <p className="text-xs text-muted-foreground">{coin.symbol.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="col-span-3 sm:col-span-3 text-right">
                    <p className="text-sm font-bold text-foreground">{sym}{coin.current_price.toLocaleString()}</p>
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      coin.price_change_percentage_24h >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"
                    }`}>
                      {coin.price_change_percentage_24h >= 0 ? "▲" : "▼"} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                    </span>
                  </div>
                  <div className="hidden sm:block col-span-2 text-right text-sm text-muted-foreground">
                    {sym}{(coin.market_cap / 1e9).toFixed(2)}B
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Trending Section (unchanged) */}
      <section className="py-12 bg-card/50">
        <div className="container">
          <div className="flex items-center gap-2 mb-8">
            <Flame className="h-6 w-6 text-primary" />
            <h2 className="text-2xl sm:text-3xl font-display font-bold">
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">{t("common.trending")}</span>
            </h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
            {trendingCoins.map((coin, idx) => (
              <Link
                key={coin.id}
                to={`/coin/${coin.id}`}
                className="flex-shrink-0 w-60 snap-start bg-background border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-sm">
                    {idx + 1}
                  </span>
                  <img src={coin.image} alt={coin.name} className="w-9 h-9 rounded-full ring-2 ring-border group-hover:ring-primary/30 transition-all" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{coin.name}</p>
                    <p className="text-xs text-muted-foreground">{coin.symbol.toUpperCase()}</p>
                  </div>
                </div>
                <p className="text-xl font-bold text-foreground">{sym}{coin.current_price.toLocaleString()}</p>
                <p className={`text-sm font-medium mt-1 ${coin.price_change_percentage_24h >= 0 ? "text-profit" : "text-loss"}`}>
                  {coin.price_change_percentage_24h >= 0 ? "▲" : "▼"} {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Download App Section with Official Store Badges */}
      <section className="py-20 bg-gradient-to-b from-background to-card/30">
        <div className="container">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/5 via-primary/10 to-accent/5 border border-primary/20 shadow-2xl">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
            <div className="relative z-10 p-8 md:p-12 lg:p-16">
              <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 text-center md:text-left">
                   <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 text-sm text-primary mb-6">
                     <Smartphone className="h-3.5 w-3.5" />
                     Mobile App
                   </div>
                  <h3 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
                    Take Your Trading <br />
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Anywhere</span>
                  </h3>
                  <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto md:mx-0">
                    Get the full Tronnlix experience on your mobile device. Trade on the go with our lightning-fast Progressive Web App or native apps.
                  </p>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start items-center">
                    <Button 
                      variant="gold" 
                      size="lg" 
                      className="gap-2 shadow-lg hover:shadow-xl transition-all"
                      onClick={() => {
                        if ('serviceWorker' in navigator && (window as any).deferredPrompt) {
                          (window as any).deferredPrompt.prompt();
                        } else {
                          toast.info("Add this site to your home screen from your browser menu to install the app!");
                        }
                      }}
                    >
                      <Download className="h-5 w-5" /> Install PWA
                    </Button>
                    {/* App Store & Play Store badges (non-functional, apps not yet published) */}
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border cursor-default opacity-80"
                      title="Coming soon on Google Play"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground" fill="currentColor">
                        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302a1 1 0 010 1.38l-2.302 2.302L15.396 13l2.302-2.492zM5.864 3.465L16.8 9.798l-2.302 2.302-8.634-8.635z"/>
                      </svg>
                      <div className="text-left leading-tight">
                        <span className="text-[8px] text-muted-foreground uppercase tracking-wide">Get it on</span>
                        <p className="text-xs font-semibold text-foreground -mt-0.5">Google Play</p>
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border cursor-default opacity-80"
                      title="Coming soon on App Store"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-foreground" fill="currentColor">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      <div className="text-left leading-tight">
                        <span className="text-[8px] text-muted-foreground uppercase tracking-wide">Download on</span>
                        <p className="text-xs font-semibold text-foreground -mt-0.5">App Store</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block">
                  <div className="relative">
                    <div className="w-64 h-64 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30 backdrop-blur-sm flex items-center justify-center shadow-2xl">
                      <Smartphone className="h-24 w-24 text-primary/60" />
                    </div>
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-primary/20 blur-xl" />
                    <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-accent/20 blur-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Wallets */}
      <section className="py-16 border-t border-border">
        <div className="container text-center">
          <h2 className="text-2xl font-display font-bold mb-2">
            Supported <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Wallets</span>
          </h2>
          <p className="text-muted-foreground mb-8 text-sm">Connect your favorite wallet and start trading</p>
          <div className="flex flex-wrap justify-center gap-6 md:gap-8 max-w-2xl mx-auto">
            {wallets.map(w => (
              <div key={w.name} className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-xl bg-secondary border border-border flex items-center justify-center overflow-hidden hover:border-primary/40 transition-all group-hover:scale-105">
                  <img src={w.logo} alt={w.name} className="w-8 h-8 object-contain" loading="lazy" />
                </div>
                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors">{w.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-6">and more...</p>
        </div>
      </section>

      {/* Newsletter Section */}
      <NewsletterSection />

      {/* Final CTA */}
      <section className="py-24">
        <div className="container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              {t("common.readyTitle").split(" ").slice(0, -1).join(" ")}{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t("common.readyTitle").split(" ").slice(-1)}
              </span>
            </h2>
            <p className="text-muted-foreground mb-10 max-w-md mx-auto">
              {t("common.readySubtitle")}
            </p>
            <Link to="/auth">
              <Button variant="hero" size="xl" className="gap-2">
                {t("common.createAccount")} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
