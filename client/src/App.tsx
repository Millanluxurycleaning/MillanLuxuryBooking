import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { AnnouncementProvider } from "@/contexts/AnnouncementContext";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { WelcomePopup } from "@/components/WelcomePopup";
import Home from "@/pages/home";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/not-found";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { Analytics } from "@/components/Analytics";
import BlogIndex from "@/pages/blog";
import BlogPost from "@/pages/blog/PostDetail";
import Fragrances from "@/pages/fragrances";
import ServicesPage from "@/pages/services";
import CartPage from "@/pages/cart";
import CheckoutPage from "@/pages/checkout";
import CheckoutSuccess from "@/pages/checkout-success";
import BookingPage from "@/pages/book";
import PartnersPage from "@/pages/partners";
import PartnerLogin from "@/pages/partner/login";
import PartnerDashboard from "@/pages/partner/dashboard";

// Main router component
function Router() {
  return (
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
  );
}

function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <CartProvider>
          <AnnouncementProvider>
            <TooltipProvider>
              <AppErrorBoundary>
                <Toaster />
                <Analytics />
                <AnnouncementBanner />
                <WelcomePopup />
                <Router />
              </AppErrorBoundary>
            </TooltipProvider>
          </AnnouncementProvider>
        </CartProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
