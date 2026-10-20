import { serviceAreas, additionalServiceAreas } from "@shared/locations";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { Link } from "wouter";
import { cityPages, cityPagePath } from "@shared/cityPages";

export function ServiceAreas() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold mb-3 text-black dark:text-white">
            Serving the Phoenix Valley
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Premium luxury cleaning services across Arizona's most desirable communities
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {serviceAreas.map((area) => {
            const page = cityPages.find((c) => c.city === area.city);
            const card = (
            <Card key={area.city} className="hover-elevate h-full" data-testid={`card-location-${area.city.toLowerCase()}`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-serif font-semibold text-black dark:text-white">
                      {area.city}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {page ? `House cleaning in ${area.city} →` : area.state}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
            return page ? (
              <Link key={area.city} href={cityPagePath(page.slug)} className="block">
                {card}
              </Link>
            ) : (
              card
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Also serving: {additionalServiceAreas.join(", ")}, and surrounding communities
          </p>
        </div>
      </div>
    </section>
  );
}
