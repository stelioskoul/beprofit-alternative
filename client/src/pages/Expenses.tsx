import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Download, Edit, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function Expenses() {
  const { id } = useParams();
  const storeId = parseInt(id || "0");
  const { isAuthenticated, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD" | "EUR">("USD");
  const [type, setType] = useState<"one_time" | "monthly" | "yearly">("one_time");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");

  const { data: expenses, isLoading, refetch } = trpc.expenses.list.useQuery(
    { storeId },
    { enabled: isAuthenticated && storeId > 0 }
  );

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense added successfully");
      setOpen(false);
      setName("");
      setAmount("");
      setCurrency("USD");
      setType("one_time");
      setDate(new Date().toISOString().split("T")[0]);
      setIsActive(true);
      setStartDate(new Date().toISOString().split("T")[0]);
      setEndDate("");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated successfully");
      setEditOpen(false);
      setEditingExpense(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const downloadExpensesTemplateMutation = trpc.expenses.downloadExpensesTemplate.useQuery(
    { storeId },
    { enabled: false }
  );

  const importExpensesMutation = trpc.expenses.importExpensesBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.count} expenses`);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const handleDownloadTemplate = async () => {
    const result = await downloadExpensesTemplateMutation.refetch();
    if (result.data?.csv) {
      const blob = new Blob([result.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "expenses_template.csv";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportCSV = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        importExpensesMutation.mutate({ storeId, csvData: text });
      }
    };
    input.click();
  };

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

  const handleCreate = () => {
    if (!name || !amount || isNaN(parseFloat(amount))) {
      toast.error("Please fill in all fields with valid values");
      return;
    }

    // Validate dates for recurring expenses
    if (type !== "one_time") {
      if (!isActive && !endDate) {
        toast.error("Please provide an end date for inactive recurring expenses");
        return;
      }
    }

    createMutation.mutate({
      storeId,
      title: name,
      amount,
      currency,
      type,
      date: type === "one_time" ? date : undefined,
      startDate: type !== "one_time" ? startDate : undefined,
      endDate: type !== "one_time" && !isActive ? endDate : undefined,
      isActive: type !== "one_time" ? (isActive ? 1 : 0) : undefined,
    });
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(value));
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "one_time":
        return "One-time";
      case "monthly":
        return "Monthly";
      case "yearly":
        return "Yearly";
      default:
        return type;
    }
  };

  const totalExpenses = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold gold-text">Operational Expenses</h2>
          <p className="text-muted-foreground mt-1">
            Manage one-time and recurring business expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gold-gradient-border">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
          <Button variant="outline" size="sm" onClick={handleImportCSV} disabled={importExpensesMutation.isPending} className="gold-gradient-border">
            {importExpensesMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            Import CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gold-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>
                Add a one-time or recurring operational expense
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Expense Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Office Rent, Software Subscription"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={(v: any) => setCurrency(v)}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Frequency</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {type === "one_time" ? (
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={isActive ? "active" : "inactive"} onValueChange={(v) => setIsActive(v === "active")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Still Active</SelectItem>
                        <SelectItem value="inactive">No Longer Active</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  {!isActive && (
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="hidden">
                <Input
                  id="date-hidden"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="gold-gradient flex-1"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Expense
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Expense Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>
                Update end date or deactivate this recurring expense
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Expense Name</Label>
                <p className="text-sm text-muted-foreground">{editingExpense?.title}</p>
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <p className="text-sm text-muted-foreground">{formatCurrency(editingExpense?.amount || "0")}</p>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <p className="text-sm text-muted-foreground">{getTypeLabel(editingExpense?.type || "monthly")}</p>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <p className="text-sm text-muted-foreground">
                  {editingExpense?.startDate ? new Date(editingExpense.startDate).toLocaleDateString() : "N/A"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-endDate">End Date (Deactivate)</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  defaultValue={editingExpense?.endDate ? new Date(editingExpense.endDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => {
                    if (editingExpense) {
                      setEditingExpense({ ...editingExpense, endDate: e.target.value });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Set an end date to stop this expense from being calculated after that date
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (!editingExpense?.endDate) {
                      toast.error("Please set an end date to deactivate the expense");
                      return;
                    }
                    updateMutation.mutate({
                      id: editingExpense.id,
                      storeId,
                      endDate: editingExpense.endDate,
                      isActive: 0,
                    });
                  }}
                  disabled={updateMutation.isPending}
                  className="gold-gradient flex-1"
                >
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card className="card-glow">
        <CardHeader>
          <CardTitle>Total Expenses</CardTitle>
          <CardDescription>Sum of all recurring and one-time expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold gold-text">{formatCurrency(totalExpenses.toString())}</p>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : expenses && expenses.length > 0 ? (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <Card key={expense.id} className="glass">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <p className="font-medium">{expense.title}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-muted-foreground">
                      {getTypeLabel(expense.type)}
                    </span>
                    {expense.type === 'one_time' && expense.date && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(expense.date).toLocaleDateString()}
                      </span>
                    )}
                    {expense.type !== 'one_time' && expense.startDate && (
                      <span className="text-sm text-muted-foreground">
                        {new Date(expense.startDate).toLocaleDateString()}
                        {expense.endDate && ` - ${new Date(expense.endDate).toLocaleDateString()}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-xl font-semibold text-primary">
                    {formatCurrency(expense.amount)}
                  </p>
                  {expense.type !== 'one_time' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingExpense(expense);
                        setEditOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate({ id: expense.id, storeId })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">No expenses added yet</p>
            <Button onClick={() => setOpen(true)} className="gold-gradient">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Expense
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
