import { useState, useEffect, useRef, useCallback } from "react";
import { Star, Crown, Gem, Check, X, Wallet, Copy, Loader2, AlertTriangle, ArrowLeft, DollarSign, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettingsDB } from "@/hooks/useSiteSettingsDB";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useWallets } from "@/hooks/useWallets";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

// Tier definitions (same as original)
const TIERS = [
  {
    id: "pro",
    label: "Pro",
    icon: Star,
    price: 99,
    color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    features: ["Access Pro bots", "Priority signals", "Advanced analytics"],
  },
  {
    id: "elite",
    label: "Elite",
    icon: Crown,
    price: 299,
    color: "text-purple-400 border-purple-500/30 bg-purple-500/10",
    features: ["Access Elite + Pro bots", "AI strategies", "Premium support", "Higher limits"],
  },
  {
    id: "vip",
    label: "VIP",
    icon: Gem,
    price: 999,
    color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
    features: ["All bot tiers", "Exclusive VIP bots", "1-on-1 support", "Early access", "Custom strategies"],
  },
];

// Coin metadata (same as DepositPage)
const COIN_META: Record<string, { symbol: string; name: string; color: string; networks: string[] }> = {
  tether: { symbol: "USDT", name: "Tether", color: "#26A17B", networks: ["TRC-20", "ERC-20"] },
  bitcoin: { symbol: "BTC", name: "Bitcoin", color: "#F7931A", networks: ["BTC"] },
  ethereum: { symbol: "ETH", name: "Ethereum", color: "#627EEA", networks: ["ERC-20"] },
  binancecoin: { symbol: "BNB", name: "BNB", color: "#F3BA2F", networks: ["BEP-20"] },
  ripple: { symbol: "XRP", name: "Ripple", color: "#23292F", networks: ["XRP"] },
  solana: { symbol: "SOL", name: "Solana", color: "#9945FF", networks: ["SOL"] },
  cardano: { symbol: "ADA", name: "Cardano", color: "#0033AD", networks: ["ADA"] },
  dogecoin: { symbol: "DOGE", name: "Dogecoin", color: "#C2A633", networks: ["DOGE"] },
  tron: { symbol: "TRX", name: "Tron", color: "#FF0013", networks: ["TRC-20"] },
  litecoin: { symbol: "LTC", name: "Litecoin", color: "#BFBBBB", networks: ["LTC"] },
};

const MIN_USDT_EQUIVALENT = 20; // minimum deposit in USD

