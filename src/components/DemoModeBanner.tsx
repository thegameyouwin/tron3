import { useAppStore } from "@/stores/useAppStore";
import { FlaskConical, X } from "lucide-react";

export default function DemoModeBanner() {
  const { demoMode, demoBalance, toggleDemoMode } = useAppStore();
  if (!demoMode) return null;

  return (
    <div className="sticky top-0 z-50 bg-amber-500/10 border-b border-amber-500/30 backdrop-blur-sm">
      <div className="container flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">DEMO MODE</span>
          <span className="text-xs text-amber-300/80">
            Balance: <span className="font-mono font-bold">${demoBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> USDT
          </span>
        </div>
        <button
          onClick={toggleDemoMode}
          className="text-amber-400 hover:text-amber-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
