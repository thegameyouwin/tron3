import { useState, useEffect } from "react";
import { 
  Home, TrendingUp, ArrowLeftRight, Bot, Wallet, LogOut, 
  Moon, Sun, Shield, History, Crown, Menu, X 
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Close mobile menu on window resize (if screen becomes desktop)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const navItems = [
    { icon: Home, path: "/dashboard", label: t("nav.dashboard") },
    { icon: TrendingUp, path: "/markets", label: t("nav.markets") },
    { icon: ArrowLeftRight, path: "/spot-trading", label: t("nav.trade") },
    { icon: Bot, path: "/bots", label: t("nav.bots") },
    { icon: History, path: "/transactions", label: t("nav.history") },
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
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2" onClick={closeMobileMenu}>
            <TronnlixLogo size={28} />
            <span className="text-lg font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Tronnlix
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 text-xs ${
                      active 
                        ? "text-primary bg-primary/10 border-b-2 border-primary rounded-b-none" 
                        : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          {/* Right side controls */}
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
                  <Shield className="h-3.5 w-3.5" /> {t("nav.admin")}
                </Button>
              </Link>
            )}

            {/* Upgrade Button (Desktop) */}
            {showUpgrade && (
              <Button
                variant="gold"
                size="sm"
                className="gap-1.5 text-xs hidden md:inline-flex"
                onClick={() => setShowUpgradeModal(true)}
              >
                <Crown className="h-3.5 w-3.5" />
                Upgrade
              </Button>
            )}

            {/* Wallet Balance */}
            <Link to="/deposit">
              <Button variant="gold" size="sm" className="gap-2">
                <Wallet className="h-3.5 w-3.5" />
                ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Button>
            </Link>

            {/* Logout (Desktop) */}
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hidden md:inline-flex"
              onClick={handleLogout}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMobileMenu}
      />

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[80%] max-w-sm bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-out md:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/dashboard" className="flex items-center gap-2" onClick={closeMobileMenu}>
              <TronnlixLogo size={28} />
              <span className="text-lg font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Tronnlix
              </span>
            </Link>
            <button
              onClick={closeMobileMenu}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Navigation Links */}
          <div className="flex-1 py-6 px-4 space-y-4">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 py-2 text-base transition-colors ${
                    active ? "text-primary font-semibold" : "text-foreground hover:text-primary"
                  }`}
                  onClick={closeMobileMenu}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Drawer Actions (Upgrade, Logout) */}
          <div className="p-4 border-t border-border space-y-3">
            {showUpgrade && (
              <Button
                variant="gold"
                className="w-full gap-2"
                onClick={() => {
                  setShowUpgradeModal(true);
                  closeMobileMenu();
                }}
              >
                <Crown className="h-4 w-4" />
                Upgrade Tier
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                handleLogout();
                closeMobileMenu();
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

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
