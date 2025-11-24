import { Link, useLocation } from "wouter";
import { BarChart3, Package, DollarSign, AlertTriangle, Settings, LogOut, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { APP_TITLE } from "@/const";

export function Navigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = "/";
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  const navItems = [
    { path: "/", icon: BarChart3, label: "Dashboard" },
    { path: "/products", icon: Package, label: "Products" },
    { path: "/expenses", icon: DollarSign, label: "Expenses" },
    { path: "/disputes", icon: AlertTriangle, label: "Disputes" },
    { path: "/orders", icon: ShoppingCart, label: "Orders" },
    { path: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r-2 border-primary bg-sidebar">
      {/* Header */}
      <div className="border-b-2 border-primary p-6">
        <h1 className="text-2xl font-bold text-primary">// {APP_TITLE}</h1>
        <p className="text-xs text-secondary mt-1">CYBERPUNK EDITION</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="text-xs text-secondary mb-4 font-bold">// NAVIGATION</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start gap-3 ${
                  isActive ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium uppercase tracking-wide">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      {user && (
        <div className="border-t-2 border-primary p-4 space-y-2">
          <div className="text-xs text-muted-foreground">
            <div className="font-bold text-primary">USER:</div>
            <div className="truncate">{user.name || user.email || "User"}</div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium uppercase tracking-wide">Exit</span>
          </Button>
        </div>
      )}
    </div>
  );
}
