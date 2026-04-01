import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Mail, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewData {
  cryptoId: string;
  symbol: string;
  amountUSD: number;
  cryptoAmount: number;
  feePercent: number;
  feeUSD: number;
  netUSD: number;
  netCrypto: number;
  walletAddress: string;
  network: string;
}

interface WithdrawReviewProps {
  data: ReviewData;
  onBack: () => void;
  onConfirmed: (transactionId: string) => void;
}

export default function WithdrawReview({ data, onBack, onConfirmed }: WithdrawReviewProps) {
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendOTP = useCallback(async () => {
    setSending(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("send-withdraw-otp", {
        body: {
          action: "send",
          transaction_data: {
            crypto_id: data.cryptoId,
            amount: data.cryptoAmount,
            usd_amount: data.netUSD,
            wallet_address: data.walletAddress,
            network: data.network,
          },
        },
      });
      if (error) throw error;
      setOtpId(res.otp_id);
      setCodeSent(true);
      setCountdown(60);
      toast.success("Verification code sent to your email");
    } catch (err: any) {
      toast.error(err.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  }, [data]);

  // Auto-send OTP on mount
  useEffect(() => {
    sendOTP();
  }, []);

  const verifyOTP = async () => {
    if (code.length !== 6) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setVerifying(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("send-withdraw-otp", {
        body: { action: "verify", otp_id: otpId, code },
      });
      if (error) throw error;
      if (res.verified) {
        toast.success("Withdrawal submitted!");
        onConfirmed(res.transaction_id);
      } else {
        toast.error(res.error || "Verification failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const truncateAddr = (a: string) =>
    a.length > 20 ? `${a.slice(0, 12)}...${a.slice(-8)}` : a;

  return (
    <div className="space-y-5">
      {/* Code Sent Banner */}
      {codeSent && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="font-semibold text-foreground text-sm">Code Sent</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            A verification code has been sent to your email
          </p>
        </div>
      )}

      {/* Summary */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className="text-sm font-semibold text-foreground">
            {data.cryptoAmount.toFixed(6)} {data.symbol}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Fee ({data.feePercent}%)</span>
          <span className="text-sm font-semibold text-destructive">
            -{data.feeUSD.toFixed(2)} {data.symbol === "USDT" ? "USDT" : "USD"}
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Network</span>
          <span className="text-sm font-semibold text-foreground">
            {data.network.includes("TRC") ? "TRON" : data.network.includes("ERC") ? "Ethereum" : data.network.includes("BEP") ? "BSC" : data.network} ({data.network})
          </span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">Wallet</span>
          <span className="text-sm font-semibold text-foreground">Spot Wallet</span>
        </div>
        <div className="flex justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">You Receive</span>
          <span className="text-sm font-bold text-emerald-400">
            {data.netCrypto.toFixed(selectedDecimal(data.symbol))} {data.symbol}
          </span>
        </div>
      </div>

      {/* To Address */}
      <div>
        <p className="text-xs text-muted-foreground mb-1">To Address</p>
        <div className="bg-secondary rounded-xl px-4 py-3 font-mono text-sm text-primary break-all">
          {data.walletAddress}
        </div>
      </div>

      {/* Email Verification */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Email Verification</span>
          </div>
          {countdown > 0 ? (
            <span className="text-xs text-primary font-medium">Resend ({countdown}s)</span>
          ) : (
            <button onClick={sendOTP} disabled={sending} className="text-xs text-primary font-medium hover:underline">
              {sending ? "Sending..." : "Resend"}
            </button>
          )}
        </div>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6-digit verification code"
          className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-center text-lg font-mono tracking-[0.5em] text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/30 rounded-xl">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Please verify the recipient address carefully. Crypto transactions cannot be reversed.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onBack}>
          Back
        </Button>
        <Button
          variant="gold"
          className="flex-1 h-12 rounded-xl"
          disabled={code.length !== 6 || verifying}
          onClick={verifyOTP}
        >
          {verifying ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Confirm Withdrawal
        </Button>
      </div>
    </div>
  );
}

function selectedDecimal(symbol: string) {
  return symbol === "USDT" || symbol === "USD" ? 2 : 6;
}
