import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone, Loader2, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

const QUICK_KES = [500, 1000, 2500, 5000, 10000, 25000];
const KES_TO_USD_RATE = 0.0077; // ~1 USD = 130 KES

const MpesaDepositForm = ({ onBack }: Props) => {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"form" | "pending" | "success" | "failed">("form");
  const [loading, setLoading] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleSubmit = async () => {
    if (!user) return toast.error("Not authenticated");
    if (!phone || phone.length < 9) return toast.error("Enter a valid phone number");
    const amt = Number(amount);
    if (!amt || amt < 50) return toast.error("Minimum deposit is KES 50");

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          phone_number: phone,
          amount: amt,
          user_id: user.id,
          currency: "KES",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPaymentRef(data?.reference || data?.payment_id || "");
      setStep("pending");
      toast.success("Check your phone for the M-PESA prompt!");
      startPolling();
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate M-PESA payment");
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    setPollCount(0);
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      setPollCount(prev => {
        if (prev >= 30) {
          // 5 min timeout
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("failed");
          return prev;
        }
        return prev + 1;
      });

      // Check for new M-PESA transaction
      if (!user) return;
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("network", "M-PESA")
        .order("created_at", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const latest = data[0];
        const created = new Date(latest.created_at).getTime();
        if (Date.now() - created < 600000) {
          // Within 10 min
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("success");
          toast.success("M-PESA payment received!");
        }
      }
    }, 10000);
  };

  const usdEquivalent = (Number(amount) * KES_TO_USD_RATE).toFixed(2);

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to methods
      </button>

      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
          <Smartphone className="h-7 w-7 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">M-PESA Deposit</h2>
        <p className="text-xs text-muted-foreground mt-1">Funds will be added to your fiat (USD) wallet</p>
      </div>

      {step === "form" && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+254</span>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="7XXXXXXXX"
                maxLength={10}
                className="w-full h-12 pl-14 pr-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Amount (KES)</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0"
              min="50"
              className="w-full h-12 px-4 rounded-xl bg-secondary border border-border text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all tabular-nums"
            />
            {Number(amount) > 0 && (
              <p className="text-xs text-muted-foreground mt-1">≈ ${usdEquivalent} USD</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_KES.map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  Number(amount) === amt
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-secondary text-muted-foreground hover:border-emerald-500/40"
                }`}
              >
                KES {amt.toLocaleString()}
              </button>
            ))}
          </div>

          <div className="bg-secondary/50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-foreground">KES {Number(amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="text-foreground">1 USD ≈ {(1 / KES_TO_USD_RATE).toFixed(0)} KES</span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between text-sm font-semibold">
              <span className="text-foreground">You receive</span>
              <span className="text-emerald-400">${usdEquivalent} USD</span>
            </div>
          </div>

          <Button
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={handleSubmit}
            disabled={loading || !phone || !amount}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
            {loading ? "Sending prompt..." : "Pay with M-PESA"}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            An STK push will be sent to your phone. Enter your M-PESA PIN to confirm.
          </p>
        </div>
      )}

      {step === "pending" && (
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto animate-pulse">
            <RefreshCw className="h-8 w-8 text-amber-400 animate-spin" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Waiting for Payment</h3>
          <p className="text-sm text-muted-foreground">
            Check your phone and enter your M-PESA PIN to complete the payment
          </p>
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-xs text-muted-foreground">Amount: <span className="text-foreground font-medium">KES {Number(amount).toLocaleString()}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Phone: <span className="text-foreground font-medium">+254{phone}</span></p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Polling... ({pollCount}/30) — This may take up to 5 minutes
          </p>
          <Button variant="outline" size="sm" onClick={() => { if (pollRef.current) clearInterval(pollRef.current); setStep("form"); }}>
            Cancel
          </Button>
        </div>
      )}

      {step === "success" && (
        <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Payment Received!</h3>
          <p className="text-sm text-muted-foreground">
            KES {Number(amount).toLocaleString()} (≈ ${usdEquivalent} USD) has been received and is pending admin approval.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => { setStep("form"); setAmount(""); setPhone(""); }}>
              New Deposit
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onBack}>
              Done
            </Button>
          </div>
        </div>
      )}

      {step === "failed" && (
        <div className="bg-card border border-destructive/30 rounded-2xl p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Payment Timeout</h3>
          <p className="text-sm text-muted-foreground">
            We didn't receive a confirmation. If you completed the payment, it may still be processing.
          </p>
          <Button variant="outline" size="sm" onClick={() => setStep("form")}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export default MpesaDepositForm;
