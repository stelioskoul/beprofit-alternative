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
  const [cogsValues, setCogsValues] = useState<Record<number, string>>({});
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
      toast.success("Configuration saved successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save configuration");
    },
  });

  const toggleExpand = (productId: number, product: any) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
    } else {
      setExpandedProduct(productId);
      
      // Initialize COGS value from existing data
      setCogsValues({
        ...cogsValues,
        [productId]: product.cogs ? (product.cogs / 100).toFixed(2) : "",
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

  const handleSaveTiers = (productId: number, variantId: string) => {
    const cogsValue = cogsValues[productId];
    const productShippingTiers = shippingTiers[productId];

    if (!cogsValue || parseFloat(cogsValue) < 0) {
      toast.error("Please enter a valid COGS value");
      return;
    }

    // Build shipping tiers JSON
    const shippingTiersData: any = {};
    const zones = ["EU", "USA", "Canada", "ROW"] as const;
    
    for (const zone of zones) {
      const zoneTiers = productShippingTiers?.[zone];
      if (zoneTiers) {
        const hasAnyValue = Object.values(zoneTiers).some(v => v && parseFloat(v) > 0);
        if (hasAnyValue) {
          shippingTiersData[zone] = {
            "1": zoneTiers["1"] ? Math.round(parseFloat(zoneTiers["1"]) * 100) : 0,
            "2": zoneTiers["2"] ? Math.round(parseFloat(zoneTiers["2"]) * 100) : 0,
            "3": zoneTiers["3"] ? Math.round(parseFloat(zoneTiers["3"]) * 100) : 0,
            "4": zoneTiers["4"] ? Math.round(parseFloat(zoneTiers["4"]) * 100) : 0,
          };
        }
      }
    }

    updateTiersMutation.mutate({
      variantId,
      cogs: parseFloat(cogsValue),
      shippingTiers: Object.keys(shippingTiersData).length > 0 ? JSON.stringify(shippingTiersData) : null,
    });
  };

  const hasConfiguration = (product: any) => {
    return product.cogs > 0 || product.shippingTiers;
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <Navigation />
      
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#f0e040] mb-2 font-mono tracking-wider">
            // PRODUCTS
          </h1>
          <p className="text-[#00d9ff] text-sm uppercase tracking-widest">
            TIERED COGS & SHIPPING CONFIGURATION
          </p>
        </div>

        <div className="mb-6">
          <Button
            onClick={() => importShopifyMutation.mutate()}
            disabled={importShopifyMutation.isPending}
            className="bg-[#f0e040] text-[#0a0e1a] hover:bg-[#f0e040]/90 font-mono"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import from Shopify
          </Button>
          <p className="text-gray-400 text-sm mt-2">
            Import all products from Shopify. Configure COGS and shipping tiers for each product below.
          </p>
        </div>

        {isLoading ? (
          <div className="text-[#00d9ff]">Loading products...</div>
        ) : (
          <div className="space-y-4">
            {products?.map((product) => (
              <div
                key={product.id}
                className="border-2 border-[#f0e040] bg-[#0f1420] rounded-lg overflow-hidden"
              >
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#151b2b] transition-colors"
                  onClick={() => toggleExpand(product.id, product)}
                >
                  <div>
                    <h3 className="text-[#f0e040] font-mono text-lg uppercase">
                      {product.productName || product.sku}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Variant ID: {product.variantId} • SKU: {product.sku}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {hasConfiguration(product) ? (
                      <span className="text-[#00ff88] text-sm flex items-center gap-1">
                        <span className="text-lg">✓</span> Tiers Configured
                      </span>
                    ) : (
                      <span className="text-[#ff6b6b] text-sm flex items-center gap-1">
                        <span className="text-lg">⚠</span> No Tiers
                      </span>
                    )}
                    {expandedProduct === product.id ? (
                      <ChevronUp className="h-5 w-5 text-[#00d9ff]" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-[#00d9ff]" />
                    )}
                  </div>
                </div>

                {expandedProduct === product.id && (
                  <div className="p-6 border-t-2 border-[#f0e040] bg-[#0a0e1a] space-y-6">
                    {/* COGS Section */}
                    <div>
                      <h4 className="text-[#00d9ff] font-mono text-sm mb-4 tracking-wider">
                        // COGS (EUR)
                      </h4>
                      <div className="bg-[#0f1420] border border-dashed border-[#00d9ff]/30 rounded p-4">
                        <Label htmlFor={`cogs-${product.id}`} className="text-gray-300 text-sm">
                          Cost per Unit (€)
                        </Label>
                        <Input
                          id={`cogs-${product.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={cogsValues[product.id] || ""}
                          onChange={(e) =>
                            setCogsValues({
                              ...cogsValues,
                              [product.id]: e.target.value,
                            })
                          }
                          className="mt-2 bg-[#0a0e1a] border-[#00d9ff] text-[#00d9ff] placeholder:text-gray-600"
                        />
                      </div>
                    </div>

                    {/* Shipping Tiers Section */}
                    <div>
                      <h4 className="text-[#ff6b9d] font-mono text-sm mb-4 tracking-wider">
                        // SHIPPING TIERS (EUR)
                      </h4>
                      <Tabs defaultValue="EU" className="w-full">
                        <TabsList className="bg-[#0f1420] border border-[#ff6b9d]/30">
                          <TabsTrigger value="EU" className="data-[state=active]:bg-[#ff6b9d] data-[state=active]:text-[#0a0e1a]">
                            EU
                          </TabsTrigger>
                          <TabsTrigger value="USA" className="data-[state=active]:bg-[#ff6b9d] data-[state=active]:text-[#0a0e1a]">
                            USA
                          </TabsTrigger>
                          <TabsTrigger value="Canada" className="data-[state=active]:bg-[#ff6b9d] data-[state=active]:text-[#0a0e1a]">
                            Canada
                          </TabsTrigger>
                          <TabsTrigger value="ROW" className="data-[state=active]:bg-[#ff6b9d] data-[state=active]:text-[#0a0e1a]">
                            ROW
                          </TabsTrigger>
                        </TabsList>

                        {(["EU", "USA", "Canada", "ROW"] as const).map((zone) => (
                          <TabsContent key={zone} value={zone} className="mt-4">
                            <div className="grid grid-cols-4 gap-4">
                              {(["1", "2", "3", "4"] as const).map((tier) => (
                                <div key={tier} className="bg-[#0f1420] border border-dashed border-[#00d9ff]/30 rounded p-3">
                                  <Label className="text-gray-300 text-xs uppercase tracking-wider">
                                    {tier === "4" ? "4+ Items" : `${tier} Item${tier !== "1" ? "s" : ""}`}
                                  </Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={shippingTiers[product.id]?.[zone]?.[tier] || ""}
                                    onChange={(e) => {
                                      const currentTiers = shippingTiers[product.id] || {
                                        EU: { "1": "", "2": "", "3": "", "4": "" },
                                        USA: { "1": "", "2": "", "3": "", "4": "" },
                                        Canada: { "1": "", "2": "", "3": "", "4": "" },
                                        ROW: { "1": "", "2": "", "3": "", "4": "" },
                                      };
                                      setShippingTiers({
                                        ...shippingTiers,
                                        [product.id]: {
                                          ...currentTiers,
                                          [zone]: {
                                            ...currentTiers[zone],
                                            [tier]: e.target.value,
                                          },
                                        },
                                      });
                                    }}
                                    className="mt-2 bg-[#0a0e1a] border-[#00d9ff] text-[#00d9ff] placeholder:text-gray-600"
                                  />
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={() => handleSaveTiers(product.id, product.variantId)}
                        disabled={updateTiersMutation.isPending}
                        className="bg-[#f0e040] text-[#0a0e1a] hover:bg-[#f0e040]/90 font-mono"
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Tiers
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
