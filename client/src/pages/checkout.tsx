import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Ach, ApplePay, CreditCard, GiftCard, GooglePay, PaymentForm } from "react-square-web-payments-sdk";
import type { ChargeVerifyBuyerDetails } from "@square/web-payments-sdk-types";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";

export default function CheckoutPage() {
  const { cart, sessionId } = useCart();
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isApplePaySupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent;
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|OPR|Firefox|Android/.test(ua);
    const applePaySession = (window as any).ApplePaySession;
    if (!isSafari || !applePaySession) return false;
    return typeof applePaySession.canMakePayments === "function"
      ? applePaySession.canMakePayments()
      : true;
  }, []);

  const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID as string | undefined;
  const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID as string | undefined;

  const items = cart?.items ?? [];
  const subtotal = cart?.totals.subtotal ?? 0;
  const achAccountHolderName = buyerName.trim();
  const redirectURI = typeof window !== "undefined" ? `${window.location.origin}/checkout` : undefined;

  const createVerificationDetails = (): ChargeVerifyBuyerDetails => {
    const [givenName, ...rest] = buyerName.trim().split(" ");
    const familyName = rest.join(" ");
    return {
      amount: subtotal.toFixed(2),
      currencyCode: "USD",
      intent: "CHARGE",
      billingContact: {
        givenName: givenName || buyerName || "Customer",
        familyName: familyName || undefined,
        email: buyerEmail || undefined,
        phone: buyerPhone || undefined,
        addressLines: [addressLine1, addressLine2].filter(Boolean),
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        countryCode: "US",
      },
    };
  };

  const tax = subtotal * 0.075;
  const total = subtotal + tax;

  const createPaymentRequest = () => ({
    countryCode: "US",
    currencyCode: "USD",
    total: {
      amount: total.toFixed(2),
      label: "Total",
    },
    lineItems: [
      ...items.map((item) => ({
        amount: (item.price * item.quantity).toFixed(2),
        label: item.product?.fragrance && item.product.fragrance !== "Signature"
          ? `${item.product.name} (${item.product.fragrance})`
          : item.product?.name ?? "Item",
      })),
      {
        amount: tax.toFixed(2),
        label: "Sales Tax (7.5%)",
      },
    ],
    requestBillingContact: true,
  });

  const handleTokenize = async (tokenResult: any, buyerVerificationToken?: { token?: string }) => {
    if (tokenResult.status !== "OK") {
      setError("Payment details are incomplete or invalid.");
      return;
    }

    if (!cart?.id) {
      setError("Order details not ready. Please refresh.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/checkout/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-cart-session": sessionId } : {}),
        },
        body: JSON.stringify({
          cartId: cart.id,
          sourceId: tokenResult.token,
          verificationToken: buyerVerificationToken?.token,
          buyerEmail,
          billingAddress: {
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country: "US",
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Payment failed.");
      }

      window.location.assign(`/checkout/success?orderId=${data.orderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-28 pb-16 px-6">
        <div className="container mx-auto max-w-6xl grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="buyer-name">Full Name</Label>
                  <Input
                    id="buyer-name"
                    value={buyerName}
                    onChange={(event) => setBuyerName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyer-email">Email</Label>
                  <Input
                    id="buyer-email"
                    type="email"
                    value={buyerEmail}
                    onChange={(event) => setBuyerEmail(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="buyer-phone">Phone</Label>
                  <Input
                    id="buyer-phone"
                    value={buyerPhone}
                    onChange={(event) => setBuyerPhone(event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address-line-1">Address</Label>
                  <Input
                    id="address-line-1"
                    value={addressLine1}
                    onChange={(event) => setAddressLine1(event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address-line-2">Address Line 2</Label>
                  <Input
                    id="address-line-2"
                    value={addressLine2}
                    onChange={(event) => setAddressLine2(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(event) => setState(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal-code">Postal Code</Label>
                  <Input
                    id="postal-code"
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                  />
                </div>
              </div>

              {!applicationId || !locationId ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  Square checkout is not configured. Add `VITE_SQUARE_APPLICATION_ID` and
                  `VITE_SQUARE_LOCATION_ID` to your environment.
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                  Your selections are empty. <Link href="/fragrances">Shop products</Link> to continue.
                </div>
              ) : (
                <div className="space-y-4">
              <PaymentForm
                    applicationId={applicationId}
                    locationId={locationId}
                    cardTokenizeResponseReceived={handleTokenize}
                    createVerificationDetails={createVerificationDetails}
                    createPaymentRequest={createPaymentRequest}
                  >
                    <div className="space-y-6">
                      <div className="grid gap-3 md:grid-cols-2">
                        {isApplePaySupported && <ApplePay />}
                        <GooglePay />
                      </div>

                      <div className="rounded-xl border border-border p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Pay with Gift Card</h3>
                        <GiftCard buttonProps={{ className: "w-full", isLoading: isSubmitting }}>
                          {isSubmitting ? "Processing..." : "Pay with Gift Card"}
                        </GiftCard>
                      </div>

                      <div className="rounded-xl border border-border p-4 space-y-3">
                        <h3 className="text-sm font-semibold">ACH Bank Transfer</h3>
                        {!achAccountHolderName && (
                          <p className="text-xs text-muted-foreground">
                            Enter your full name to enable ACH payments.
                          </p>
                        )}
                        <Ach
                          accountHolderName={achAccountHolderName || "Customer"}
                          redirectURI={redirectURI}
                          buttonProps={{ className: "w-full", isLoading: isSubmitting || !achAccountHolderName }}
                        >
                          {isSubmitting ? "Processing..." : "Pay by Bank Transfer"}
                        </Ach>
                      </div>

                      <div className="rounded-xl border border-border p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Pay with Card</h3>
                        <CreditCard buttonProps={{ className: "w-full", isLoading: isSubmitting }}>
                          {isSubmitting ? "Processing..." : "Pay Now"}
                        </CreditCard>
                      </div>
                    </div>
                  </PaymentForm>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>
                    {item.product?.fragrance && item.product.fragrance !== "Signature"
                      ? `${item.product.name} (${item.product.fragrance})`
                      : item.product?.name ?? "Item"} x {item.quantity}
                  </span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-3 mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Sales Tax (7.5%)</span>
                  <span>${(subtotal * 0.075).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${(subtotal * 1.075).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
