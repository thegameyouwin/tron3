import { Wallet, Smartphone, ArrowRight } from "lucide-react";

interface Props {
  onSelect: (method: "crypto" | "fiat") => void;
}

const DepositMethodSelector = ({ onSelect }: Props) => {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Deposit Funds</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose your preferred deposit method</p>
      </div>

      <div className="grid gap-3">
        {/* Crypto Deposit */}
        <button
          onClick={() => onSelect("crypto")}
          className="group relative bg-card border border-border rounded-2xl p-5 text-left hover:border-primary/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">Crypto Deposit</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send BTC, ETH, USDT, SOL & more directly to your wallet
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["BTC", "ETH", "USDT", "SOL", "BNB"].map(c => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </button>

        {/* Fiat / M-PESA */}
        <button
          onClick={() => onSelect("fiat")}
          className="group relative bg-card border border-border rounded-2xl p-5 text-left hover:border-emerald-500/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Smartphone className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground">M-PESA / Mobile Money</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Deposit via M-PESA STK Push — funds go to your fiat wallet
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  M-PESA
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                  KES → USD
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
                  Instant
                </span>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 transition-colors shrink-0" />
          </div>
        </button>
      </div>

      <p className="text-[10px] text-center text-muted-foreground">
        Fiat deposits can be converted to crypto anytime from your wallet
      </p>
    </div>
  );
};

export default DepositMethodSelector;
