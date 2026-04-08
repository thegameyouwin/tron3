import { useState } from "react";
import { ArrowLeft, CreditCard, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

interface Props {
  onBack: () => void;
}

const CardDepositForm = ({ onBack }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [cardName, setCardName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const formatCardNumber = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSubmit = async () => {
    if (!user) return toast.error("Please sign in");
    const amt = Number(amount);
    if (!amt || amt < 30) return toast.error("Minimum deposit is $30");
    if (cardNumber.replace(/\s/g, "").length < 16) return toast.error("Invalid card number");
    if (expiry.length < 5) return toast.error("Invalid expiry date");
    if (cvv.length < 3) return toast.error("Invalid CVV");
    if (!cardName.trim()) return toast.error("Enter cardholder name");

    setSubmitting(true);
    try {
      // Create a pending transaction for admin approval
      await supabase.from("transactions").insert({
        user_id: user.id,
        type: "deposit",
        crypto_id: "tether",
        amount: amt,
        usd_amount: amt,
        status: "pending",
        notes: `Card deposit — ${cardNumber.slice(-4)} — awaiting admin approval`,
        network: "card",
      });

      // Log in ledger
      await supabase.from("ledger_entries").insert({
        user_id: user.id,
        crypto_id: "usdt",
        amount: amt,
        entry_type: "card_deposit_pending",
        description: `Card deposit $${amt} pending approval`,
      });

      setSubmitted(true);
      toast.success("Deposit submitted! Awaiting admin approval.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit deposit");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> {t("common.back")}
        </button>
        <div className="bg-profit/10 border border-profit/30 rounded-2xl p-6 text-center">
          <Check className="h-10 w-10 text-profit mx-auto mb-3" />
          <h2 className="text-lg font-bold text-foreground">Deposit Submitted</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your card deposit of <span className="font-bold text-foreground">${amount}</span> has been submitted and is pending admin approval.
            Your account will be credited once the transaction is verified.
          </p>
          <Button variant="outline" className="mt-4" onClick={onBack}>
            Make Another Deposit
          </Button>
        </div>
      </div>
    );
  }

  const displayAmount = Number(amount) || 0;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> {t("common.back")}
      </button>

      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">{t("deposit.cardPayment")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("deposit.cardPaymentDesc")}</p>
      </div>

      {/* Amount */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <label className="block text-sm font-medium text-foreground">{t("trading.amount")} (USD)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-bold">$</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full h-14 pl-8 pr-4 rounded-xl bg-secondary border border-border text-xl font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            min="30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => setAmount(amt.toString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                Number(amount) === amt
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">{t("deposit.minDeposit")} $30 USD</p>
      </div>

      {/* Card Details */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-4 w-4" /> Card Details
        </h3>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Cardholder Name</label>
          <input
            type="text"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="John Doe"
            className="w-full h-10 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">Card Number</label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="4242 4242 4242 4242"
            maxLength={19}
            className="w-full h-10 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono tracking-wider"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Expiry</label>
            <input
              type="text"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              maxLength={5}
              className="w-full h-10 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">CVV</label>
            <input
              type="password"
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="•••"
              maxLength={4}
              className="w-full h-10 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
            />
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="border border-primary/30 bg-primary/5 rounded-xl p-3">
        <p className="text-[11px] text-muted-foreground">
          💳 Card deposits are processed securely and credited after admin verification. Minimum $30. Funds go to your USDT wallet.
        </p>
      </div>

      <Button
        variant="gold"
        className="w-full h-12"
        onClick={handleSubmit}
        disabled={submitting || !amount || Number(amount) < 30}
      >
        {submitting ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
        ) : (
          `Deposit $${displayAmount}`
        )}
      </Button>
    </div>
  );
};

export default CardDepositForm;
