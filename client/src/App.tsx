import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Expenses from "./pages/Expenses";
import Disputes from "./pages/Disputes";
import Settings from "./pages/Settings";
import Orders from "./pages/Orders";
import ShopifyCallback from "./pages/ShopifyCallback";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/products"} component={Products} />
      <Route path={"/expenses"} component={Expenses} />
      <Route path={"/disputes"} component={Disputes} />
      <Route path={"/orders"} component={Orders} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/shopify-callback"} component={ShopifyCallback} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
