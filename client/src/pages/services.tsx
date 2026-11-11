import { Navigation } from "@/components/Navigation";
import { Services } from "@/components/Services";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/PageSEO";
import { seoPages } from "@shared/seoPages";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Crown } from "lucide-react";

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      <PageSEO title={seoPages.services.title} description={seoPages.services.description} path={seoPages.services.path} />
      <Navigation />
      <main>
        <div className="container mx-auto px-6 md:px-8 pt-28 pb-2 text-center">
          <h1 className="font-serif text-3xl md:text-5xl font-semibold mb-3">
            Professional Cleaning Services in Phoenix, AZ
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every service is tailored to your space, schedule, and standards.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Button asChild size="lg">
              <a href="/service-checklist">
                <ClipboardCheck className="w-4 h-4 mr-2" /> View Service Checklist
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="/memberships">
                <Crown className="w-4 h-4 mr-2" /> See Memberships
              </a>
            </Button>
          </div>
        </div>
        <Services
          groupByCategory
        />
      </main>
      <Footer />
    </div>
  );
}
