import { useAppStore } from "@/stores/useAppStore";
import { FlaskConical, Wallet } from "lucide-react";

export default function DemoModeToggle() {
  const { demoMode, toggleDemoMode } = useAppStore();

  return (
    <button
      onClick={toggleDemoMode}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
        demoMode
          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30"
          : "bg-secondary text-muted-foreground border-border hover:text-foreground hover:border-primary/30"
      }`}
    >
      {demoMode ? (
        <>
          <FlaskConical className="h-3.5 w-3.5" />
          Demo
        </>
      ) : (
        <>
          <Wallet className="h-3.5 w-3.5" />
          Live
        </>
      )}
    </button>
  );
}
