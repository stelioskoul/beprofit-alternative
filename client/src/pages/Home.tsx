import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    window.location.href = "/dashboard";
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <img src="/profit-tracker-logo.png" alt="Profit Tracker" className="h-14" />
          <Button className="gold-gradient" onClick={() => (window.location.href = "/signin")}>Sign In</Button>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center">
        <div className="container max-w-4xl text-center space-y-8 py-12">
          <h1 className="text-5xl font-bold tracking-tight">
            Track Your E-Commerce Profit
          </h1>
          <p className="text-xl text-muted-foreground">
            Connect your Shopify store and Facebook Ads to get real-time profit tracking with
            detailed cost breakdowns including COGS, shipping, ad spend, and more.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" className="gold-gradient" onClick={() => (window.location.href = "/signup")}>
              Get Started
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3 mt-12">
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Multi-Store Support</h3>
              <p className="text-sm text-muted-foreground">
                Manage multiple stores in one dashboard
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Real-Time Metrics</h3>
              <p className="text-sm text-muted-foreground">
                Get instant profit calculations with detailed breakdowns
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">Ad Spend Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Automatically sync Facebook Ads spend
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Profit Tracker. All rights reserved.
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms & Conditions
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
