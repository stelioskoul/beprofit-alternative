import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { ShopifyConnect } from "@/components/ShopifyConnect";

export default function Settings() {
  const [fbToken, setFbToken] = useState("");
  const [fbAccountId, setFbAccountId] = useState("");
  const [shopifyToken, setShopifyToken] = useState("");
  const [shopifyDomain, setShopifyDomain] = useState("");

  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const saveFacebookMutation = trpc.settings.saveFacebook.useMutation({
    onSuccess: () => {
      toast.success("Facebook settings saved");
      setFbToken(""); // Clear token input after save
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save Facebook settings");
    },
  });
  const saveShopifyMutation = trpc.settings.saveShopify.useMutation({
    onSuccess: () => {
      toast.success("Shopify settings saved");
      setShopifyToken(""); // Clear token input after save
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save Shopify settings");
    },
  });

  useEffect(() => {
    if (settings) {
      setFbAccountId(settings.facebook.accountId);
      setShopifyDomain(settings.shopify.storeDomain);
    }
  }, [settings]);

  const handleSaveFacebook = (e: React.FormEvent) => {
    e.preventDefault();
    saveFacebookMutation.mutate({
      accessToken: fbToken || undefined,
      accountId: fbAccountId || undefined,
    });
  };

  const handleSaveShopify = (e: React.FormEvent) => {
    e.preventDefault();
    saveShopifyMutation.mutate({
      accessToken: shopifyToken || undefined,
      storeDomain: shopifyDomain || undefined,
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <div className="flex-1 overflow-auto">
        <div className="container py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">// SETTINGS</h1>
            <p className="text-secondary">API CREDENTIALS & CONFIGURATION</p>
          </div>

          {isLoading ? (
            <div className="text-center text-muted-foreground py-12">Loading settings...</div>
          ) : (
            <div className="space-y-8">
              {/* Facebook Ads Manager */}
              <form onSubmit={handleSaveFacebook} className="border-2 border-primary p-6 bg-card">
                <h2 className="text-2xl font-bold text-secondary mb-4">// FACEBOOK ADS MANAGER</h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fbToken" className="text-primary uppercase">Access Token</Label>
                    <Input
                      id="fbToken"
                      type="password"
                      value={fbToken}
                      onChange={(e) => setFbToken(e.target.value)}
                      placeholder={settings?.facebook.hasToken ? "••••••••••••" : "Enter new token"}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {settings?.facebook.hasToken ? "Token is set. Enter new token to update." : "No token configured"}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="fbAccountId" className="text-primary uppercase">Ad Account ID</Label>
                    <Input
                      id="fbAccountId"
                      value={fbAccountId}
                      onChange={(e) => setFbAccountId(e.target.value)}
                      placeholder="act_123456789"
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" disabled={saveFacebookMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {saveFacebookMutation.isPending ? "Saving..." : "Save Facebook Settings"}
                  </Button>
                </div>
              </form>

              {/* Shopify */}
              <form onSubmit={handleSaveShopify} className="border-2 border-primary p-6 bg-card">
                <h2 className="text-2xl font-bold text-secondary mb-4">// SHOPIFY</h2>
                <div className="space-y-6">
            {/* Shopify OAuth Integration */}
            <ShopifyConnect />

                  <div>
                    <Label htmlFor="shopifyToken" className="text-primary uppercase">Access Token</Label>
                    <Input
                      id="shopifyToken"
                      type="password"
                      value={shopifyToken}
                      onChange={(e) => setShopifyToken(e.target.value)}
                      placeholder={settings?.shopify.hasToken ? "••••••••••••" : "Enter new token"}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {settings?.shopify.hasToken ? "Token is set. Enter new token to update." : "No token configured"}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="shopifyDomain" className="text-primary uppercase">Store Domain</Label>
                    <Input
                      id="shopifyDomain"
                      value={shopifyDomain}
                      onChange={(e) => setShopifyDomain(e.target.value)}
                      placeholder="your-store.myshopify.com"
                      className="mt-1"
                    />
                  </div>
                  <Button type="submit" disabled={saveShopifyMutation.isPending}>
                    <Save className="h-4 w-4 mr-2" />
                    {saveShopifyMutation.isPending ? "Saving..." : "Save Shopify Settings"}
                  </Button>
                </div>
              </form>

              {/* Info Section */}
              <div className="border-2 border-secondary p-6 bg-card">
                <h2 className="text-2xl font-bold text-secondary mb-4">// INFORMATION</h2>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="text-primary font-bold">Facebook Ads Manager:</span> Used to fetch ad spend data for profit calculations.
                  </p>
                  <p>
                    <span className="text-primary font-bold">Shopify:</span> Used to fetch order data, revenue, and product information.
                  </p>
                  <p className="mt-4 text-xs">
                    All credentials are encrypted and stored securely in the database.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
