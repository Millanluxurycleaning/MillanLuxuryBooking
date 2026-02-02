import { Navigation } from "@/components/Navigation";
import { Services } from "@/components/Services";
import { Footer } from "@/components/Footer";

export default function ServicesPage() {
  return (
    <div className="min-h-screen">
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
