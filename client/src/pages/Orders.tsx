import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { useParams } from "wouter";
import { useState } from "react";

export default function Orders() {
  const { id } = useParams();
  const storeId = parseInt(id || "0");
  const { isAuthenticated, loading } = useAuth();
  
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);

  const { data: orders, isLoading } = trpc.orders.listWithProfit.useQuery(
    { storeId, startDate, endDate },
    { enabled: isAuthenticated && storeId > 0 }
  );

  if (loading) {
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (dateInput: string | Date | null | undefined) => {
    if (!dateInput) return "Invalid date";
    try {
      const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return "text-green-500";
    if (profit < 0) return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold gold-text">Orders</h2>
          <p className="text-muted-foreground mt-1">
            View detailed profit breakdown for each order
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <Label htmlFor="start-date" className="text-xs">From</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40 date-input-gold"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date" className="text-xs">To</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40 date-input-gold"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Card key={order.id} className="card-glow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-lg">Order #{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {order.country && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          📍 {order.country}
                        </span>
                      )}
                      {order.shippingType && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          🚚 {order.shippingType.charAt(0).toUpperCase() + order.shippingType.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Net Profit</p>
                    <p className={`text-2xl font-bold ${getProfitColor(order.profit)}`}>
                      {formatCurrency(order.profit)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.lineItems.map((item: any, idx: number) => (
                    <div key={idx} className="glass p-3 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × {formatCurrency(item.price)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.quantity * item.price)}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 pt-2 border-t border-white/5">
                        <div>
                          <p className="text-xs text-muted-foreground">COGS</p>
                          <p className="text-sm font-medium">{formatCurrency(item.cogs || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Shipping</p>
                          <p className="text-sm font-medium">{formatCurrency(item.shipping || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Processing Fee</p>
                          <p className="text-sm font-medium">{formatCurrency(item.processingFee || 0)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Item Profit</p>
                          <p className={`text-sm font-semibold ${getProfitColor(item.profit || 0)}`}>
                            {formatCurrency(item.profit || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Revenue</p>
                      <p className="font-semibold">{formatCurrency(order.totalRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total COGS</p>
                      <p className="font-semibold">{formatCurrency(order.totalCogs)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Shipping</p>
                      <p className="font-semibold">{formatCurrency(order.totalShipping)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Processing Fees</p>
                      <p className="font-semibold">{formatCurrency(order.totalProcessingFees)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Ad Spend (allocated)</p>
                      <p className="font-semibold">{formatCurrency(order.allocatedAdSpend || 0)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-2">No orders found for this date range</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting the date range or check your Shopify connection
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
