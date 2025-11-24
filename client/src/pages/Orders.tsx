import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Orders() {
  const [page, setPage] = useState(1);
  const limit = 50;
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Set default date range to last 30 days
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  const { data: ordersData, isLoading, refetch } = trpc.orders.list.useQuery({
    page,
    limit,
    startDate,
    endDate,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const orders = ordersData?.orders || [];
  const total = ordersData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary tracking-wider">
            // ORDERS
          </h1>
          <p className="text-sm text-cyan-400 mt-1">
            ALL SHOPIFY ORDERS
          </p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="p-4 border-2 border-primary/30 rounded-lg bg-card/50">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm text-muted-foreground font-bold">DATE RANGE:</span>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">START:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1 bg-background border border-primary/30 rounded text-foreground text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">END:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1 bg-background border border-primary/30 rounded text-foreground text-sm"
            />
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => refetch()}
            className="uppercase"
          >
            FILTER
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            Showing {total} orders
          </span>
        </div>
      </div>

      <div className="border-2 border-primary/30 rounded-lg overflow-hidden bg-card/50">
        <Table>
          <TableHeader>
            <TableRow className="border-primary/30 hover:bg-transparent">
              <TableHead className="text-primary font-bold">DATE</TableHead>
              <TableHead className="text-primary font-bold">ORDER ID</TableHead>
              <TableHead className="text-primary font-bold">STATUS</TableHead>
              <TableHead className="text-primary font-bold">CUSTOMER</TableHead>
              <TableHead className="text-primary font-bold">ITEMS</TableHead>
              <TableHead className="text-primary font-bold">AMOUNT PAID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No orders found. Check your Shopify API credentials in Settings.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order: any) => (
                <TableRow
                  key={order.id}
                  className="border-primary/20 hover:bg-primary/5"
                >
                  <TableCell className="text-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-mono text-cyan-400">
                    #{order.order_number}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        order.financial_status === "paid"
                          ? "bg-green-500/20 text-green-400"
                          : order.financial_status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {order.financial_status?.toUpperCase() || "UNKNOWN"}
                    </span>
                  </TableCell>
                  <TableCell className="text-foreground">
                    {order.customer?.first_name || ""} {order.customer?.last_name || "Guest"}
                  </TableCell>
                  <TableCell className="text-foreground">
                    <div className="max-w-xs">
                      {order.line_items?.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          {item.quantity}x {item.name}
                        </div>
                      ))}
                      {order.line_items?.length > 2 && (
                        <div className="text-xs text-muted-foreground">
                          +{order.line_items.length - 2} more
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-primary font-bold">
                    ${parseFloat(order.current_total_price || "0").toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
