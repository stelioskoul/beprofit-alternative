import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { 
  ArrowLeft, 
  Loader2, 
  Users, 
  Store, 
  Activity, 
  Settings,
  MoreHorizontal,
  Trash2,
  Shield,
  ShieldOff,
  RefreshCw
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminPanel() {
  const { isAuthenticated, loading, user } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  // Queries
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.getUsers.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: stores, isLoading: storesLoading, refetch: refetchStores } = trpc.admin.getAllStores.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = trpc.admin.getSystemMetrics.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: exchangeRate } = trpc.admin.getExchangeRate.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const { data: processingFees } = trpc.admin.getDefaultProcessingFees.useQuery(
    undefined,
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  // Mutations
  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully");
      refetchUsers();
      refetchStores();
      refetchMetrics();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateRoleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated");
      refetchUsers();
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

  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass">
          <CardContent className="p-6">
            <p className="text-red-500 font-semibold">Access Denied</p>
            <p className="text-muted-foreground mt-2">You don't have permission to access the admin panel.</p>
            <Link href="/dashboard">
              <Button className="mt-4">Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen">
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold gold-text">Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Manage users, stores, and system configuration</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="w-full overflow-x-auto pb-2 -mb-2">
            <TabsList className="glass-strong inline-flex w-auto min-w-full">
              <TabsTrigger value="users" className="data-[state=active]:gold-gradient">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="stores" className="data-[state=active]:gold-gradient">
                <Store className="h-4 w-4 mr-2" />
                Stores
              </TabsTrigger>
              <TabsTrigger value="metrics" className="data-[state=active]:gold-gradient">
                <Activity className="h-4 w-4 mr-2" />
                System Metrics
              </TabsTrigger>
              <TabsTrigger value="config" className="data-[state=active]:gold-gradient">
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage all registered users</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchUsers()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Stores</TableHead>
                          <TableHead>Signed Up</TableHead>
                          <TableHead>Last Login</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users?.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.name || "—"}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                              <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                                {u.role}
                              </Badge>
                            </TableCell>
                            <TableCell>{u.storeCount}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(u.createdAt)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(u.lastSignedIn)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {u.role === "user" ? (
                                    <DropdownMenuItem
                                      onClick={() => updateRoleMutation.mutate({ userId: u.id, role: "admin" })}
                                    >
                                      <Shield className="h-4 w-4 mr-2" />
                                      Make Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => updateRoleMutation.mutate({ userId: u.id, role: "user" })}
                                      disabled={u.id === user?.id}
                                    >
                                      <ShieldOff className="h-4 w-4 mr-2" />
                                      Remove Admin
                                    </DropdownMenuItem>
                                  )}
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-red-500"
                                        disabled={u.id === user?.id}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete User
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete {u.email} and all their stores, connections, and data. This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteUserMutation.mutate({ userId: u.id })}
                                          className="bg-red-500 hover:bg-red-600"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stores Tab */}
          <TabsContent value="stores" className="space-y-4">
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Store Overview</CardTitle>
                  <CardDescription>All stores across all users with connection status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchStores()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                {storesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store Name</TableHead>
                          <TableHead>Owner</TableHead>
                          <TableHead>Platform</TableHead>
                          <TableHead>Shopify</TableHead>
                          <TableHead>Facebook Ads</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stores?.map((store) => (
                          <TableRow key={store.id}>
                            <TableCell className="font-medium">{store.name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <div>{store.user?.name || "—"}</div>
                                <div className="text-muted-foreground">{store.user?.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{store.platform}</Badge>
                            </TableCell>
                            <TableCell>
                              {store.shopifyConnected ? (
                                <div>
                                  <Badge variant="default" className="bg-green-600">Connected</Badge>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {store.shopifyDomain}
                                  </div>
                                </div>
                              ) : (
                                <Badge variant="secondary">Not Connected</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {store.facebookAccountsCount > 0 ? (
                                <Badge variant="default" className="bg-blue-600">
                                  {store.facebookAccountsCount} account{store.facebookAccountsCount > 1 ? "s" : ""}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Not Connected</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(store.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Metrics Tab */}
          <TabsContent value="metrics" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => refetchMetrics()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {metricsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <>
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="glass">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <Users className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Users</p>
                          <p className="text-3xl font-bold">{metrics?.totalUsers || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-500/10">
                          <Store className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Stores</p>
                          <p className="text-3xl font-bold">{metrics?.totalStores || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-orange-500/10">
                          <Activity className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Shopify Connections</p>
                          <p className="text-3xl font-bold">{metrics?.shopifyConnections || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-500/10">
                          <Activity className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Facebook Connections</p>
                          <p className="text-3xl font-bold">{metrics?.facebookConnections || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Activity Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="text-lg">User Activity (Last 7 Days)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">New Signups</span>
                        <span className="font-semibold text-green-500">+{metrics?.recentSignups || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Active Users</span>
                        <span className="font-semibold">{metrics?.activeUsers || 0}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass">
                    <CardHeader>
                      <CardTitle className="text-lg">Users by Role</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Admins</span>
                        <Badge variant="default">{metrics?.usersByRole?.admin || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Regular Users</span>
                        <Badge variant="secondary">{metrics?.usersByRole?.user || 0}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* Configuration Tab */}
          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass">
                <CardHeader>
                  <CardTitle>Exchange Rate</CardTitle>
                  <CardDescription>Current EUR/USD exchange rate used for conversions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">EUR to USD Rate</span>
                    <span className="text-2xl font-bold">{exchangeRate?.rate?.toFixed(4) || "—"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    To update the exchange rate, go to Settings → Secrets in the Manus UI and update the EXCHANGE_RATE_EUR_USD value.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle>Default Processing Fees</CardTitle>
                  <CardDescription>Default payment processing fees for new stores</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Percentage Fee</span>
                    <span className="font-semibold">{((processingFees?.percentFee || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Fixed Fee</span>
                    <span className="font-semibold">${processingFees?.fixedFee?.toFixed(2) || "0.29"}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {processingFees?.description}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="glass">
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>Current system configuration and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Environment</span>
                      <Badge variant="outline">Production</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Database</span>
                      <Badge variant="default" className="bg-green-600">Connected</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shopify API</span>
                      <Badge variant="outline">v2025-10</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Facebook API</span>
                      <Badge variant="outline">v21.0</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
