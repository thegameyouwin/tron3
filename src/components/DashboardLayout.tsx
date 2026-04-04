import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useAppStore } from "@/stores/useAppStore";
import { useWallets } from "@/hooks/useWallets";
import { useCryptoPrices } from "@/hooks/useCryptoPrices";
import { useProfile } from "@/hooks/useProfile";
import TronnlixLogo from "@/components/TronnlixLogo";
import LanguageSelector from "@/components/LanguageSelector";
import AccountTierBadge from "@/components/AccountTierBadge";
import UpgradeTierModal from "@/components/UpgradeTierModal";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Wallet, Banknote, Users, TrendingUp, CandlestickChart,
  Bot, Coins, Gift, ArrowRightLeft, ArrowDownToLine, History, CreditCard,
  ShieldCheck, Lock, HelpCircle, LogOut, Sun, Moon, Shield, ChevronLeft,
  ChevronRight, Menu, X, User, BadgeCheck, ArrowUp
} from "lucide-react";

const sections = [
  {
    title: "Overview",
    items: [
      { icon: LayoutDashboard, path: "/dashboard", label: "Dashboard" },
      { icon: Wallet, path: "/crypto-wallet", label: "Crypto Wallet" },
      { icon: Banknote, path: "/fiat-wallet", label: "Fiat Wallet" },
    ],
  },
  {
    title: "Trading",
    items: [
      { icon: Users, path: "/p2p", label: "P2P Market" },
      { icon: TrendingUp, path: "/spot-trading", label: "Spot Trading" },
      { icon: CandlestickChart, path: "/futures", label: "Futures" },
      { icon: Bot, path: "/bots", label: "Trading Bots" },
      { icon: Coins, path: "/earn", label: "Earn & Stake" },
      { icon: Gift, path: "/referral", label: "Referral Program" },
      { icon: ArrowRightLeft, path: "/converter", label: "Converter" },
    ],
  },
  {
    title: "Transactions",
    items: [
      { icon: ArrowDownToLine, path: "/deposit", label: "Deposit Crypto" },
      { icon: History, path: "/transactions", label: "Financial History" },
      { icon: CreditCard, path: "/payment-methods", label: "Payment Methods" },
    ],
  },
  {
    title: "Account",
    items: [
      { icon: ShieldCheck, path: "/kyc", label: "Identity (KYC)" },
      { icon: Lock, path: "/security", label: "Security Centre" },
      { icon: HelpCircle, path: "/help", label: "Help & Support" },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const { darkMode, toggleDarkMode } = useAppStore();
  const { wallets } = useWallets();
  const { prices } = useCryptoPrices();
  const { profile } = useProfile();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const accountTier = (profile as any)?.account_tier || "free";
  const kycVerified = profile?.kyc_status === "verified";

  const totalUsd = wallets.reduce((sum, w) => {
    const price = w.crypto_id === "usdt" ? 1 : (prices.find(p => p.id === w.crypto_id)?.current_price ?? 0);
    return sum + w.balance * price;
  }, 0);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const sidebarContent = (isMobileSidebar = false) => {
    const isCollapsed = isMobileSidebar ? mobileCollapsed : collapsed;
    return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2">
          <TronnlixLogo size={28} />
          {!isCollapsed && <span className="text-lg font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Tronnlix</span>}
        </Link>
        {!isMobileSidebar && (
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto hidden md:block text-sidebar-foreground/60 hover:text-sidebar-foreground">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Profile & Balance card */}
      {!isCollapsed && (
        <div className="mx-3 mt-3 space-y-2">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/50 border border-border">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-foreground truncate">{profile?.display_name || user?.email?.split("@")[0] || "User"}</p>
                {kycVerified && <BadgeCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
              </div>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <AccountTierBadge tier={accountTier} compact />
                {accountTier !== "vip" && (
                  <button onClick={() => setShowUpgrade(true)} className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
                    <ArrowUp className="h-2.5 w-2.5" /> Upgrade
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* KYC / Verification Status Banner */}
          <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
            kycVerified
              ? "bg-emerald-500/10 border-emerald-500/20"
              : profile?.kyc_status === "pending"
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-muted/50 border-border"
          }`}>
            {kycVerified ? (
              <>
                <BadgeCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-emerald-400">Identity Verified</p>
                  <p className="text-[9px] text-muted-foreground">Full access enabled</p>
                </div>
              </>
            ) : profile?.kyc_status === "pending" ? (
              <>
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-amber-400">Verification Pending</p>
                  <p className="text-[9px] text-muted-foreground">Under review</p>
                </div>
              </>
            ) : (
              <>
                <ShieldCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-foreground">Not Verified</p>
                  <p className="text-[9px] text-muted-foreground">Verify identity for full access</p>
                </div>
                <Link to="/kyc" onClick={() => setMobileOpen(false)} className="text-[9px] text-primary font-semibold hover:underline shrink-0">Verify →</Link>
              </>
            )}
          </div>

          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio</p>
            <p className="text-lg font-bold text-foreground">${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            {!isCollapsed && <p className="px-2 mb-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{section.title}</p>}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                      active
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    } ${isCollapsed ? "justify-center" : ""}`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {isAdmin && (
          <div>
            {!isCollapsed && <p className="px-2 mb-1 text-[10px] uppercase tracking-wider font-semibold text-destructive">Admin</p>}
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all ${isCollapsed ? "justify-center" : ""}`}
            >
              <Shield className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Admin Panel</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1 shrink-0">
        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-1 px-1"}`}>
          <button onClick={toggleDarkMode} className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {!isCollapsed && <LanguageSelector compact />}
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/60" title="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}>
        {sidebarContent(false)}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-10">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center h-14 px-4 border-b border-border bg-background/95 backdrop-blur-md sticky top-0 z-40">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2 ml-2">
            <TronnlixLogo size={24} />
            <span className="text-base font-display font-bold text-foreground">Tronnlix</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <AccountTierBadge tier={accountTier} compact />
            <Link to="/deposit">
              <Button variant="gold" size="sm" className="text-xs gap-1">
                <Wallet className="h-3 w-3" />${totalUsd.toFixed(2)}
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradeTierModal
          currentTier={accountTier}
          onClose={() => setShowUpgrade(false)}
          onUpgraded={() => { setShowUpgrade(false); }}
        />
      )}
    </div>
  );
}
