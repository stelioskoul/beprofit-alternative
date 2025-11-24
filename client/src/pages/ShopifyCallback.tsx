import { useEffect } from "react";
import { useLocation } from "wouter";

export default function ShopifyCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Get OAuth code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (code) {
      // Send code to parent window
      if (window.opener) {
        window.opener.postMessage(
          { type: "shopify-oauth-callback", code, state },
          window.location.origin
        );
        window.close();
      } else {
        // If not in popup, redirect to settings
        setLocation("/settings");
      }
    } else {
      // No code, redirect to settings
      setLocation("/settings");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing Shopify authorization...</p>
      </div>
    </div>
  );
}
