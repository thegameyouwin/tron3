import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Plus, Search, MessageCircle, Flag, Share2, ChevronDown, Filter, Star, Clock, Shield, Wallet, ArrowUpDown, TrendingUp, TrendingDown, Users, AlertCircle, X, Copy, Check, Trash2, DollarSign, Send } from "lucide-react";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";

const CRYPTO_FILTERS = ["All", "BTC", "ETH", "LTC", "SOL", "USDT", "BNB", "XRP"];
const PAYMENT_METHODS = [
  "All Payment Methods",
  "Bank Transfer",
  "M-Pesa",
  "PayPal",
  "Venmo",
  "Wire Transfer",
  "USDT TRC20",
  "USDT ERC20",
  "Cash",
  "Apple Pay",
  "Google Pay",
];
const SORT_OPTIONS = [
  { label: "Best Price", value: "bestPrice" },
  { label: "Price: Low to High", value: "priceAsc" },
  { label: "Price: High to Low", value: "priceDesc" },
  { label: "Trade Completion", value: "completionDesc" },
  { label: "Trade Count", value: "tradesDesc" },
];

// Supported cryptos with addresses and balances
const SUPPORTED_CRYPTOS = [
  { symbol: "BTC", name: "Bitcoin", color: "#F7931A", icon: "₿" },
  { symbol: "ETH", name: "Ethereum", color: "#627EEA", icon: "Ξ" },
  { symbol: "LTC", name: "Litecoin", color: "#BFBBBB", icon: "Ł" },
  { symbol: "SOL", name: "Solana", color: "#9945FF", icon: "◎" },
  { symbol: "USDT", name: "Tether", color: "#26A17B", icon: "₮" },
  { symbol: "BNB", name: "Binance Coin", color: "#F3BA2F", icon: "BNB" },
  { symbol: "XRP", name: "Ripple", color: "#23292F", icon: "XRP" },
];

// Generate a mock crypto address for a user and crypto
const generateAddress = (cryptoSymbol: string, userId: string) => {
  const prefixes: Record<string, string> = {
    BTC: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    ETH: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    LTC: "LbTjMGN7gELw4KbeyQf6cTCq859hV18tFj",
    SOL: "7xKXtg2CWxBTPYyH9mhZdLdP9HXzqBqFp6Z5Lx4Q7R8s",
    USDT: "TXLAQ63XxZzZzZzZzZzZzZzZzZzZzZzZz",
    BNB: "bnb1xqj5l4l4l4l4l4l4l4l4l4l4l4l4l4l4l",
    XRP: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
  };
  return prefixes[cryptoSymbol] || `${cryptoSymbol}${userId.slice(0, 8)}`;
};

