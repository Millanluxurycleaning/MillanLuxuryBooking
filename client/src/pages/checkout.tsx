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

const FLAT_SHIPPING = 10.0;

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

  // Shipping address
  const [shipSameAsBilling, setShipSameAsBilling] = useState(true);
  const [shipAddressLine1, setShipAddressLine1] = useState("");
  const [shipAddressLine2, setShipAddressLine2] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipPostalCode, setShipPostalCode] = useState("");

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

  const shipping = FLAT_SHIPPING;
  const tax = (subtotal + shipping) * 0.075;
  const total = subtotal + shipping + tax;

  const shippingAddress = shipSameAsBilling
    ? { addressLine1, addressLine2, city, state, postalCode, country: "US" }
    : { addressLine1: shipAddressLine1, addressLine2: shipAddressLine2, city: shipCity, state: shipState, postalCode: shipPostalCode, country: "US" };

  const createVerificationDetails = (): ChargeVerifyBuyerDetails => {
    const [givenName, ...rest] = buyerName.trim().split(" ");
    const familyName = rest.join(" ");
    return {
      amount: total.toFixed(2),
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
        amount: shipping.toFixed(2),
        label: "Shipping",
      },
      {
        amount: tax.toFixed(2),
        label: "Sales Tax (7.5%)",
      },
    ],
    requestBillingContact: true,
    requestShippingContact: true,
  });

  // Validate required fields
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail);
  const isValidPhone = buyerPhone.replace(/\D/g, "").length >= 10;
  const billingComplete = Boolean(addressLine1.trim() && city.trim() && state.trim() && postalCode.trim());
  const shippingComplete = shipSameAsBilling
    ? billingComplete
    : Boolean(shipAddressLine1.trim() && shipCity.trim() && shipState.trim() && shipPostalCode.trim());
  const formReady = Boolean(buyerName.trim()) && isValidEmail && isValidPhone && billingComplete && shippingComplete;

  const handleTokenize = async (tokenResult: any, buyerVerificationToken?: { token?: string }) => {
    if (tokenResult.status !== "OK") {
      setError("Payment details are incomplete or invalid.");
      return;
    }

    if (!formReady) {
      setError("Please fill in all required fields (name, email, phone, billing & shipping address).");
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
          buyerName: buyerName.trim(),
          buyerEmail,
          buyerPhone,
          billingAddress: {
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country: "US",
          },
          shippingAddress,
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
              {/* Contact Info */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Contact Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="buyer-name">Full Name *</Label>
                    <Input
                      id="buyer-name"
                      name="name"
                      autoComplete="name"
                      required
                      value={buyerName}
                      onChange={(event) => setBuyerName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyer-email">Email *</Label>
                    <Input
                      id="buyer-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={buyerEmail}
                      onChange={(event) => setBuyerEmail(event.target.value)}
                    />
                    {buyerEmail && !isValidEmail && (
                      <p className="text-xs text-destructive">Enter a valid email address</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyer-phone">Phone *</Label>
                    <Input
                      id="buyer-phone"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      placeholder="(555) 555-5555"
                      value={buyerPhone}
                      onChange={(event) => setBuyerPhone(event.target.value)}
                    />
                    {buyerPhone && !isValidPhone && (
                      <p className="text-xs text-destructive">Enter a valid phone number</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Billing Address</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address-line-1">Address *</Label>
                    <Input
                      id="address-line-1"
                      name="address-line1"
                      autoComplete="billing address-line1"
                      required
                      value={addressLine1}
                      onChange={(event) => setAddressLine1(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="address-line-2">Address Line 2</Label>
                    <Input
                      id="address-line-2"
                      name="address-line2"
                      autoComplete="billing address-line2"
                      value={addressLine2}
                      onChange={(event) => setAddressLine2(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      autoComplete="billing address-level2"
                      required
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <Input
                      id="state"
                      name="state"
                      autoComplete="billing address-level1"
                      required
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal-code">Postal Code *</Label>
                    <Input
                      id="postal-code"
                      name="postal-code"
                      autoComplete="billing postal-code"
                      required
                      value={postalCode}
                      onChange={(event) => setPostalCode(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Shipping Address</h3>
                <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shipSameAsBilling}
                    onChange={(e) => setShipSameAsBilling(e.target.checked)}
                    className="rounded border-border"
                  />
                  Same as billing address
                </label>

                {!shipSameAsBilling && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ship-address-line-1">Address *</Label>
                      <Input
                        id="ship-address-line-1"
                        name="ship-address-line1"
                        autoComplete="shipping address-line1"
                        required
                        value={shipAddressLine1}
                        onChange={(event) => setShipAddressLine1(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="ship-address-line-2">Address Line 2</Label>
                      <Input
                        id="ship-address-line-2"
                        name="ship-address-line2"
                        autoComplete="shipping address-line2"
                        value={shipAddressLine2}
                        onChange={(event) => setShipAddressLine2(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ship-city">City *</Label>
                      <Input
                        id="ship-city"
                        name="ship-city"
                        autoComplete="shipping address-level2"
                        required
                        value={shipCity}
                        onChange={(event) => setShipCity(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ship-state">State *</Label>
                      <Input
                        id="ship-state"
                        name="ship-state"
                        autoComplete="shipping address-level1"
                        required
                        value={shipState}
                        onChange={(event) => setShipState(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ship-postal-code">Postal Code *</Label>
                      <Input
                        id="ship-postal-code"
                        name="ship-postal-code"
                        autoComplete="shipping postal-code"
                        required
                        value={shipPostalCode}
                        onChange={(event) => setShipPostalCode(event.target.value)}
                      />
                    </div>
                  </div>
                )}
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
                  {!formReady && (
                    <div className="rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
                      Please fill in all required fields (*) above before paying.
                    </div>
                  )}
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
                  <span>Shipping</span>
                  <span>${shipping.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Sales Tax (7.5%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
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
