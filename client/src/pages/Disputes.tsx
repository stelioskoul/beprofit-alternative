import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2, Download } from "lucide-react";

export default function Disputes() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  
  // Pull disputes state
  const [pullStartDate, setPullStartDate] = useState("");
  const [pullEndDate, setPullEndDate] = useState("");
  const [pullStatus, setPullStatus] = useState("");

  const utils = trpc.useUtils();
  const { data: disputes, isLoading } = trpc.disputes.list.useQuery();
  const { data: shopifyDisputes, isLoading: isLoadingShopify } = trpc.disputes.listShopify.useQuery();
  
  const createMutation = trpc.disputes.create.useMutation({
    onSuccess: () => {
      utils.disputes.list.invalidate();
      resetForm();
      toast.success("Dispute added");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add dispute");
    },
  });
  
  const deleteMutation = trpc.disputes.delete.useMutation({
    onSuccess: () => {
      utils.disputes.list.invalidate();
      toast.success("Dispute deleted");
    },
  });
  
  const pullMutation = trpc.disputes.pullFromShopify.useMutation({
    onSuccess: (data) => {
      utils.disputes.listShopify.invalidate();
      toast.success(`Successfully imported ${data.imported} dispute(s) from Shopify`);
      setPullStartDate("");
      setPullEndDate("");
      setPullStatus("");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to pull disputes from Shopify");
    },
  });

  const resetForm = () => {
    setStartDate("");
    setEndDate("");
    setAmount("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !amount) {
      toast.error("Start date, end date, and amount are required");
      return;
    }

    createMutation.mutate({
      startDate,
      endDate,
      amount: parseFloat(amount),
      notes: notes || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this dispute?")) {
      deleteMutation.mutate({ id });
    }
  };
  
  const handlePullDisputes = () => {
    if (!pullStartDate) {
      toast.error("Start date is required");
      return;
    }
    
    pullMutation.mutate({
      startDate: pullStartDate,
      endDate: pullEndDate || undefined,
      status: pullStatus || undefined,
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <div className="flex-1 overflow-auto ml-[210px]">
        <div className="container pt-4 pb-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">// DISPUTES</h1>
            <p className="text-secondary">TRACK DISPUTE LOSSES</p>
          </div>

          <Tabs defaultValue="manual" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="shopify">Shopify Disputes</TabsTrigger>
            </TabsList>

            {/* Manual Disputes Tab */}
            <TabsContent value="manual">
              {/* Add Dispute Form */}
              <form onSubmit={handleSubmit} className="mb-8 border-2 border-primary p-6 bg-card">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="startDate" className="text-primary uppercase">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-primary uppercase">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount" className="text-primary uppercase">Amount (EUR)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100.00"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Label htmlFor="notes" className="text-primary uppercase">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional information about the dispute..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Dispute"}
                </Button>
              </form>

              {/* Disputes Table */}
              <div className="border-2 border-primary bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-primary">
                      <tr>
                        <th className="text-left p-4 text-primary uppercase font-bold">Start Date</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">End Date</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Amount (EUR)</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Notes</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            Loading disputes...
                          </td>
                        </tr>
                      ) : disputes && disputes.length > 0 ? (
                        disputes.map((dispute) => (
                          <tr key={dispute.id} className="border-b border-muted hover:bg-muted/50">
                            <td className="p-4">{dispute.startDate}</td>
                            <td className="p-4">{dispute.endDate}</td>
                            <td className="p-4 text-destructive">€{dispute.amount.toFixed(2)}</td>
                            <td className="p-4 text-sm text-muted-foreground">{dispute.notes || "-"}</td>
                            <td className="p-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(dispute.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No disputes yet. Add your first dispute above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Shopify Disputes Tab */}
            <TabsContent value="shopify">
              {/* Pull Disputes Form */}
              <div className="mb-8 border-2 border-primary p-6 bg-card">
                <h3 className="text-xl font-bold text-primary mb-4">PULL DISPUTES FROM SHOPIFY</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <Label htmlFor="pullStartDate" className="text-primary uppercase">Start Date *</Label>
                    <Input
                      id="pullStartDate"
                      type="date"
                      value={pullStartDate}
                      onChange={(e) => setPullStartDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pullEndDate" className="text-primary uppercase">End Date (Optional)</Label>
                    <Input
                      id="pullEndDate"
                      type="date"
                      value={pullEndDate}
                      onChange={(e) => setPullEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pullStatus" className="text-primary uppercase">Status (Optional)</Label>
                    <select
                      id="pullStatus"
                      value={pullStatus}
                      onChange={(e) => setPullStatus(e.target.value)}
                      className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background"
                    >
                      <option value="">All</option>
                      <option value="needs_response">Needs Response</option>
                      <option value="under_review">Under Review</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handlePullDisputes} 
                      disabled={pullMutation.isPending}
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {pullMutation.isPending ? "Pulling..." : "Pull Disputes"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Shopify Disputes Table */}
              <div className="border-2 border-primary bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b-2 border-primary">
                      <tr>
                        <th className="text-left p-4 text-primary uppercase font-bold">Dispute ID</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Order ID</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Type</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Status</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Reason</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Amount</th>
                        <th className="text-left p-4 text-primary uppercase font-bold">Initiated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isLoadingShopify ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            Loading Shopify disputes...
                          </td>
                        </tr>
                      ) : shopifyDisputes && shopifyDisputes.length > 0 ? (
                        shopifyDisputes.map((dispute) => (
                          <tr key={dispute.id} className="border-b border-muted hover:bg-muted/50">
                            <td className="p-4 font-mono text-sm">{dispute.shopifyDisputeId}</td>
                            <td className="p-4 font-mono text-sm">{dispute.shopifyOrderId || "-"}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                dispute.disputeType === "chargeback" 
                                  ? "bg-destructive/20 text-destructive" 
                                  : "bg-yellow-500/20 text-yellow-500"
                              }`}>
                                {dispute.disputeType.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                dispute.status === "won" 
                                  ? "bg-green-500/20 text-green-500"
                                  : dispute.status === "lost"
                                  ? "bg-destructive/20 text-destructive"
                                  : "bg-yellow-500/20 text-yellow-500"
                              }`}>
                                {dispute.status.replace("_", " ").toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-sm">{dispute.reason || "-"}</td>
                            <td className="p-4 text-destructive font-bold">
                              {dispute.currency} {dispute.amount.toFixed(2)}
                            </td>
                            <td className="p-4 text-sm">
                              {new Date(dispute.initiatedAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-muted-foreground">
                            No Shopify disputes yet. Pull disputes from Shopify above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
