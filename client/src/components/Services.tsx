import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Home, Truck, Shirt } from "lucide-react";
import type { ServiceItem } from "@shared/types";
import { normalizeArrayData } from "@/lib/arrayUtils";
import { useAssets } from "@/hooks/useAssets";

const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

// Icon mapping for services
const iconMap: Record<string, any> = {
  "Deep Cleaning": Sparkles,
  "Move-In/Move-Out": Truck,
  "Basic Cleaning": Home,
  "Laundry Services": Shirt,
  "Airbnb (Only)": Home,
  "Airbnb Turnovers": Home,
  "Airbnb Turn Over Services": Home,
  "Airbnb turn over services": Home,
};

const signatureServices = [
  {
    emoji: "🫧",
    title: "Deep Cleaning",
    description:
      "A meticulous, top-to-bottom clean designed to reset your home or rental when it needs extra attention.",
  },
  {
    emoji: "🏠",
    title: "Move-In / Move-Out Cleaning",
    description:
      "Perfect for transitions — detailed cleaning that prepares your space for inspection, listing, or move-in.",
  },
  {
    emoji: "🛏",
    title: "Weekly & Bi-Weekly Cleaning (Basic Cleaning)",
    description:
      "Consistent, guest-ready service to maintain a polished, welcoming space between stays.",
  },
  {
    emoji: "✨",
    title: "Airbnb Turnovers",
    description:
      "Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.",
  },
];

const signatureCopyMap: Record<string, string> = {
  "deep cleaning": signatureServices[0].description,
  "move-in/move-out": signatureServices[1].description,
  "move-in / move-out": signatureServices[1].description,
  "move-in / move-out cleaning": signatureServices[1].description,
  "move-in/move-out cleaning": signatureServices[1].description,
  "basic cleaning": signatureServices[2].description,
  "weekly & bi-weekly cleaning": signatureServices[2].description,
  "weekly & biweekly cleaning": signatureServices[2].description,
  "weekly & bi-weekly cleaning (basic cleaning)": signatureServices[2].description,
  "airbnb turnovers": signatureServices[3].description,
  "airbnb (only)": signatureServices[3].description,
  "airbnb turn over services": signatureServices[3].description,
  "airbnb turnover services": signatureServices[3].description,
  "airbnb turn overservices": signatureServices[3].description,
  "airbnb weekly & biweekly cleaning": signatureServices[3].description,
  "reset, monthly & one time cleaning": signatureServices[3].description,
  "final/ move-out cleaning": signatureServices[3].description,
  "final / move-out cleaning": signatureServices[3].description,
  "standard service offerings": signatureServices[3].description,
};

const getCuratedServiceCopy = (name: string) => {
  const normalized = normalizeServiceName(name).toLowerCase();
  return signatureCopyMap[normalized] ?? null;
};


type ServicesProps = {
  limit?: number;
  heading?: string;
  subheading?: string;
  showAllLink?: boolean;
  variant?: "default" | "luxe";
  groupByCategory?: boolean;
};

const resolveServiceTitle = (service: ServiceItem) => service.title || service.name || "Service";

const normalizeServiceName = (name: string) => name.replace(/^[^A-Za-z0-9]+/, "").trim();
const isAirbnbServiceName = (name: string) => {
  const lowerName = name.toLowerCase();
  return (
    lowerName.includes("airbnb") ||
    lowerName.includes("vrbo") ||
    lowerName.includes("vacation rental") ||
    lowerName.includes("turnover") ||
    lowerName.includes("guest")
  );
};
const coreServiceMatchers = [
  {
    key: "deep",
    match: (name: string) => name.includes("deep"),
  },
  {
    key: "basic",
    match: (name: string) => name.includes("basic") || name.includes("weekly"),
  },
  {
    key: "move",
    match: (name: string) =>
      name.includes("move-in") || name.includes("move-out") || name.includes("move out") || name.includes("move-in/out"),
  },
  {
    key: "airbnb",
    match: (name: string) => name.includes("airbnb") || name.includes("turnover"),
  },
];

