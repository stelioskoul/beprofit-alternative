import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import StoreView from "./pages/StoreView";
import Connections from "./pages/Connections";
import DebugTransactions from "./pages/DebugTransactions";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import AdminPanel from "./pages/AdminPanel";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";

function Router() {
  return (
    <Switch>
      <Route path={"/signin"} component={SignIn} />
      <Route path={"/signup"} component={SignUp} />
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/store/:id"} component={StoreView} />
      <Route path={"/store/:id/connections"} component={Connections} />
      <Route path={"/debug/transactions"} component={DebugTransactions} />
      <Route path={"/admin"} component={AdminPanel} />
      <Route path={"/privacy"} component={PrivacyPolicy} />
      <Route path={"/terms"} component={TermsConditions} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          {/* Animated gradient background */}
          <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(218,165,32,0.25)_0%,transparent_50%)] animate-breathe" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(218,165,32,0.22)_0%,transparent_50%)] animate-breathe" style={{ animationDelay: '1s' }} />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_80%,rgba(218,165,32,0.20)_0%,transparent_50%)] animate-breathe" style={{ animationDelay: '2s' }} />
            
            {/* Gold texture overlay */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23daa520' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
