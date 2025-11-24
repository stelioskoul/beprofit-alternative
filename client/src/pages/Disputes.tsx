import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function Disputes() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: disputes, isLoading } = trpc.disputes.list.useQuery();
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

  return (
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <div className="flex-1 overflow-auto">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">// DISPUTES</h1>
            <p className="text-secondary">TRACK DISPUTE LOSSES</p>
          </div>

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
        </div>
      </div>
    </div>
  );
}
