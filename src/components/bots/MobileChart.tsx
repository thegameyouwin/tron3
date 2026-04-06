import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MobileChartProps {
  currentPrice: number;
}

export default function MobileChart({ currentPrice }: MobileChartProps) {
  const data = useMemo(() => {
    const cp = currentPrice || 60000;
    return Array.from({ length: 30 }, (_, i) => ({
      t: i,
      price: cp * (1 + Math.sin(i * 0.3) * 0.01 + (Math.random() - 0.5) * 0.005),
    }));
  }, [currentPrice]);

  return (
    <div className="h-48 bg-background p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="t" hide />
          <YAxis domain={["auto", "auto"]} hide />
          <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Price"]} />
          <Line type="monotone" dataKey="price" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
