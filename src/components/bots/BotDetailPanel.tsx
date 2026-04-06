import { useState } from "react";
import { ArrowLeft, Info, Wallet, CreditCard, RefreshCw, StopCircle, Target, Timer, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { AutoStopConfig, STRATEGY_LABELS, calcROI, calcWinRate, formatRuntime, inputCls } from "./types";

interface BotDetailPanelProps {
  bot: any;
  stakeAmount: string;
  setStakeAmount: (v: string) => void;
  autoStopEnabled: boolean;
  setAutoStopEnabled: (v: boolean) => void;
  profitTarget: string;
  setProfitTarget: (v: string) => void;
  lossLimit: string;
  setLossLimit: (v: string) => void;
  timeLimitMinutes: string;
  setTimeLimitMinutes: (v: string) => void;
  effectiveBalance: number;
  demoMode: boolean;
  depositAddress: string;
  isPending: boolean;
  onBack: () => void;
  onStartBot: (autoStopConfig?: AutoStopConfig) => void;
  getSymbol: (id: string) => string;
}

export default function BotDetailPanel({
  bot, stakeAmount, setStakeAmount,
  autoStopEnabled, setAutoStopEnabled,
  profitTarget, setProfitTarget, lossLimit, setLossLimit,
  timeLimitMinutes, setTimeLimitMinutes,
  effectiveBalance, demoMode, depositAddress, isPending,
  onBack, onStartBot, getSymbol,
}: BotDetailPanelProps) {
  const stratLabel = STRATEGY_LABELS[bot.strategy] || bot.strategy;
  const roi = calcROI(bot.total_profit, bot.config, bot.created_at);
  const winRate = calcWinRate(bot.total_trades, bot.total_profit);
  const runtime = formatRuntime(bot.created_at);
  const pair = `${getSymbol(bot.crypto_id)}/USDT`;
  const amount = Number(stakeAmount) || 0;
  const canStake = amount >= bot.min_stake && amount <= effectiveBalance;
  const tier = (bot.tier || "free").toLowerCase();
  const premium = ["pro", "elite", "vip"].includes(tier);
  const [paymentStep, setPaymentStep] = useState<"info" | "pay" | "monitoring">("info");

  const handleStartBot = () => {
    if (!canStake && !premium) return;
    const autoStopConfig: AutoStopConfig | undefined = autoStopEnabled
      ? {
          enabled: true,
          profitTarget: profitTarget ? parseFloat(profitTarget) : undefined,
          lossLimit: lossLimit ? parseFloat(lossLimit) : undefined,
          timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : undefined,
        }
      : undefined;
    onStartBot(autoStopConfig);
  };

  const infoRows = [
    { label: "PNL", value: `+${bot.total_profit.toLocaleString()}`, color: "text-profit" },
    { label: "ROI", value: `+${roi.toFixed(2)}%/hr`, color: "text-profit" },
    { label: "Daily Earn", value: `+${bot.daily_earn.toFixed(2)}%`, color: "text-profit" },
    { label: "Runtime", value: runtime, color: "" },
    { label: "Win Rate", value: `${winRate.toFixed(2)}%`, color: "" },
    { label: "Min. Stake", value: `$${bot.min_stake.toFixed(2)} USDT`, color: "" },
    { label: "Tier", value: tier.charAt(0).toUpperCase() + tier.slice(1), color: premium ? "text-primary font-semibold" : "" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b shrink-0">
        <button onClick={onBack} className="flex gap-2 text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-4 w-4" />Back
        </button>
        <div>
          <p className="text-[11px] text-muted-foreground">{stratLabel}</p>
          <h2 className="text-lg font-bold">{pair}</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        <div className="p-3 bg-profit/10 border border-profit/20 rounded-lg">
          <p className="text-[11px] text-profit flex gap-1.5">
            <Info className="h-3.5 w-3.5 shrink-0" />
            {premium && !demoMode ? "Premium bot requires a deposit to activate." : "Shared parameter bot."}
          </p>
        </div>

        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-bold mb-2">Basic Info</h3>
          <div className="bg-secondary/50 rounded-lg border divide-y">
            {infoRows.map((row) => (
              <div key={row.label} className="flex justify-between px-3 py-2.5">
                <span className="text-xs text-muted-foreground">{row.label}</span>
                <span className={`text-xs font-medium ${row.color}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Auto-stop */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={autoStopEnabled} onChange={(e) => setAutoStopEnabled(e.target.checked)} className="rounded border-border accent-primary" />
              <StopCircle className="h-4 w-4 text-destructive" /> Auto-stop
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild><HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                <TooltipContent className="max-w-[220px] text-xs">Stop bot automatically when profit target, loss limit, or time limit is reached.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {autoStopEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Target className="h-3 w-3 text-profit" />
                  <label className="text-xs text-muted-foreground">Profit target (%)</label>
                </div>
                <input type="number" value={profitTarget} onChange={(e) => setProfitTarget(e.target.value)} placeholder="e.g., 20" className={`${inputCls} h-9 px-3`} />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <StopCircle className="h-3 w-3 text-loss" />
                  <label className="text-xs text-muted-foreground">Loss limit (%)</label>
                </div>
                <input type="number" value={lossLimit} onChange={(e) => setLossLimit(e.target.value)} placeholder="e.g., 10" className={`${inputCls} h-9 px-3`} />
              </div>
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Timer className="h-3 w-3 text-primary" />
                  <label className="text-xs text-muted-foreground">Time limit (min)</label>
                </div>
                <input type="number" value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} placeholder="e.g., 120" className={`${inputCls} h-9 px-3`} />
              </div>
            </div>
          )}
        </div>

        {/* Stake amount */}
        {premium && !demoMode && paymentStep === "pay" ? (
          <div className="p-4 border border-primary/30 rounded-xl">
            <div className="flex gap-2 mb-3"><Wallet className="h-4 w-4 text-primary" /><h3 className="text-sm font-bold">Send Payment</h3></div>
            <p className="text-xs mb-3">Send <span className="font-bold">${stakeAmount || bot.min_stake} USDT</span> to:</p>
            <div className="flex justify-center mb-3"><div className="bg-white p-2 rounded-lg"><QRCodeSVG value={depositAddress} size={120} /></div></div>
            <div className="bg-secondary p-3 rounded-lg mb-3"><p className="text-[10px] mb-1">Address</p><p className="text-xs font-mono break-all">{depositAddress}</p></div>
            <button onClick={() => { navigator.clipboard.writeText(depositAddress); toast.success("Copied!"); }} className="w-full text-xs py-2 rounded-lg bg-primary/10 text-primary mb-3">Copy</button>
          </div>
        ) : (
          <div className="p-4 border rounded-lg">
            <div className="flex justify-between mb-2"><span className="text-sm font-semibold">Stake Amount (USDT)</span></div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground font-medium">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={stakeAmount}
                onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setStakeAmount(v); }}
                placeholder={bot.min_stake.toFixed(2)}
                className={`${inputCls} h-14 pl-7 pr-16 text-xl font-semibold`}
                autoComplete="off"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">USDT</span>
            </div>
            <div className="flex gap-2 mt-3">
              {[bot.min_stake, 100, 500].map((amt: number) => (
                <button key={amt} onClick={() => setStakeAmount(amt.toString())} className="flex-1 text-xs py-2 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">${amt}</button>
              ))}
              <button onClick={() => setStakeAmount(effectiveBalance.toFixed(2))} className="flex-1 text-xs py-2 rounded-md bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">MAX</button>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[11px] text-muted-foreground">{demoMode ? "Demo " : ""}Balance: ${effectiveBalance.toFixed(2)}</span>
            </div>
            {amount > 0 && amount < bot.min_stake && <p className="text-[11px] text-loss mt-1">Min stake ${bot.min_stake}</p>}
            {amount > effectiveBalance && !premium && <p className="text-[11px] text-loss mt-1">Insufficient balance. <Link to="/deposit" className="text-primary">Deposit →</Link></p>}
          </div>
        )}
      </div>

      <div className="p-4 border-t shrink-0">
        {premium && !demoMode && paymentStep === "pay" ? (
          <Button className="w-full h-12 bg-primary" onClick={() => { toast.success("Verifying..."); setPaymentStep("monitoring"); setTimeout(() => { handleStartBot(); setPaymentStep("info"); }, 3000); }}>
            <CreditCard className="mr-2" /> I've Paid
          </Button>
        ) : premium && !demoMode && paymentStep === "monitoring" ? (
          <Button disabled className="w-full h-12"><RefreshCw className="animate-spin mr-2" /> Verifying</Button>
        ) : premium && !demoMode ? (
          <Button className="w-full h-12 bg-profit" disabled={amount < bot.min_stake} onClick={() => setPaymentStep("pay")}>
            {amount >= bot.min_stake ? `Pay $${amount.toFixed(2)}` : "Enter amount"}
          </Button>
        ) : (
          <Button
            className="w-full h-12 bg-profit hover:bg-profit/90 text-white font-bold text-base"
            disabled={!canStake || isPending}
            onClick={handleStartBot}
          >
            {isPending ? "Processing..." : canStake ? `Start Bot — $${amount.toFixed(2)}` : amount > 0 ? "Amount too low" : "Enter amount"}
          </Button>
        )}
        <p className="text-[10px] text-center mt-2 text-muted-foreground">By clicking, you agree to terms.</p>
      </div>
    </div>
  );
}
