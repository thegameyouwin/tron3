import { useAppStore } from "@/stores/useAppStore";
import { FlaskConical, Wallet } from "lucide-react";
import { motion } from "framer-motion";

export default function DemoModeToggle() {
  const { demoMode, toggleDemoMode } = useAppStore();

  return (
    <motion.button
      onClick={toggleDemoMode}
      whileTap={{ scale: 0.95 }}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all shadow-lg ${
        demoMode
          ? "bg-amber-500/20 text-amber-300 border-amber-400 shadow-amber-500/20 animate-pulse"
          : "bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-emerald-500/10 hover:bg-emerald-500/25"
      }`}
    >
      {demoMode ? (
        <>
          <FlaskConical className="h-4 w-4" />
          <span className="uppercase tracking-wider">Demo Mode</span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          <span className="uppercase tracking-wider">Live Trading</span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
        </>
      )}
    </motion.button>
  );
}