export default function UpgradeTierModal({ currentTier, onClose, onUpgraded }: { currentTier: string; onClose: () => void; onUpgraded: () => void }) {
  const { user } = useAuth();
  const { settings, isLoading: settingsLoading } = useSiteSettingsDB();
  const { prices } = useCryptoPrices();
  const { fetchWallets } = useWallets();

  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "deposit">("select");

  // Deposit flow state
  const [selectedCoinIdx, setSelectedCoinIdx] = useState(0);
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositStep, setDepositStep] = useState<"coin" | "address" | "monitoring">("coin");
  const [monitorId, setMonitorId] = useState<string | null>(null);
  const [monitorStatus, setMonitorStatus] = useState<"idle" | "monitoring" | "detected" | "expired">("idle");
  const [countdown, setCountdown] = useState(10);
  const [copied, setCopied] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = TIERS.find(t => t.id === selectedTier);
  const tierPriceUSD = selected?.price || 0;

  // Build wallet entries from site settings (same as DepositPage)
  const walletEntries = Object.entries(settings?.deposit_wallets || {})
    .filter(([_, val]) => val?.address)
    .map(([id, config]) => {
      const price = prices.find(p => p.id === id)?.current_price || 0;
      const minAmountInCoin = price > 0 ? MIN_USDT_EQUIVALENT / price : MIN_USDT_EQUIVALENT;
      return {
        id,
        symbol: COIN_META[id]?.symbol || id.toUpperCase(),
        name: COIN_META[id]?.name || id,
        color: COIN_META[id]?.color || "#888",
        address: config.address,
        network: config.network || COIN_META[id]?.networks?.[0] || "TRC-20",
        networks: COIN_META[id]?.networks || [config.network || "TRC-20"],
        recommended: config.recommended || false,
        image: prices.find(p => p.id === id)?.image || "",
        currentPrice: price,
        minAmount: minAmountInCoin,
      };
    });

  const selectedCoin = walletEntries[selectedCoinIdx];

  // Prefill amount when coin or tier changes
  useEffect(() => {
    if (selectedCoin && tierPriceUSD > 0 && selectedCoin.currentPrice > 0) {
      const requiredCrypto = tierPriceUSD / selectedCoin.currentPrice;
      setDepositAmount(requiredCrypto.toFixed(selectedCoin.id === "tether" ? 2 : 8));
    }
  }, [selectedCoin, tierPriceUSD]);

  // Sync network with selected coin
  useEffect(() => {
    if (selectedCoin) {
      setSelectedNetwork(selectedCoin.network);
    }
  }, [selectedCoinIdx, selectedCoin?.network]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleCopy = () => {
    if (!selectedCoin) return;
    navigator.clipboard.writeText(selectedCoin.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Address copied");
  };

  const startMonitoring = async () => {
    if (!user || !selectedCoin) {
      toast.error("Missing user or coin info");
      return;
    }
    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Invalid amount");
      return;
    }
    if (amountNum < selectedCoin.minAmount) {
      toast.warning(`Minimum is ${selectedCoin.minAmount.toFixed(selectedCoin.id === "tether" ? 2 : 8)} ${selectedCoin.symbol}`);
      return;
    }

    const { data, error } = await supabase
      .from("deposit_monitors")
      .insert({
        user_id: user.id,
        crypto_id: selectedCoin.id,
        network: selectedNetwork,
        address: selectedCoin.address,
        amount: amountNum,
        status: "monitoring",
        metadata: { tier_upgrade: selectedTier, usd_amount: tierPriceUSD },
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to start monitoring");
      console.error(error);
      return;
    }

    setMonitorId(data.id);
    setMonitorStatus("monitoring");
    setDepositStep("monitoring");
    setCountdown(10);
    toast.success("Monitoring started – we'll detect your payment");
    pollForDeposit(data.id);
  };

  const pollForDeposit = useCallback(
    (mId: string) => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(10);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => (prev <= 1 ? 10 : prev - 1));
      }, 1000);

      const check = async () => {
        try {
          const { data, error } = await supabase.functions.invoke("check-deposit", {
            body: { monitor_id: mId },
          });
          if (error) return;
          if (data?.status === "detected") {
            // Upgrade the user's tier
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ account_tier: selectedTier })
              .eq("user_id", user?.id);
            if (updateError) {
              toast.error("Deposit detected but tier upgrade failed. Contact support.");
            } else {
              toast.success(`Upgraded to ${selected?.label}!`);
              onUpgraded();
              onClose();
            }
            setMonitorStatus("detected");
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            fetchWallets();
          } else if (data?.status === "expired") {
            setMonitorStatus("expired");
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
          }
        } catch (err) {
          console.error("Poll error", err);
        }
      };
      check();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(check, 10000);
    },
    [fetchWallets, selectedTier, selected?.label, user, onUpgraded, onClose]
  );

  const cancelMonitoring = async () => {
    if (monitorId) {
      await supabase.from("deposit_monitors").update({ status: "cancelled" }).eq("id", monitorId);
    }
    setMonitorStatus("idle");
    setDepositStep("coin");
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const resetDeposit = () => {
    setDepositStep("coin");
    setMonitorStatus("idle");
    setMonitorId(null);
  };

  const handleProceedToAddress = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (amt < selectedCoin.minAmount) {
      toast.warning(`Minimum deposit is ${selectedCoin.minAmount.toFixed(selectedCoin.id === "tether" ? 2 : 8)} ${selectedCoin.symbol}`);
      return;
    }
    setDepositStep("address");
  };

  // Render logic
  if (settingsLoading) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
        <div className="bg-card border border-border rounded-2xl p-6">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  if (walletEntries.length === 0) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60">
        <div className="bg-card border border-border rounded-2xl p-6 max-w-sm text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No deposit wallets configured. Please contact support.</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-bold text-foreground">
            {step === "select" ? "Upgrade Account Tier" : `Pay with Crypto`}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === "select" && (
          <div className="p-4 space-y-3">
            {TIERS.filter(t => {
              const order: Record<string, number> = { free: 0, pro: 1, elite: 2, vip: 3 };
              return (order[t.id] || 0) > (order[currentTier?.toLowerCase()] || 0);
            }).map(tier => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.id}
                  onClick={() => setSelectedTier(tier.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedTier === tier.id ? `${tier.color} border-current` : "border-border hover:border-muted-foreground/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-bold text-foreground">{tier.label}</span>
                    </div>
                    <span className="text-lg font-bold text-foreground">${tier.price}</span>
                  </div>
                  <ul className="space-y-1">
                    {tier.features.map(f => (
                      <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-emerald-400" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <Button
              className="w-full h-11 mt-2"
              disabled={!selectedTier}
              onClick={() => setStep("deposit")}
            >
              {selectedTier ? `Upgrade to ${selected?.label} — $${selected?.price}` : "Select a tier"}
            </Button>
          </div>
        )}

        {step === "deposit" && selectedCoin && (
          <div className="p-4 space-y-4">
            {/* Coin selector pills */}
            <div className="flex flex-wrap gap-2 justify-center">
              {walletEntries.map((coin, idx) => (
                <button
                  key={coin.id}
                  onClick={() => {
                    setSelectedCoinIdx(idx);
                    resetDeposit();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedCoinIdx === idx
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {coin.image ? (
                    <img src={coin.image} alt={coin.symbol} className="w-4 h-4 rounded-full" />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                      style={{ backgroundColor: coin.color }}
                    >
                      {coin.symbol.slice(0, 2)}
                    </div>
                  )}
                  {coin.symbol}
                  {coin.recommended && (
                    <span className="ml-1 text-[8px] bg-primary/20 text-primary px-1 rounded">Rec</span>
                  )}
                </button>
              ))}
            </div>

            {/* Network selector */}
            <div className="flex flex-wrap gap-2 justify-center">
              {selectedCoin.networks.map((net) => (
                <button
                  key={net}
                  onClick={() => setSelectedNetwork(net)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedNetwork === net
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-card text-muted-foreground hover:border-emerald-500/40"
                  }`}
                >
                  {net === "TRC-20" ? "TRON Network" : net === "ERC-20" ? "Ethereum" : net}
                </button>
              ))}
            </div>

            {/* Step: coin (amount entry) */}
            {depositStep === "coin" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Amount to send ({selectedCoin.symbol})
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full h-12 pl-9 pr-4 rounded-xl bg-secondary border border-border text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all tabular-nums"
                        step="any"
                        min="0"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Required for {selected?.label} tier: ${tierPriceUSD} USD ≈ {depositAmount} {selectedCoin.symbol}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Minimum: {selectedCoin.minAmount.toFixed(selectedCoin.id === "tether" ? 2 : 8)} {selectedCoin.symbol}
                    </p>
                  </div>
                  <Button
                    variant="gold"
                    className="w-full h-11"
                    onClick={handleProceedToAddress}
                  >
                    Continue to Address
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setStep("select")}
                  >
                    ← Back to Tiers
                  </Button>
                </div>
              </div>
            )}

            {/* Step: address & QR */}
            {depositStep === "address" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Send exactly</p>
                    <p className="text-2xl font-bold text-foreground tabular-nums">
                      {depositAmount} {selectedCoin.symbol}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">via {selectedNetwork}</p>
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-[#0a0a0a] p-4 rounded-xl inline-block">
                      <QRCodeSVG value={selectedCoin.address} size={160} bgColor="#0a0a0a" fgColor="#22c55e" level="M" />
                    </div>
                  </div>

                  <div className="bg-secondary rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Deposit Address</p>
                        <p className="text-xs font-mono text-foreground break-all">{selectedCoin.address}</p>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="shrink-0 p-2 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">Important</span>
                    </div>
                    <ul className="space-y-1 text-[10px] text-muted-foreground list-disc list-inside">
                      <li>Only send {selectedCoin.symbol} via {selectedNetwork}</li>
                      <li>Send exactly {depositAmount} {selectedCoin.symbol}</li>
                      <li>You have 30 minutes to complete</li>
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDepositStep("coin")} className="gap-1.5">
                      <ArrowLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button variant="gold" className="flex-1 h-11" onClick={startMonitoring}>
                      I've Sent — Start Monitoring
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Monitoring states */}
            {depositStep === "monitoring" && monitorStatus === "monitoring" && (
              <div className="bg-card border border-border rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Scanning blockchain...</p>
                      <p className="text-[10px] text-muted-foreground">
                        Looking for {depositAmount} {selectedCoin.symbol} on {selectedNetwork}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Next check</p>
                    <p className="text-xl font-bold text-emerald-400 tabular-nums">{countdown}s</p>
                  </div>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(10 - countdown) * 10}%` }} />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={cancelMonitoring}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => monitorId && pollForDeposit(monitorId)} title="Refresh">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {monitorStatus === "detected" && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-emerald-400">Upgrade Successful!</p>
                <p className="text-xs text-muted-foreground mt-1">Your account is now {selected?.label}.</p>
              </div>
            )}

            {monitorStatus === "expired" && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm font-semibold text-destructive">Session Expired</p>
                <p className="text-xs text-muted-foreground mt-1">No transaction detected.</p>
                <Button variant="gold" size="sm" className="mt-3" onClick={resetDeposit}>
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
