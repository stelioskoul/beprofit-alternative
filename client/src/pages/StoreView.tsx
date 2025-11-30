import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useState } from "react";
import Connections from "./Connections";
import Products from "./Products";
import Expenses from "./Expenses";
import Orders from "./Orders";
import ExchangeRateDisplay from "@/components/ExchangeRateDisplay";

export default function StoreView() {
  const { id } = useParams();
  const storeId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const { data: store, isLoading: storeLoading } = trpc.stores.getById.useQuery(
    { id: storeId },
    { enabled: isAuthenticated && storeId > 0 }
  );

  const { data: metrics, isLoading: metricsLoading, error } = trpc.metrics.getProfit.useQuery(
    { storeId, fromDate: startDate, toDate: endDate },
    { enabled: isAuthenticated && storeId > 0, retry: false }
  );

  if (loading || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass">
          <CardContent className="p-6">
            <p className="text-muted-foreground">Store not found</p>
            <Button onClick={() => setLocation("/dashboard")} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold gold-text">{store.name}</h1>
            <p className="text-muted-foreground mt-1">Track your store's profitability</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="glass-strong">
            <TabsTrigger value="dashboard" className="data-[state=active]:gold-gradient">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:gold-gradient">
              Products
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:gold-gradient">
              Expenses
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:gold-gradient">
              Orders
            </TabsTrigger>
            <TabsTrigger value="connections" className="data-[state=active]:gold-gradient">
              Connections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Date Range Picker */}
            <div className="flex items-center justify-between gap-4 glass p-4 rounded-lg">
              <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="start-date" className="text-sm font-medium">
                  From
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-background text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="end-date" className="text-sm font-medium">
                  To
                </label>
                <input
                  type="date"
                  id="end-date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-background text-foreground"
                />
              </div>
              </div>
              <ExchangeRateDisplay />
            </div>

            {metricsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <Card className="glass">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-destructive mb-2">Error loading metrics</p>
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    {error.message}
                  </p>
                </CardContent>
              </Card>
            ) : metrics ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="card-glow">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Total Revenue</p>
                      <p className="text-3xl font-bold gold-text">
                        {formatCurrency(metrics.revenue)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="card-glow">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Total Costs</p>
                      <p className="text-3xl font-bold text-red-500">
                        {formatCurrency(metrics.cogs + metrics.shipping + metrics.processingFees + metrics.adSpend + metrics.operationalExpenses)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="card-glow">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Net Profit</p>
                      <p className={`text-3xl font-bold ${metrics.netProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrency(metrics.netProfit)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="card-glow">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Profit Margin</p>
                      <p className={`text-3xl font-bold ${(metrics.revenue > 0 ? (metrics.netProfit / metrics.revenue * 100) : 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {(metrics.revenue > 0 ? (metrics.netProfit / metrics.revenue * 100) : 0).toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="glass">
                    <CardContent className="p-6 space-y-3">
                      <h3 className="font-semibold text-lg mb-4">Cost Breakdown</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">COGS</span>
                        <span className="font-semibold">{formatCurrency(metrics.cogs)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-semibold">{formatCurrency(metrics.shipping)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Processing Fees</span>
                        <span className="font-semibold">{formatCurrency(metrics.processingFees)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ad Spend</span>
                        <span className="font-semibold">{formatCurrency(metrics.adSpend)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Operational Expenses</span>
                        <span className="font-semibold">{formatCurrency(metrics.operationalExpenses)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass">
                    <CardContent className="p-6 space-y-3">
                      <h3 className="font-semibold text-lg mb-4">Order Statistics</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Total Orders</span>
                        <span className="font-semibold">{metrics.orders}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Average Order Value</span>
                        <span className="font-semibold">
                          {formatCurrency(metrics.orders > 0 ? metrics.revenue / metrics.orders : 0)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Average Profit per Order</span>
                        <span className="font-semibold">
                          {formatCurrency(metrics.orders > 0 ? metrics.netProfit / metrics.orders : 0)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="products">
            <Products />
          </TabsContent>

          <TabsContent value="expenses">
            <Expenses />
          </TabsContent>

          <TabsContent value="orders">
            <Orders />
          </TabsContent>

          <TabsContent value="connections">
            <Connections />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
