import { useState } from "react";
import { ArrowLeft, Phone, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWallets } from "@/hooks/useWallets";
import { toast } from "sonner";

interface Props {
  onBack: () => void;
}

const KES_PER_USD = 129;
const MIN_KES = 100;
const MAX_KES = 150000;

export default function MpesaWithdrawForm({ onBack }: Props) {
  const { user } = useAuth();
  const { getBalance, fetchWallets } = useWallets();
  const [phone, setPhone] = useState("");
  const [amountKES, setAmountKES] = useState("");
  const [step, setStep] = useState<"form" | "confirming" | "pending" | "success" | "failed">("form");
  const [txRef, setTxRef] = useState("");

  const kes = Number(amountKES) || 0;
  const usdEquivalent = kes / KES_PER_USD;
  const usdtBalance = getBalance("tether") + getBalance("usdt");
  const phoneValid = /^(\+?254|0)\d{9}$/.test(phone.replace(/\s/g, ""));
  const canSubmit = phoneValid && kes >= MIN_KES && kes <= MAX_KES && usdEquivalent <= usdtBalance;

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setStep("confirming");
    try {
      // Use edge function instead of direct DB access
      const { data, error } = await supabase.functions.invoke("process-withdraw", {
        body: {
          method: "mpesa",
          phone: phone.replace(/\s/g, ""),
          amount_kes: kes,
          amount_usd: usdEquivalent,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setTxRef(data.transaction_id || "");
      toast.success("Withdrawal request submitted!");
      setStep("pending");
      fetchWallets();

      // Poll for admin approval
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (!data.transaction_id) { clearInterval(poll); return; }
        const { data: updated } = await supabase
          .from("transactions")
          .select("status")
          .eq("id", data.transaction_id)
          .maybeSingle();
        if (updated?.status === "completed") {
          clearInterval(poll);
          setStep("success");
        } else if (updated?.status === "rejected") {
          clearInterval(poll);
          setStep("failed");
        } else if (attempts > 60) {
          clearInterval(poll);
        }
      }, 5000);
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
      setStep("form");
    }
  };

  const quickAmounts = [500, 1000, 5000, 10000];

  if (step === "pending") {
    return (
      <div className="space-y-6 text-center py-8">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Processing Withdrawal</h3>
        <p className="text-sm text-muted-foreground">
          Your M-PESA withdrawal of <span className="font-bold">KES {kes.toLocaleString()}</span> is being processed.
        </p>
        <p className="text-xs text-muted-foreground">
          You'll receive the funds on <span className="font-mono">{phone}</span> shortly.
        </p>
        <div className="bg-secondary/50 border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Reference</p>
          <p className="text-sm font-mono text-foreground">{txRef.slice(0, 12)}...</p>
        </div>
        <Button variant="outline" onClick={onBack} className="w-full h-12 rounded-xl">
          Back to Withdraw
        </Button>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="space-y-6 text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Withdrawal Sent!</h3>
        <p className="text-sm text-muted-foreground">
          KES {kes.toLocaleString()} has been sent to {phone}
        </p>
        <Button onClick={onBack} className="w-full h-12 rounded-xl">
          Done
        </Button>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="space-y-6 text-center py-8">
        <XCircle className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-bold text-foreground">Withdrawal Failed</h3>
        <p className="text-sm text-muted-foreground">
          Your withdrawal could not be completed. Funds have been returned.
        </p>
        <Button onClick={() => setStep("form")} className="w-full h-12 rounded-xl">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
        <Phone className="h-4 w-4 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">M-PESA Withdrawal</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Phone Number</label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="0712345678 or +254712345678"
          className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {phone && !phoneValid && (
          <p className="text-xs text-destructive mt-1">Enter a valid Safaricom number</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Amount (KES)</label>
        <input
          type="number"
          value={amountKES}
          onChange={e => setAmountKES(e.target.value)}
          placeholder={`Min KES ${MIN_KES}`}
          className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          min={MIN_KES}
          max={MAX_KES}
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-muted-foreground">≈ ${usdEquivalent.toFixed(2)} USDT</p>
          <p className="text-xs text-muted-foreground">Balance: ${usdtBalance.toFixed(2)} USDT</p>
        </div>
      </div>

      <div className="flex gap-2">
        {quickAmounts.map(amt => (
          <button
            key={amt}
            onClick={() => setAmountKES(amt.toString())}
            className="flex-1 text-xs py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors"
          >
            {amt >= 1000 ? `${amt / 1000}K` : amt}
          </button>
        ))}
      </div>

      {kes > 0 && usdEquivalent > usdtBalance && (
        <p className="text-xs text-destructive">Insufficient USDT balance for this amount</p>
      )}

      <div className="bg-secondary/50 border border-border rounded-xl p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">You withdraw</span>
          <span className="font-medium text-foreground">KES {kes.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Rate</span>
          <span className="font-medium text-foreground">1 USD = KES {KES_PER_USD}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Deducted from wallet</span>
          <span className="font-medium text-foreground">${usdEquivalent.toFixed(2)} USDT</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button
          className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!canSubmit || step === "confirming"}
          onClick={handleSubmit}
        >
          {step === "confirming" ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
          ) : (
            `Withdraw KES ${kes.toLocaleString()}`
          )}
        </Button>
      </div>
    </div>
  );
}
