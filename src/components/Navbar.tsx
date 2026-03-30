import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useAppStore } from "@/stores/useAppStore";
import TronnlixLogo from "@/components/TronnlixLogo";
import LanguageSelector from "@/components/LanguageSelector";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { darkMode, toggleDarkMode } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  const navItems = [
    { label: t("nav.home"), path: "/" },
    { label: t("nav.markets"), path: "/#crypto" },
  ];

  // Close mobile menu when window is resized to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileOpen) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMenu = () => setMobileOpen(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <TronnlixLogo size={36} />
            <span className="text-xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Tronnlix
            </span>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <Link to="/auth" className="hidden md:block">
              <Button variant="outline" size="sm">{t("nav.signIn")}</Button>
            </Link>
            <Link to="/auth" className="hidden md:block">
              <Button variant="gold" size="sm">{t("nav.register")}</Button>
            </Link>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity duration-300 md:hidden ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeMenu}
      />

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-[80%] max-w-sm bg-background border-l border-border shadow-xl transform transition-transform duration-300 ease-out md:hidden ${
          mobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Drawer header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
              <TronnlixLogo size={28} />
              <span className="text-lg font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Tronnlix
              </span>
            </Link>
            <button
              onClick={closeMenu}
              className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer navigation links */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-4">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className="block py-2 text-base text-foreground hover:text-primary transition-colors"
                onClick={closeMenu}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Drawer action buttons - pinned to bottom */}
          <div className="p-4 border-t border-border space-y-3 shrink-0">
            <Link to="/auth" onClick={closeMenu}>
              <Button variant="outline" size="sm" className="w-full">
                {t("nav.signIn")}
              </Button>
            </Link>
            <Link to="/auth" onClick={closeMenu}>
              <Button variant="gold" size="sm" className="w-full">
                {t("nav.register")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
