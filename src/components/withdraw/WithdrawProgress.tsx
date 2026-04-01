import { useState, useEffect } from "react";
import { Loader2, ExternalLink, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface WithdrawProgressProps {
  transactionId: string;
  symbol: string;
  network: string;
  walletAddress: string;
  amountUSD: number;
  feePercent: number;
  feeUSD: number;
  netUSD: number;
  netCrypto: number;
  cryptoAmount: number;
  onDone: () => void;
}

function getExplorerUrl(network: string, address: string) {
  if (network === "TRC-20") return `https://tronscan.org/#/address/${address}`;
  if (network === "ERC-20") return `https://etherscan.io/address/${address}`;
  if (network === "BEP-20") return `https://bscscan.com/address/${address}`;
  if (network === "BTC") return `https://www.blockchain.com/btc/address/${address}`;
  if (network === "SOL") return `https://solscan.io/account/${address}`;
  return null;
}

function getExplorerName(network: string) {
  if (network === "TRC-20") return "TronScan";
  if (network === "ERC-20") return "Etherscan";
  if (network === "BEP-20") return "BscScan";
  if (network === "BTC") return "Blockchain.com";
  if (network === "SOL") return "Solscan";
  return "Explorer";
}

export default function WithdrawProgress({
  transactionId, symbol, network, walletAddress,
  amountUSD, feePercent, feeUSD, netUSD, netCrypto, cryptoAmount, onDone,
}: WithdrawProgressProps) {
  const [status, setStatus] = useState<string>("pending");
  const [refreshing, setRefreshing] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(20);

  // Poll for status
  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("status")
        .eq("id", transactionId)
        .single();
      if (data) setStatus(data.status);
    };
    check();
    const iv = setInterval(check, 15000);
    return () => clearInterval(iv);
  }, [transactionId]);

  // Countdown timer
  useEffect(() => {
    if (minutesLeft <= 0) return;
    const t = setInterval(() => setMinutesLeft(m => Math.max(0, m - 1)), 60000);
    return () => clearInterval(t);
  }, [minutesLeft]);

  const refresh = async () => {
    setRefreshing(true);
    const { data } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .single();
    if (data) setStatus(data.status);
    setRefreshing(false);
  };

  const explorerUrl = getExplorerUrl(network, walletAddress);
  const explorerName = getExplorerName(network);
  const dec = symbol === "USDT" ? 2 : 6;
  const statusLabel = status === "pending" ? "Confirming" : status === "completed" ? "Completed" : "Rejected";
  const statusColor = status === "pending" ? "text-primary" : status === "completed" ? "text-emerald-400" : "text-destructive";

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          {status === "pending" && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
          <h2 className="text-lg font-display font-bold text-foreground">Withdrawal In Progress</h2>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            status === "pending" ? "bg-primary/10 border-primary/30 text-primary" :
            status === "completed" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
            "bg-destructive/10 border-destructive/30 text-destructive"
          }`}>
            {status === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
            {statusLabel}
          </span>
          <span className="text-xs text-muted-foreground">#{transactionId.slice(0, 8)}</span>
        </div>

        {/* Breakdown */}
        <div className="bg-secondary/50 rounded-xl divide-y divide-border">
          <div className="flex justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="text-sm font-semibold text-foreground">{cryptoAmount.toFixed(dec)} {symbol}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">Fee ({feePercent}%)</span>
            <span className="text-sm font-semibold text-destructive">-{feeUSD.toFixed(dec)} {symbol}</span>
          </div>
          <div className="flex justify-between px-4 py-3">
            <span className="text-sm text-muted-foreground">You Receive</span>
            <span className="text-sm font-bold text-emerald-400">{netCrypto.toFixed(dec)} {symbol}</span>
          </div>
        </div>
      </div>

      {/* Recipient */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">Recipient Address</p>
        <p className="font-mono text-sm text-foreground break-all">{walletAddress}</p>
      </div>

      {/* Explorer Link */}
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
        >
          <ExternalLink className="h-4 w-4" />
          View on {explorerName}
        </a>
      )}

      {/* Processing notice */}
      {status === "pending" && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-muted-foreground">
            Processing. Cancel option available in {minutesLeft} mins.
          </p>
        </div>
      )}

      {/* Refresh */}
      <Button
        variant="outline"
        className="w-full h-11 rounded-xl"
        onClick={refresh}
        disabled={refreshing}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
        Refresh
      </Button>

      {status !== "pending" && (
        <Button variant="gold" className="w-full h-11 rounded-xl" onClick={onDone}>
          Done
        </Button>
      )}
    </div>
  );
}