const pickCoreServices = (services: ServiceItem[]) => {
  const selected: ServiceItem[] = [];
  const used = new Set<number>();

  coreServiceMatchers.forEach(({ match }) => {
    const found = services.find((service) => {
      if (used.has(service.id)) return false;
      const normalized = normalizeServiceName(resolveServiceTitle(service)).toLowerCase();
      return match(normalized);
    });
    if (found) {
      selected.push(found);
      used.add(found.id);
    }
  });

  return selected;
};
const isRentalServiceName = (name: string) => {
  return isAirbnbServiceName(name);
};

const isLaundryAddonServiceName = (name: string) => {
  const lowerName = name.toLowerCase();
  return lowerName.includes("comforter") || lowerName.includes("bed sheet");
};

const getServiceType = (name: string) => {
  const lowerName = name.toLowerCase();
  if (isRentalServiceName(name)) {
    return "Rental";
  }
  if (lowerName.includes("laundry") || lowerName.includes("comforter") || lowerName.includes("bed sheet")) {
    return "Laundry";
  }
  if (lowerName.includes("add-on")) {
    return "Add-on";
  }
  return "Cleaning";
};

const formatPrice = (price?: number | null) => {
  if (price === null || price === undefined) {
    return null;
  }
  return Number(price).toFixed(2);
};

const summarizeDescription = (description?: string | null, maxLength = 120) => {
  if (!description) return "";
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  const snippet = cleaned.slice(0, maxLength);
  const sentenceEnd = snippet.lastIndexOf(".");
  if (sentenceEnd > 60) {
    return cleaned.slice(0, sentenceEnd + 1);
  }
  const commaEnd = snippet.lastIndexOf(",");
  const spaceEnd = snippet.lastIndexOf(" ");
  const cutIndex = Math.max(sentenceEnd, commaEnd, spaceEnd, maxLength);
  return `${cleaned.slice(0, cutIndex).trim()}...`;
};

