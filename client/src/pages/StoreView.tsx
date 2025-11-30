import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, Settings } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function StoreView() {
  const { id } = useParams();
  const storeId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Date range state (default to last 30 days)
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: metrics, isLoading, error } = trpc.metrics.getProfit.useQuery(
    {
      storeId,
      fromDate,
      toDate,
    },
    {
      enabled: isAuthenticated && storeId > 0,
      retry: false,
    }
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Store #{storeId}</h1>
          </div>
          <Button variant="outline" onClick={() => setLocation(`/store/${storeId}/connections`)}>
            <Settings className="h-4 w-4 mr-2" />
            Connections
          </Button>
        </div>
      </div>

      <div className="container py-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">From:</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">To:</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-destructive mb-4">{error.message}</p>
              <Button onClick={() => setLocation(`/store/${storeId}/connections`)}>
                Set Up Connections
              </Button>
            </CardContent>
          </Card>
        ) : metrics ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Revenue</CardDescription>
                  <CardTitle className="text-2xl">{formatCurrency(metrics.revenue)}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{metrics.orders} orders</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>COGS</CardDescription>
                  <CardTitle className="text-2xl text-destructive">
                    -{formatCurrency(metrics.cogs)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Shipping</CardDescription>
                  <CardTitle className="text-2xl text-destructive">
                    -{formatCurrency(metrics.shipping)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Processing Fees</CardDescription>
                  <CardTitle className="text-2xl text-destructive">
                    -{formatCurrency(metrics.processingFees)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Ad Spend</CardDescription>
                  <CardTitle className="text-2xl text-destructive">
                    -{formatCurrency(metrics.adSpend)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Disputes</CardDescription>
                  <CardTitle className="text-2xl text-destructive">
                    -{formatCurrency(metrics.disputes)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Operational Expenses</CardDescription>
                  <CardTitle className="text-2xl text-destructive">
                    -{formatCurrency(metrics.operationalExpenses)}
                  </CardTitle>
                </CardHeader>
              </Card>

              <Card className="border-primary">
                <CardHeader className="pb-2">
                  <CardDescription>Net Profit</CardDescription>
                  <CardTitle
                    className={`text-2xl ${metrics.netProfit >= 0 ? "text-green-500" : "text-destructive"}`}
                  >
                    {formatCurrency(metrics.netProfit)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            {metrics.processedOrders && metrics.processedOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Detailed breakdown of orders in this period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Order</th>
                          <th className="text-left py-2">Customer</th>
                          <th className="text-right py-2">Total</th>
                          <th className="text-right py-2">COGS</th>
                          <th className="text-right py-2">Shipping</th>
                          <th className="text-left py-2">Country</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.processedOrders.slice(0, 20).map((order: any) => (
                          <tr key={order.id} className="border-b">
                            <td className="py-2">{order.id}</td>
                            <td className="py-2">{order.customer}</td>
                            <td className="text-right py-2">{formatCurrency(order.total)}</td>
                            <td className="text-right py-2">{formatCurrency(order.cogs)}</td>
                            <td className="text-right py-2">{formatCurrency(order.shippingCost)}</td>
                            <td className="py-2">{order.country || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
