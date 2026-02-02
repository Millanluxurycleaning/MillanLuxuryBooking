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
};


type ServicesProps = {
  limit?: number;
  heading?: string;
  subheading?: string;
  showAllLink?: boolean;
  variant?: "default" | "luxe";
};

const resolveServiceTitle = (service: ServiceItem) => service.title || service.name || "Service";

const normalizeServiceName = (name: string) => name.replace(/^[^A-Za-z0-9]+/, "").trim();

const isLaundryAddonServiceName = (name: string) => {
  const lowerName = name.toLowerCase();
  return lowerName.includes("comforter") || lowerName.includes("bed sheet");
};

const getServiceType = (name: string) => {
  const lowerName = name.toLowerCase();
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
  const limitedServices = typeof limit === "number" ? squareServices.slice(0, limit) : squareServices;
  const hasShapeError = !isLoading && !error && !isValid;
  const background = assets?.servicesBackground?.url ?? assets?.heroBackground?.url ?? fallbackBg;
  const titleText = heading ?? "Our Services";
  const subtitleText =
    subheading ??
    "A spotless, refreshed home is the heart of everyday comfort that's precisely what Millan Luxury Cleaning delivers through our premium residential cleaning solutions.";

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {limitedServices.map((service) => {
              const serviceTitle = resolveServiceTitle(service);
              const normalizedTitle = normalizeServiceName(serviceTitle);
              const serviceType = getServiceType(normalizedTitle);
              const Icon = iconMap[normalizedTitle] || Sparkles;
              const isFeatured = normalizedTitle === "Deep Cleaning";
              const bookingLink = `/book?serviceId=${service.id}`;
              const price = formatPrice(service.price);
              const summary = summarizeDescription(service.description, isLuxe ? 90 : 120);

              return (
                <Card
                  key={service.id}
                  className={`group hover-elevate transition-all duration-300 overflow-hidden ${
                    isFeatured ? "border-2 border-primary shadow-xl" : ""
                  } ${isLuxe ? "bg-black/25 backdrop-blur-2xl border border-white/20 shadow-[0_40px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10" : ""}`}
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
                          <CardTitle className={`text-xl md:text-2xl font-serif ${isLuxe ? "text-white" : ""}`}>
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
                      <CardDescription className="text-base text-muted-foreground">{summary}</CardDescription>
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
                            <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <span className="text-primary mt-0.5">*</span>
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">
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
