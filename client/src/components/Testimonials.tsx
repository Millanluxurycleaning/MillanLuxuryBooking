import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ExternalLink } from "lucide-react";
import type { Testimonial } from "@shared/types";
import { normalizeArrayData } from "@/lib/arrayUtils";

export function Testimonials() {
  const { data: testimonials = [], isLoading } = useQuery<Testimonial[]>({
    queryKey: ["/api/testimonials"]
  });

  const { items: testimonialList, isValid } = normalizeArrayData<Testimonial>(testimonials);
  const hasShapeError = !isLoading && !isValid;
  const sourceLabels: Record<string, string> = {
    google: "View on Google",
    thumbtack: "View on Thumbtack",
    yelp: "View on Yelp",
  };
  const liveTestimonials = testimonialList.filter(
    (testimonial) => testimonial.source === "google" || testimonial.source === "yelp",
  );
  const displayTestimonials = liveTestimonials;
  const googleLink = liveTestimonials.find((testimonial) => testimonial.source === "google" && testimonial.sourceUrl)?.sourceUrl;
  const yelpLink = liveTestimonials.find((testimonial) => testimonial.source === "yelp" && testimonial.sourceUrl)?.sourceUrl;

  return (
    <section id="testimonials" className="py-20 md:py-32 bg-card">
      <div className="container mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-5xl font-semibold mb-4">
            What Clients Say
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Trusted by homeowners across Phoenix, AZ
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <Skeleton className="h-4 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Testimonials Grid */}
        {!isLoading && !hasShapeError && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {displayTestimonials.map((testimonial) => (
              <Card
                key={testimonial.id}
                className="hover-elevate transition-all duration-300"
                data-testid={`card-testimonial-${testimonial.id}`}
              >
                <CardContent className="pt-6">
                  {/* Star Rating */}
                  <div className="flex gap-1 mb-4">
                    {typeof testimonial.rating === 'number' && testimonial.rating > 0 && [...Array(Math.min(testimonial.rating, 5))].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-primary text-primary" />
                    ))}
                    {(!testimonial.rating || typeof testimonial.rating !== 'number') && (
                      <div className="text-sm text-muted-foreground">Rating unavailable</div>
                    )}
                  </div>

                  {/* Review Text */}
                  <p className="text-base italic text-foreground mb-4 leading-relaxed">
                    "{testimonial.review}"
                  </p>

                  {(testimonial.source === "google" || testimonial.source === "thumbtack" || testimonial.source === "yelp") &&
                    testimonial.sourceUrl && (
                    <div className="mb-4">
                      <a
                        href={testimonial.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                      >
                        {sourceLabels[testimonial.source]}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  {/* Reviewer Name */}
                  <p className="font-semibold text-sm text-muted-foreground">
                    – {testimonial.name}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayTestimonials.length === 0 && !hasShapeError && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Reviews are updating. Please check back soon.
            </p>
          </div>
        )}

        {hasShapeError && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              We ran into unexpected data while loading testimonials. Please refresh and try again.
            </p>
          </div>
        )}

        {(googleLink || yelpLink) && (
          <div className="text-center mt-12">
            <Button 
              asChild
              variant="outline"
              size="lg"
              data-testid="button-read-more-reviews"
            >
              <a 
                href={googleLink || yelpLink || "#"}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                {googleLink ? "Read More on Google" : "Read More on Yelp"}
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
