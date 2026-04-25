import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccess() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-semibold mb-4">
            Order Confirmed
          </h1>
          <p className="text-muted-foreground mb-6">
            Thank you for your purchase. We will send a confirmation email shortly.
          </p>
          {orderId && (
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground mb-8">
              Order reference: <span className="font-semibold text-foreground">#{orderId}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <a href="/fragrances">Continue Shopping</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/services">Book a Service</a>
            </Button>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
