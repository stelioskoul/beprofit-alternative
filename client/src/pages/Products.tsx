import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, Search, Settings } from "lucide-react";
import { useParams } from "wouter";
import { useState } from "react";
import { ShippingConfigEditor } from "@/components/ShippingConfigEditor";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Products() {
  const { id } = useParams();
  const storeId = parseInt(id || "0");
  const { isAuthenticated, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingCogs, setEditingCogs] = useState<Record<string, string>>({});
  const [editingShipping, setEditingShipping] = useState<Record<string, any>>({});

  const { data: products, isLoading, refetch } = trpc.products.list.useQuery(
    { storeId },
    { enabled: isAuthenticated && storeId > 0 }
  );

  const { data: cogsConfigs } = trpc.config.getCogs.useQuery(
    { storeId },
    { enabled: isAuthenticated && storeId > 0 }
  );

  const { data: shippingConfigs } = trpc.config.getShipping.useQuery(
    { storeId },
    { enabled: isAuthenticated && storeId > 0 }
  );

  const saveCogsMutation = trpc.config.setCogs.useMutation({
    onSuccess: () => {
      toast.success("COGS saved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const saveShippingMutation = trpc.config.setShipping.useMutation({
    onSuccess: () => {
      toast.success("Shipping config saved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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

  const filteredProducts = products?.filter((p: any) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveCogs = (variantId: string) => {
    const value = editingCogs[variantId];
    if (!value || isNaN(parseFloat(value))) {
      toast.error("Please enter a valid number");
      return;
    }

    saveCogsMutation.mutate({
      storeId,
      variantId,
      cogsValue: value,
    });
  };

  const handleSaveShipping = (variantId: string) => {
    const config = editingShipping[variantId];
    if (!config) {
      toast.error("No shipping configuration to save");
      return;
    }

    saveShippingMutation.mutate({
      storeId,
      variantId,
      configJson: JSON.stringify(config),
    });
  };

  const getCogsValue = (variantId: string) => {
    if (editingCogs[variantId]) return editingCogs[variantId];
    const config = cogsConfigs?.find((c) => c.variantId === variantId);
    return config?.cogsValue || "";
  };

  const getShippingConfig = (variantId: string) => {
    if (editingShipping[variantId]) return editingShipping[variantId];
    const config = shippingConfigs?.find((c) => c.variantId === variantId);
    if (config?.configJson) {
      try {
        return JSON.parse(config.configJson);
      } catch {
        return {};
      }
    }
    return {};
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text">Products</h2>
          <p className="text-muted-foreground mt-1">
            Configure COGS and shipping costs for your products
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <div className="space-y-4">
          {filteredProducts.map((product: any) => (
            <Card key={product.id} className="card-glow">
              <CardHeader>
                <CardTitle className="text-lg">{product.title}</CardTitle>
                <CardDescription>
                  {(product.variants || []).length} variant{(product.variants || []).length !== 1 ? "s" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(product.variants || []).map((variant: any) => (
                    <div key={variant.id} className="glass p-4 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{variant.title}</p>
                          <p className="text-sm text-muted-foreground">SKU: {variant.sku || "N/A"}</p>
                        </div>
                        <p className="text-lg font-semibold text-primary">
                          ${parseFloat(variant.price).toFixed(2)}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>COGS (Cost of Goods Sold) - USD ($)</Label>
                          <div className="flex gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00 USD"
                              value={getCogsValue(variant.id.toString())}
                              onChange={(e) =>
                                setEditingCogs({ ...editingCogs, [variant.id.toString()]: e.target.value })
                              }
                            />
                            <Button
                              size="icon"
                              onClick={() => handleSaveCogs(variant.id.toString())}
                              disabled={saveCogsMutation.isPending}
                              className="gold-gradient"
                            >
                              {saveCogsMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Shipping Configuration</Label>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full">
                                <Settings className="h-4 w-4 mr-2" />
                                Configure Shipping Matrix
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                              <DialogTitle className="sr-only">Configure Shipping Matrix</DialogTitle>
                              <ShippingConfigEditor
                                variantId={variant.id.toString()}
                                productTitle={`${product.title} - ${variant.title}`}
                                initialConfig={getShippingConfig(variant.id.toString())}
                                onSave={(config) => {
                                  saveShippingMutation.mutate({
                                    storeId,
                                    variantId: variant.id.toString(),
                                    configJson: JSON.stringify(config),
                                  });
                                }}
                                isSaving={saveShippingMutation.isPending}
                              />
                            </DialogContent>
                          </Dialog>
                          <p className="text-xs text-muted-foreground">
                            Configure shipping by country (US/EU/CA), method (Standard/Express), and quantity
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No products found</p>
            <p className="text-sm text-muted-foreground">
              Make sure your Shopify store is connected and has products
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
