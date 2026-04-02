import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { Copy, Check, AlertTriangle, RefreshCw, X, Loader2, Clock, ArrowLeft, DollarSign } from "lucide-react";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useWallets } from "@/hooks/useWallets";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettingsDB } from "@/hooks/useSiteSettingsDB";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import DepositMethodSelector from "@/components/deposit/DepositMethodSelector";
import MpesaDepositForm from "@/components/deposit/MpesaDepositForm";

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

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];
const MIN_USDT_EQUIVALENT = 20;

const DepositPage = () => {
  const { settings, isLoading: settingsLoading } = useSiteSettingsDB();
  const [depositMethod, setDepositMethod] = useState<"choose" | "crypto" | "fiat">("choose");
  const { prices } = useCryptoPrices();
  const { user } = useAuth();
  const { fetchWallets } = useWallets();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [copied, setCopied] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [monitorId, setMonitorId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [monitorStatus, setMonitorStatus] = useState<"idle" | "monitoring" | "detected" | "expired">("idle");
  const [depositHistory, setDepositHistory] = useState<any[]>([]);
  const [depositAmount, setDepositAmount] = useState("");
  const [step, setStep] = useState<"amount" | "address">("amount");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build wallet entries from settings
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

  const selected = walletEntries[selectedIdx];

  // Sync network with selected coin
  useEffect(() => {
    if (selected) {
      setSelectedNetwork(selected.network);
    }
  }, [selectedIdx, selected?.network]);

  // Fetch deposit history
  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("deposit_monitors")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (data) setDepositHistory(data);
    };
    fetchHistory();
  }, [user, monitorStatus]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleCopy = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Address copied to clipboard");
  };

  const proceedToAddress = () => {
    const amt = Number(depositAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid positive amount");
      return;
    }
    if (amt < selected.minAmount) {
      toast.warning(
        `Minimum deposit is ${selected.minAmount.toFixed(selected.id === "tether" ? 2 : 8)} ${selected.symbol} ` +
        `(~$${MIN_USDT_EQUIVALENT} USD)`
      );
      return;
    }
    setStep("address");
  };

  const startMonitoring = async () => {
    if (!user || !selected) {
      toast.error("User not authenticated or no coin selected");
      return;
    }

    const amt = Number(depositAmount);
    if (amt < selected.minAmount) {
      toast.warning(
        `Minimum deposit is ${selected.minAmount.toFixed(selected.id === "tether" ? 2 : 8)} ${selected.symbol}`
      );
      return;
    }

    // Original working monitoring logic
    const { data, error } = await supabase
      .from("deposit_monitors")
      .insert({
        user_id: user.id,
        crypto_id: selected.id,
        network: selectedNetwork,
        address: selected.address,
        status: "monitoring",
      })
      .select()
      .single();

    if (error) {
      console.error("Start monitoring error:", error);
      toast.error("Failed to start monitoring. Please try again.");
      return;
    }

    setMonitorId(data.id);
    setMonitoring(true);
    setMonitorStatus("monitoring");
    setCountdown(10);
    toast.success("Monitoring started. We'll notify you when the deposit is detected.");
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
            setMonitorStatus("detected");
            setMonitoring(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            toast.success(`Transaction detected! ${data.amount} received.`);
            fetchWallets();
          } else if (data?.status === "expired") {
            setMonitorStatus("expired");
            setMonitoring(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
          }
        } catch {}
      };
      check();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(check, 10000);
    },
    [fetchWallets]
  );

  const cancelMonitoring = async () => {
    if (monitorId) {
      await supabase.from("deposit_monitors").update({ status: "cancelled" }).eq("id", monitorId);
    }
    setMonitoring(false);
    setMonitorStatus("idle");
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const resetFlow = () => {
    setStep("amount");
    setDepositAmount("");
    setMonitorStatus("idle");
    setMonitoring(false);
  };

  if (settingsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (walletEntries.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-center p-4">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No deposit wallets configured. Please contact support.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Deposit Funds</h1>
          <p className="text-sm text-muted-foreground">Choose a currency and complete the deposit</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2">
          {["Amount", "Address", "Monitor"].map((label, idx) => {
            let status: "active" | "completed" | "pending" = "pending";
            if (step === "amount" && idx === 0) status = "active";
            else if (step === "address" && idx === 1) status = "active";
            else if (monitorStatus !== "idle" && idx === 2) status = "active";
            else if ((step === "address" && idx === 0) || (monitorStatus !== "idle" && idx === 0) || (monitorStatus !== "idle" && idx === 1)) status = "completed";
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    status === "active"
                      ? "bg-primary text-white ring-2 ring-primary/50"
                      : status === "completed"
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {status === "completed" ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            );
          })}
        </div>

        {/* Coin selector pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {walletEntries.map((coin, idx) => (
            <button
              key={coin.id}
              onClick={() => {
                setSelectedIdx(idx);
                resetFlow();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                selectedIdx === idx
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

        {selected && (
          <>
            {/* Network selector */}
            <div className="flex flex-wrap gap-2 justify-center">
              {selected.networks.map((net) => (
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

            {/* Step 1: Amount */}
            {step === "amount" && (
              <div className="bg-card border border-border rounded-2xl p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Deposit Amount ({selected.symbol})
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-12 pl-9 pr-4 rounded-xl bg-secondary border border-border text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all tabular-nums"
                      step="any"
                      min="0"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Minimum: {selected.minAmount.toFixed(selected.id === "tether" ? 2 : 8)} {selected.symbol} (~${MIN_USDT_EQUIVALENT} USD)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((amt) => {
                    const converted = selected.id === "tether" ? amt : (amt / selected.currentPrice);
                    return (
                      <button
                        key={amt}
                        onClick={() => setDepositAmount(converted.toFixed(selected.id === "tether" ? 2 : 8))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          Number(depositAmount) === converted
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        ${amt}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="gold"
                  className="w-full h-12"
                  onClick={proceedToAddress}
                  disabled={!depositAmount || Number(depositAmount) <= 0}
                >
                  Continue
                </Button>
              </div>
            )}

            {/* Step 2: Address & QR */}
            {step === "address" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Send exactly</p>
                    <p className="text-3xl font-bold text-foreground tabular-nums">
                      {depositAmount} {selected.symbol}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">via {selectedNetwork}</p>
                  </div>

                  <div className="flex justify-center">
                    <div className="bg-[#0a0a0a] p-4 rounded-xl inline-block">
                      <QRCodeSVG
                        value={selected.address}
                        size={180}
                        bgColor="#0a0a0a"
                        fgColor="#22c55e"
                        level="M"
                      />
                    </div>
                  </div>

                  <div className="bg-secondary rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground mb-0.5">Deposit Address</p>
                        <p className="text-xs font-mono text-foreground break-all">{selected.address}</p>
                      </div>
                      <button
                        onClick={handleCopy}
                        className="shrink-0 p-2 rounded-lg bg-card border border-border hover:border-primary/40 transition-colors"
                        title="Copy address"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Important notice */}
                <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">Important</span>
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
                    <li>Only send {selected.symbol} via the {selectedNetwork} network</li>
                    <li>Send exactly {depositAmount} {selected.symbol}</li>
                    <li>You have 30 minutes to complete this transaction</li>
                    <li>Sending other tokens may result in permanent loss</li>
                  </ul>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep("amount")}
                    className="gap-1.5"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    variant="gold"
                    className="flex-1 h-12"
                    onClick={startMonitoring}
                    disabled={monitoring}
                  >
                    I've Sent — Start Monitoring
                  </Button>
                </div>
              </div>
            )}

            {/* Monitoring States */}
            {monitorStatus === "monitoring" && (
              <div className="bg-card border border-border rounded-xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Scanning blockchain...</p>
                      <p className="text-[10px] text-muted-foreground">
                        Looking for {depositAmount} {selected.symbol} on {selectedNetwork}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">Next check</p>
                    <p className="text-xl font-bold text-emerald-400 tabular-nums">{countdown}s</p>
                  </div>
                </div>
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${(10 - countdown) * 10}%` }}
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" className="flex-1" onClick={cancelMonitoring}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => monitorId && pollForDeposit(monitorId)}
                    title="Refresh"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {monitorStatus === "detected" && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-emerald-400">Transaction Detected!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your deposit is being processed and will be credited shortly.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={resetFlow}
                >
                  New Deposit
                </Button>
              </div>
            )}

            {monitorStatus === "expired" && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-center animate-in fade-in slide-in-from-bottom-2 duration-200">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <p className="text-sm font-semibold text-destructive">Session Expired</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No transaction detected within the time limit.
                </p>
                <Button
                  variant="gold"
                  size="sm"
                  className="mt-3"
                  onClick={resetFlow}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Deposit History */}
            {depositHistory.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Recent Deposits
                </h3>
                <div className="space-y-2">
                  {depositHistory.map((d) => (
                    <div key={d.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {COIN_META[d.crypto_id]?.symbol || d.crypto_id.toUpperCase()}
                          </span>
                          {d.amount && (
                            <span className="text-xs text-muted-foreground">
                              {Number(d.amount).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(d.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.status === "detected" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Completed
                          </span>
                        )}
                        {d.status === "expired" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Expired
                          </span>
                        )}
                        {d.status === "monitoring" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Monitoring
                          </span>
                        )}
                        {d.status === "cancelled" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                            Cancelled
                          </span>
                        )}
                        {d.network && (
                          <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                            {d.network}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DepositPage;
