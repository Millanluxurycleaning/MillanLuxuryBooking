import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, ExternalLink } from "lucide-react";
import type { Testimonial } from "@shared/types";
import { normalizeArrayData } from "@/lib/arrayUtils";

const fallbackTestimonials: Testimonial[] = [
  {
    id: 1001,
    author: "Erika Santos",
    name: "Erika Santos",
    rating: 5,
    content:
      "Super fast at responding and was so accommodating to my busy schedule. This business was professional, detail oriented, and very kind! Absolutely loved coming home to a clean home by Millan Luxury Cleaning! Could not recommend enough!!!",
    review:
      "Super fast at responding and was so accommodating to my busy schedule. This business was professional, detail oriented, and very kind! Absolutely loved coming home to a clean home by Millan Luxury Cleaning! Could not recommend enough!!!",
    source: "google",
    createdAt: new Date(),
  },
  {
    id: 1002,
    author: "Broderick",
    name: "Broderick",
    rating: 5,
    content:
      "Amazing customer service! We worked with me to get my house cleaned before the holidays, squeezed me into his schedule and its spotless! I could eat of the floors! No more picky dust making me sneeze, dog hair is completely gone.",
    review:
      "Amazing customer service! We worked with me to get my house cleaned before the holidays, squeezed me into his schedule and its spotless! I could eat of the floors! No more picky dust making me sneeze, dog hair is completely gone.",
    source: "google",
    createdAt: new Date(),
  },
  {
    id: 1003,
    author: "Ami Mohrman",
    name: "Ami Mohrman",
    rating: 5,
    content:
      "Incredible service and communication from the time I found them through getting our laundry done. I googled someone to do our laundry as we are traveling with a newborn and they have been so helpful! Highly recommend",
    review:
      "Incredible service and communication from the time I found them through getting our laundry done. I googled someone to do our laundry as we are traveling with a newborn and they have been so helpful! Highly recommend",
    source: "google",
    createdAt: new Date(),
  },
  {
    id: 1004,
    author: "Stephanie Alvarez",
    name: "Stephanie Alvarez",
    rating: 5,
    content:
      "A professional young man who is detail oriented and aims to make his clients happy. Very fair pricing and punctual. He is well worth the price! Highly recommend.",
    review:
      "A professional young man who is detail oriented and aims to make his clients happy. Very fair pricing and punctual. He is well worth the price! Highly recommend.",
    source: "google",
    createdAt: new Date(),
  },
  {
    id: 1005,
    author: "Noah",
    name: "Noah",
    rating: 5,
    content:
      "Wow what amazing cleaning! Communication was great and prices are outstanding. Couldn't recommend them enough!!",
    review:
      "Wow what amazing cleaning! Communication was great and prices are outstanding. Couldn't recommend them enough!!",
    source: "google",
    createdAt: new Date(),
  },
  {
    id: 1006,
    author: "Michael Hupe",
    name: "Michael Hupe",
    rating: 5,
    content:
      "One of the best house cleaners I've ever had the cleanest my house has ever been super professional and polite.",
    review:
      "One of the best house cleaners I've ever had the cleanest my house has ever been super professional and polite.",
    source: "google",
    createdAt: new Date(),
  },
  {
    id: 1007,
    author: "Jr Arredondo",
    name: "Jr Arredondo",
    rating: 5,
    content:
      "Amazing service! They have helped me so much by getting my house in order for this holiday season!",
    review:
      "Amazing service! They have helped me so much by getting my house in order for this holiday season!",
    source: "google",
    createdAt: new Date(),
  },
  {
    id: 1008,
    author: "Michael Leonte",
    name: "Michael Leonte",
    rating: 5,
    content:
      "Cleaned amazing my home feels brand new! Thank you! Will definitely use again.",
    review:
      "Cleaned amazing my home feels brand new! Thank you! Will definitely use again.",
    source: "google",
    createdAt: new Date(),
  },
  {
    id: 1009,
    author: "Riley Updike",
    name: "Riley Updike",
    rating: 5,
    content: "Had a great experience! Cleaned my apartment super well!",
    review: "Had a great experience! Cleaned my apartment super well!",
    source: "google",
    createdAt: new Date(),
  },
];

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
  const displayTestimonials = liveTestimonials.length > 0 ? liveTestimonials : fallbackTestimonials;
  const [pageIndex, setPageIndex] = useState(0);
  const itemsPerPage = 3;
  const totalPages = Math.max(1, Math.ceil(displayTestimonials.length / itemsPerPage));
  const pageStart = pageIndex * itemsPerPage;
  const pageItems = displayTestimonials.slice(pageStart, pageStart + itemsPerPage);
  const googleLink = liveTestimonials.find((testimonial) => testimonial.source === "google" && testimonial.sourceUrl)?.sourceUrl;
  const yelpLink = liveTestimonials.find((testimonial) => testimonial.source === "yelp" && testimonial.sourceUrl)?.sourceUrl;
  const fallbackGoogleLink = "https://www.google.com/maps/search/?api=1&query=Millan%20Luxury%20Cleaning%20Phoenix%20AZ";

  useEffect(() => {
    if (pageIndex > totalPages - 1) {
      setPageIndex(0);
    }
  }, [pageIndex, totalPages]);

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

        {/* Testimonials Carousel */}
        {!isLoading && !hasShapeError && (
          <div className="space-y-8 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pageItems.map((testimonial) => {
                const reviewText = testimonial.review || testimonial.content || "";
                const reviewerName = testimonial.name || testimonial.author || "Client";

                return (
                  <Card
                    key={testimonial.id}
                    className="hover-elevate transition-all duration-300 bg-[rgba(5,40,35,0.35)] text-white backdrop-blur-xl border border-emerald-100/20 shadow-[0_24px_70px_rgba(0,0,0,0.35)]"
                    data-testid={`card-testimonial-${testimonial.id}`}
                  >
                    <CardContent className="pt-6">
                      {/* Star Rating */}
                      <div className="flex gap-1 mb-4">
                        {typeof testimonial.rating === "number" && testimonial.rating > 0
                          ? [...Array(Math.min(testimonial.rating, 5))].map((_, i) => (
                              <Star key={i} className="w-5 h-5 fill-amber-300 text-amber-300" />
                            ))
                          : (
                            <div className="text-sm text-white/70">Rating unavailable</div>
                          )}
                      </div>

                      {/* Review Text */}
                      <p className="text-base italic text-white/80 mb-4 leading-relaxed">
                        "{reviewText}"
                      </p>

                      {(testimonial.source === "google" ||
                        testimonial.source === "thumbtack" ||
                        testimonial.source === "yelp") &&
                        testimonial.sourceUrl && (
                          <div className="mb-4">
                            <a
                              href={testimonial.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-100 hover:underline"
                            >
                              {sourceLabels[testimonial.source]}
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        )}

                      {/* Reviewer Name */}
                      <p className="font-semibold text-sm text-white/70">
                      - {reviewerName}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {displayTestimonials.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPageIndex((prev) => (prev - 1 + totalPages) % totalPages)}
                  data-testid="button-testimonials-prev"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  {pageIndex + 1} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPageIndex((prev) => (prev + 1) % totalPages)}
                  data-testid="button-testimonials-next"
                >
                  Next
                </Button>
              </div>
            )}
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

        {(googleLink || yelpLink || displayTestimonials.length > 0) && (
          <div className="text-center mt-12">
            <Button 
              asChild
              variant="outline"
              size="lg"
              data-testid="button-read-more-reviews"
            >
              <a 
                href={googleLink || yelpLink || fallbackGoogleLink}
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                {googleLink || (!googleLink && !yelpLink) ? "Read More on Google" : "Read More on Yelp"}
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
