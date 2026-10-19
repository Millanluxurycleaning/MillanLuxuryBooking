import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { Analytics } from "@/components/Analytics";

const Admin = lazy(() => import("@/pages/Admin"));
const BlogIndex = lazy(() => import("@/pages/blog"));
const BlogPost = lazy(() => import("@/pages/blog/PostDetail"));
const Fragrances = lazy(() => import("@/pages/fragrances"));
const ServicesPage = lazy(() => import("@/pages/services"));
const CartPage = lazy(() => import("@/pages/cart"));
const CheckoutPage = lazy(() => import("@/pages/checkout"));
const CheckoutSuccess = lazy(() => import("@/pages/checkout-success"));
const BookingPage = lazy(() => import("@/pages/book"));
const PartnersPage = lazy(() => import("@/pages/partners"));
const PartnerLogin = lazy(() => import("@/pages/partner/login"));
const PartnerDashboard = lazy(() => import("@/pages/partner/dashboard"));

// Main router component
function Router() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <Switch>
        <Route path="/" component={Home}/>
        <Route path="/blog" component={BlogIndex}/>
        <Route path="/blog/:slug" component={BlogPost}/>
        <Route path="/services" component={ServicesPage}/>
        <Route path="/fragrances" component={Fragrances}/>
        <Route path="/cart" component={CartPage}/>
        <Route path="/checkout" component={CheckoutPage}/>
        <Route path="/checkout/success" component={CheckoutSuccess}/>
        <Route path="/book" component={BookingPage}/>
        <Route path="/partners" component={PartnersPage}/>
        <Route path="/partner/login" component={PartnerLogin}/>
        <Route path="/partner/dashboard" component={PartnerDashboard}/>
        <Route path="/admin" component={Admin}/>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <AppErrorBoundary>
            <Toaster />
            <Analytics />
            <Router />
          </AppErrorBoundary>
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  );
}

export default App;
