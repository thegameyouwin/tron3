import { ArrowUpRight, Smartphone } from "lucide-react";

interface Props {
  onSelect: (method: "crypto" | "mpesa") => void;
}

export default function WithdrawMethodSelector({ onSelect }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Choose your withdrawal method</p>
      <button
        onClick={() => onSelect("crypto")}
        className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-all group"
      >
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ArrowUpRight className="h-6 w-6 text-primary" />
        </div>
        <div className="text-left flex-1">
          <h3 className="text-sm font-bold text-foreground">Crypto Withdrawal</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Send to any external wallet address (BTC, ETH, USDT, etc.)
          </p>
        </div>
      </button>
      <button
        onClick={() => onSelect("mpesa")}
        className="w-full flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-all group"
      >
        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Smartphone className="h-6 w-6 text-emerald-400" />
        </div>
        <div className="text-left flex-1">
          <h3 className="text-sm font-bold text-foreground">M-PESA Withdrawal</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Withdraw directly to your M-PESA mobile wallet (KES)
          </p>
        </div>
      </button>
    </div>
  );
}
