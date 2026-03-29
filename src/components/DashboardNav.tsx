import { useState, useEffect } from "react";
import { 
  Home, TrendingUp, ArrowLeftRight, Bot, Wallet, LogOut, 
  Moon, Sun, Shield, History, Crown 
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWallets } from "@/hooks/useWallets";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useAppStore } from "@/stores/useAppStore";
import { useAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import TronnlixLogo from "@/components/TronnlixLogo";
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "react-i18next";
import UpgradeTierModal from "@/components/UpgradeTierModal";

const DashboardNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { wallets } = useWallets();
  const { prices } = useCryptoPrices();
  const { darkMode, toggleDarkMode } = useAppStore();
  const { isAdmin } = useAdmin();
  const { t } = useTranslation();

  const [currentTier, setCurrentTier] = useState<string>("free");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch user's current account tier
  useEffect(() => {
    if (!user) return;
    const fetchTier = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("account_tier")
        .eq("user_id", user.id)
        .single();
      if (!error && data) {
        setCurrentTier(data.account_tier || "free");
      }
    };
    fetchTier();
  }, [user]);

  const navItems = [
    { icon: Home, path: "/dashboard", label: t("nav.dashboard", "Dashboard") },
    { icon: TrendingUp, path: "/markets", label: t("nav.markets", "Markets") },
    { icon: ArrowLeftRight, path: "/spot-trading", label: t("nav.trade", "Trade") },
    { icon: Bot, path: "/bots", label: t("nav.bots", "Bots") },
    { icon: History, path: "/transactions", label: t("nav.history", "History") },
  ];

  const totalUsd = wallets.reduce((sum, w) => {
    const price = w.crypto_id === "usdt" ? 1 : (prices.find(p => p.id === w.crypto_id)?.current_price ?? 0);
    return sum + w.balance * price;
  }, 0);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleUpgradeSuccess = () => {
    const fetchTier = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("account_tier")
        .eq("user_id", user.id)
        .single();
      if (data) setCurrentTier(data.account_tier);
    };
    fetchTier();
  };

  const showUpgrade = currentTier !== "vip";

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container py-2">
          {/* Top row: Logo + right controls */}
          <div className="flex items-center justify-between gap-2">
            <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
              <TronnlixLogo size={28} />
              <span className="text-lg font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Tronnlix
              </span>
            </Link>

            <div className="flex items-center gap-2">
              <LanguageSelector compact />

              <button
                onClick={toggleDarkMode}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </button>

              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-destructive">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t("nav.admin", "Admin")}</span>
                  </Button>
                </Link>
              )}

              {showUpgrade && (
                <Button
                  variant="gold"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  <Crown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t("upgrade", "Upgrade")}</span>
                </Button>
              )}

              <Link to="/deposit">
                <Button variant="gold" size="sm" className="gap-2">
                  <Wallet className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="sm:hidden text-xs">
                    ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </span>
                </Button>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Second row: Navigation links - ALWAYS VISIBLE on all screens */}
          <div className="flex flex-wrap items-center justify-center gap-1 mt-2 sm:mt-0 sm:justify-start">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1 sm:gap-2 text-xs ${
                      active 
                        ? "text-primary bg-primary/10 border-b-2 border-primary rounded-b-none" 
                        : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="inline-block text-xs sm:text-sm font-medium text-current">
                      {item.label}
                    </span>
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Upgrade Tier Modal */}
      {showUpgradeModal && (
        <UpgradeTierModal
          currentTier={currentTier}
          onClose={() => setShowUpgradeModal(false)}
          onUpgraded={handleUpgradeSuccess}
        />
      )}
    </>
  );
};

export default DashboardNav;
