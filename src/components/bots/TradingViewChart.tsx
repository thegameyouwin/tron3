import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  /** Optional custom height (e.g., "300px", "100%") */
  height?: string;
}

/**
 * Simple, reliable TradingView embed — same method as FuturesPage.
 * No ResizeObserver, no retry loops.
 * Supports dark/light theme and responsive height.
 */
export default function TradingViewChart({ symbol, height = "min-h-[450px] md:min-h-[450px]" }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !symbol) return;

    // Clear previous widget
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;

    // Detect current theme (dark/light)
    const isDark = document.documentElement.classList.contains("dark");
    const theme = isDark ? "dark" : "light";

    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `BINANCE:${symbol}USDT`,
      interval: "15",
      timezone: "Etc/UTC",
      theme: theme,
      style: "1",
      locale: "en",
      allow_symbol_change: false,
      support_host: "https://www.tradingview.com",
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol]);

  return <div className={`w-full ${height}`} ref={containerRef} />;
}
