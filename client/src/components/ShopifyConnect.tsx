import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export function ShopifyConnect() {
  const { data: status, refetch } = trpc.shopifyOAuth.getConnectionStatus.useQuery();
  const utils = trpc.useUtils();
  const handleCallback = trpc.shopifyOAuth.handleCallback.useMutation();
  const disconnect = trpc.shopifyOAuth.disconnect.useMutation();
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle OAuth callback from popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === "shopify-oauth-callback") {
        setIsProcessing(true);
        try {
          const { code } = event.data;
          const redirectUri = `${window.location.origin}/shopify-callback`;
          
          await handleCallback.mutateAsync({ code, redirectUri });
          toast.success("Shopify connected successfully!");
          refetch();
        } catch (error) {
          toast.error("Failed to connect Shopify");
          console.error(error);
        } finally {
          setIsProcessing(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleCallback, refetch]);

  const handleConnect = async () => {
    try {
      const redirectUri = `${window.location.origin}/shopify-callback`;
      const result = await utils.shopifyOAuth.getAuthUrl.fetch({ redirectUri });
      
      // Open popup window for OAuth
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        result.authUrl,
        "Shopify OAuth",
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      toast.error("Failed to start OAuth flow");
      console.error(error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect.mutateAsync();
      toast.success("Shopify disconnected");
      refetch();
    } catch (error) {
      toast.error("Failed to disconnect Shopify");
      console.error(error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Shopify Integration
          {status?.connected ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-gray-400" />
          )}
        </CardTitle>
        <CardDescription>
          Connect your Shopify store to automatically sync orders, products, and revenue data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.connected ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Connected to: {status.shopDomain}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Webhooks are active and syncing data automatically
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnect.isPending}
            >
              {disconnect.isPending ? "Disconnecting..." : "Disconnect Shopify"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                Shopify is not connected. Click below to authorize access to your store.
              </p>
            </div>
            <Button
              onClick={handleConnect}
              disabled={isProcessing}
              className="w-full"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {isProcessing ? "Connecting..." : "Connect Shopify Store"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
