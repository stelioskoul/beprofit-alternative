import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, Upload, Pencil, Check, X } from "lucide-react";

export default function Products() {
  const [sku, setSku] = useState("");
  const [cogs, setCogs] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editCogs, setEditCogs] = useState("");
  const [editShipping, setEditShipping] = useState("");

  const utils = trpc.useUtils();
  const { data: products, isLoading } = trpc.products.list.useQuery();
  
  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      setSku("");
      setCogs("");
      setShippingCost("");
      toast.success("Product saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save product");
    },
  });
  
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      setEditingId(null);
      toast.success("Product updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update product");
    },
  });
  
  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      utils.products.list.invalidate();
      toast.success("Product deleted");
    },
  });
  
  const importMutation = trpc.products.importCSV.useMutation({
    onSuccess: (result) => {
      utils.products.list.invalidate();
      toast.success(`Imported ${result.success} products, ${result.failed} failed`);
    },
  });
  
  const importShopifyMutation = trpc.products.importShopifyProducts.useMutation({
    onSuccess: (result) => {
      utils.products.list.invalidate();
      toast.success(`Imported ${result.imported} new products from Shopify, ${result.skipped} already exist`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import from Shopify");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !cogs || !shippingCost) {
      toast.error("All fields are required");
      return;
    }
    createMutation.mutate({
      sku,
      cogs: parseFloat(cogs),
      shippingCost: parseFloat(shippingCost),
    });
  };

  const handleDelete = (sku: string) => {
    if (confirm(`Delete product ${sku}?`)) {
      deleteMutation.mutate({ sku });
    }
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setEditCogs(product.cogs.toFixed(2));
    setEditShipping(product.shippingCost.toFixed(2));
  };

  const handleSaveEdit = (sku: string) => {
    if (!editCogs || !editShipping) {
      toast.error("COGS and shipping cost are required");
      return;
    }
    updateMutation.mutate({
      sku,
      cogs: parseFloat(editCogs),
      shippingCost: parseFloat(editShipping),
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCogs("");
    setEditShipping("");
  };

  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        importMutation.mutate({ csvContent: text });
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Navigation />
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2 font-orbitron">// PRODUCTS</h1>
            <p className="text-accent">MANAGE SKU, COGS & SHIPPING</p>
          </div>

          {/* Add Product Form */}
          <form onSubmit={handleSubmit} className="border-2 border-primary p-6 mb-8 bg-card">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="sku" className="text-primary uppercase font-bold">SKU</Label>
                <Input
                  id="sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="PROD-001"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cogs" className="text-primary uppercase font-bold">COGS (EUR)</Label>
                <Input
                  id="cogs"
                  type="number"
                  step="0.01"
                  value={cogs}
                  onChange={(e) => setCogs(e.target.value)}
                  placeholder="10.50"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="shipping" className="text-primary uppercase font-bold">Shipping Cost (EUR)</Label>
                <Input
                  id="shipping"
                  type="number"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  placeholder="2.50"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Product"}
              </Button>
              <Button type="button" variant="outline" onClick={handleImportCSV} disabled={importMutation.isPending}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => importShopifyMutation.mutate()} 
                disabled={importShopifyMutation.isPending}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importShopifyMutation.isPending ? "Importing..." : "Import from Shopify"}
              </Button>
            </div>
          </form>

          {/* Products Table */}
          <div className="border-2 border-primary bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-primary">
                  <tr>
                    <th className="text-left p-4 text-primary uppercase font-bold">SKU</th>
                    <th className="text-left p-4 text-primary uppercase font-bold">Product Name</th>
                    <th className="text-left p-4 text-primary uppercase font-bold">COGS (EUR)</th>
                    <th className="text-left p-4 text-primary uppercase font-bold">Shipping (EUR)</th>
                    <th className="text-left p-4 text-primary uppercase font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Loading products...
                      </td>
                    </tr>
                  ) : products && products.length > 0 ? (
                    products.map((product) => (
                      <tr key={product.id} className="border-b border-muted hover:bg-muted/50">
                        <td className="p-4 font-mono text-sm">{product.sku}</td>
                        <td className="p-4">{product.productName || "-"}</td>
                        <td className="p-4">
                          {editingId === product.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editCogs}
                              onChange={(e) => setEditCogs(e.target.value)}
                              className="w-24"
                            />
                          ) : (
                            <span className={product.cogs === 0 ? "text-yellow-500" : ""}>
                              €{product.cogs.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingId === product.id ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={editShipping}
                              onChange={(e) => setEditShipping(e.target.value)}
                              className="w-24"
                            />
                          ) : (
                            <span className={product.shippingCost === 0 ? "text-yellow-500" : ""}>
                              €{product.shippingCost.toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            {editingId === product.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSaveEdit(product.sku)}
                                  disabled={updateMutation.isPending}
                                >
                                  <Check className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(product)}
                                >
                                  <Pencil className="h-4 w-4 text-accent" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(product.sku)}
                                  disabled={deleteMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        No products yet. Add your first product above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
