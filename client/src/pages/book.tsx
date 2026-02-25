import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, addDays, startOfDay } from "date-fns";
import { CreditCard, PaymentForm } from "react-square-web-payments-sdk";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Sparkles, Home, AlertCircle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { BookingUpsellCarousel } from "@/components/BookingUpsellCarousel";
import type { ServiceItem, ServicePricingTier } from "@shared/types";

// Square footage pricing tiers
const SQFT_TIERS = [
  { name: "1-999 sq ft", addOn: 0 },
  { name: "1,000-1,499 sq ft", addOn: 50 },
  { name: "1,500-1,999 sq ft", addOn: 90 },
  { name: "2,000-2,499 sq ft", addOn: 120 },
  { name: "2,500-2,999 sq ft", addOn: 140 },
  { name: "3,000-3,499 sq ft", addOn: 200 },
  { name: "3,500-3,999 sq ft", addOn: 250 },
  { name: "4,000-4,499 sq ft", addOn: 290 },
  { name: "4,500-5,000 sq ft", addOn: 320 },
  { name: "5,000+ sq ft", addOn: null }, // Call for estimate
] as const;

// Laundry add-on items (fixed price)
const LAUNDRY_ITEMS = [
  { id: "king-comforter", name: "King Comforter", price: 30 },
  { id: "king-sheets", name: "King Bed Sheets", price: 15 },
  { id: "queen-comforter", name: "Queen Comforter", price: 25 },
  { id: "queen-sheets", name: "Queen Bed Sheets", price: 12 },
  { id: "twin-comforter", name: "Twin/Full Comforter", price: 20 },
  { id: "twin-sheets", name: "Twin/Full Bed Sheets", price: 10 },
  { id: "small-blankets", name: "Small Blankets", price: 6 },
] as const;

// Laundry variable pricing
const LAUNDRY_RATES = {
  regularPerLb: 2.45,
  delicatePerLb: 3.80,
  deliveryPerMile: 0.75,
} as const;

const signatureServiceCopyMap: Record<string, string> = {
  "deep cleaning":
    "A meticulous, top-to-bottom clean designed to reset your home or rental when it needs extra attention.",
  "move-in/move-out":
    "Perfect for transitions — detailed cleaning that prepares your space for inspection, listing, or move-in.",
  "move-in / move-out":
    "Perfect for transitions — detailed cleaning that prepares your space for inspection, listing, or move-in.",
  "move-in / move-out cleaning":
    "Perfect for transitions — detailed cleaning that prepares your space for inspection, listing, or move-in.",
  "move-in/move-out cleaning":
    "Perfect for transitions — detailed cleaning that prepares your space for inspection, listing, or move-in.",
  "basic cleaning":
    "Consistent, guest-ready service to maintain a polished, welcoming space between stays.",
  "weekly & bi-weekly cleaning":
    "Consistent, guest-ready service to maintain a polished, welcoming space between stays.",
  "weekly & biweekly cleaning":
    "Consistent, guest-ready service to maintain a polished, welcoming space between stays.",
  "weekly & bi-weekly cleaning (basic cleaning)":
    "Consistent, guest-ready service to maintain a polished, welcoming space between stays.",
  "airbnb turnovers":
    "Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.",
  "airbnb (only)":
    "Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.",
  "airbnb weekly & biweekly cleaning":
    "Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.",
  "reset, monthly & one time cleaning":
    "Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.",
  "final/ move-out cleaning":
    "Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.",
  "final / move-out cleaning":
    "Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.",
  "standard service offerings":
    "Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.",
};

const normalizeServiceName = (name: string) => name.replace(/^[^A-Za-z0-9]+/, "").trim();

const getCuratedServiceCopy = (name: string) => {
  const normalized = normalizeServiceName(name).toLowerCase();
  return signatureServiceCopyMap[normalized] ?? null;
};

const formatDescriptionLines = (description: string) => {
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const bulletSplit = cleaned.split("•").map((line) => line.trim()).filter(Boolean);
  if (bulletSplit.length > 1) {
    return bulletSplit;
  }
  const sentenceSplit = cleaned.split(/(?<=\.)\s+/).map((line) => line.trim()).filter(Boolean);
  return sentenceSplit.length > 1 ? sentenceSplit : [cleaned];
};

