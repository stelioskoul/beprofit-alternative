import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Clock, CalendarDays } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { useState, useMemo } from "react";
import Connections from "./Connections";
import Products from "./Products";
import Expenses from "./Expenses";
import Orders from "./Orders";
import Settings from "./Settings";
import ShippingProfiles from "./ShippingProfiles";
import ExchangeRateDisplay from "@/components/ExchangeRateDisplay";

export default function StoreView() {
  const { id } = useParams();
  const storeId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Memoize today's date to prevent recalculation on every render
  const todayString = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Default to today only (not last 30 days)
  const [startDate, setStartDate] = useState(todayString);
  const [endDate, setEndDate] = useState(todayString);

  const { data: store, isLoading: storeLoading } = trpc.stores.getById.useQuery(
    { id: storeId },
    { enabled: isAuthenticated && storeId > 0 }
  );

  const { data: metrics, isLoading: metricsLoading, error, refetch } = trpc.metrics.getProfit.useQuery(
    { storeId, fromDate: startDate, toDate: endDate },
    { enabled: isAuthenticated && storeId > 0, retry: false }
  );

  // Removed caching - using direct getProfit for always fresh data

  const { data: exchangeRateData } = trpc.exchangeRate.getCurrent.useQuery();
  const exchangeRate = exchangeRateData?.rate || 1.1588;

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

  const formatCurrencyUSD = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatCurrencyEUR = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <div className="min-h-screen">
      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold gold-text">{store.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-muted-foreground">Track your store's profitability</p>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">{store.timezone?.replace(/_/g, ' ') || "America/New York"}</span>
              </div>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto pb-2 -mb-2">
            <TabsList className="glass-strong inline-flex w-auto min-w-full">
            <TabsTrigger value="dashboard" className="data-[state=active]:gold-gradient">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="shipping-profiles" className="data-[state=active]:gold-gradient">
              Shipping Profiles
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
            <TabsTrigger value="settings" className="data-[state=active]:gold-gradient">
              Settings
            </TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Date Range Picker */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass p-4 rounded-lg">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="start-date" className="text-sm font-medium">
                  From
                </label>
                <input
                  type="date"
                  id="start-date"
                  value={startDate}
                  max={endDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-black/30 text-foreground date-input-gold"
                  style={{ colorScheme: 'dark' }}
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
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 rounded-md border border-border bg-black/30 text-foreground date-input-gold"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              {/* Date Range Presets Dropdown */}
              <Select
                onValueChange={(value) => {
                  const today = new Date();
                  let fromDate: Date;
                  let toDate: Date = new Date(today);
                  
                  switch (value) {
                    case 'today':
                      fromDate = new Date(today);
                      break;
                    case 'yesterday':
                      fromDate = new Date(today);
                      fromDate.setDate(today.getDate() - 1);
                      toDate = new Date(fromDate);
                      break;
                    case 'last7':
                      fromDate = new Date(today);
                      fromDate.setDate(today.getDate() - 6);
                      break;
                    case 'last30':
                      fromDate = new Date(today);
                      fromDate.setDate(today.getDate() - 29);
                      break;
                    case 'thisMonth':
                      // Create date for 1st of current month in local timezone
                      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                      toDate = new Date(today);
                      break;
                    case 'lastMonth':
                      fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                      toDate = new Date(today.getFullYear(), today.getMonth(), 0);
                      break;
                    default:
                      return;
                  }
                  
                  // Format dates in local timezone
                  const formatDate = (d: Date) => {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };
                  
                  setStartDate(formatDate(fromDate));
                  setEndDate(formatDate(toDate));
                }}
              >
                <SelectTrigger className="w-[150px] h-9 bg-black/30 border-border">
                  <CalendarDays className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7">Last 7 Days</SelectItem>
                  <SelectItem value="last30">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                </SelectContent>
              </Select>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex flex-col items-stretch sm:items-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetch()}
                    disabled={metricsLoading}
                    className="gold-gradient-border"
                  >
                    {metricsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Refresh Data
                  </Button>
                  {/* Removed lastRefreshed display - no caching */}
                </div>
                <ExchangeRateDisplay />
              </div>
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
                        {formatCurrencyUSD(metrics.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrencyEUR(metrics.revenue / exchangeRate)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="card-glow">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Total Costs</p>
                      <p className="text-3xl font-bold text-red-500">
                        {formatCurrencyUSD(metrics.cogs + metrics.shipping + metrics.processingFees + (metrics.disputeValue || 0) + (metrics.disputeFees || 0) + (metrics.refunds || 0) + metrics.adSpend + metrics.operationalExpenses)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrencyEUR((metrics.cogs + metrics.shipping + metrics.processingFees + (metrics.disputeValue || 0) + (metrics.disputeFees || 0) + (metrics.refunds || 0) + metrics.adSpend + metrics.operationalExpenses) / exchangeRate)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="card-glow">
                    <CardContent className="p-6">
                      <p className="text-sm text-muted-foreground mb-2">Net Profit</p>
                      <p className={`text-3xl font-bold ${metrics.netProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {formatCurrencyUSD(metrics.netProfit)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatCurrencyEUR(metrics.netProfit / exchangeRate)}
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
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrencyUSD(metrics.cogs)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrencyEUR(metrics.cogs / exchangeRate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrencyUSD(metrics.shipping)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrencyEUR(metrics.shipping / exchangeRate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Processing Fees</span>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrencyUSD(metrics.processingFees)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrencyEUR(metrics.processingFees / exchangeRate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Dispute Value</span>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrencyUSD(metrics.disputeValue || 0)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrencyEUR((metrics.disputeValue || 0) / exchangeRate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Dispute Fees</span>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrencyUSD(metrics.disputeFees || 0)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrencyEUR((metrics.disputeFees || 0) / exchangeRate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Refunds</span>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrencyUSD(metrics.refunds || 0)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrencyEUR((metrics.refunds || 0) / exchangeRate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Ad Spend</span>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrencyUSD(metrics.adSpend)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrencyEUR(metrics.adSpend / exchangeRate)}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Operational Expenses</span>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrencyUSD(metrics.operationalExpenses)}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrencyEUR(metrics.operationalExpenses / exchangeRate)}</div>
                        </div>
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
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrencyUSD(metrics.orders > 0 ? metrics.revenue / metrics.orders : 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrencyEUR((metrics.orders > 0 ? metrics.revenue / metrics.orders : 0) / exchangeRate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Average Profit per Order</span>
                        <div className="text-right">
                          <div className="font-semibold">
                            {formatCurrencyUSD(metrics.averageOrderProfit || 0)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrencyEUR((metrics.averageOrderProfit || 0) / exchangeRate)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Average Profit Margin per Order</span>
                        <span className={`font-semibold ${(metrics.averageOrderProfitMargin || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {(metrics.averageOrderProfitMargin || 0).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">ROAS (Return on Ad Spend)</span>
                        <span className={`font-semibold ${(metrics.roas || 0) >= 1 ? "text-green-500" : "text-red-500"}`}>
                          {(metrics.roas || 0).toFixed(2)}x
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="shipping-profiles">
            <ShippingProfiles />
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

          <TabsContent value="settings">
            <Settings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