// Initial sample offers with remaining amounts and owner tracking
const initialOffers = [
  {
    id: "1",
    user: "Kwame Asante",
    userId: "merchant_1",
    avatar: "KA",
    verified: true,
    vip: true,
    trades: 731,
    completion: 98,
    side: "sell",
    crypto: "BTC",
    cryptoId: "bitcoin",
    price: 63406.8,
    priceChange: -1.3,
    minAmount: 50,
    maxAmount: 4700,
    amountCrypto: 0.07,
    minCrypto: 0.00078856,
    maxCrypto: 0.07412456,
    remainingAmountCrypto: 0.07,
    remainingMinAmount: 50,
    remainingMaxAmount: 4700,
    methods: ["USDT TRC20", "BTC"],
    rating: 4.9,
    responseTime: "< 5 min",
    color: "#F7931A",
    location: "Accra, Ghana",
  },
  {
    id: "2",
    user: "Amara Diallo",
    userId: "merchant_2",
    avatar: "AD",
    verified: true,
    vip: false,
    trades: 762,
    completion: 96,
    side: "sell",
    crypto: "ETH",
    cryptoId: "ethereum",
    price: 1721.7,
    priceChange: -0.9,
    minAmount: 50,
    maxAmount: 2450,
    amountCrypto: 0.76,
    minCrypto: 0.02904,
    maxCrypto: 1.539132,
    remainingAmountCrypto: 0.76,
    remainingMinAmount: 50,
    remainingMaxAmount: 2450,
    methods: ["USDT TRC20", "USDT ERC20"],
    rating: 4.7,
    responseTime: "< 10 min",
    color: "#627EEA",
    location: "Dakar, Senegal",
  },
  {
    id: "3",
    user: "Kofi Mensah",
    userId: "merchant_3",
    avatar: "KM",
    verified: true,
    vip: false,
    trades: 855,
    completion: 96,
    side: "sell",
    crypto: "ETH",
    cryptoId: "ethereum",
    price: 1878.1,
    priceChange: 1.4,
    minAmount: 200,
    maxAmount: 3700,
    amountCrypto: 1.06,
    minCrypto: 0.106493,
    maxCrypto: 1.97012,
    remainingAmountCrypto: 1.06,
    remainingMinAmount: 200,
    remainingMaxAmount: 3700,
    methods: ["ETH"],
    rating: 4.8,
    responseTime: "< 3 min",
    color: "#627EEA",
    location: "Kumasi, Ghana",
  },
  {
    id: "4",
    user: "Sekou Traore",
    userId: "merchant_4",
    avatar: "ST",
    verified: true,
    vip: false,
    trades: 445,
    completion: 94,
    side: "sell",
    crypto: "BTC",
    cryptoId: "bitcoin",
    price: 57116.1,
    priceChange: 0.8,
    minAmount: 100,
    maxAmount: 5000,
    amountCrypto: 0.05,
    minCrypto: 0.00105049,
    maxCrypto: 0.06952786,
    remainingAmountCrypto: 0.05,
    remainingMinAmount: 100,
    remainingMaxAmount: 5000,
    methods: ["USDT TRC20", "BTC"],
    rating: 4.6,
    responseTime: "< 15 min",
    color: "#F7931A",
    location: "Bamako, Mali",
  },
  {
    id: "5",
    user: "Jamal Ndiaye",
    userId: "merchant_5",
    avatar: "JN",
    verified: true,
    vip: false,
    trades: 320,
    completion: 91,
    side: "buy",
    crypto: "USDT",
    cryptoId: "tether",
    price: 1.01,
    minAmount: 100,
    maxAmount: 10000,
    amountCrypto: 9900,
    minCrypto: 100,
    maxCrypto: 9900,
    remainingAmountCrypto: 9900,
    remainingMinAmount: 100,
    remainingMaxAmount: 10000,
    methods: ["PayPal"],
    rating: 4.5,
    responseTime: "< 20 min",
    color: "#26A17B",
    location: "Dakar, Senegal",
  },
  {
    id: "6",
    user: "Olu Makinde",
    userId: "merchant_6",
    avatar: "OM",
    verified: false,
    vip: false,
    trades: 156,
    completion: 89,
    side: "sell",
    crypto: "SOL",
    cryptoId: "solana",
    price: 87.5,
    priceChange: -2.1,
    minAmount: 25,
    maxAmount: 1500,
    amountCrypto: 17.14,
    minCrypto: 0.285,
    maxCrypto: 17.14,
    remainingAmountCrypto: 17.14,
    remainingMinAmount: 25,
    remainingMaxAmount: 1500,
    methods: ["Bank Transfer"],
    rating: 4.2,
    responseTime: "< 30 min",
    color: "#9945FF",
    location: "Lagos, Nigeria",
  },
  {
    id: "7",
    user: "Tariq Khan",
    userId: "merchant_7",
    avatar: "TK",
    verified: true,
    vip: true,
    trades: 1203,
    completion: 99,
    side: "sell",
    crypto: "LTC",
    cryptoId: "litecoin",
    price: 54.2,
    priceChange: -0.5,
    minAmount: 20,
    maxAmount: 2000,
    amountCrypto: 36.9,
    minCrypto: 0.369,
    maxCrypto: 36.9,
    remainingAmountCrypto: 36.9,
    remainingMinAmount: 20,
    remainingMaxAmount: 2000,
    methods: ["M-Pesa", "Bank Transfer"],
    rating: 4.9,
    responseTime: "< 2 min",
    color: "#BFBBBB",
    location: "Nairobi, Kenya",
  },
  {
    id: "8",
    user: "Rashid Bello",
    userId: "merchant_8",
    avatar: "RB",
    verified: true,
    vip: false,
    trades: 498,
    completion: 95,
    side: "buy",
    crypto: "BTC",
    cryptoId: "bitcoin",
    price: 63200,
    priceChange: -1.5,
    minAmount: 500,
    maxAmount: 20000,
    amountCrypto: 0.31,
    minCrypto: 0.0079,
    maxCrypto: 0.3164,
    remainingAmountCrypto: 0.31,
    remainingMinAmount: 500,
    remainingMaxAmount: 20000,
    methods: ["Wire Transfer", "USDT TRC20"],
    rating: 4.7,
    responseTime: "< 8 min",
    color: "#F7931A",
    location: "Abuja, Nigeria",
  },
];

