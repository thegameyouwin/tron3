import { useRef, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { TRADEABLE, inputCls } from "./types";

interface PairSelectorProps {
  selectedPair: string;
  onSelectPair: (id: string) => void;
  prices: any[];
  getSymbol: (id: string) => string;
  currentPrice: number;
  priceChange24h?: number;
  pairImage?: string;
  chartPairName: string;
}

export default function PairSelector({
  selectedPair, onSelectPair, prices, getSymbol,
  currentPrice, priceChange24h, pairImage, chartPairName,
}: PairSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex items-center gap-4">
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(!open)} className="flex gap-2 px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors">
          {pairImage && <img src={pairImage} className="w-5 h-5 rounded-full" alt="" />}
          <span className="text-sm font-bold">{chartPairName}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-72 bg-card border rounded-xl shadow-2xl z-50">
            <div className="p-2">
              <input
                type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pairs..." className={`${inputCls} h-8 px-3 text-xs`} autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {TRADEABLE.filter((id) => {
                const p = prices.find((pr: any) => pr.id === id);
                return p && (p.name.toLowerCase().includes(search.toLowerCase()) || p.symbol.toLowerCase().includes(search.toLowerCase()));
              }).map((id) => {
                const p = prices.find((pr: any) => pr.id === id);
                if (!p) return null;
                return (
                  <button
                    key={id}
                    onClick={() => { onSelectPair(id); setOpen(false); setSearch(""); }}
                    className={`w-full flex justify-between px-3 py-2 text-xs hover:bg-secondary/80 transition-colors ${selectedPair === id ? "bg-primary/10" : ""}`}
                  >
                    <div className="flex gap-2">
                      <img src={p.image} className="w-5 h-5 rounded-full" alt="" />
                      <span>{p.symbol.toUpperCase()}/USDT</span>
                    </div>
                    <div>
                      <span>${p.current_price.toLocaleString()}</span>
                      <span className={`ml-2 ${p.price_change_percentage_24h >= 0 ? "text-profit" : "text-loss"}`}>
                        {p.price_change_percentage_24h >= 0 ? "+" : ""}{p.price_change_percentage_24h.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <span className="text-lg font-bold">${currentPrice.toLocaleString()}</span>
        {priceChange24h !== undefined && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priceChange24h >= 0 ? "bg-profit/10 text-profit" : "bg-loss/10 text-loss"}`}>
            {priceChange24h >= 0 ? "+" : ""}{priceChange24h.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}