export function Services({
  limit,
  heading,
  subheading,
  showAllLink = false,
  variant = "default",
  groupByCategory = false,
}: ServicesProps) {
  const { data: services = [], isLoading, error } = useQuery<ServiceItem[]>({
    queryKey: ["/api/services"],
  });
  const { data: assets = {} } = useAssets();
  const isLuxe = variant === "luxe";

  const { items: serviceList, isValid } = normalizeArrayData<ServiceItem>(services);
  const squareServices = serviceList.filter((service) => {
    if (!service.squareServiceId) return false;
    const serviceTitle = normalizeServiceName(resolveServiceTitle(service));
    return !isLaundryAddonServiceName(serviceTitle);
  });
  const coreServices = pickCoreServices(squareServices);
  const limitedServices =
    typeof limit === "number"
      ? coreServices.length > 0
        ? coreServices.slice(0, limit)
        : squareServices.slice(0, limit)
      : squareServices;
  const hasShapeError = !isLoading && !error && !isValid;
  const background = assets?.servicesBackground?.url ?? assets?.heroBackground?.url ?? fallbackBg;
  const titleText = heading ?? "Our Services";
  const subtitleText =
    subheading ??
    "A spotless, refreshed home is the heart of everyday comfort. Millan Luxury Cleaning delivers premium residential care with discretion and precision.";
  const hasAirbnbService = limitedServices.some((service) =>
    isAirbnbServiceName(normalizeServiceName(resolveServiceTitle(service))),
  );
  const showAirbnbOnlyCard =
    !hasAirbnbService && (groupByCategory || typeof limit === "number");
  const airbnbOfferings = [
    { label: "🧼 Reset, Monthly & One Time Cleaning", price: "$25.00+" },
    { label: "🧼 Weekly & Biweekly Cleaning", price: "$25.00+" },
    { label: "🧼 Final/ Move-Out Cleaning", price: "Call Us" },
    { label: "🌟 Standard Service Offerings 🌟", price: "$20.00+" },
  ];
  const renderAirbnbOnlyCard = () => (
    <Card
      className="group hover-elevate transition-all duration-300 overflow-hidden bg-[rgba(5,40,35,0.35)] text-white backdrop-blur-xl border border-emerald-100/20 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
      data-testid="card-service-airbnb-only"
    >
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-white/60 text-foreground ring-1 ring-white/50">
            <Home className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl md:text-2xl font-serif">
              🏠 Airbnb Turn Over Services
            </CardTitle>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">
              Rental Services
            </p>
          </div>
        </div>
        <CardDescription className="text-base text-white/70">
          Fast, detailed resets between guests to ensure your rental is spotless, refreshed, and guest-ready every time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {airbnbOfferings.map((offering) => (
          <div key={offering.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-white">{offering.label}</span>
            <span className="text-white/70">{offering.price}</span>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button asChild variant="default" className="w-full">
          <a href="/book">Book Airbnb Service</a>
        </Button>
      </CardFooter>
    </Card>
  );
  const groupedServices = groupByCategory
    ? ([
        {
          label: "Core Cleaning",
          items: limitedServices.filter((service) => {
            const name = normalizeServiceName(resolveServiceTitle(service));
            const lowerName = name.toLowerCase();
            return !isRentalServiceName(name) && !lowerName.includes("laundry") && !lowerName.includes("add-on");
          }),
        },
        {
          label: "Rental Services",
          items: limitedServices.filter((service) => {
            const name = normalizeServiceName(resolveServiceTitle(service));
            return isRentalServiceName(name);
          }),
        },
        {
          label: "Maintenance",
          items: limitedServices.filter((service) => {
            const name = normalizeServiceName(resolveServiceTitle(service)).toLowerCase();
            return name.includes("laundry") || name.includes("add-on");
          }),
        },
      ] as { label: string | null; items: ServiceItem[] }[]).filter((group) => group.items.length > 0)
    : [{ label: null as string | null, items: limitedServices }];
  const needsRentalGroup =
    showAirbnbOnlyCard && groupByCategory && !groupedServices.some((group) => group.label === "Rental Services");
  let groupsToRender = groupedServices;

  if (needsRentalGroup) {
    const rentalGroup = { label: "Rental Services", items: [] as ServiceItem[] };
    const coreIndex = groupedServices.findIndex((group) => group.label === "Core Cleaning");
    groupsToRender =
      coreIndex === -1
        ? [rentalGroup, ...groupedServices]
        : [
            ...groupedServices.slice(0, coreIndex + 1),
            rentalGroup,
            ...groupedServices.slice(coreIndex + 1),
          ];
  }

  return (
    <section
      id="services"
      className="relative py-20 md:py-32 overflow-hidden"
      style={{
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70" />

      <div className="relative z-10 container mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-5xl font-semibold text-white mb-4">
            {titleText}
          </h2>
          <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
            {subtitleText}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-12 w-12 mb-4" />
                  <Skeleton className="h-8 w-3/4 mb-2" />
                  <Skeleton className="h-16 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-24 w-full" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="text-center py-6">
            <p className="text-white/80 text-sm md:text-base">
              We couldn't load services right now. Please refresh the page.
            </p>
          </div>
        )}

        {/* Services Grid */}
        {!isLoading && !error && (
          <div className="space-y-12">
            {groupsToRender.map((group, groupIndex) => (
              <div key={group.label ?? `group-${groupIndex}`} className="space-y-6">
                {group.label && (
                  <div className="text-center">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/60">{group.label}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                  {group.items.map((service) => {
                    const serviceTitle = resolveServiceTitle(service);
                    const normalizedTitle = normalizeServiceName(serviceTitle);
                    const serviceType = getServiceType(normalizedTitle);
                    const Icon = iconMap[normalizedTitle] || Sparkles;
                    const isFeatured = normalizedTitle === "Deep Cleaning";
                    const isGlassAddOn = !isLuxe || normalizedTitle.toLowerCase().includes("add-on");
                    const bookingLink = `/book?serviceId=${service.id}`;
                    const price = formatPrice(service.price);
                    const curatedCopy = getCuratedServiceCopy(serviceTitle);
                    const summary = curatedCopy ?? summarizeDescription(service.description, isLuxe ? 90 : 120);

                    return (
                      <Card
                        key={service.id}
                        className={`group hover-elevate transition-all duration-300 overflow-hidden ${
                          isFeatured ? "border-2 border-primary shadow-xl" : ""
                        } ${
                          isLuxe
                            ? "bg-black/25 backdrop-blur-2xl border border-white/20 shadow-[0_40px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10"
                            : ""
                        } ${
                          isGlassAddOn
                            ? "bg-[rgba(5,40,35,0.35)] text-white backdrop-blur-xl border border-emerald-100/20 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
                            : ""
                        }`}
                        data-testid={`card-service-${service.id}`}
                      >
                        {/* Service Image */}
                        {service.imageUrl && (
                          <div className="relative w-full h-48 overflow-hidden">
                            <img
                              src={service.imageUrl}
                              alt={serviceTitle}
                              className={`w-full h-full object-cover transition-transform duration-500 ${isLuxe ? "group-hover:scale-105" : ""}`}
                            />
                            {isLuxe && <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />}
                            {isFeatured && !isLuxe && (
                              <span className="absolute top-3 right-3 text-xs font-semibold text-white bg-primary px-3 py-1 rounded-full shadow-lg">
                                MOST POPULAR
                              </span>
                            )}
                          </div>
                        )}

                        <CardHeader className={isLuxe ? "space-y-4 pb-5 text-white" : "space-y-3 pb-4"}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`p-3 rounded-lg ${
                                  isFeatured ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                                } ${isLuxe ? "bg-white/15 text-white rounded-full ring-1 ring-white/20" : ""}`}
                              >
                                <Icon className="w-6 h-6" />
                              </div>
                              <div className="space-y-1">
                                <CardTitle
                                  className={`text-xl md:text-2xl font-serif ${isLuxe || isGlassAddOn ? "text-white" : ""}`}
                                >
                                  {serviceTitle}
                                </CardTitle>
                                {isLuxe && (
                                  <p className="text-[0.7rem] uppercase tracking-[0.3em] text-white/60">
                                    {serviceType}
                                  </p>
                                )}
                              </div>
                            </div>
                            {!isLuxe && (
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{serviceType}</Badge>
                                {price && service.displayPrice && (
                                  <Badge className="bg-primary text-primary-foreground">${price}</Badge>
                                )}
                              </div>
                            )}
                          </div>
                        {!isLuxe && (
                          <CardDescription
                            className={`text-base ${isGlassAddOn ? "text-white/70" : "text-muted-foreground"}`}
                          >
                            {summary}
                          </CardDescription>
                        )}
                          {isLuxe && isFeatured && (
                            <Badge className="w-fit border border-white/40 bg-white/15 text-white">
                              SIGNATURE
                            </Badge>
                          )}
                        </CardHeader>

                        {!isLuxe && (
                          <CardContent>
                            {Array.isArray(service.features) && service.features.length > 0 ? (
                              <ul className="space-y-2">
                                {service.features.map((feature, idx) => (
                                <li
                                  key={idx}
                                  className={`flex items-start gap-2 text-sm ${
                                    isGlassAddOn ? "text-white/70" : "text-muted-foreground"
                                  }`}
                                >
                                  <span className="text-primary mt-0.5">*</span>
                                  <span>{feature}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={`text-sm ${isGlassAddOn ? "text-white/70" : "text-muted-foreground"}`}>
                              {serviceType} service with flexible scheduling and premium care.
                            </p>
                          )}
                        </CardContent>
                        )}

                        {isLuxe && summary && (
                          <CardContent className="pt-0">
                            <p className="text-sm text-white/70 leading-relaxed line-clamp-2">{summary}</p>
                          </CardContent>
                        )}

                        <CardFooter className={isLuxe ? "pt-2" : ""}>
                          <Button
                            asChild
                            variant={isLuxe || isFeatured ? "default" : "outline"}
                            className={`w-full ${isLuxe ? "tracking-wide shadow-lg shadow-black/30" : ""}`}
                            data-testid={`button-book-${service.id}`}
                          >
                            <a href={bookingLink}>{isLuxe ? "Reserve This Service" : "Book This Service"}</a>
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                  {showAirbnbOnlyCard &&
                    (groupByCategory ? group.label === "Rental Services" : group.label === null) &&
                    renderAirbnbOnlyCard()}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && limitedServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">No services available yet.</p>
          </div>
        )}

        {/* Shape error state */}
        {hasShapeError && (
          <div className="text-center py-12">
            <p className="text-white/70 text-lg">
              We encountered unexpected data while loading services. Please refresh the page.
            </p>
          </div>
        )}

        {showAllLink && !isLoading && !error && limitedServices.length > 0 && (
          <div className="mt-12 text-center">
            <Button asChild variant="outline" className="border-white/50 text-white hover:text-white">
              <a href="/services">View all services</a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