type AvailabilitySlot = {
  startAt: string | null;
  locationId: string;
  appointmentSegments: {
    teamMemberId: string;
    serviceVariationId: string;
    serviceVariationVersion: string;
    durationMinutes?: number | null;
  }[];
};

type AvailabilityResponse = {
  serviceId: number;
  serviceVariationId: string;
  serviceVariationVersion: string;
  availabilities: AvailabilitySlot[];
};

export default function BookingPage() {
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialServiceId = Number(queryParams.get("serviceId"));

  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    Number.isFinite(initialServiceId) ? initialServiceId : null,
  );
  const [selectedPricingTier, setSelectedPricingTier] = useState<string | null>(null);
  const [squareFootage, setSquareFootage] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingStatus, setBookingStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingId: number;
    serviceName: string;
    date: string;
    time: string;
  } | null>(null);

  // Laundry add-ons state (quantities instead of just selected)
  const [laundryItemQuantities, setLaundryItemQuantities] = useState<Record<string, number>>({});
  const [regularLaundryLbs, setRegularLaundryLbs] = useState("");
  const [delicateLaundryLbs, setDelicateLaundryLbs] = useState("");
  const [deliveryMiles, setDeliveryMiles] = useState("");
  const [needsPickupDelivery, setNeedsPickupDelivery] = useState(false);

  const { data: services = [], isLoading: servicesLoading } = useQuery<ServiceItem[]>({
    queryKey: ["/api/services"],
  });

  const isLaundryAddonService = (service: ServiceItem) => {
    const name = (service.title ?? service.name ?? "").toLowerCase();
    return name.includes("comforter") || name.includes("bed sheet");
  };

  const squareServices = services.filter(
    (service) => Boolean(service.squareServiceId) && !isLaundryAddonService(service),
  );

  const selectedService = squareServices.find((s) => s.id === selectedServiceId);

  // Check if this is a laundry service
  const isLaundryService = selectedService?.title?.toLowerCase().includes("laundry") ?? false;

  // Parse pricing tiers from service
  const pricingTiers = useMemo((): ServicePricingTier[] => {
    if (!selectedService?.pricingTiers) return [];
    try {
      const tiers = selectedService.pricingTiers as ServicePricingTier[];
      return Array.isArray(tiers) ? tiers : [];
    } catch {
      return [];
    }
  }, [selectedService]);

  // Get square footage add-on price
  const sqftAddOn = useMemo(() => {
    if (!squareFootage) return 0;
    const tier = SQFT_TIERS.find((t) => t.name === squareFootage);
    return tier?.addOn ?? 0;
  }, [squareFootage]);

  // Check if "call for estimate" tier selected
  const requiresEstimate = squareFootage === "5,000+ sq ft";

  // Calculate laundry add-ons total (with quantities)
  const laundryItemsTotal = useMemo(() => {
    let total = 0;
    Object.entries(laundryItemQuantities).forEach(([itemId, qty]) => {
      if (qty > 0) {
        const item = LAUNDRY_ITEMS.find((i) => i.id === itemId);
        if (item) total += item.price * qty;
      }
    });
    return total;
  }, [laundryItemQuantities]);

  const laundryVariableTotal = useMemo(() => {
    let total = 0;
    const regularLbs = parseFloat(regularLaundryLbs) || 0;
    const delicateLbs = parseFloat(delicateLaundryLbs) || 0;
    const miles = parseFloat(deliveryMiles) || 0;

    if (regularLbs > 0) total += regularLbs * LAUNDRY_RATES.regularPerLb;
    if (delicateLbs > 0) total += delicateLbs * LAUNDRY_RATES.delicatePerLb;
    if (needsPickupDelivery && miles > 0) total += miles * LAUNDRY_RATES.deliveryPerMile;

    return total;
  }, [regularLaundryLbs, delicateLaundryLbs, deliveryMiles, needsPickupDelivery]);

  const laundryTotal = laundryItemsTotal + laundryVariableTotal;

  // Calculate base price from tier or service
  const basePrice = useMemo(() => {
    if (selectedPricingTier && pricingTiers.length > 0) {
      const tier = pricingTiers.find((t) => t.name === selectedPricingTier);
      if (tier) return tier.price;
    }
    return selectedService?.price ? Number(selectedService.price) : null;
  }, [selectedPricingTier, pricingTiers, selectedService]);

  // Calculate total price including square footage add-on and laundry
  const selectedPrice = useMemo(() => {
    // For laundry, price is entirely from add-ons
    if (isLaundryService) {
      return laundryTotal > 0 ? laundryTotal : null;
    }
    if (basePrice === null) return null;
    return basePrice + sqftAddOn;
  }, [basePrice, sqftAddOn, isLaundryService, laundryTotal]);

  // Square Web Payments SDK for card-on-file
  const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID as string | undefined;
  const squareLocationId = import.meta.env.VITE_SQUARE_LOCATION_ID as string | undefined;

  useEffect(() => {
    if (!selectedServiceId && squareServices.length > 0) {
      setSelectedServiceId(squareServices[0].id);
    }
  }, [selectedServiceId, squareServices]);

  // Reset pricing tier, square footage, and laundry selections when service changes
  useEffect(() => {
    setSelectedPricingTier(null);
    setSquareFootage("");
    setLaundryItemQuantities({});
    setRegularLaundryLbs("");
    setDelicateLaundryLbs("");
    setDeliveryMiles("");
    setNeedsPickupDelivery(false);
  }, [selectedServiceId]);

  // Update laundry item quantity
  const updateLaundryQuantity = (itemId: string, qty: number) => {
    setLaundryItemQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, qty),
    }));
  };

  const availabilityQuery = useQuery<AvailabilityResponse>({
    queryKey: ["/api/bookings/availability", selectedServiceId],
    enabled: Boolean(selectedServiceId),
    queryFn: async () => {
      const startAt = new Date().toISOString();
      const endAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const response = await fetch(
        `/api/bookings/availability?serviceId=${selectedServiceId}&startAt=${encodeURIComponent(
          startAt,
        )}&endAt=${encodeURIComponent(endAt)}`,
      );
      if (!response.ok) {
        throw new Error("Failed to load availability");
      }
      return response.json();
    },
  });

  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedServiceId, selectedDate]);

  const curatedDescription = selectedService
    ? getCuratedServiceCopy(selectedService.title ?? selectedService.name ?? "")
    : null;
  const formattedDescription = selectedService?.description
    ? formatDescriptionLines(selectedService.description)
    : [];

  // Group availabilities by date
  const availabilitiesByDate = useMemo(() => {
    const slots = availabilityQuery.data?.availabilities || [];
    const grouped = new Map<string, AvailabilitySlot[]>();

    slots.forEach((slot) => {
      if (slot.startAt) {
        const dateKey = format(new Date(slot.startAt), "yyyy-MM-dd");
        const existing = grouped.get(dateKey) || [];
        existing.push(slot);
        grouped.set(dateKey, existing);
      }
    });

    return grouped;
  }, [availabilityQuery.data]);

  // Get available dates for the calendar
  const availableDates = useMemo(() => {
    return Array.from(availabilitiesByDate.keys()).map((d) => new Date(d));
  }, [availabilitiesByDate]);

  // Get times for selected date
  const timesForSelectedDate = useMemo(() => {
    const dateKey = format(selectedDate, "yyyy-MM-dd");
    return availabilitiesByDate.get(dateKey) || [];
  }, [selectedDate, availabilitiesByDate]);

  // Generate calendar days (2 weeks)
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const today = startOfDay(new Date());
    for (let i = 0; i < 14; i++) {
      days.push(addDays(today, i));
    }
    return days;
  }, []);

  const handleSubmit = async (sourceId?: string) => {
    if (!selectedServiceId || !selectedSlot?.startAt || !selectedSlot.appointmentSegments.length) {
      return;
    }

    const segment = selectedSlot.appointmentSegments[0];

    // Build notes with pricing tier, square footage, and laundry info
    const noteParts: string[] = [];
    if (selectedPricingTier) {
      noteParts.push(`Size: ${selectedPricingTier}`);
    }
    if (squareFootage) {
      noteParts.push(`Square Footage: ${squareFootage}`);
    }
    // Laundry details
    if (isLaundryService) {
      const laundryDetails: string[] = [];
      // Items with quantities
      const itemsWithQty = LAUNDRY_ITEMS.filter((i) => (laundryItemQuantities[i.id] || 0) > 0);
      if (itemsWithQty.length > 0) {
        laundryDetails.push(`Items: ${itemsWithQty.map((i) => `${laundryItemQuantities[i.id]}x ${i.name} ($${i.price * laundryItemQuantities[i.id]})`).join(", ")}`);
      }
      if (parseFloat(regularLaundryLbs) > 0) {
        laundryDetails.push(`Regular Laundry: ${regularLaundryLbs} lbs @ $${LAUNDRY_RATES.regularPerLb}/lb`);
      }
      if (parseFloat(delicateLaundryLbs) > 0) {
        laundryDetails.push(`Delicate Fabrics: ${delicateLaundryLbs} lbs @ $${LAUNDRY_RATES.delicatePerLb}/lb`);
      }
      if (needsPickupDelivery && parseFloat(deliveryMiles) > 0) {
        laundryDetails.push(`Pick-up/Delivery: ${deliveryMiles} miles @ $${LAUNDRY_RATES.deliveryPerMile}/mile`);
      }
      if (laundryDetails.length > 0) {
        noteParts.push("--- Laundry Details ---");
        noteParts.push(...laundryDetails);
      }
    }
    if (notes) {
      noteParts.push(notes);
    }
    const bookingNotes = noteParts.join("\n");

    setIsSubmitting(true);
    setBookingStatus(null);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone,
          notes: bookingNotes,
          serviceId: selectedServiceId,
          startAt: selectedSlot.startAt,
          teamMemberId: segment.teamMemberId,
          serviceVariationId: segment.serviceVariationId,
          serviceVariationVersion: segment.serviceVariationVersion,
          sourceId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Booking failed");
      }

      setBookingStatus({
        success: true,
        message: `Booking confirmed! Reference #${data.bookingId}. You'll receive a confirmation email shortly.`,
      });

      setConfirmedBooking({
        bookingId: data.bookingId,
        serviceName: selectedService?.title ?? "your service",
        date: selectedSlot?.startAt ? format(new Date(selectedSlot.startAt), "EEEE, MMMM d") : "",
        time: selectedSlot?.startAt ? format(new Date(selectedSlot.startAt), "h:mm a") : "",
      });
    } catch (error) {
      setBookingStatus({
        success: false,
        message: error instanceof Error ? error.message : "Booking failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <section className="pt-28 pb-16 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 mb-4">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">Premium Booking</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-serif font-semibold">Book Your Service</h1>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Select a service, pick your preferred date and time, and we'll take care of the rest.
            </p>
          </div>

          {confirmedBooking ? (
            <div className="max-w-2xl mx-auto space-y-6">
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50">
                <CardContent className="pt-6 text-center space-y-4">
                  <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto" />
                  <h2 className="text-2xl font-semibold">Booking Confirmed!</h2>
                  <p className="text-muted-foreground">
                    Reference #{confirmedBooking.bookingId} — You'll receive a confirmation email shortly.
                  </p>
                  <div className="inline-flex flex-col sm:flex-row gap-4 text-sm bg-white/70 rounded-xl px-6 py-4 border border-emerald-200">
                    <span><strong>Service:</strong> {confirmedBooking.serviceName}</span>
                    <span><strong>Date:</strong> {confirmedBooking.date}</span>
                    <span><strong>Time:</strong> {confirmedBooking.time}</span>
                  </div>
                </CardContent>
              </Card>

              <BookingUpsellCarousel
                serviceName={confirmedBooking.serviceName}
                bookingDate={confirmedBooking.date}
                bookingId={confirmedBooking.bookingId}
              />
            </div>
          ) : (
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-6">
              {/* Service Selection */}
              <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">1</span>
                    Select a Service
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {servicesLoading && <p className="text-sm text-muted-foreground">Loading services...</p>}
                  {!servicesLoading &&
                    squareServices.map((service) => (
                      <button
                        key={service.id}
                        onClick={() => setSelectedServiceId(service.id)}
                        className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
                          selectedServiceId === service.id
                            ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-100"
                            : "border-border hover:border-purple-300 hover:shadow-md"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <p className="font-semibold text-lg">{service.title}</p>
                          {service.requiresDeposit !== false && (
                            <Badge variant="outline" className="text-xs">Deposit Required</Badge>
                          )}
                        </div>
                        {service.displayPrice && service.price && (
                          <p className="text-purple-600 font-bold mt-1">Starting at ${Number(service.price).toFixed(2)}</p>
                        )}
                      </button>
                    ))}
                </CardContent>
              </Card>

              {selectedService?.description && (
                <div className="rounded-xl border border-border/70 bg-gradient-to-br from-purple-50/70 to-pink-50/70 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Service Description</p>
                  {curatedDescription && (
                    <p className="mt-2 text-sm text-foreground font-medium">
                      {curatedDescription}
                    </p>
                  )}
                  {formattedDescription.length > 0 && (
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
                      {formattedDescription.map((line, index) => (
                        <li key={`${selectedService.id}-detail-${index}`} className="flex gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Pricing Tier Selection (if available, not for laundry) */}
              {pricingTiers.length > 0 && !isLaundryService && (
                <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-purple-500" />
                      Select Property Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {pricingTiers.map((tier) => (
                        <button
                          key={tier.name}
                          onClick={() => setSelectedPricingTier(tier.name)}
                          className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
                            selectedPricingTier === tier.name
                              ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-100"
                              : "border-border hover:border-purple-300 hover:shadow-md"
                          }`}
                        >
                          <p className="font-semibold">{tier.name}</p>
                          <p className="text-purple-600 font-bold mt-1">${tier.price.toFixed(2)}</p>
                          {tier.description && (
                            <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Square Footage Selection */}
                    <div className="mt-6 pt-4 border-t">
                      <Label className="text-sm font-medium">
                        Property Square Footage
                      </Label>
                      <Select value={squareFootage} onValueChange={setSquareFootage}>
                        <SelectTrigger className="mt-2 max-w-sm">
                          <SelectValue placeholder="Select square footage range" />
                        </SelectTrigger>
                        <SelectContent>
                          {SQFT_TIERS.map((tier) => (
                            <SelectItem key={tier.name} value={tier.name}>
                              {tier.name}
                              {tier.addOn !== null ? (
                                tier.addOn > 0 ? ` (+$${tier.addOn})` : " (included)"
                              ) : " — Call for estimate"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {requiresEstimate && (
                        <p className="text-sm text-amber-600 mt-2">
                          📞 For properties over 5,000 sq ft, please call for a private estate estimate.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Square Footage for services without pricing tiers (not for laundry) */}
              {pricingTiers.length === 0 && selectedService && !isLaundryService && (
                <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Home className="w-5 h-5 text-purple-500" />
                      Property Square Footage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={squareFootage} onValueChange={setSquareFootage}>
                      <SelectTrigger className="max-w-sm">
                        <SelectValue placeholder="Select square footage range" />
                      </SelectTrigger>
                      <SelectContent>
                        {SQFT_TIERS.map((tier) => (
                          <SelectItem key={tier.name} value={tier.name}>
                            {tier.name}
                            {tier.addOn !== null ? (
                              tier.addOn > 0 ? ` (+$${tier.addOn})` : " (included)"
                            ) : " — Call for estimate"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requiresEstimate && (
                      <p className="text-sm text-amber-600 mt-3">
                        📞 For properties over 5,000 sq ft, please call for a private estate estimate.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Laundry Add-ons */}
              {isLaundryService && (
                <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <span className="text-2xl">🧺</span>
                      Laundry Items & Services
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Select items and quantities</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pick-up & Delivery - First */}
                    <div>
                      <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        needsPickupDelivery ? "border-purple-500 bg-purple-50" : "border-border hover:border-purple-300"
                      }`}>
                        <input
                          type="checkbox"
                          checked={needsPickupDelivery}
                          onChange={(e) => setNeedsPickupDelivery(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1">
                          <span className="font-medium">🚗 Pick-up & Delivery</span>
                          <span className="text-sm text-muted-foreground ml-2">(${LAUNDRY_RATES.deliveryPerMile}/mile)</span>
                        </div>
                      </label>
                      {needsPickupDelivery && (
                        <div className="mt-3 ml-7">
                          <Label htmlFor="delivery-miles" className="text-sm text-muted-foreground">
                            Estimated round-trip miles
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              id="delivery-miles"
                              type="number"
                              min="0"
                              step="1"
                              placeholder="0"
                              value={deliveryMiles}
                              onChange={(e) => setDeliveryMiles(e.target.value)}
                              className="max-w-24"
                            />
                            <span className="text-sm text-muted-foreground">miles</span>
                            {parseFloat(deliveryMiles) > 0 && (
                              <span className="text-purple-600 font-medium">
                                = ${(parseFloat(deliveryMiles) * LAUNDRY_RATES.deliveryPerMile).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Variable Pricing - By Weight */}
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">👕 Laundry by Weight</Label>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label htmlFor="regular-lbs" className="text-sm text-muted-foreground">
                            Regular Clothes (${LAUNDRY_RATES.regularPerLb}/lb)
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              id="regular-lbs"
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="0"
                              value={regularLaundryLbs}
                              onChange={(e) => setRegularLaundryLbs(e.target.value)}
                              className="max-w-24"
                            />
                            <span className="text-sm text-muted-foreground">lbs</span>
                            {parseFloat(regularLaundryLbs) > 0 && (
                              <span className="text-purple-600 font-medium">
                                = ${(parseFloat(regularLaundryLbs) * LAUNDRY_RATES.regularPerLb).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="delicate-lbs" className="text-sm text-muted-foreground">
                            Delicate Fabrics (${LAUNDRY_RATES.delicatePerLb}/lb)
                          </Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              id="delicate-lbs"
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="0"
                              value={delicateLaundryLbs}
                              onChange={(e) => setDelicateLaundryLbs(e.target.value)}
                              className="max-w-24"
                            />
                            <span className="text-sm text-muted-foreground">lbs</span>
                            {parseFloat(delicateLaundryLbs) > 0 && (
                              <span className="text-purple-600 font-medium">
                                = ${(parseFloat(delicateLaundryLbs) * LAUNDRY_RATES.delicatePerLb).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bedding Items with Quantity */}
                    <div className="border-t pt-4">
                      <Label className="text-sm font-semibold mb-3 block">🛏️ Bedding & Blankets</Label>
                      <div className="space-y-2">
                        {LAUNDRY_ITEMS.map((item) => {
                          const qty = laundryItemQuantities[item.id] || 0;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                qty > 0 ? "border-purple-500 bg-purple-50" : "border-border"
                              }`}
                            >
                              <span className="flex-1 font-medium">{item.name}</span>
                              <span className="text-purple-600 font-bold">${item.price} ea</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => updateLaundryQuantity(item.id, qty - 1)}
                                  disabled={qty <= 0}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center font-medium">{qty}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => updateLaundryQuantity(item.id, qty + 1)}
                                >
                                  +
                                </Button>
                              </div>
                              {qty > 0 && (
                                <span className="text-purple-600 font-bold min-w-16 text-right">
                                  ${(item.price * qty).toFixed(2)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Laundry Total */}
                    {laundryTotal > 0 && (
                      <div className="border-t pt-4 bg-gradient-to-r from-purple-50 to-pink-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Laundry Total</span>
                          <span className="text-xl font-bold text-purple-600">${laundryTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Calendar Date Selection */}
              <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">2</span>
                    <Calendar className="w-5 h-5" />
                    Choose a Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {availabilityQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-2">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                            {day}
                          </div>
                        ))}
                        {/* Empty cells for alignment */}
                        {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                        {calendarDays.map((day) => {
                          const dateKey = format(day, "yyyy-MM-dd");
                          const hasSlots = availabilitiesByDate.has(dateKey);
                          const isSelected = isSameDay(day, selectedDate);
                          const isToday = isSameDay(day, new Date());

                          return (
                            <button
                              key={dateKey}
                              onClick={() => hasSlots && setSelectedDate(day)}
                              disabled={!hasSlots}
                              className={`
                                relative p-3 rounded-xl text-center transition-all
                                ${isSelected
                                  ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200"
                                  : hasSlots
                                    ? "hover:bg-purple-50 hover:shadow-md border border-transparent hover:border-purple-200"
                                    : "text-muted-foreground/40 cursor-not-allowed"
                                }
                                ${isToday && !isSelected ? "ring-2 ring-purple-300" : ""}
                              `}
                            >
                              <div className="text-lg font-semibold">{format(day, "d")}</div>
                              <div className="text-xs mt-0.5">{format(day, "MMM")}</div>
                              {hasSlots && !isSelected && (
                                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {availableDates.length === 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          No availability in the next 2 weeks. Please check back later.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Time Selection */}
              <Card className="border-2 border-transparent hover:border-purple-200/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">3</span>
                    <Clock className="w-5 h-5" />
                    Select a Time
                    {selectedDate && (
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        for {format(selectedDate, "EEEE, MMMM d")}
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {timesForSelectedDate.length === 0 ? (
                    <p className="text-center text-muted-foreground py-6">
                      {availabilityQuery.isLoading
                        ? "Loading times..."
                        : "No times available for this date. Please select another date."}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {timesForSelectedDate.map((slot) => {
                        const startAt = slot.startAt ? new Date(slot.startAt) : null;
                        const timeLabel = startAt ? format(startAt, "h:mm a") : "";
                        const isSelected = selectedSlot?.startAt === slot.startAt;
                        const duration = slot.appointmentSegments[0]?.durationMinutes;

                        return (
                          <button
                            key={slot.startAt}
                            onClick={() => setSelectedSlot(slot)}
                            className={`
                              px-3 py-3 rounded-xl text-center transition-all font-medium
                              ${isSelected
                                ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200"
                                : "border-2 border-border hover:border-purple-300 hover:bg-purple-50 hover:shadow-md"
                              }
                            `}
                          >
                            <div className="text-sm">{timeLabel}</div>
                            {duration && (
                              <div className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-muted-foreground"}`}>
                                {Math.floor(duration / 60)}h {duration % 60}m
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Customer Details & Summary */}
            <div className="space-y-6">
              {/* Booking Summary */}
              {(selectedService || selectedSlot) && (
                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Booking Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {selectedService && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service</span>
                        <span className="font-medium">{selectedService.title}</span>
                      </div>
                    )}
                    {selectedPricingTier && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Property Size</span>
                        <span className="font-medium">{selectedPricingTier}</span>
                      </div>
                    )}
                    {squareFootage && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Square Footage</span>
                        <span className="font-medium">
                          {squareFootage}
                          {sqftAddOn > 0 && <span className="text-purple-600 ml-1">(+${sqftAddOn})</span>}
                        </span>
                      </div>
                    )}
                    {requiresEstimate && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-700">
                        📞 Call for estate estimate
                      </div>
                    )}
                    {/* Laundry Items Summary */}
                    {isLaundryService && laundryItemsTotal > 0 && (
                      <div>
                        <span className="text-muted-foreground text-xs">Items:</span>
                        <div className="mt-1 space-y-1">
                          {LAUNDRY_ITEMS.filter((i) => (laundryItemQuantities[i.id] || 0) > 0).map((item) => {
                            const qty = laundryItemQuantities[item.id] || 0;
                            return (
                              <div key={item.id} className="flex justify-between text-xs">
                                <span>{qty}x {item.name}</span>
                                <span>${(item.price * qty).toFixed(2)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {isLaundryService && laundryVariableTotal > 0 && (
                      <div className="space-y-1">
                        {parseFloat(regularLaundryLbs) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span>Regular ({regularLaundryLbs} lbs)</span>
                            <span>${(parseFloat(regularLaundryLbs) * LAUNDRY_RATES.regularPerLb).toFixed(2)}</span>
                          </div>
                        )}
                        {parseFloat(delicateLaundryLbs) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span>Delicate ({delicateLaundryLbs} lbs)</span>
                            <span>${(parseFloat(delicateLaundryLbs) * LAUNDRY_RATES.delicatePerLb).toFixed(2)}</span>
                          </div>
                        )}
                        {needsPickupDelivery && parseFloat(deliveryMiles) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span>Delivery ({deliveryMiles} mi)</span>
                            <span>${(parseFloat(deliveryMiles) * LAUNDRY_RATES.deliveryPerMile).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {selectedSlot?.startAt && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-medium">{format(new Date(selectedSlot.startAt), "EEEE, MMM d")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Time</span>
                          <span className="font-medium">{format(new Date(selectedSlot.startAt), "h:mm a")}</span>
                        </div>
                      </>
                    )}
                    {selectedPrice && !requiresEstimate && (
                      <>
                        <div className="border-t border-purple-200 my-2" />
                        {sqftAddOn > 0 && basePrice && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Base Price</span>
                              <span>${basePrice.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Sq Ft Add-on</span>
                              <span>+${sqftAddOn.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="font-medium">Total Price</span>
                          <span className="font-bold text-purple-600">${selectedPrice.toFixed(2)}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Cancellation Policy Notice */}
              <Card className="border-emerald-200 bg-emerald-50/50">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-emerald-900">Cancellation Policy</p>
                      <p className="text-emerald-700 mt-1">
                        A card is required to hold your booking but <strong>will not be charged</strong>.
                        Cancellations within 24 hours incur a 25% fee. Same-day cancellations or no-shows incur a 50% fee.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">4</span>
                    Your Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name">Full Name *</Label>
                    <Input
                      id="customer-name"
                      placeholder="John Smith"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-email">Email *</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="john@example.com"
                      value={customerEmail}
                      onChange={(event) => setCustomerEmail(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">Phone</Label>
                    <Input
                      id="customer-phone"
                      placeholder="(555) 123-4567"
                      value={customerPhone}
                      onChange={(event) => setCustomerPhone(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Special Requests</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special instructions or requests..."
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={3}
                    />
                  </div>

                  {bookingStatus && (
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm ${
                        bookingStatus.success
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      }`}
                    >
                      {bookingStatus.message}
                    </div>
                  )}

                  {/* Card on File + Confirm Button */}
                  {applicationId && squareLocationId ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Your card will not be charged. Held securely by Square.</span>
                      </div>
                      <PaymentForm
                        applicationId={applicationId}
                        locationId={squareLocationId}
                        cardTokenizeResponseReceived={(tokenResult) => {
                          if (tokenResult.status === "OK" && tokenResult.token) {
                            handleSubmit(tokenResult.token);
                          } else {
                            setBookingStatus({
                              success: false,
                              message: "Please enter valid card details.",
                            });
                          }
                        }}
                        createPaymentRequest={() => ({
                          countryCode: "US",
                          currencyCode: "USD",
                          total: { amount: "0.00", label: "Card on File" },
                        })}
                      >
                        <CreditCard
                          buttonProps={{
                            isLoading: isSubmitting,
                            css: {
                              backgroundColor: "#a855f7",
                              fontSize: "16px",
                              fontWeight: "600",
                              padding: "12px",
                              "&:hover": {
                                backgroundColor: "#9333ea",
                              },
                            },
                          }}
                          style={{
                            input: {
                              fontSize: "16px",
                            },
                          }}
                        >
                          {isSubmitting ? "Booking..." : "Confirm Booking"}
                        </CreditCard>
                      </PaymentForm>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleSubmit()}
                      disabled={
                        isSubmitting ||
                        !selectedServiceId ||
                        !selectedSlot ||
                        !customerName.trim() ||
                        !customerEmail.trim()
                      }
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      size="lg"
                    >
                      {isSubmitting ? "Booking..." : "Confirm Booking"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
