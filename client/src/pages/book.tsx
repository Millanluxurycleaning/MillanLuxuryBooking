import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, addDays, startOfDay, startOfMonth, endOfMonth, addMonths, isBefore } from "date-fns";
import { CreditCard, PaymentForm } from "react-square-web-payments-sdk";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Sparkles, Home, ShieldCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Star, Copy, Check } from "lucide-react";
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

// Step IDs for the wizard flow
const STEP_SERVICE = 1;
const STEP_DETAILS = 2;  // Property size / sqft / laundry items
const STEP_DATE = 3;
const STEP_TIME = 4;
const STEP_CONTACT = 5;

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
  const [serviceAddress, setServiceAddress] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [serviceState, setServiceState] = useState("AZ");
  const [serviceZip, setServiceZip] = useState("");
  const [notes, setNotes] = useState("");
  const [frequency, setFrequency] = useState<"one-time" | "weekly" | "bi-weekly" | "monthly">("one-time");
  const [bookingStatus, setBookingStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingId: number;
    serviceName: string;
    date: string;
    time: string;
  } | null>(null);
  const [reviewClicked, setReviewClicked] = useState(false);
  const [reviewCodeCopied, setReviewCodeCopied] = useState(false);

  // Laundry add-ons state (quantities instead of just selected)
  const [laundryItemQuantities, setLaundryItemQuantities] = useState<Record<string, number>>({});
  const [regularLaundryLbs, setRegularLaundryLbs] = useState("");
  const [delicateLaundryLbs, setDelicateLaundryLbs] = useState("");
  const [deliveryMiles, setDeliveryMiles] = useState("");
  const [needsPickupDelivery, setNeedsPickupDelivery] = useState(false);

  // Wizard step tracking
  const [activeStep, setActiveStep] = useState(STEP_SERVICE);
  const stepRefs: Record<number, React.RefObject<HTMLDivElement>> = {
    [STEP_SERVICE]: useRef<HTMLDivElement>(null),
    [STEP_DETAILS]: useRef<HTMLDivElement>(null),
    [STEP_DATE]: useRef<HTMLDivElement>(null),
    [STEP_TIME]: useRef<HTMLDivElement>(null),
    [STEP_CONTACT]: useRef<HTMLDivElement>(null),
  };

  const scrollToStep = useCallback((step: number) => {
    setTimeout(() => {
      stepRefs[step]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }, []);

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

  // Services that use tier-based pricing but don't need a separate sqft input
  const isAddOnOrStandardService = (() => {
    const t = (selectedService?.title ?? selectedService?.name ?? "").toLowerCase();
    return t.includes("add-on") || t.includes("optional add") || t.includes("standard service");
  })();

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
    if (isLaundryService) return laundryTotal > 0 ? laundryTotal : null;
    if (basePrice === null) return null;
    return basePrice + sqftAddOn;
  }, [basePrice, sqftAddOn, isLaundryService, laundryTotal]);

  const FREQUENCY_DISCOUNTS: Record<string, number> = {
    "one-time": 0,
    "weekly": 20,
    "bi-weekly": 15,
    "monthly": 10,
  };

  const frequencyDiscount = FREQUENCY_DISCOUNTS[frequency] ?? 0;
  const recurringPrice = selectedPrice != null && frequencyDiscount > 0
    ? selectedPrice * (1 - frequencyDiscount / 100)
    : null;

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

  // Calendar month navigation
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const today = startOfDay(new Date());
  const maxMonth = startOfMonth(addMonths(today, 3));

  const prevMonth = () => setViewMonth((m) => {
    const prev = addMonths(m, -1);
    return isBefore(prev, startOfMonth(today)) ? m : prev;
  });
  const nextMonth = () => setViewMonth((m) => {
    const next = addMonths(m, 1);
    return isBefore(maxMonth, next) ? m : next;
  });

  // Update laundry item quantity
  const updateLaundryQuantity = (itemId: string, qty: number) => {
    setLaundryItemQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, qty),
    }));
  };

  // Find the squareVariationId for the selected pricing tier (if any)
  const selectedTierVariationId = useMemo(() => {
    if (!selectedPricingTier || !pricingTiers.length) return null;
    const tier = pricingTiers.find((t) => t.name === selectedPricingTier);
    return tier?.squareVariationId ?? null;
  }, [selectedPricingTier, pricingTiers]);

  const availabilityQuery = useQuery<AvailabilityResponse>({
    queryKey: ["/api/bookings/availability", selectedServiceId, format(viewMonth, "yyyy-MM"), selectedTierVariationId],
    enabled: Boolean(selectedServiceId),
    queryFn: async () => {
      const monthStart = startOfMonth(viewMonth);
      const startAt = isBefore(monthStart, today) ? today.toISOString() : monthStart.toISOString();
      const endAt = endOfMonth(viewMonth).toISOString();
      const variationParam = selectedTierVariationId
        ? `&variationId=${encodeURIComponent(selectedTierVariationId)}`
        : "";
      const response = await fetch(
        `/api/bookings/availability?serviceId=${selectedServiceId}&startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}${variationParam}`,
      );
      if (!response.ok) throw new Error("Failed to load availability");
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

  // Generate all days in the viewed month
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    let current = start;
    while (current <= end) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [viewMonth]);

  // --- Step completion checks ---
  // Step 2 (details) is needed for non-laundry services that have pricing tiers or sqft
  // Add-ons and Standard Service Offerings skip sqft — they just need a tier picked
  const needsDetailsStep = selectedService && !isLaundryService;
  const needsLaundryStep = selectedService && isLaundryService;

  const isStep1Complete = Boolean(selectedServiceId && selectedService);
  const isStep2Complete = (() => {
    if (!isStep1Complete) return false;
    if (needsLaundryStep) return laundryTotal > 0;
    if (needsDetailsStep) {
      if (pricingTiers.length > 0) {
        // Add-ons / Standard Services: just pick a tier, no sqft needed
        if (isAddOnOrStandardService) return Boolean(selectedPricingTier);
        return Boolean(selectedPricingTier) && Boolean(squareFootage);
      }
      // No tiers: still need sqft (unless add-on/standard)
      if (isAddOnOrStandardService) return true;
      return Boolean(squareFootage);
    }
    return true;
  })();
  const isStep3Complete = isStep2Complete && timesForSelectedDate.length > 0;
  const isStep4Complete = isStep3Complete && Boolean(selectedSlot);
  const isStep5Reachable = isStep4Complete;

  // Determine the next step the user should go to
  const advanceToStep = useCallback((step: number) => {
    setActiveStep(step);
    scrollToStep(step);
  }, [scrollToStep]);

  // Auto-advance when service is selected
  const prevServiceId = useRef(selectedServiceId);
  useEffect(() => {
    if (selectedServiceId && selectedServiceId !== prevServiceId.current) {
      prevServiceId.current = selectedServiceId;
      if (activeStep === STEP_SERVICE) {
        advanceToStep(STEP_DETAILS);
      }
    }
  }, [selectedServiceId, activeStep, advanceToStep]);

  const handleSubmit = async (sourceId?: string) => {
    if (!selectedServiceId || !selectedSlot?.startAt || !selectedSlot.appointmentSegments.length) {
      return;
    }
    if (!serviceAddress.trim() || !serviceCity.trim() || !serviceState || !/^\d{5}(-\d{4})?$/.test(serviceZip)) {
      setBookingStatus({ success: false, message: "Please enter a complete service address." });
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
          serviceAddress,
          serviceCity,
          serviceState,
          serviceZip,
          notes: bookingNotes,
          serviceId: selectedServiceId,
          startAt: selectedSlot.startAt,
          teamMemberId: segment.teamMemberId,
          serviceVariationId: segment.serviceVariationId,
          serviceVariationVersion: segment.serviceVariationVersion,
          sourceId,
          totalPrice: selectedPrice ?? undefined,
          frequency,
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

              {/* Review prompt card */}
              <Card className="overflow-hidden border-0 shadow-lg">
                <div className="p-6 text-center" style={{ background: "linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 50%, #1e4030 100%)" }}>
                  <div className="flex justify-center gap-1 mb-3">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className="w-5 h-5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <h3 className="text-xl font-serif font-semibold text-white mb-1">
                    Loved our service?
                  </h3>
                  <p className="text-sm text-white/70 mb-4 leading-relaxed">
                    Leave us a Google review and get <strong className="text-white">5% off</strong> your next booking!
                  </p>

                  {reviewClicked ? (
                    <div className="space-y-3">
                      <p className="text-xs text-white/60">Thank you! Use this code on your next booking:</p>
                      <div className="rounded-xl bg-white/10 border border-white/20 px-4 py-3 flex items-center justify-between gap-3 mx-auto max-w-xs">
                        <span className="text-lg font-mono font-bold tracking-widest text-amber-300">REVIEW5</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText("REVIEW5").then(() => {
                              setReviewCodeCopied(true);
                              setTimeout(() => setReviewCodeCopied(false), 2000);
                            });
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-white/60 hover:text-white transition-colors"
                        >
                          {reviewCodeCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          {reviewCodeCopied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-[11px] text-white/40">Valid for one use on your next service booking.</p>
                    </div>
                  ) : (
                    <a
                      href="https://www.google.com/maps/search/Millan+Luxury+Cleaning+Phoenix+AZ/@33.45,-112.07,15z"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setReviewClicked(true)}
                      className="inline-flex items-center gap-2 h-11 px-8 rounded-xl font-semibold text-sm text-[#1a3a2a] transition-opacity hover:opacity-90"
                      style={{ background: "linear-gradient(90deg, #d4af37, #f0d060)" }}
                    >
                      Leave a Google Review
                    </a>
                  )}
                </div>
              </Card>
            </div>
          ) : (
          <div className="max-w-3xl mx-auto space-y-4">

            {/* ───── STEP 1: Select a Service ───── */}
            <div ref={stepRefs[STEP_SERVICE]} className="scroll-mt-24">
              <Card className={`border-2 transition-all ${activeStep === STEP_SERVICE ? "border-purple-300 shadow-lg shadow-purple-100/50" : isStep1Complete ? "border-emerald-200" : "border-transparent"}`}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => setActiveStep(STEP_SERVICE)}
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {isStep1Complete && activeStep !== STEP_SERVICE ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      ) : (
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">1</span>
                      )}
                      Select a Service
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {isStep1Complete && activeStep !== STEP_SERVICE && (
                        <span className="text-sm text-purple-600 font-medium">{selectedService?.title}</span>
                      )}
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activeStep === STEP_SERVICE ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </button>
                {activeStep === STEP_SERVICE && (
                  <CardContent className="pt-0 space-y-6">
                    {servicesLoading && <p className="text-sm text-muted-foreground">Loading services...</p>}
                    {!servicesLoading && (() => {
                      const isAirbnbTurnover = (title: string) => {
                        const t = title.toLowerCase();
                        return t.includes("weekly") || t.includes("bi-weekly") || t.includes("biweekly") ||
                          t.includes("reset") || t.includes("monthly") || t.includes("one time") || t.includes("one-time") ||
                          t.includes("final");
                      };
                      const isResidential = (title: string) => {
                        const t = title.toLowerCase();
                        return t.includes("deep") || t.includes("move-in") || t.includes("move in") ||
                          t.includes("move-out") || t.includes("move out") || t.includes("basic") ||
                          t.includes("vip") || t.includes("signature");
                      };
                      const airbnbServices = squareServices.filter((s) => isAirbnbTurnover(s.title ?? s.name ?? ""));
                      const residentialServices = squareServices.filter((s) => !isAirbnbTurnover(s.title ?? s.name ?? "") && isResidential(s.title ?? s.name ?? ""));
                      const otherServices = squareServices.filter((s) => !isAirbnbTurnover(s.title ?? s.name ?? "") && !isResidential(s.title ?? s.name ?? ""));
                      const renderServiceButton = (service: typeof squareServices[0]) => (
                        <button
                          key={service.id}
                          onClick={() => {
                            setSelectedServiceId(service.id);
                            setTimeout(() => {
                              setActiveStep(STEP_DETAILS);
                              scrollToStep(STEP_DETAILS);
                            }, 300);
                          }}
                          className={`rounded-xl border-2 px-4 py-4 text-left transition-all ${
                            selectedServiceId === service.id
                              ? "border-purple-500 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg shadow-purple-100"
                              : "border-border hover:border-purple-300 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-lg">{service.title}</p>
                          </div>
                          {service.displayPrice && service.price && (
                            <p className="text-purple-600 font-bold mt-1">Starting at ${Number(service.price).toFixed(2)}</p>
                          )}
                        </button>
                      );
                      return (
                        <>
                          {residentialServices.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 mb-3">🏡 Residential Services</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                {residentialServices.map(renderServiceButton)}
                              </div>
                            </div>
                          )}
                          {airbnbServices.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-purple-600 mb-3">🏠 Airbnb Turnovers</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                {airbnbServices.map(renderServiceButton)}
                              </div>
                            </div>
                          )}
                          {otherServices.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Other Services</p>
                              <div className="grid gap-3 md:grid-cols-2">
                                {otherServices.map(renderServiceButton)}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </CardContent>
                )}
              </Card>
            </div>

            {/* Service Description (shows between step 1 and 2 when service selected) */}
            {selectedService?.description && activeStep >= STEP_DETAILS && (
              <div className="rounded-xl border border-border/70 bg-gradient-to-br from-purple-50/70 to-pink-50/70 px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Service Description</p>
                {curatedDescription && (
                  <p className="mt-2 text-sm text-foreground font-medium">{curatedDescription}</p>
                )}
                {formattedDescription.length > 0 && (
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed">
                    {formattedDescription.map((line, index) => (
                      <li key={`${selectedService.id}-detail-${index}`} className="flex gap-2">
                        <span className="text-primary mt-0.5">&bull;</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ───── STEP 2: Property Details / Laundry ───── */}
            {isStep1Complete && (
              <div ref={stepRefs[STEP_DETAILS]} className="scroll-mt-24">
                <Card className={`border-2 transition-all ${
                  activeStep === STEP_DETAILS ? "border-purple-300 shadow-lg shadow-purple-100/50"
                  : isStep2Complete ? "border-emerald-200"
                  : "border-transparent opacity-60"
                }`}>
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => isStep1Complete && setActiveStep(STEP_DETAILS)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {isStep2Complete && activeStep !== STEP_DETAILS ? (
                          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">2</span>
                        )}
                        {isLaundryService ? (
                          <><span className="text-xl">🧺</span> Laundry Items & Services</>
                        ) : (
                          <><Home className="w-5 h-5 text-purple-500" /> Property Details</>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {isStep2Complete && activeStep !== STEP_DETAILS && (
                          <span className="text-sm text-purple-600 font-medium">
                            {isLaundryService
                              ? `$${laundryTotal.toFixed(2)}`
                              : `${squareFootage}${selectedPricingTier ? ` / ${selectedPricingTier}` : ""}`}
                          </span>
                        )}
                        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activeStep === STEP_DETAILS ? "rotate-180" : ""}`} />
                      </div>
                    </CardHeader>
                  </button>

                  {activeStep === STEP_DETAILS && (
                    <CardContent className="pt-0 space-y-6">
                      {/* Non-laundry: Pricing tiers + sqft */}
                      {!isLaundryService && (
                        <>
                          {pricingTiers.length > 0 && (
                            <>
                              <div>
                                <Label className="text-sm font-semibold mb-3 block">Select Property Size</Label>
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
                              </div>
                              {!isAddOnOrStandardService && (
                              <div className="border-t pt-4">
                                <Label className="text-sm font-medium">Property Square Footage</Label>
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
                                    For properties over 5,000 sq ft, please call for a private estate estimate.
                                  </p>
                                )}
                              </div>
                              )}
                            </>
                          )}

                          {pricingTiers.length === 0 && !isAddOnOrStandardService && (
                            <div>
                              <Label className="text-sm font-medium">Property Square Footage</Label>
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
                                <p className="text-sm text-amber-600 mt-3">
                                  For properties over 5,000 sq ft, please call for a private estate estimate.
                                </p>
                              )}
                            </div>
                          )}

                          {/* Continue button for non-laundry */}
                          {isStep2Complete && (
                            <Button
                              onClick={() => advanceToStep(STEP_DATE)}
                              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                            >
                              Continue to Date Selection
                            </Button>
                          )}
                        </>
                      )}

                      {/* Laundry items */}
                      {isLaundryService && (
                        <>
                          {/* Pick-up & Delivery */}
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
                                <span className="font-medium">Pick-up & Delivery</span>
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

                          {/* By Weight */}
                          <div className="border-t pt-4">
                            <Label className="text-sm font-semibold mb-3 block">Laundry by Weight</Label>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label htmlFor="regular-lbs" className="text-sm text-muted-foreground">
                                  Regular Clothes (${LAUNDRY_RATES.regularPerLb}/lb)
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Input id="regular-lbs" type="number" min="0" step="0.5" placeholder="0" value={regularLaundryLbs} onChange={(e) => setRegularLaundryLbs(e.target.value)} className="max-w-24" />
                                  <span className="text-sm text-muted-foreground">lbs</span>
                                  {parseFloat(regularLaundryLbs) > 0 && (
                                    <span className="text-purple-600 font-medium">= ${(parseFloat(regularLaundryLbs) * LAUNDRY_RATES.regularPerLb).toFixed(2)}</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label htmlFor="delicate-lbs" className="text-sm text-muted-foreground">
                                  Delicate Fabrics (${LAUNDRY_RATES.delicatePerLb}/lb)
                                </Label>
                                <div className="flex items-center gap-2 mt-1">
                                  <Input id="delicate-lbs" type="number" min="0" step="0.5" placeholder="0" value={delicateLaundryLbs} onChange={(e) => setDelicateLaundryLbs(e.target.value)} className="max-w-24" />
                                  <span className="text-sm text-muted-foreground">lbs</span>
                                  {parseFloat(delicateLaundryLbs) > 0 && (
                                    <span className="text-purple-600 font-medium">= ${(parseFloat(delicateLaundryLbs) * LAUNDRY_RATES.delicatePerLb).toFixed(2)}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Bedding Items */}
                          <div className="border-t pt-4">
                            <Label className="text-sm font-semibold mb-3 block">Bedding & Blankets</Label>
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
                                      <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateLaundryQuantity(item.id, qty - 1)} disabled={qty <= 0}>-</Button>
                                      <span className="w-8 text-center font-medium">{qty}</span>
                                      <Button type="button" variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => updateLaundryQuantity(item.id, qty + 1)}>+</Button>
                                    </div>
                                    {qty > 0 && (
                                      <span className="text-purple-600 font-bold min-w-16 text-right">${(item.price * qty).toFixed(2)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Laundry Total + Continue */}
                          {laundryTotal > 0 && (
                            <div className="border-t pt-4 bg-gradient-to-r from-purple-50 to-pink-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="font-semibold">Laundry Total</span>
                                <span className="text-xl font-bold text-purple-600">${laundryTotal.toFixed(2)}</span>
                              </div>
                              <Button
                                onClick={() => advanceToStep(STEP_DATE)}
                                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                              >
                                Continue to Date Selection
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  )}
                </Card>
              </div>
            )}

            {/* ───── STEP 3: Choose a Date ───── */}
            <div ref={stepRefs[STEP_DATE]} className="scroll-mt-24">
              <Card className={`border-2 transition-all ${
                activeStep === STEP_DATE ? "border-purple-300 shadow-lg shadow-purple-100/50"
                : isStep3Complete ? "border-emerald-200"
                : !isStep2Complete ? "border-transparent opacity-40 pointer-events-none"
                : "border-transparent"
              }`}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => isStep2Complete && setActiveStep(STEP_DATE)}
                  disabled={!isStep2Complete}
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {isStep3Complete && activeStep !== STEP_DATE ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      ) : (
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isStep2Complete ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-gray-300"}`}>3</span>
                      )}
                      <Calendar className="w-5 h-5" />
                      Choose a Date
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {timesForSelectedDate.length > 0 && activeStep !== STEP_DATE && (
                        <span className="text-sm text-purple-600 font-medium">{format(selectedDate, "EEE, MMM d")}</span>
                      )}
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activeStep === STEP_DATE ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </button>
                {activeStep === STEP_DATE && isStep2Complete && (
                  <CardContent className="pt-0">
                    {availabilityQuery.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Month navigation */}
                        <div className="flex items-center justify-between px-1">
                          <button
                            onClick={prevMonth}
                            disabled={!isBefore(startOfMonth(today), viewMonth)}
                            className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-purple-600" />
                          </button>
                          <h3 className="font-semibold text-base">{format(viewMonth, "MMMM yyyy")}</h3>
                          <button
                            onClick={nextMonth}
                            disabled={!isBefore(viewMonth, maxMonth)}
                            className="p-2 rounded-lg hover:bg-purple-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-5 h-5 text-purple-600" />
                          </button>
                        </div>

                        <div className="grid grid-cols-7 gap-1">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
                          ))}
                          {/* Empty cells for offset */}
                          {Array.from({ length: calendarDays[0]?.getDay() || 0 }).map((_, i) => (
                            <div key={`empty-${i}`} />
                          ))}
                          {calendarDays.map((day) => {
                            const dateKey = format(day, "yyyy-MM-dd");
                            const hasSlots = availabilitiesByDate.has(dateKey);
                            const isSelected = isSameDay(day, selectedDate);
                            const isToday = isSameDay(day, new Date());
                            const isPast = isBefore(day, today);

                            return (
                              <button
                                key={dateKey}
                                onClick={() => {
                                  if (hasSlots && !isPast) {
                                    setSelectedDate(day);
                                    setTimeout(() => {
                                      setActiveStep(STEP_TIME);
                                      scrollToStep(STEP_TIME);
                                    }, 300);
                                  }
                                }}
                                disabled={!hasSlots || isPast}
                                className={`
                                  relative p-2 rounded-xl text-center transition-all
                                  ${isSelected
                                    ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-200"
                                    : hasSlots && !isPast
                                      ? "hover:bg-purple-50 hover:shadow-md border border-transparent hover:border-purple-200 cursor-pointer"
                                      : "text-muted-foreground/30 cursor-not-allowed"
                                  }
                                  ${isToday && !isSelected ? "ring-2 ring-purple-300" : ""}
                                `}
                              >
                                <div className="text-sm font-semibold">{format(day, "d")}</div>
                                {hasSlots && !isPast && !isSelected && (
                                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {availableDates.length === 0 && !availabilityQuery.isLoading && (
                          <p className="text-center text-muted-foreground py-4">
                            No availability in {format(viewMonth, "MMMM")}. Try the next month.
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            </div>

            {/* ───── STEP 4: Select a Time ───── */}
            <div ref={stepRefs[STEP_TIME]} className="scroll-mt-24">
              <Card className={`border-2 transition-all ${
                activeStep === STEP_TIME ? "border-purple-300 shadow-lg shadow-purple-100/50"
                : isStep4Complete ? "border-emerald-200"
                : !isStep3Complete ? "border-transparent opacity-40 pointer-events-none"
                : "border-transparent"
              }`}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => isStep3Complete && setActiveStep(STEP_TIME)}
                  disabled={!isStep3Complete}
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {isStep4Complete && activeStep !== STEP_TIME ? (
                        <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                      ) : (
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isStep3Complete ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-gray-300"}`}>4</span>
                      )}
                      <Clock className="w-5 h-5" />
                      Select a Time
                      {selectedDate && activeStep === STEP_TIME && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          for {format(selectedDate, "EEEE, MMMM d")}
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {isStep4Complete && activeStep !== STEP_TIME && selectedSlot?.startAt && (
                        <span className="text-sm text-purple-600 font-medium">{format(new Date(selectedSlot.startAt), "h:mm a")}</span>
                      )}
                      <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activeStep === STEP_TIME ? "rotate-180" : ""}`} />
                    </div>
                  </CardHeader>
                </button>
                {activeStep === STEP_TIME && isStep3Complete && (
                  <CardContent className="pt-0 space-y-4">
                    {/* Cleaning Frequency */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Cleaning Frequency</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([
                          { value: "one-time", label: "One-Time", discount: 0 },
                          { value: "weekly", label: "Weekly", discount: 20 },
                          { value: "bi-weekly", label: "Bi-Weekly", discount: 15 },
                          { value: "monthly", label: "Monthly", discount: 10 },
                        ] as const).map((f) => (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setFrequency(f.value)}
                            className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-0.5 ${
                              frequency === f.value
                                ? "border-purple-400 bg-purple-50 text-purple-700"
                                : "border-border bg-background text-muted-foreground hover:border-purple-300"
                            }`}
                          >
                            <span>{f.label}</span>
                            {f.discount > 0 && (
                              <span className={`text-[10px] font-semibold ${frequency === f.value ? "text-purple-500" : "text-emerald-600"}`}>
                                {f.discount}% off*
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">* Discount applies from 2nd visit onward. First visit is full price.</p>
                    </div>

                    {timesForSelectedDate.length === 0 ? (
                      <p className="text-center text-muted-foreground py-6">
                        {availabilityQuery.isLoading ? "Loading times..." : "No times available for this date. Please select another date."}
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
                              onClick={() => {
                                setSelectedSlot(slot);
                                setTimeout(() => {
                                  setActiveStep(STEP_CONTACT);
                                  scrollToStep(STEP_CONTACT);
                                }, 300);
                              }}
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
                )}
              </Card>
            </div>

            {/* ───── Booking Summary (sticky on desktop, inline on mobile) ───── */}
            {isStep4Complete && (
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
                      Call for estate estimate
                    </div>
                  )}
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
                        <span className="font-medium">1st Visit</span>
                        <span className="font-bold text-purple-600">${selectedPrice.toFixed(2)}</span>
                      </div>
                      {recurringPrice != null && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Recurring ({frequencyDiscount}% off)</span>
                          <span className="font-semibold text-emerald-600">${recurringPrice.toFixed(2)}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cancellation Policy */}
            {isStep4Complete && (
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
            )}

            {/* ───── STEP 5: Your Details + Card ───── */}
            <div ref={stepRefs[STEP_CONTACT]} className="scroll-mt-24">
              <Card className={`border-2 transition-all ${
                activeStep === STEP_CONTACT ? "border-purple-300 shadow-lg shadow-purple-100/50"
                : !isStep5Reachable ? "border-transparent opacity-40 pointer-events-none"
                : "border-transparent"
              }`}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => isStep5Reachable && setActiveStep(STEP_CONTACT)}
                  disabled={!isStep5Reachable}
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${isStep5Reachable ? "bg-gradient-to-br from-purple-500 to-pink-500" : "bg-gray-300"}`}>5</span>
                      Your Details & Payment
                    </CardTitle>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${activeStep === STEP_CONTACT ? "rotate-180" : ""}`} />
                  </CardHeader>
                </button>
                {activeStep === STEP_CONTACT && isStep5Reachable && (
                  <CardContent className="pt-0 space-y-4">

                    {/* Booking Summary confirmation */}
                    {selectedService && selectedSlot && (
                      <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-5 space-y-3">
                        <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">Booking Summary</p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Service</span>
                            <span className="font-semibold text-right">{selectedService.title}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Frequency</span>
                            <span className="font-semibold">
                              {frequency === "one-time" ? "One-Time" : frequency === "bi-weekly" ? "Bi-Weekly" : frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                              {frequencyDiscount > 0 && <span className="ml-1 text-emerald-600 text-xs">({frequencyDiscount}% off*)</span>}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date</span>
                            <span className="font-semibold">{format(new Date(selectedSlot.startAt!), "EEEE, MMMM d, yyyy")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time</span>
                            <span className="font-semibold">{format(new Date(selectedSlot.startAt!), "h:mm a")}</span>
                          </div>
                          {selectedPrice && !requiresEstimate && (
                            <>
                              <div className="border-t border-purple-200 pt-2 flex justify-between">
                                <span className="text-muted-foreground">1st Visit Price</span>
                                <span className="font-bold text-purple-700">${selectedPrice.toFixed(2)}</span>
                              </div>
                              {recurringPrice != null && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Recurring Rate</span>
                                  <span className="font-bold text-emerald-600">${recurringPrice.toFixed(2)}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        {recurringPrice != null && (
                          <p className="text-[11px] text-muted-foreground border-t border-purple-200 pt-2">
                            * First visit is full price. Discount applies from the 2nd visit onward.
                          </p>
                        )}
                      </div>
                    )}

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

                    {/* Service Address */}
                    <div className="rounded-lg border border-purple-200/60 bg-purple-50/30 p-4 space-y-3">
                      <p className="text-sm font-semibold text-purple-700">Service Location *</p>
                      <div className="space-y-2">
                        <Label htmlFor="service-address">Street Address</Label>
                        <Input
                          id="service-address"
                          placeholder="123 Main St"
                          value={serviceAddress}
                          onChange={(event) => setServiceAddress(event.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-6 gap-2">
                        <div className="col-span-3 space-y-2">
                          <Label htmlFor="service-city">City</Label>
                          <Input
                            id="service-city"
                            placeholder="Phoenix"
                            value={serviceCity}
                            onChange={(event) => setServiceCity(event.target.value)}
                            required
                          />
                        </div>
                        <div className="col-span-1 space-y-2">
                          <Label htmlFor="service-state">State</Label>
                          <select
                            id="service-state"
                            value={serviceState}
                            onChange={(event) => setServiceState(event.target.value)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"].map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label htmlFor="service-zip">ZIP Code</Label>
                          <Input
                            id="service-zip"
                            placeholder="85001"
                            value={serviceZip}
                            onChange={(event) => setServiceZip(event.target.value)}
                            maxLength={10}
                            required
                          />
                        </div>
                      </div>
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
                          !customerEmail.trim() ||
                          !serviceAddress.trim() ||
                          !serviceCity.trim() ||
                          !serviceState ||
                          !/^\d{5}(-\d{4})?$/.test(serviceZip)
                        }
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        size="lg"
                      >
                        {isSubmitting ? "Booking..." : "Confirm Booking"}
                      </Button>
                    )}
                  </CardContent>
                )}
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
