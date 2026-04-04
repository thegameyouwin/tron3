import { useState, useMemo } from "react";
import { ArrowUpRight, Inbox } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useWallets } from "@/hooks/useWallets";
import { useTransactions } from "@/hooks/useTransactions";
import { useAppStore } from "@/stores/useAppStore";
import { useSiteSettingsDB } from "@/hooks/useSiteSettingsDB";
import { useProfile } from "@/hooks/useProfile";
import WithdrawMethodSelector from "@/components/withdraw/WithdrawMethodSelector";
import WithdrawForm from "@/components/withdraw/WithdrawForm";
import WithdrawReview from "@/components/withdraw/WithdrawReview";
import WithdrawProgress from "@/components/withdraw/WithdrawProgress";
import MpesaWithdrawForm from "@/components/withdraw/MpesaWithdrawForm";

const WITHDRAW_COINS = [
  { id: "tether", symbol: "USDT", networks: ["TRC-20", "ERC-20", "BEP-20"] },
  { id: "bitcoin", symbol: "BTC", networks: ["BTC"] },
  { id: "ethereum", symbol: "ETH", networks: ["ERC-20"] },
  { id: "binancecoin", symbol: "BNB", networks: ["BEP-20"] },
  { id: "ripple", symbol: "XRP", networks: ["XRP"] },
  { id: "solana", symbol: "SOL", networks: ["SOL"] },
  { id: "cardano", symbol: "ADA", networks: ["ADA"] },
];

type Step = "method" | "form" | "review" | "progress" | "mpesa";

const WithdrawPage = () => {
  const [step, setStep] = useState<Step>("method");
  const [selectedCrypto, setSelectedCrypto] = useState("tether");
  const [reviewData, setReviewData] = useState<any>(null);
  const [txId, setTxId] = useState<string | null>(null);

  const { prices, getSymbol } = useCryptoPrices();
  const { wallets, getBalance } = useWallets();
  const { transactions, fetchTransactions } = useTransactions();
  const { settings } = useSiteSettingsDB();
  const { profile } = useProfile();
  const currency = useAppStore((s) => s.currency);
  const sym = currency === "inr" ? "₹" : "$";

  const withdrawFee = settings?.withdraw_fee_percent || 1;
  const kycVerified = profile?.kyc_status === "verified";

  const totalUsd = useMemo(() => {
    return wallets.reduce((sum, w) => {
      const price = w.crypto_id === "usdt" ? 1 : (prices.find(p => p.id === w.crypto_id)?.current_price ?? 0);
      return sum + w.balance * price;
    }, 0);
  }, [wallets, prices]);

  const coinPrice = prices.find(p => p.id === selectedCrypto);

  const handleMethodSelect = (method: "crypto" | "mpesa") => {
    if (method === "mpesa") setStep("mpesa");
    else setStep("form");
  };

  const handleReview = (formData: { walletAddress: string; network: string; amountUSD: number }) => {
    const usd = formData.amountUSD;
    const cryptoAmount = selectedCrypto === "tether" ? usd : (coinPrice ? usd / coinPrice.current_price : 0);
    const feeUSD = usd * (withdrawFee / 100);
    const netUSD = usd - feeUSD;
    const netCrypto = selectedCrypto === "tether" ? netUSD : (coinPrice ? netUSD / coinPrice.current_price : 0);

    setReviewData({
      cryptoId: selectedCrypto,
      symbol: getSymbol(selectedCrypto),
      amountUSD: usd,
      cryptoAmount,
      feePercent: withdrawFee,
      feeUSD,
      netUSD,
      netCrypto,
      walletAddress: formData.walletAddress,
      network: formData.network,
    });
    setStep("review");
  };

  const handleConfirmed = (transactionId: string) => {
    setTxId(transactionId);
    setStep("progress");
    fetchTransactions();
  };

  const handleDone = () => {
    setStep("method");
    setReviewData(null);
    setTxId(null);
    fetchTransactions();
  };

  const recentWithdrawals = transactions.filter(t => t.type === "withdrawal").slice(0, 10);

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">
            {step === "mpesa" ? "M-PESA Withdrawal" :
             step === "form" ? `Withdraw ${getSymbol(selectedCrypto)}` :
             step === "review" || step === "progress" ? `Withdraw ${reviewData?.symbol || ""}` :
             "Withdraw"}
          </h1>
        </div>
        {step === "method" && (
          <p className="text-sm text-muted-foreground -mt-4">
            Choose how you'd like to withdraw your funds
          </p>
        )}

        {(step === "method" || step === "form") && (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-foreground">
              {sym}{totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Balance</p>
          </div>
        )}

        {step === "method" && (
          <WithdrawMethodSelector onSelect={handleMethodSelect} />
        )}

        {step === "mpesa" && (
          <MpesaWithdrawForm onBack={() => setStep("method")} />
        )}

        {step === "form" && (
          <>
            <button onClick={() => setStep("method")} className="text-xs text-primary hover:underline">
              ← Change method
            </button>
            <WithdrawForm
              coins={WITHDRAW_COINS}
              selectedCrypto={selectedCrypto}
              onSelectCrypto={setSelectedCrypto}
              prices={prices}
              getBalance={getBalance}
              getSymbol={getSymbol}
              kycVerified={kycVerified}
              onReview={handleReview}
            />
          </>
        )}

        {step === "review" && reviewData && (
          <WithdrawReview
            data={reviewData}
            onBack={() => setStep("form")}
            onConfirmed={handleConfirmed}
          />
        )}

        {step === "progress" && reviewData && txId && (
          <WithdrawProgress
            transactionId={txId}
            symbol={reviewData.symbol}
            network={reviewData.network}
            walletAddress={reviewData.walletAddress}
            amountUSD={reviewData.amountUSD}
            feePercent={reviewData.feePercent}
            feeUSD={reviewData.feeUSD}
            netUSD={reviewData.netUSD}
            netCrypto={reviewData.netCrypto}
            cryptoAmount={reviewData.cryptoAmount}
            onDone={handleDone}
          />
        )}

        <div className="space-y-3 pt-2">
          <h2 className="text-base font-display font-bold text-foreground">Recent Withdrawals</h2>
          {recentWithdrawals.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-6 text-center">
              <Inbox className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No withdrawals yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentWithdrawals.map(t => {
                const img = prices.find(p => p.id === t.crypto_id)?.image;
                const statusColor = t.status === "completed" ? "text-emerald-400" :
                  t.status === "rejected" ? "text-destructive" : "text-primary";
                const statusBg = t.status === "completed" ? "bg-emerald-500" :
                  t.status === "rejected" ? "bg-destructive" : "bg-primary";
                return (
                  <div key={t.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {img && <img src={img} alt={t.crypto_id} className="w-7 h-7 rounded-full" />}
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {t.amount.toFixed(6)} {getSymbol(t.crypto_id)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()} • {t.network === "M-PESA" ? "M-PESA" : t.wallet_address?.slice(0, 12) + "..."}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">
                        -{sym}{t.usd_amount.toFixed(2)}
                      </p>
                      <p className={`text-xs font-medium flex items-center gap-1 justify-end ${statusColor}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusBg} ${t.status === "pending" ? "animate-pulse" : ""}`} />
                        {t.status === "pending" ? "Confirming" : t.status === "completed" ? "Completed" : "Rejected"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default WithdrawPage;
