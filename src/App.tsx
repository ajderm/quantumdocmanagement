import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HubSpotProvider } from "./hooks/useHubSpot";
import { ErrorBoundary } from "./components/ErrorBoundary";
import DocumentHub from "./pages/DocumentHub";
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const LeasingPartners = lazy(() => import("./pages/admin/LeasingPartners"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function AppInner() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled promise rejection:", event.reason);
      event.preventDefault();
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[200px] text-sm text-muted-foreground">Loading…</div>
          }
        >
          <Routes>
            {/* Main app - embedded in HubSpot Deal CRM card */}
            <Route path="/" element={<DocumentHub />} />

            {/* Admin settings - accessed via HubSpot Connected Apps */}
            <Route path="/admin" element={<AdminSettings />} />
            <Route path="/admin/leasing" element={<LeasingPartners />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <HubSpotProvider>
        <ErrorBoundary>
          <AppInner />
        </ErrorBoundary>
      </HubSpotProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
