import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Smartphone, Loader2, Check, AlertTriangle, RefreshCw, Globe } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

// M-PESA supported countries
const MPESA_COUNTRIES = [
  { code: "KE", name: "Kenya", dialCode: "254", phoneLength: 9, currency: "KES", rateToUSD: 0.0077 },
  { code: "TZ", name: "Tanzania", dialCode: "255", phoneLength: 9, currency: "TZS", rateToUSD: 0.00038 },
  { code: "UG", name: "Uganda", dialCode: "256", phoneLength: 9, currency: "UGX", rateToUSD: 0.00027 },
  { code: "RW", name: "Rwanda", dialCode: "250", phoneLength: 9, currency: "RWF", rateToUSD: 0.00078 },
  { code: "CD", name: "DR Congo", dialCode: "243", phoneLength: 9, currency: "CDF", rateToUSD: 0.00038 },
  { code: "MZ", name: "Mozambique", dialCode: "258", phoneLength: 9, currency: "MZN", rateToUSD: 0.0157 },
];

// Quick amounts in local currency (KES, TZS, etc.) – will be converted per country
const QUICK_AMOUNTS = [500, 1000, 2500, 5000, 10000, 25000];

// Normalize phone number to international format (no '+')
const normalizePhoneNumber = (raw: string, dialCode: string, expectedLength: number): string => {
  let cleaned = raw.replace(/\D/g, '');
  
  // Remove leading dial code if present
  if (cleaned.startsWith(dialCode)) {
    cleaned = cleaned.slice(dialCode.length);
  }
  // Remove leading '0' if present (common in local dialing)
  else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  // If starts with '+', remove it
  if (raw.startsWith('+')) {
    cleaned = raw.slice(1).replace(/\D/g, '');
    if (cleaned.startsWith(dialCode)) {
      cleaned = cleaned.slice(dialCode.length);
    }
  }
  
  // Validate length
  if (cleaned.length !== expectedLength) {
    throw new Error(`Phone number must be ${expectedLength} digits after ${dialCode}`);
  }
  
  return dialCode + cleaned;
};

const MpesaDepositForm = ({ onBack }: Props) => {
  const { user } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState(MPESA_COUNTRIES[0]); // default Kenya
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

    let normalizedPhone: string;
    try {
      normalizedPhone = normalizePhoneNumber(phone, selectedCountry.dialCode, selectedCountry.phoneLength);
    } catch (err: any) {
      toast.error(err.message);
      return;
    }

    const amt = Number(amount);
    if (!amt || amt < 50) return toast.error(`Minimum deposit is ${selectedCountry.currency} 50`);

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          phone_number: normalizedPhone,
          amount: amt,
          user_id: user.id,
          currency: selectedCountry.currency,
          country: selectedCountry.code,
        },
      });

      if (error) {
        // Try to parse the error body for details
        const errBody = (error as any)?.context?.body;
        const errMsg = errBody?.error || errBody?.details || error.message || "Failed to initiate M-PESA payment";
        throw new Error(errMsg);
      }
      if (data?.error) throw new Error(data.error);

      setPaymentRef(data?.reference || data?.payment_id || "");
      setStep("pending");
      toast.success("Check your phone for the M-PESA prompt!");
      startPolling();
    } catch (err: any) {
      console.error("M-PESA error:", err);
      const msg = err.message || "Failed to initiate M-PESA payment";
      if (msg.includes("not configured")) {
        toast.error("M-PESA is not configured yet. Please contact support.");
      } else if (msg.includes("OAuth") || msg.includes("authenticate")) {
        toast.error("Payment provider authentication failed. Please try again later.");
      } else {
        toast.error(msg);
      }
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
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("failed");
          return prev;
        }
        return prev + 1;
      });

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
          if (pollRef.current) clearInterval(pollRef.current);
          setStep("success");
          toast.success("M-PESA payment received!");
        }
      }
    }, 10000);
  };

  const usdEquivalent = (Number(amount) * selectedCountry.rateToUSD).toFixed(2);
  const displayPhoneHint = `e.g., ${selectedCountry.dialCode}${'7'.repeat(selectedCountry.phoneLength)} or 0${'7'.repeat(selectedCountry.phoneLength)}`;

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
        <p className="text-xs text-muted-foreground mt-1">Funds will be added to your USD wallet</p>
      </div>

      {step === "form" && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          {/* Country Selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Country</label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCountry.code}
                onChange={(e) => {
                  const country = MPESA_COUNTRIES.find(c => c.code === e.target.value);
                  if (country) {
                    setSelectedCountry(country);
                    setPhone(""); // reset phone when country changes
                  }
                }}
                className="w-full h-12 pl-9 pr-4 rounded-xl bg-secondary border border-border text-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              >
                {MPESA_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+{selectedCountry.dialCode}</span>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, selectedCountry.phoneLength + 3))} // allow extra digits for country code
                placeholder={`${selectedCountry.dialCode}xxxxxxxx`}
                className="w-full h-12 pl-16 pr-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{displayPhoneHint}</p>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Amount ({selectedCountry.currency})</label>
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

          {/* Quick Amounts */}
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  Number(amount) === amt
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-secondary text-muted-foreground hover:border-emerald-500/40"
                }`}
              >
                {selectedCountry.currency} {amt.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-secondary/50 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Amount</span>
              <span className="text-foreground">{selectedCountry.currency} {Number(amount || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="text-foreground">1 USD ≈ {(1 / selectedCountry.rateToUSD).toFixed(0)} {selectedCountry.currency}</span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between text-sm font-semibold">
              <span className="text-foreground">You receive</span>
              <span className="text-emerald-400">${usdEquivalent} USD</span>
            </div>
          </div>

          <Button
            className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={handleSubmit}
            disabled={loading || !phone || !amount || Number(amount) < 50}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Smartphone className="h-4 w-4 mr-2" />}
            {loading ? "Sending prompt..." : `Pay with M-PESA (${selectedCountry.currency})`}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            An STK push will be sent to your phone. Enter your M-PESA PIN to confirm.
          </p>
        </div>
      )}

      {/* Pending, Success, Failed states (same as before) */}
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
            <p className="text-xs text-muted-foreground">Amount: <span className="text-foreground font-medium">{selectedCountry.currency} {Number(amount).toLocaleString()}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Phone: <span className="text-foreground font-medium">+{selectedCountry.dialCode}{phone.replace(/\D/g, '').slice(-selectedCountry.phoneLength)}</span></p>
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
            {selectedCountry.currency} {Number(amount).toLocaleString()} (≈ ${usdEquivalent} USD) has been received and is pending admin approval.
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
