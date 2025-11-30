import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function Connections() {
  const { id } = useParams();
  const storeId = parseInt(id || "0");
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();
  const [shopDomain, setShopDomain] = useState("");

  const { data: shopifyConn, refetch: refetchShopify } = trpc.shopify.getConnection.useQuery(
    { storeId },
    { enabled: isAuthenticated && storeId > 0 }
  );

  const { data: facebookConns, refetch: refetchFacebook } = trpc.facebook.getConnections.useQuery(
    { storeId },
    { enabled: isAuthenticated && storeId > 0 }
  );

  const shopifyAuthMutation = trpc.shopify.getAuthUrl.useMutation({
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const facebookAuthMutation = trpc.facebook.getAuthUrl.useMutation({
    onSuccess: (data) => {
      window.location.href = data.authUrl;
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const shopifyDisconnectMutation = trpc.shopify.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Shopify disconnected");
      refetchShopify();
    },
  });

  const facebookDisconnectMutation = trpc.facebook.disconnect.useMutation({
    onSuccess: () => {
      toast.success("Facebook disconnected");
      refetchFacebook();
    },
  });

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

  const handleShopifyConnect = () => {
    if (!shopDomain.trim()) {
      toast.error("Please enter your Shopify store domain");
      return;
    }

    const domain = shopDomain.trim().replace("https://", "").replace("http://", "");
    shopifyAuthMutation.mutate({ shop: domain, storeId });
  };

  const handleFacebookConnect = () => {
    facebookAuthMutation.mutate({ storeId });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container flex h-16 items-center">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/store/${storeId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold ml-4">Connections</h1>
        </div>
      </div>

      <div className="container py-8 max-w-4xl">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Shopify</CardTitle>
                  <CardDescription>Connect your Shopify store to import orders and products</CardDescription>
                </div>
                {shopifyConn ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {shopifyConn ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Store: {shopifyConn.shopDomain}</p>
                    <p className="text-sm text-muted-foreground">
                      Connected {new Date(shopifyConn.connectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => shopifyDisconnectMutation.mutate({ storeId })}
                    disabled={shopifyDisconnectMutation.isPending}
                  >
                    {shopifyDisconnectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="shop">Shopify Store Domain</Label>
                    <Input
                      id="shop"
                      placeholder="mystore.myshopify.com"
                      value={shopDomain}
                      onChange={(e) => setShopDomain(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your Shopify store domain (e.g., mystore.myshopify.com)
                    </p>
                  </div>
                  <Button onClick={handleShopifyConnect} disabled={shopifyAuthMutation.isPending}>
                    {shopifyAuthMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Connect Shopify
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Facebook Ads</CardTitle>
                  <CardDescription>Connect your Facebook ad account to track ad spend</CardDescription>
                </div>
                {facebookConns && facebookConns.length > 0 ? (
                  <CheckCircle className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              {facebookConns && facebookConns.length > 0 ? (
                <div className="space-y-4">
                  {facebookConns.map((conn) => (
                    <div key={conn.id} className="flex items-center justify-between border rounded-lg p-4">
                      <div>
                        <p className="text-sm font-medium">Account: {conn.adAccountId}</p>
                        <p className="text-sm text-muted-foreground">
                          Connected {new Date(conn.connectedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => facebookDisconnectMutation.mutate({ connectionId: conn.id })}
                        disabled={facebookDisconnectMutation.isPending}
                      >
                        {facebookDisconnectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Disconnect
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" onClick={handleFacebookConnect}>
                    Add Another Account
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your Facebook ad account to automatically track ad spend and calculate profit.
                  </p>
                  <Button onClick={handleFacebookConnect} disabled={facebookAuthMutation.isPending}>
                    {facebookAuthMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Connect Facebook Ads
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
