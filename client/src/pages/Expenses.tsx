import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

export default function Expenses() {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseType, setExpenseType] = useState<"one_time" | "monthly" | "yearly">("one_time");
  const [date, setDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  const utils = trpc.useUtils();
  const { data: expenses, isLoading } = trpc.expenses.list.useQuery();
  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      resetForm();
      toast.success("Expense added");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add expense");
    },
  });
  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      toast.success("Expense deleted");
    },
  });
  const importMutation = trpc.expenses.importCSV.useMutation({
    onSuccess: (result) => {
      utils.expenses.list.invalidate();
      toast.success(`Imported ${result.success} expenses, ${result.failed} failed`);
    },
  });

  const resetForm = () => {
    setCategory("");
    setAmount("");
    setDate("");
    setStartDate("");
    setEndDate("");
    setDescription("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) {
      toast.error("Category and amount are required");
      return;
    }
    
    if (expenseType === "one_time" && !date) {
      toast.error("Date is required for one-time expenses");
      return;
    }
    
    if ((expenseType === "monthly" || expenseType === "yearly") && !startDate) {
      toast.error("Start date is required for recurring expenses");
      return;
    }

    createMutation.mutate({
      category,
      amount: parseFloat(amount),
      expenseType,
      date: expenseType === "one_time" ? date : undefined,
      startDate: expenseType !== "one_time" ? startDate : undefined,
      endDate: expenseType !== "one_time" && endDate ? endDate : undefined,
      description: description || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this expense?")) {
      deleteMutation.mutate({ id });
    }
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
    <div className="flex h-screen bg-background">
      <Navigation />
      
      <div className="flex-1 overflow-auto">
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-primary mb-2">// EXPENSES</h1>
            <p className="text-secondary">OPERATIONAL COST TRACKING</p>
          </div>

          {/* Add Expense Form */}
          <form onSubmit={handleSubmit} className="mb-8 border-2 border-primary p-6 bg-card">
            {/* Expense Type Selector */}
            <div className="mb-4">
              <Label className="text-primary uppercase mb-2 block">Expense Type</Label>
              <div className="flex gap-2">
                {(["one_time", "monthly", "yearly"] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={expenseType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExpenseType(type)}
                    className="uppercase"
                  >
                    {type.replace("_", "-")}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="category" className="text-primary uppercase">Category</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Marketing, Software, etc."
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
              
              {expenseType === "one_time" ? (
                <div>
                  <Label htmlFor="date" className="text-primary uppercase">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              ) : (
                <>
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
                    <Label htmlFor="endDate" className="text-primary uppercase">End Date (Optional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              
              <div className="md:col-span-2">
                <Label htmlFor="description" className="text-primary uppercase">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes..."
                  className="mt-1"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
              <Button type="button" variant="outline" onClick={handleImportCSV} disabled={importMutation.isPending}>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </form>

          {/* Expenses Table */}
          <div className="border-2 border-primary bg-card">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-primary">
                  <tr>
                    <th className="text-left p-4 text-primary uppercase font-bold">Category</th>
                    <th className="text-left p-4 text-primary uppercase font-bold">Amount (EUR)</th>
                    <th className="text-left p-4 text-primary uppercase font-bold">Type</th>
                    <th className="text-left p-4 text-primary uppercase font-bold">Date(s)</th>
                    <th className="text-left p-4 text-primary uppercase font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground">
                        Loading expenses...
                      </td>
                    </tr>
                  ) : expenses && expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <tr key={expense.id} className="border-b border-muted hover:bg-muted/50">
                        <td className="p-4">{expense.category}</td>
                        <td className="p-4">€{expense.amount.toFixed(2)}</td>
                        <td className="p-4 uppercase">{expense.expenseType.replace("_", "-")}</td>
                        <td className="p-4 text-sm">
                          {expense.expenseType === "one_time" 
                            ? expense.date 
                            : `${expense.startDate} → ${expense.endDate || "ongoing"}`
                          }
                        </td>
                        <td className="p-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
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
                        No expenses yet. Add your first expense above.
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