// Transaction history type
interface Transaction {
  id: string;
  type: "buy" | "sell" | "deposit" | "withdraw";
  crypto?: string;
  amount: number;
  fiatAmount?: number;
  counterparty?: string;
  status: "completed" | "pending";
  timestamp: Date;
  address?: string;
}

const P2PMarketPage = () => {
  const [tab, setTab] = useState<"buy" | "sell">("buy");
  const [cryptoFilter, setCryptoFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [amountFilter, setAmountFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("All Payment Methods");
  const [sortBy, setSortBy] = useState("bestPrice");
  const [showFilters, setShowFilters] = useState(false);
  const [showPostAd, setShowPostAd] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState<any>(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [tradeError, setTradeError] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const { prices } = useCryptoPrices();

  // Wallet balances
  const [usdBalance, setUsdBalance] = useState(15000);
  const [cryptoBalances, setCryptoBalances] = useState<Record<string, number>>({
    BTC: 0.12,
    ETH: 2.5,
    LTC: 5.0,
    SOL: 15.0,
    USDT: 500,
    BNB: 1.2,
    XRP: 200,
  });

  // Offers state
  const [offers, setOffers] = useState(initialOffers);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Current user info
  const currentUser = {
    id: "current_user",
    name: "You (Demo Trader)",
    avatar: "YD",
    verified: true,
    vip: false,
  };

  // Generate crypto addresses for current user
  const userAddresses = useMemo(() => {
    const addresses: Record<string, string> = {};
    SUPPORTED_CRYPTOS.forEach(crypto => {
      addresses[crypto.symbol] = generateAddress(crypto.symbol, currentUser.id);
    });
    return addresses;
  }, []);

  // Helper to add transaction
  const addTransaction = (tx: Omit<Transaction, "id" | "timestamp">) => {
    setTransactions(prev => [
      {
        ...tx,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
      },
      ...prev,
    ]);
  };

  // Deposit function
  const handleDeposit = (type: "fiat" | "crypto", crypto?: string, amount?: number, address?: string) => {
    if (type === "fiat" && amount && amount > 0) {
      setUsdBalance(prev => prev + amount);
      addTransaction({
        type: "deposit",
        amount: amount,
        fiatAmount: amount,
        status: "completed",
      });
      return true;
    }
    if (type === "crypto" && crypto && amount && amount > 0) {
      const currentBalance = cryptoBalances[crypto] || 0;
      setCryptoBalances(prev => ({ ...prev, [crypto]: currentBalance + amount }));
      addTransaction({
        type: "deposit",
        crypto: crypto,
        amount: amount,
        status: "completed",
        address: address || userAddresses[crypto],
      });
      return true;
    }
    return false;
  };

  // Withdraw function
  const handleWithdraw = (type: "fiat" | "crypto", crypto?: string, amount?: number, externalAddress?: string) => {
    if (type === "fiat" && amount && amount > 0 && usdBalance >= amount) {
      setUsdBalance(prev => prev - amount);
      addTransaction({
        type: "withdraw",
        amount: amount,
        fiatAmount: amount,
        status: "completed",
      });
      return true;
    }
    if (type === "crypto" && crypto && amount && amount > 0 && externalAddress) {
      const currentBalance = cryptoBalances[crypto] || 0;
      if (currentBalance >= amount) {
        setCryptoBalances(prev => ({ ...prev, [crypto]: currentBalance - amount }));
        addTransaction({
          type: "withdraw",
          crypto: crypto,
          amount: amount,
          status: "completed",
          address: externalAddress,
        });
        return true;
      }
    }
    return false;
  };

  // Execute trade
  const executeTrade = (offer: any, amountInCrypto: number) => {
    const totalUSD = amountInCrypto * offer.price;
    
    if (offer.side === "sell" && tab === "buy") {
      // User buying crypto from seller
      if (usdBalance < totalUSD) {
        setTradeError(`Insufficient USD balance. Need $${totalUSD.toLocaleString()}`);
        return false;
      }
      if (amountInCrypto > offer.remainingAmountCrypto) {
        setTradeError(`Seller only has ${offer.remainingAmountCrypto.toFixed(8)} ${offer.crypto} left`);
        return false;
      }
      if (totalUSD < offer.remainingMinAmount || totalUSD > offer.remainingMaxAmount) {
        setTradeError(`Amount must be between $${offer.remainingMinAmount} and $${offer.remainingMaxAmount}`);
        return false;
      }

      // Execute trade
      setUsdBalance(prev => prev - totalUSD);
      setCryptoBalances(prev => ({
        ...prev,
        [offer.crypto]: (prev[offer.crypto] || 0) + amountInCrypto,
      }));

      // Update offer remaining amount
      setOffers(prevOffers =>
        prevOffers.map(o => {
          if (o.id === offer.id) {
            const newRemaining = o.remainingAmountCrypto - amountInCrypto;
            if (newRemaining <= 0.000001) {
              return null; // Remove offer
            }
            const ratio = newRemaining / o.amountCrypto;
            return {
              ...o,
              remainingAmountCrypto: newRemaining,
              remainingMinAmount: o.minAmount * ratio,
              remainingMaxAmount: o.maxAmount * ratio,
            };
          }
          return o;
        }).filter(Boolean)
      );

      addTransaction({
        type: "buy",
        crypto: offer.crypto,
        amount: amountInCrypto,
        fiatAmount: totalUSD,
        counterparty: offer.user,
        status: "completed",
      });
      return true;
    } 
    else if (offer.side === "buy" && tab === "sell") {
      // User selling crypto to buyer
      const currentBalance = cryptoBalances[offer.crypto] || 0;
      if (currentBalance < amountInCrypto) {
        setTradeError(`Insufficient ${offer.crypto} balance. You have ${currentBalance.toFixed(8)} ${offer.crypto}`);
        return false;
      }
      if (amountInCrypto > offer.remainingAmountCrypto) {
        setTradeError(`Buyer only wants ${offer.remainingAmountCrypto.toFixed(8)} ${offer.crypto} more`);
        return false;
      }
      if (totalUSD < offer.remainingMinAmount || totalUSD > offer.remainingMaxAmount) {
        setTradeError(`Amount must be between $${offer.remainingMinAmount} and $${offer.remainingMaxAmount}`);
        return false;
      }

      // Execute trade
      setCryptoBalances(prev => ({
        ...prev,
        [offer.crypto]: prev[offer.crypto] - amountInCrypto,
      }));
      setUsdBalance(prev => prev + totalUSD);

      // Update offer
      setOffers(prevOffers =>
        prevOffers.map(o => {
          if (o.id === offer.id) {
            const newRemaining = o.remainingAmountCrypto - amountInCrypto;
            if (newRemaining <= 0.000001) return null;
            const ratio = newRemaining / o.amountCrypto;
            return {
              ...o,
              remainingAmountCrypto: newRemaining,
              remainingMinAmount: o.minAmount * ratio,
              remainingMaxAmount: o.maxAmount * ratio,
            };
          }
          return o;
        }).filter(Boolean)
      );

      addTransaction({
        type: "sell",
        crypto: offer.crypto,
        amount: amountInCrypto,
        fiatAmount: totalUSD,
        counterparty: offer.user,
        status: "completed",
      });
      return true;
    }
    return false;
  };

  // Post new ad
  const [newAd, setNewAd] = useState({
    side: "sell" as "buy" | "sell",
    crypto: "BTC",
    price: 50000,
    amountCrypto: 0.1,
    minAmount: 50,
    maxAmount: 1000,
    methods: ["Bank Transfer"],
  });

  const handlePostAd = () => {
    const newOffer: any = {
      id: Math.random().toString(36).substr(2, 9),
      user: currentUser.name,
      userId: currentUser.id,
      avatar: currentUser.avatar,
      verified: currentUser.verified,
      vip: currentUser.vip,
      trades: 0,
      completion: 100,
      side: newAd.side,
      crypto: newAd.crypto,
      cryptoId: newAd.crypto.toLowerCase(),
      price: newAd.price,
      priceChange: 0,
      minAmount: newAd.minAmount,
      maxAmount: newAd.maxAmount,
      amountCrypto: newAd.amountCrypto,
      minCrypto: newAd.minAmount / newAd.price,
      maxCrypto: newAd.maxAmount / newAd.price,
      remainingAmountCrypto: newAd.amountCrypto,
      remainingMinAmount: newAd.minAmount,
      remainingMaxAmount: newAd.maxAmount,
      methods: newAd.methods,
      rating: 0,
      responseTime: "< 5 min",
      color: SUPPORTED_CRYPTOS.find(c => c.symbol === newAd.crypto)?.color || "#888",
      location: "Your Location",
    };
    setOffers(prev => [newOffer, ...prev]);
    setShowPostAd(false);
    setNewAd({
      side: "sell",
      crypto: "BTC",
      price: 50000,
      amountCrypto: 0.1,
      minAmount: 50,
      maxAmount: 1000,
      methods: ["Bank Transfer"],
    });
  };

  const deleteAd = (offerId: string) => {
    setOffers(prev => prev.filter(o => o.id !== offerId));
  };

  const getCoinImage = (cryptoId: string) => prices.find(p => p.id === cryptoId)?.image || "";

  // Filter and sort offers
  const filtered = useMemo(() => {
    let filteredOffers = offers.filter(o => {
      if (tab === "buy" ? o.side !== "sell" : o.side !== "buy") return false;
      if (cryptoFilter !== "All" && o.crypto !== cryptoFilter) return false;
      if (search && !o.user.toLowerCase().includes(search.toLowerCase())) return false;
      if (amountFilter) {
        const amt = Number(amountFilter);
        if (amt < o.remainingMinAmount || amt > o.remainingMaxAmount) return false;
      }
      if (methodFilter !== "All Payment Methods" && !o.methods.includes(methodFilter)) return false;
      return true;
    });

    switch (sortBy) {
      case "priceAsc":
        filteredOffers.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        filteredOffers.sort((a, b) => b.price - a.price);
        break;
      case "completionDesc":
        filteredOffers.sort((a, b) => b.completion - a.completion);
        break;
      case "tradesDesc":
        filteredOffers.sort((a, b) => b.trades - a.trades);
        break;
      case "bestPrice":
      default:
        if (tab === "buy") filteredOffers.sort((a, b) => a.price - b.price);
        else filteredOffers.sort((a, b) => b.price - a.price);
        break;
    }
    return filteredOffers;
  }, [tab, cryptoFilter, search, amountFilter, methodFilter, sortBy, offers]);

  const totalOffers = filtered.length;
  const bestPrice = totalOffers ? (tab === "buy" ? filtered[0]?.price : filtered[0]?.price) : 0;

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${i < fullStars ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
          />
        ))}
        {rating > 0 && <span className="text-[10px] text-muted-foreground ml-1">({rating})</span>}
      </div>
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(id);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header with Wallet */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">P2P Marketplace Simulator</h1>
            <p className="text-sm text-muted-foreground">Buy and sell crypto directly with other users</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDeposit(true)} className="gap-1.5">
              <DollarSign className="h-3.5 w-3.5" /> Deposit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowWithdraw(true)} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Withdraw
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filters
            </Button>
            <Button variant="gold" size="sm" className="gap-1.5" onClick={() => setShowPostAd(true)}>
              <Plus className="h-3.5 w-3.5" /> Post Ad
            </Button>
          </div>
        </div>

        {/* Wallet Summary */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-4 border border-primary/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Your USD Balance</p>
              <p className="text-2xl font-bold text-foreground">${usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {SUPPORTED_CRYPTOS.map(crypto => (
                <div key={crypto.symbol} className="text-center">
                  <p className="text-xs text-muted-foreground">{crypto.symbol}</p>
                  <p className="text-sm font-semibold text-foreground">{cryptoBalances[crypto.symbol]?.toFixed(crypto.symbol === 'BTC' ? 6 : 4) || '0'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Buy/Sell Tabs & Quick Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-lg overflow-hidden border border-border">
            <button
              onClick={() => setTab("buy")}
              className={`px-5 py-2 text-sm font-semibold transition-all ${tab === "buy" ? "bg-profit text-white" : "bg-card text-muted-foreground hover:bg-secondary"}`}
            >
              Buy
            </button>
            <button
              onClick={() => setTab("sell")}
              className={`px-5 py-2 text-sm font-semibold transition-all ${tab === "sell" ? "bg-loss text-white" : "bg-card text-muted-foreground hover:bg-secondary"}`}
            >
              Sell
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-emerald-400" />
              <span className="text-muted-foreground">Secure Escrow</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">24/7 Support</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-muted-foreground">{totalOffers} Ads</span>
            </div>
            {bestPrice > 0 && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-profit" />
                <span className="text-muted-foreground">Best {tab === "buy" ? "Buy" : "Sell"}: ${bestPrice.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="bg-card border border-border rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Crypto</label>
              <div className="flex flex-wrap gap-1">
                {CRYPTO_FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setCryptoFilter(f)}
                    className={`px-2 py-1 rounded-md text-xs ${cryptoFilter === f ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:bg-secondary/80"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Payment Method</label>
              <select
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Sort by</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full h-9 rounded-lg bg-secondary border border-border px-3 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* Search and Amount Filter */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search merchant"
              className="w-full h-10 rounded-lg bg-card border border-border pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>
          <input
            type="number"
            value={amountFilter}
            onChange={e => setAmountFilter(e.target.value)}
            placeholder="Amount (USD)"
            className="h-10 rounded-lg bg-card border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary w-40"
          />
          <Button variant="outline" size="sm" onClick={() => { setSearch(""); setAmountFilter(""); setMethodFilter("All Payment Methods"); setCryptoFilter("All"); }} className="gap-1">
            <X className="h-3 w-3" /> Clear
          </Button>
        </div>

        {/* Offers Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/20">
            <div className="col-span-3">Merchant</div>
            <div className="col-span-2">Price (USD)</div>
            <div className="col-span-3">Amount / Limits</div>
            <div className="col-span-2">Payment Methods</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          <div className="divide-y divide-border">
            {filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground text-sm">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No offers match your filters.
              </div>
            )}
            {filtered.map(offer => {
              const isOwnOffer = offer.userId === currentUser.id;
              const maxTradeAmount = Math.min(offer.remainingAmountCrypto, tab === "buy" ? usdBalance / offer.price : cryptoBalances[offer.crypto] || 0);
              
              return (
                <div key={offer.id} className="p-4 lg:px-5 lg:py-4 hover:bg-secondary/20 transition-colors">
                  {/* Mobile view */}
                  <div className="lg:hidden space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                          {offer.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground">{offer.user}</span>
                            {offer.verified && <span className="text-[10px] text-primary">✓ Verified</span>}
                            {offer.vip && <span className="text-[10px] text-amber-400">VIP</span>}
                            {isOwnOffer && <span className="text-[10px] text-blue-400">Your Ad</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {renderStars(offer.rating)}
                            <span className="text-[10px] text-muted-foreground">{offer.trades} trades</span>
                            <span className="text-[10px] text-profit">{offer.completion}%</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{offer.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">${offer.price.toLocaleString()}</p>
                        <p className={`text-[10px] ${offer.priceChange >= 0 ? "text-profit" : "text-loss"}`}>
                          {offer.priceChange >= 0 ? "+" : ""}{offer.priceChange}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-medium">{offer.remainingAmountCrypto.toFixed(8)} {offer.crypto}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Limits</p>
                        <p className="text-muted-foreground">${offer.remainingMinAmount} - ${offer.remainingMaxAmount.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {offer.methods.map(m => (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{m}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {isOwnOffer ? (
                        <Button variant="outline" size="sm" onClick={() => deleteAd(offer.id)} className="text-xs gap-1">
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      ) : (
                        <>
                          <Button 
                            variant={tab === "buy" ? "cta" : "destructive"} 
                            size="sm" 
                            className="text-xs px-4"
                            onClick={() => setShowTradeModal(offer)}
                            disabled={maxTradeAmount <= 0}
                          >
                            {tab === "buy" ? "Buy" : "Sell"} {offer.crypto}
                          </Button>
                          <button className="p-1.5 rounded-lg hover:bg-secondary">
                            <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Desktop view */}
                  <div className="hidden lg:grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                        {offer.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-foreground">{offer.user}</span>
                          {offer.verified && <span className="text-[10px] text-primary">✓</span>}
                          {offer.vip && <span className="text-[10px] text-amber-400">👑</span>}
                          {isOwnOffer && <span className="text-[10px] text-blue-400">Your Ad</span>}
                        </div>
                        {renderStars(offer.rating)}
                        <p className="text-[10px] text-muted-foreground">
                          {offer.trades} trades | {offer.completion}% completion
                        </p>
                        <p className="text-[10px] text-muted-foreground">{offer.location}</p>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <p className="text-sm font-bold text-foreground">${offer.price.toLocaleString()}</p>
                      {offer.priceChange !== undefined && (
                        <span className={`text-[10px] font-medium ${offer.priceChange >= 0 ? "text-profit" : "text-loss"}`}>
                          {offer.priceChange >= 0 ? "+" : ""}{offer.priceChange}%
                        </span>
                      )}
                    </div>

                    <div className="col-span-3">
                      <p className="text-sm font-medium text-foreground">
                        {offer.remainingAmountCrypto.toFixed(8)} {offer.crypto}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        ${offer.remainingMinAmount} - ${offer.remainingMaxAmount.toLocaleString()} USD
                      </p>
                    </div>

                    <div className="col-span-2 flex flex-wrap gap-1">
                      {offer.methods.map(m => (
                        <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {m}
                        </span>
                      ))}
                    </div>

                    <div className="col-span-2 flex items-center justify-end gap-2">
                      {isOwnOffer ? (
                        <Button variant="outline" size="sm" onClick={() => deleteAd(offer.id)} className="text-xs gap-1">
                          <Trash2 className="h-3 w-3" /> Delete
                        </Button>
                      ) : (
                        <Button
                          variant={tab === "buy" ? "cta" : "destructive"}
                          size="sm"
                          className="text-xs px-4"
                          onClick={() => setShowTradeModal(offer)}
                          disabled={maxTradeAmount <= 0}
                        >
                          {tab === "buy" ? "Buy" : "Sell"} {offer.crypto}
                        </Button>
                      )}
                      <button className="p-1.5 rounded-lg hover:bg-secondary" title="Chat">
                        <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between text-xs py-1 border-b border-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`capitalize px-1.5 py-0.5 rounded ${tx.type === 'deposit' ? 'bg-profit/20 text-profit' : tx.type === 'withdraw' ? 'bg-loss/20 text-loss' : 'bg-primary/20 text-primary'}`}>
                      {tx.type}
                    </span>
                    <span>{tx.crypto ? `${tx.amount.toFixed(6)} ${tx.crypto}` : `$${tx.amount.toFixed(2)}`}</span>
                    {tx.counterparty && <span className="text-muted-foreground">with {tx.counterparty}</span>}
                  </div>
                  <span className="text-muted-foreground">{tx.timestamp.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Shield className="h-4 w-4 text-primary mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Simulator Mode - Demo Trading</p>
              <p>All transactions are simulated. Use Deposit to add funds, Withdraw to send to external addresses. Your crypto addresses are shown in the deposit modal.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trade Modal */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">
                {tab === "buy" ? "Buy" : "Sell"} {showTradeModal.crypto}
              </h2>
              <button onClick={() => { setShowTradeModal(null); setTradeError(""); setTradeAmount(""); }} className="p-1 hover:bg-secondary rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Merchant</p>
                <p className="font-semibold">{showTradeModal.user}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-semibold">${showTradeModal.price.toLocaleString()} per {showTradeModal.crypto}</p>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1">Amount ({showTradeModal.crypto})</label>
                <input
                  type="number"
                  value={tradeAmount}
                  onChange={(e) => {
                    setTradeAmount(e.target.value);
                    setTradeError("");
                  }}
                  placeholder={`Min: ${showTradeModal.remainingMinAmount / showTradeModal.price} Max: ${Math.min(showTradeModal.remainingMaxAmount / showTradeModal.price, showTradeModal.remainingAmountCrypto)}`}
                  className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm text-foreground"
                />
                {tradeAmount && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Total: ${(parseFloat(tradeAmount) * showTradeModal.price).toLocaleString()}
                  </p>
                )}
              </div>
              {tradeError && <p className="text-xs text-loss">{tradeError}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setShowTradeModal(null); setTradeError(""); setTradeAmount(""); }}>
                  Cancel
                </Button>
                <Button
                  variant={tab === "buy" ? "cta" : "destructive"}
                  className="flex-1"
                  onClick={() => {
                    const amount = parseFloat(tradeAmount);
                    if (isNaN(amount) || amount <= 0) {
                      setTradeError("Please enter a valid amount");
                      return;
                    }
                    if (executeTrade(showTradeModal, amount)) {
                      setShowTradeModal(null);
                      setTradeAmount("");
                      setTradeError("");
                    }
                  }}
                >
                  Confirm {tab === "buy" ? "Purchase" : "Sale"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Deposit Funds</h2>
              <button onClick={() => setShowDeposit(false)} className="p-1 hover:bg-secondary rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold mb-2">Fiat Deposit (USD)</h3>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="fiatAmount"
                    placeholder="Amount in USD"
                    className="flex-1 h-10 rounded-lg bg-secondary border border-border px-3 text-sm"
                  />
                  <Button
                    variant="gold"
                    onClick={() => {
                      const amount = parseFloat((document.getElementById("fiatAmount") as HTMLInputElement)?.value);
                      if (amount && amount > 0) {
                        handleDeposit("fiat", undefined, amount);
                        setShowDeposit(false);
                      }
                    }}
                  >
                    Deposit USD
                  </Button>
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold mb-2">Crypto Deposit</h3>
                <p className="text-xs text-muted-foreground mb-3">Send crypto to your personal address below. Funds will be credited automatically (simulated).</p>
                <div className="space-y-3">
                  {SUPPORTED_CRYPTOS.map(crypto => (
                    <div key={crypto.symbol} className="bg-secondary/30 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{crypto.symbol}</span>
                        <span className="text-xs text-muted-foreground">Balance: {cryptoBalances[crypto.symbol]?.toFixed(6) || '0'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-black/20 p-2 rounded break-all">{userAddresses[crypto.symbol]}</code>
                        <button
                          onClick={() => copyToClipboard(userAddresses[crypto.symbol], `deposit_${crypto.symbol}`)}
                          className="p-2 hover:bg-secondary rounded"
                        >
                          {copiedAddress === `deposit_${crypto.symbol}` ? <Check className="h-4 w-4 text-profit" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input
                          type="number"
                          id={`deposit_${crypto.symbol}`}
                          placeholder="Amount to deposit"
                          className="flex-1 h-8 rounded bg-card border border-border px-2 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const amount = parseFloat((document.getElementById(`deposit_${crypto.symbol}`) as HTMLInputElement)?.value);
                            if (amount && amount > 0) {
                              handleDeposit("crypto", crypto.symbol, amount, userAddresses[crypto.symbol]);
                              setShowDeposit(false);
                            }
                          }}
                        >
                          Simulate Deposit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Withdraw Funds</h2>
              <button onClick={() => setShowWithdraw(false)} className="p-1 hover:bg-secondary rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1">Select Asset</label>
                <select id="withdrawAsset" className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm">
                  <option value="fiat">USD (Fiat)</option>
                  {SUPPORTED_CRYPTOS.map(c => (
                    <option key={c.symbol} value={c.symbol}>{c.symbol} - Balance: {cryptoBalances[c.symbol]?.toFixed(6) || '0'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1">Amount</label>
                <input type="number" id="withdrawAmount" placeholder="0.00" className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm" />
              </div>
              <div id="addressField">
                <label className="block text-sm text-foreground mb-1">External Wallet Address</label>
                <input type="text" id="externalAddress" placeholder="Enter recipient address" className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm" />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => {
                  const asset = (document.getElementById("withdrawAsset") as HTMLSelectElement)?.value;
                  const amount = parseFloat((document.getElementById("withdrawAmount") as HTMLInputElement)?.value);
                  const address = (document.getElementById("externalAddress") as HTMLInputElement)?.value;
                  if (asset === "fiat") {
                    if (handleWithdraw("fiat", undefined, amount)) setShowWithdraw(false);
                    else alert("Insufficient USD balance");
                  } else {
                    if (address && handleWithdraw("crypto", asset, amount, address)) setShowWithdraw(false);
                    else alert("Insufficient crypto balance or missing address");
                  }
                }}
              >
                Withdraw
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Post Ad Modal */}
      {showPostAd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">Post New Ad</h2>
              <button onClick={() => setShowPostAd(false)} className="p-1 hover:bg-secondary rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-foreground mb-1">Type</label>
                <div className="flex gap-2">
                  <Button variant={newAd.side === "sell" ? "gold" : "outline"} size="sm" className="flex-1" onClick={() => setNewAd({ ...newAd, side: "sell" })}>
                    Sell
                  </Button>
                  <Button variant={newAd.side === "buy" ? "gold" : "outline"} size="sm" className="flex-1" onClick={() => setNewAd({ ...newAd, side: "buy" })}>
                    Buy
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1">Crypto</label>
                <select className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm" value={newAd.crypto} onChange={e => setNewAd({ ...newAd, crypto: e.target.value })}>
                  {CRYPTO_FILTERS.filter(f => f !== "All").map(c => (<option key={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1">Price (USD)</label>
                <input type="number" value={newAd.price} onChange={e => setNewAd({ ...newAd, price: parseFloat(e.target.value) })} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1">Total Amount ({newAd.crypto})</label>
                <input type="number" value={newAd.amountCrypto} onChange={e => setNewAd({ ...newAd, amountCrypto: parseFloat(e.target.value) })} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1">Min Limit (USD)</label>
                <input type="number" value={newAd.minAmount} onChange={e => setNewAd({ ...newAd, minAmount: parseFloat(e.target.value) })} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-foreground mb-1">Max Limit (USD)</label>
                <input type="number" value={newAd.maxAmount} onChange={e => setNewAd({ ...newAd, maxAmount: parseFloat(e.target.value) })} className="w-full h-10 rounded-lg bg-secondary border border-border px-3 text-sm" />
              </div>
              <Button variant="gold" className="w-full" onClick={handlePostAd}>Post Ad</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default P2PMarketPage;
