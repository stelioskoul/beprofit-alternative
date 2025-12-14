import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DebugTransactions() {
  const [storeId, setStoreId] = useState("");
  const [orderNumber, setOrderNumber] = useState("11472");
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data, isLoading, error } = trpc.shopify.debugTransactions.useQuery(
    {
      storeId: parseInt(storeId),
      orderNumber: orderNumber ? parseInt(orderNumber) : undefined,
    },
    {
      enabled: shouldFetch && !!storeId,
    }
  );

  const handleFetch = () => {
    if (storeId) {
      setShouldFetch(true);
    }
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Debug: Shopify Balance Transactions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storeId">Store ID</Label>
              <Input
                id="storeId"
                type="number"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                placeholder="Enter store ID"
              />
            </div>
            <div>
              <Label htmlFor="orderNumber">Order Number (optional)</Label>
              <Input
                id="orderNumber"
                type="number"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g., 11472"
              />
            </div>
          </div>

          <Button onClick={handleFetch} disabled={!storeId || isLoading}>
            {isLoading ? "Fetching..." : "Fetch Transactions"}
          </Button>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded text-red-300">
              Error: {error.message}
            </div>
          )}

          {data && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded">
                <p><strong>Order Number:</strong> {data.orderNumber || "All"}</p>
                <p><strong>Order ID Found:</strong> {data.orderIdFound || "N/A"}</p>
                <p><strong>Transaction Count:</strong> {data.transactionCount}</p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Raw Transactions:</h3>
                <pre className="p-4 bg-muted rounded overflow-auto max-h-[600px] text-xs">
                  {JSON.stringify(data.transactions, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
