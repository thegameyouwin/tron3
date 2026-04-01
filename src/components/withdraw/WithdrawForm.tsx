import { useState } from "react";
import { AlertTriangle, ChevronDown, Shield, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CoinMeta {
  id: string;
  symbol: string;
  networks: string[];
}

interface WithdrawFormProps {
  coins: CoinMeta[];
  selectedCrypto: string;
  onSelectCrypto: (id: string) => void;
  prices: any[];
  getBalance: (id: string) => number;
  getSymbol: (id: string) => string;
  kycVerified: boolean;
  onReview: (data: {
    walletAddress: string;
    confirmAddress: string;
    network: string;
    amountUSD: number;
  }) => void;
}

export default function WithdrawForm({
  coins, selectedCrypto, onSelectCrypto, prices, getBalance, getSymbol, kycVerified, onReview,
}: WithdrawFormProps) {
  const [walletAddress, setWalletAddress] = useState("");
  const [confirmAddress, setConfirmAddress] = useState("");
  const [network, setNetwork] = useState("");
  const [amountUSD, setAmountUSD] = useState("");
  const [showNetworkDD, setShowNetworkDD] = useState(false);

  const coinMeta = coins.find(c => c.id === selectedCrypto);
  const coinPrice = prices.find(p => p.id === selectedCrypto);
  const balance = getBalance(selectedCrypto);

  const handleSelectCrypto = (id: string) => {
    onSelectCrypto(id);
    const c = coins.find(x => x.id === id);
    if (c) setNetwork(c.networks[0]);
  };

  const usd = Number(amountUSD) || 0;
  const cryptoAmt = selectedCrypto === "tether" ? usd : (coinPrice ? usd / coinPrice.current_price : 0);

  const addressValid = walletAddress.trim().length >= 10;
  const addressMatch = walletAddress === confirmAddress;
  const canReview = kycVerified && addressValid && addressMatch && usd >= 20 && cryptoAmt <= balance && network;

  // Network-specific address hint
  const getAddressHint = () => {
    if (network === "TRC-20") return "Must start with 'T' — 34 characters total";
    if (network === "ERC-20" || network === "BEP-20") return "Must start with '0x' — 42 characters total";
    if (network === "BTC") return "P2PKH, P2SH, or Bech32 format";
    return "";
  };

  const inputClass = "w-full h-12 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-mono";

  return (
    <div className="space-y-5">
      {/* KYC Status */}
      <div className={`flex items-center gap-2 p-3 rounded-xl border ${
        kycVerified
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
      }`}>
        {kycVerified ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
        <span className="text-sm font-medium">
          {kycVerified ? "Identity verified — you may proceed" : "Identity verification required for withdrawals"}
        </span>
      </div>

      {/* Coin Selector */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Select Coin</label>
        <div className="flex flex-wrap gap-2">
          {coins.map(coin => {
            const img = prices.find(p => p.id === coin.id)?.image;
            return (
              <button
                key={coin.id}
                onClick={() => handleSelectCrypto(coin.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  selectedCrypto === coin.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                {img && <img src={img} alt={coin.symbol} className="w-5 h-5 rounded-full" />}
                <span>{coin.symbol}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Amount (USD)</label>
        <input
          type="number"
          value={amountUSD}
          onChange={e => setAmountUSD(e.target.value)}
          placeholder="Min $20"
          className={inputClass}
          min={20}
        />
        {usd > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            ≈ {cryptoAmt.toFixed(selectedCrypto === "tether" ? 2 : 8)} {getSymbol(selectedCrypto)}
            {" "}| Balance: {balance.toFixed(4)}
          </p>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
        <AlertTriangle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          Enter your {getSymbol(selectedCrypto)} ({network || "—"}) wallet address carefully. Transactions are irreversible.
        </p>
      </div>

      {/* Wallet Address */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Wallet Address ({network || "—"})
        </label>
        <input
          type="text"
          value={walletAddress}
          onChange={e => setWalletAddress(e.target.value)}
          placeholder={`Enter your ${getSymbol(selectedCrypto)} address`}
          className={inputClass}
        />
        {getAddressHint() && (
          <p className="text-xs text-muted-foreground mt-1">{getAddressHint()}</p>
        )}
      </div>

      {/* Confirm Address */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Address</label>
        <input
          type="text"
          value={confirmAddress}
          onChange={e => setConfirmAddress(e.target.value)}
          placeholder="Re-enter address to confirm"
          className={inputClass}
        />
        {confirmAddress && !addressMatch && (
          <p className="text-xs text-destructive mt-1">Addresses do not match</p>
        )}
      </div>

      {/* Network */}
      {coinMeta && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Network</label>
          {coinMeta.networks.length === 1 ? (
            <div className="h-12 rounded-xl bg-secondary border border-border px-4 flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-xs font-bold">
                {coinMeta.networks[0]}
              </span>
              <span className="text-sm text-foreground">
                {coinMeta.networks[0] === "TRC-20" ? "TRON Network" :
                 coinMeta.networks[0] === "ERC-20" ? "Ethereum Network" :
                 coinMeta.networks[0] === "BEP-20" ? "BSC Network" :
                 `${coinMeta.networks[0]} Network`}
              </span>
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowNetworkDD(!showNetworkDD)}
                className="w-full h-12 rounded-xl bg-secondary border border-border px-4 text-sm text-foreground flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {network && (
                    <span className="px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-xs font-bold">
                      {network}
                    </span>
                  )}
                  <span>{network ? `${network} Network` : "Select network"}</span>
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${showNetworkDD ? "rotate-180" : ""}`} />
              </button>
              {showNetworkDD && (
                <div className="absolute z-10 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                  {coinMeta.networks.map(net => (
                    <button
                      key={net}
                      onClick={() => { setNetwork(net); setShowNetworkDD(false); }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-3"
                    >
                      <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-xs font-bold">{net}</span>
                      <span>{net} Network</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => window.history.back()}>
          Back
        </Button>
        <Button
          variant="gold"
          className="flex-1 h-12 rounded-xl"
          disabled={!canReview}
          onClick={() => onReview({ walletAddress, confirmAddress, network, amountUSD: usd })}
        >
          Review →
        </Button>
      </div>
    </div>
  );
}
