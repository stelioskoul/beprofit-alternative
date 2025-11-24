import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState("today");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: metrics, isLoading, refetch } = trpc.metrics.get.useQuery(
    { period },
    { refetchInterval: autoRefresh ? 10000 : false }
  );

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success("Metrics refreshed");
    } catch (error) {
      toast.error("Failed to refresh metrics");
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-primary text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-primary">// PROFIT TRACKER</h1>
          <p className="text-secondary">CYBERPUNK EDITION</p>
          <Button asChild className="mt-4">
            <a href={getLoginUrl()}>Login to Continue</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <div className="flex-1 overflow-auto">
        <div className="container py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">// DASHBOARD</h1>
            <p className="text-secondary">REAL-TIME ANALYTICS</p>
          </div>

          {/* Period Selector */}
          <div className="mb-8 flex items-center gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground font-bold">PERIOD:</span>
            {["today", "yesterday", "this_week", "this_month", "last_30_days"].map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="uppercase"
              >
                {p.replace("_", " ")}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="ml-auto"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {/* Metrics Grid */}
          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading metrics...</div>
          ) : metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MetricCard
                label="Revenue"
                value={`€${metrics.revenue.toFixed(2)}`}
                type="neutral"
              />
              <MetricCard
                label="Ad Spend"
                value={`€${metrics.adSpend.toFixed(2)}`}
                type="negative"
              />
              <MetricCard
                label="Gross Profit"
                value={`€${metrics.grossProfit.toFixed(2)}`}
                type={metrics.grossProfit >= 0 ? "positive" : "negative"}
              />
              <MetricCard
                label="COGS"
                value={`€${metrics.cogs.toFixed(2)}`}
                type="neutral"
              />
              <MetricCard
                label="Shipping"
                value={`€${metrics.shipping.toFixed(2)}`}
                type="neutral"
              />
              <MetricCard
                label="Net Profit"
                value={`€${metrics.netProfit.toFixed(2)}`}
                type={metrics.netProfit >= 0 ? "positive" : "negative"}
              />
              <MetricCard
                label="Operational Expenses"
                value={`€${metrics.operationalExpenses.toFixed(2)}`}
                type="neutral"
              />
              <MetricCard
                label="Disputes"
                value={`€${metrics.disputes.toFixed(2)}`}
                type="negative"
              />
              <MetricCard
                label="Profit Margin"
                value={`${metrics.profitMargin.toFixed(2)}%`}
                type={metrics.profitMargin >= 0 ? "positive" : "negative"}
              />
              <MetricCard
                label="Orders"
                value={metrics.orders.toString()}
                type="neutral"
              />
            </div>
          ) : (
            <div className="text-center text-destructive py-12">Failed to load metrics</div>
          )}

          {/* Last Update */}
          <div className="mt-8 text-center text-xs text-muted-foreground">
            Last updated: {new Date().toLocaleString()}
            {autoRefresh && " • Auto-refresh enabled (10s)"}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, type }: { label: string; value: string; type: "positive" | "negative" | "neutral" }) {
  const colorClass = type === "positive" ? "metric-positive" : type === "negative" ? "metric-negative" : "metric-neutral";
  
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${colorClass}`}>{value}</div>
    </div>
  );
}
