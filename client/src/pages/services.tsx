import { Navigation } from "@/components/Navigation";
import { Services } from "@/components/Services";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/PageSEO";

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
      <PageSEO
        title="Cleaning Services — Deep Clean, Move-In/Out, Recurring & More"
        description="Browse all Millan Luxury Cleaning services: deep cleaning, move-in/move-out, recurring weekly and bi-weekly cleaning, and specialty packages. Serving Phoenix metro and surrounding areas."
        path="/services"
      />
      <Navigation />
      <main>
        <div className="container mx-auto px-6 md:px-8 pt-28 pb-2 text-center">
          <h1 className="font-serif text-3xl md:text-5xl font-semibold mb-3">
            Professional Cleaning Services in Phoenix, AZ
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every service is tailored to your space, schedule, and standards.
          </p>
        </div>
        <Services
          groupByCategory
        />
      </main>
      <Footer />
    </div>
  );
}
