import { trpc } from "@/lib/trpc";
import { TrendingUp } from "lucide-react";

export default function ExchangeRateDisplay() {
  const { data } = trpc.exchangeRate.getCurrent.useQuery();

  if (!data) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <TrendingUp className="h-4 w-4" />
      <span>EUR/USD: {data.rate.toFixed(4)}</span>
    </div>
  );
}
