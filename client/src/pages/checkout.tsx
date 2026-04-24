import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ApplePay, CreditCard, GooglePay, PaymentForm } from "react-square-web-payments-sdk";
import type { ChargeVerifyBuyerDetails } from "@square/web-payments-sdk-types";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Truck, Tag, ChevronDown, Store } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

const FLAT_SHIPPING = 9.99;

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

  const [shipSameAsBilling, setShipSameAsBilling] = useState(true);
  const [shipAddressLine1, setShipAddressLine1] = useState("");
  const [shipAddressLine2, setShipAddressLine2] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipPostalCode, setShipPostalCode] = useState("");

  const [discountCode, setDiscountCode] = useState(() => localStorage.getItem("mlc_discount_claimed") ?? "");
  const [discountPct, setDiscountPct] = useState<number | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [discountApplied, setDiscountApplied] = useState(false);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fulfillmentType = localStorage.getItem("fulfillmentType") ?? "shipping";
  const isPickup = fulfillmentType === "pickup";

  const [serviceDelivery, setServiceDelivery] = useState<{
    bookingId: number;
    serviceName: string;
    bookingDate: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("bookingUpsell");
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.bookingId) setServiceDelivery(data);
      }
    } catch { /* ignore */ }
  }, []);

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
  const redirectURI = typeof window !== "undefined" ? `${window.location.origin}/checkout` : undefined;

  const shipping = (serviceDelivery || isPickup) ? 0 : FLAT_SHIPPING;
  const discountAmount = discountPct ? Math.round(subtotal * discountPct) / 100 : 0;
  const total = Math.max(0, subtotal + shipping - discountAmount);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setApplyingDiscount(true);
    setDiscountError(null);
    try {
      const res = await fetch("/api/discount/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: discountCode.trim(), email: buyerEmail || undefined }),
      });
      const data = await res.json();
      if (data.valid) {
        setDiscountPct(data.discountPct);
        setDiscountApplied(true);
      } else {
        setDiscountError(data.message || "Invalid code");
        setDiscountPct(null);
        setDiscountApplied(false);
      }
    } catch {
      setDiscountError("Could not validate code. Try again.");
    } finally {
      setApplyingDiscount(false);
    }
  };

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
      { amount: shipping.toFixed(2), label: "Shipping" },
    ],
    requestBillingContact: true,
    requestShippingContact: true,
  });

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail);
  const isValidPhone = buyerPhone.replace(/\D/g, "").length >= 10;
  const billingComplete = isPickup ? true : Boolean(addressLine1.trim() && city.trim() && state.trim() && postalCode.trim());
  const shippingComplete = (serviceDelivery || isPickup)
    ? true
    : shipSameAsBilling
      ? billingComplete
      : Boolean(shipAddressLine1.trim() && shipCity.trim() && shipState.trim() && shipPostalCode.trim());
  const formReady = Boolean(buyerName.trim()) && isValidEmail && isValidPhone && billingComplete && shippingComplete;

  const handleTokenize = async (tokenResult: any, buyerVerificationToken?: { token?: string } | null) => {
    if (tokenResult.status !== "OK") {
      setError("Payment details are incomplete or invalid.");
      return;
    }
    if (!formReady) {
      setError("Please fill in all required fields above before paying.");
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
          billingAddress: { addressLine1, addressLine2, city, state, postalCode, country: "US" },
          shippingAddress: (serviceDelivery || isPickup) ? undefined : shippingAddress,
          ...(serviceDelivery
            ? { bookingId: serviceDelivery.bookingId, fulfillmentType: "service_delivery", bookingDate: serviceDelivery.bookingDate }
            : isPickup
            ? { fulfillmentType: "pickup" }
            : { fulfillmentType: "shipment" }),
          ...(discountApplied && discountCode ? { discountCode: discountCode.trim().toUpperCase() } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Payment failed.");

      sessionStorage.removeItem("bookingUpsell");
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

      <main className="pt-24 pb-16">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex flex-col lg:flex-row lg:items-start gap-0">

            {/* LEFT: Form */}
            <div className="flex-1 py-8 lg:pr-12">

              {/* Service delivery banner */}
              {serviceDelivery && (
                <div className="flex items-center gap-3 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 mb-6">
                  <Truck className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-purple-900">Delivered with your {serviceDelivery.serviceName}</p>
                    <p className="text-purple-700">{serviceDelivery.bookingDate} — free delivery with service</p>
                  </div>
                  <Badge className="ml-auto bg-emerald-500 text-white">Free Delivery</Badge>
                </div>
              )}

              {!applicationId || !locationId ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive mb-6">
                  Square checkout is not configured. Add <code>VITE_SQUARE_APPLICATION_ID</code> and <code>VITE_SQUARE_LOCATION_ID</code> to your environment.
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground mb-6">
                  Your selections are empty. <Link href="/fragrances" className="underline">Shop products</Link> to continue.
                </div>
              ) : (
                <PaymentForm
                  applicationId={applicationId}
                  locationId={locationId}
                  cardTokenizeResponseReceived={handleTokenize}
                  createVerificationDetails={createVerificationDetails}
                  createPaymentRequest={createPaymentRequest}
                >
                  <div className="space-y-8">

                    {/* Express checkout */}
                    <div>
                      <p className="text-[11px] text-center text-muted-foreground uppercase tracking-widest mb-3 font-medium">
                        Express checkout
                      </p>
                      <div className={`grid gap-2 ${isApplePaySupported ? "grid-cols-2" : "grid-cols-1"}`}>
                        {isApplePaySupported && <ApplePay />}
                        <GooglePay />
                      </div>
                      <div className="flex items-center gap-4 mt-5">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground font-medium">OR</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                      <h2 className="text-base font-semibold mb-4">Contact</h2>
                      <div className="space-y-3">
                        <div>
                          <Input
                            id="buyer-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="Email"
                            required
                            value={buyerEmail}
                            onChange={(e) => setBuyerEmail(e.target.value)}
                            className="h-11"
                          />
                          {buyerEmail && !isValidEmail && (
                            <p className="text-xs text-destructive mt-1">Enter a valid email address</p>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            id="buyer-name"
                            name="name"
                            autoComplete="name"
                            placeholder="Full name"
                            required
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            className="h-11"
                          />
                          <div>
                            <Input
                              id="buyer-phone"
                              name="phone"
                              type="tel"
                              autoComplete="tel"
                              placeholder="Phone"
                              required
                              value={buyerPhone}
                              onChange={(e) => setBuyerPhone(e.target.value)}
                              className="h-11"
                            />
                            {buyerPhone && !isValidPhone && (
                              <p className="text-xs text-destructive mt-1">Enter a valid phone number</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Delivery */}
                    <div>
                      <h2 className="text-base font-semibold mb-4">Delivery</h2>
                      {isPickup ? (
                        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
                          <Store className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="font-medium text-emerald-900 dark:text-emerald-100">Store Pickup — Free</p>
                            <p className="text-emerald-700 dark:text-emerald-300">Millan Luxury Cleaning · 811 N 3rd St, Phoenix, AZ</p>
                          </div>
                        </div>
                      ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <select
                            className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none pr-8"
                            defaultValue="US"
                          >
                            <option value="US">United States</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        </div>
                        <Input
                          id="address-line-1"
                          name="address-line1"
                          autoComplete="billing address-line1"
                          placeholder="Address"
                          required
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          className="h-11"
                        />
                        <Input
                          id="address-line-2"
                          name="address-line2"
                          autoComplete="billing address-line2"
                          placeholder="Apartment, suite, etc. (optional)"
                          value={addressLine2}
                          onChange={(e) => setAddressLine2(e.target.value)}
                          className="h-11"
                        />
                        <div className="grid grid-cols-3 gap-3">
                          <Input
                            id="city"
                            name="city"
                            autoComplete="billing address-level2"
                            placeholder="City"
                            required
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="h-11"
                          />
                          <Input
                            id="state"
                            name="state"
                            autoComplete="billing address-level1"
                            placeholder="State"
                            required
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="h-11"
                          />
                          <Input
                            id="postal-code"
                            name="postal-code"
                            autoComplete="billing postal-code"
                            placeholder="ZIP code"
                            required
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                            className="h-11"
                          />
                        </div>

                        {/* Shipping address toggle (hidden for service delivery) */}
                        {!serviceDelivery && (
                          <div className="pt-1">
                            <label className="flex items-center gap-2 text-sm cursor-pointer text-muted-foreground">
                              <input
                                type="checkbox"
                                checked={shipSameAsBilling}
                                onChange={(e) => setShipSameAsBilling(e.target.checked)}
                                className="rounded border-border"
                              />
                              Shipping address same as above
                            </label>

                            {!shipSameAsBilling && (
                              <div className="space-y-3 mt-3">
                                <Input placeholder="Shipping address" value={shipAddressLine1} onChange={(e) => setShipAddressLine1(e.target.value)} className="h-11" />
                                <Input placeholder="Apartment, suite, etc. (optional)" value={shipAddressLine2} onChange={(e) => setShipAddressLine2(e.target.value)} className="h-11" />
                                <div className="grid grid-cols-3 gap-3">
                                  <Input placeholder="City" value={shipCity} onChange={(e) => setShipCity(e.target.value)} className="h-11" />
                                  <Input placeholder="State" value={shipState} onChange={(e) => setShipState(e.target.value)} className="h-11" />
                                  <Input placeholder="ZIP code" value={shipPostalCode} onChange={(e) => setShipPostalCode(e.target.value)} className="h-11" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      )}
                    </div>

                    {/* Payment */}
                    <div>
                      <h2 className="text-base font-semibold mb-4">Payment</h2>
                      {!formReady && (
                        <div className="rounded-lg border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200 mb-4">
                          Please fill in all required fields above before paying.
                        </div>
                      )}
                      <div className="rounded-xl border border-border p-4 bg-card">
                        <p className="text-xs text-muted-foreground mb-3">All transactions are secure and encrypted.</p>
                        <CreditCard
                          buttonProps={{
                            css: { width: "100%" },
                            isLoading: isSubmitting,
                          }}
                        >
                          {isSubmitting ? "Processing..." : `Pay $${total.toFixed(2)}`}
                        </CreditCard>
                      </div>
                      {error && <p className="text-sm text-destructive mt-3">{error}</p>}
                    </div>

                  </div>
                </PaymentForm>
              )}
            </div>

            {/* RIGHT: Order summary */}
            <div className="w-full lg:w-[400px] lg:border-l border-border bg-muted/30 px-6 py-8 lg:min-h-screen">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-5">Order Summary</h2>

              {/* Items */}
              <div className="space-y-4 mb-5">
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items in your order.</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-background">
                          {item.product?.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <span className="text-[10px] text-muted-foreground">No img</span>
                            </div>
                          )}
                        </div>
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground/70 text-background text-[10px] font-semibold flex items-center justify-center leading-none">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">
                          {item.product?.name ?? "Item"}
                        </p>
                        {item.product?.fragrance && item.product.fragrance !== "Signature" && (
                          <p className="text-xs text-muted-foreground">{item.product.fragrance}</p>
                        )}
                      </div>
                      <span className="text-sm font-medium shrink-0">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Discount code */}
              <div className="mb-5 space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      className={`pl-8 h-10 text-sm ${discountApplied ? "border-emerald-400 bg-emerald-50" : ""}`}
                      placeholder="Discount code"
                      value={discountCode}
                      onChange={(e) => { setDiscountCode(e.target.value); setDiscountApplied(false); setDiscountPct(null); setDiscountError(null); }}
                      disabled={discountApplied}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 px-4 shrink-0 text-sm"
                    onClick={handleApplyDiscount}
                    disabled={applyingDiscount || discountApplied || !discountCode.trim()}
                  >
                    {applyingDiscount ? "..." : discountApplied ? "Applied ✓" : "Apply"}
                  </Button>
                </div>
                {discountError && <p className="text-xs text-destructive pl-1">{discountError}</p>}
                {discountApplied && <p className="text-xs text-emerald-600 pl-1">{discountPct}% discount applied!</p>}
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {serviceDelivery ? "Delivery" : isPickup ? "Store Pickup" : "Shipping"}
                  </span>
                  <span>
                    {(serviceDelivery || isPickup)
                      ? <span className="text-emerald-600 font-medium">Free</span>
                      : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                {discountApplied && discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Discount ({discountPct}% off)</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline font-bold text-lg border-t border-border pt-3 mt-1">
                  <span>Total</span>
                  <span>
                    <span className="text-sm font-normal text-muted-foreground mr-1">USD</span>
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
