import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, ChevronDown, ChevronUp, Save } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TierInputs {
  "1": string;
  "2": string;
  "3": string;
  "4": string;
}

interface ShippingTierInputs {
  EU: TierInputs;
  USA: TierInputs;
  Canada: TierInputs;
  ROW: TierInputs;
}

export default function Products() {
  const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
  const [cogsTiers, setCogsTiers] = useState<Record<number, TierInputs>>({});
  const [shippingTiers, setShippingTiers] = useState<Record<number, ShippingTierInputs>>({});

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery();
  
  const importShopifyMutation = trpc.products.importShopifyProducts.useMutation({
    onSuccess: (result) => {
      utils.products.list.invalidate();
      toast.success(`Imported ${result.imported} new products from Shopify, ${result.skipped} already exist`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import from Shopify");
    },
  });

  const updateTiersMutation = trpc.products.updateTiers.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success("Tiers updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update tiers");
    },
  });

  const toggleExpand = (productId: number, product: any) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(productId);
      
      // Initialize tier inputs from existing data
      const existingCogsTiers = product.cogsTiers ? JSON.parse(product.cogsTiers) : {};
      setCogsTiers({
        ...cogsTiers,
        [productId]: {
          "1": existingCogsTiers["1"] ? (existingCogsTiers["1"] / 100).toFixed(2) : "",
          "2": existingCogsTiers["2"] ? (existingCogsTiers["2"] / 100).toFixed(2) : "",
          "3": existingCogsTiers["3"] ? (existingCogsTiers["3"] / 100).toFixed(2) : "",
          "4": existingCogsTiers["4"] ? (existingCogsTiers["4"] / 100).toFixed(2) : "",
        }
      });

      const existingShippingTiers = product.shippingTiers ? JSON.parse(product.shippingTiers) : {};
      const zones = ["EU", "USA", "Canada", "ROW"] as const;
      const emptyTiers = { "1": "", "2": "", "3": "", "4": "" };
      
      setShippingTiers({
        ...shippingTiers,
        [productId]: {
          EU: zones.includes("EU") && existingShippingTiers.EU ? {
            "1": existingShippingTiers.EU["1"] ? (existingShippingTiers.EU["1"] / 100).toFixed(2) : "",
            "2": existingShippingTiers.EU["2"] ? (existingShippingTiers.EU["2"] / 100).toFixed(2) : "",
            "3": existingShippingTiers.EU["3"] ? (existingShippingTiers.EU["3"] / 100).toFixed(2) : "",
            "4": existingShippingTiers.EU["4"] ? (existingShippingTiers.EU["4"] / 100).toFixed(2) : "",
          } : emptyTiers,
          USA: zones.includes("USA") && existingShippingTiers.USA ? {
            "1": existingShippingTiers.USA["1"] ? (existingShippingTiers.USA["1"] / 100).toFixed(2) : "",
            "2": existingShippingTiers.USA["2"] ? (existingShippingTiers.USA["2"] / 100).toFixed(2) : "",
            "3": existingShippingTiers.USA["3"] ? (existingShippingTiers.USA["3"] / 100).toFixed(2) : "",
            "4": existingShippingTiers.USA["4"] ? (existingShippingTiers.USA["4"] / 100).toFixed(2) : "",
          } : emptyTiers,
          Canada: zones.includes("Canada") && existingShippingTiers.Canada ? {
            "1": existingShippingTiers.Canada["1"] ? (existingShippingTiers.Canada["1"] / 100).toFixed(2) : "",
            "2": existingShippingTiers.Canada["2"] ? (existingShippingTiers.Canada["2"] / 100).toFixed(2) : "",
            "3": existingShippingTiers.Canada["3"] ? (existingShippingTiers.Canada["3"] / 100).toFixed(2) : "",
            "4": existingShippingTiers.Canada["4"] ? (existingShippingTiers.Canada["4"] / 100).toFixed(2) : "",
          } : emptyTiers,
          ROW: zones.includes("ROW") && existingShippingTiers.ROW ? {
            "1": existingShippingTiers.ROW["1"] ? (existingShippingTiers.ROW["1"] / 100).toFixed(2) : "",
            "2": existingShippingTiers.ROW["2"] ? (existingShippingTiers.ROW["2"] / 100).toFixed(2) : "",
            "3": existingShippingTiers.ROW["3"] ? (existingShippingTiers.ROW["3"] / 100).toFixed(2) : "",
            "4": existingShippingTiers.ROW["4"] ? (existingShippingTiers.ROW["4"] / 100).toFixed(2) : "",
          } : emptyTiers,
        }
      });
    }
  };

  const updateCogsTier = (productId: number, tier: keyof TierInputs, value: string) => {
    setCogsTiers({
      ...cogsTiers,
      [productId]: {
        ...cogsTiers[productId],
        [tier]: value,
      }
    });
  };

  const updateShippingTier = (productId: number, zone: keyof ShippingTierInputs, tier: keyof TierInputs, value: string) => {
    setShippingTiers({
      ...shippingTiers,
      [productId]: {
        ...shippingTiers[productId],
        [zone]: {
          ...shippingTiers[productId]?.[zone],
          [tier]: value,
        }
      }
    });
  };

  const handleSaveTiers = (productId: number, variantId: string) => {
    const cogsData = cogsTiers[productId];
    const shippingData = shippingTiers[productId];

    // Convert to cents and build JSON objects
    const cogsJson: Record<string, number> = {};
    if (cogsData) {
      Object.entries(cogsData).forEach(([tier, value]) => {
        if (value && value.trim() !== "") {
          cogsJson[tier] = Math.round(parseFloat(value) * 100);
        }
      });
    }

    const shippingJson: Record<string, Record<string, number>> = {};
    if (shippingData) {
      Object.entries(shippingData).forEach(([zone, tiers]) => {
        shippingJson[zone] = {};
        Object.entries(tiers).forEach(([tier, value]) => {
          if (value && value.trim() !== "") {
            shippingJson[zone][tier] = Math.round(parseFloat(value) * 100);
          }
        });
      });
    }

    updateTiersMutation.mutate({
      variantId,
      cogsTiers: Object.keys(cogsJson).length > 0 ? JSON.stringify(cogsJson) : null,
      shippingTiers: Object.keys(shippingJson).length > 0 ? JSON.stringify(shippingJson) : null,
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2 font-orbitron">// PRODUCTS</h1>
            <p className="text-accent">TIERED COGS & SHIPPING CONFIGURATION</p>
          </div>

          {/* Import Button */}
          <div className="mb-6">
            <Button 
              onClick={() => importShopifyMutation.mutate()} 
              disabled={importShopifyMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importShopifyMutation.isPending ? "Importing..." : "Import from Shopify"}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Import all products from Shopify. Configure COGS and shipping tiers for each product below.
            </p>
          </div>

          {/* Products List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground border-2 border-primary bg-card">
                Loading products...
              </div>
            ) : products && products.length > 0 ? (
              products.map((product) => (
                <div key={product.id} className="border-2 border-primary bg-card">
                  {/* Product Header */}
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(product.id, product)}
                  >
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-primary">{product.productName || "Unnamed Product"}</h3>
                      <p className="text-sm text-muted-foreground">
                        Variant ID: {product.variantId} {product.sku && `• SKU: ${product.sku}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {product.cogsTiers ? (
                          <span className="text-green-500">✓ Tiers Configured</span>
                        ) : (
                          <span className="text-yellow-500">⚠ No Tiers</span>
                        )}
                      </div>
                      {expandedProduct === product.id ? (
                        <ChevronUp className="h-5 w-5 text-accent" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-accent" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Tier Configuration */}
                  {expandedProduct === product.id && (
                    <div className="border-t-2 border-primary p-6 bg-muted/20">
                      <div className="space-y-6">
                        {/* COGS Tiers */}
                        <div>
                          <h4 className="text-lg font-bold text-secondary mb-4">// COGS TIERS (EUR)</h4>
                          <div className="grid grid-cols-4 gap-4">
                            {(["1", "2", "3", "4"] as const).map((tier) => (
                              <div key={tier}>
                                <Label className="text-primary uppercase font-bold">
                                  {tier === "4" ? "4+ Items" : `${tier} Item${tier !== "1" ? "s" : ""}`}
                                </Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={cogsTiers[product.id]?.[tier] || ""}
                                  onChange={(e) => updateCogsTier(product.id, tier, e.target.value)}
                                  className="mt-1"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shipping Tiers by Zone */}
                        <div>
                          <h4 className="text-lg font-bold text-secondary mb-4">// SHIPPING TIERS (EUR)</h4>
                          <Tabs defaultValue="EU" className="w-full">
                            <TabsList className="grid w-full grid-cols-4">
                              <TabsTrigger value="EU">EU</TabsTrigger>
                              <TabsTrigger value="USA">USA</TabsTrigger>
                              <TabsTrigger value="Canada">Canada</TabsTrigger>
                              <TabsTrigger value="ROW">ROW</TabsTrigger>
                            </TabsList>
                            {(["EU", "USA", "Canada", "ROW"] as const).map((zone) => (
                              <TabsContent key={zone} value={zone} className="mt-4">
                                <div className="grid grid-cols-4 gap-4">
                                  {(["1", "2", "3", "4"] as const).map((tier) => (
                                    <div key={tier}>
                                      <Label className="text-primary uppercase font-bold">
                                        {tier === "4" ? "4+ Items" : `${tier} Item${tier !== "1" ? "s" : ""}`}
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={shippingTiers[product.id]?.[zone]?.[tier] || ""}
                                        onChange={(e) => updateShippingTier(product.id, zone, tier, e.target.value)}
                                        className="mt-1"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </TabsContent>
                            ))}
                          </Tabs>
                        </div>

                        {/* Save Button */}
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleSaveTiers(product.id, product.variantId)}
                            disabled={updateTiersMutation.isPending}
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            <Save className="h-4 w-4 mr-2" />
                            {updateTiersMutation.isPending ? "Saving..." : "Save Tiers"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-muted-foreground border-2 border-primary bg-card">
                No products yet. Click "Import from Shopify" to get started.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
