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
        <Services
          heading="All Services"
          subheading="Every service is tailored to your space, schedule, and standards."
          groupByCategory
        />
      </main>
      <Footer />
    </div>
  );
}
