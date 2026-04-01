import { useState, useEffect } from "react";

export interface SiteSettings {
  siteName: string;
  logoUrl: string;
  supportEmail: string;
  enabledCryptos: string[];
  depositWallets: Record<string, string>;
  minDeposit: number;
  minWithdraw: number;
  withdrawFeePercent: number;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "Athena",
  logoUrl: "",
  supportEmail: "support@athena.com",
  enabledCryptos: ["bitcoin", "ethereum", "solana", "binancecoin", "ripple", "cardano", "polkadot", "dogecoin"],
  depositWallets: {
    tether: "TFYBTBoknjnZsYQKSPG2kjsAsZVNR8fkWB",
    bitcoin: "bc1qhxj7jt0mcljnn6h0qxcjey3g237phss9zmmnrq",
    ethereum: "0x8d3007b24c93347adD0C503E886f53585D10F2CB",
    binancecoin: "0x8d3007b24c93347adD0C503E886f53585D10F2CB",
    ripple: "rMXG6jF9b9zsdGzgv2edDbdTsBHojGvF2b",
    solana: "9yZBBxPxUahdu4BJd5wz8SU4ZxVrgu7PvsDGUjGciCwm",
    cardano: "addr1qyu3t0yatnsk2sv4varh7f2jwc7404uzztqc2dkunzzr7nwtdkxk9zdruk90g4l99r7uxuqyk308fhnarl07zt4texzs97q9fg",
  },
  minDeposit: 10,
  minWithdraw: 20,
  withdrawFeePercent: 1,
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(() => {
    const saved = localStorage.getItem("athena_site_settings");
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem("athena_site_settings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (partial: Partial<SiteSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  return { settings, updateSettings };
}
