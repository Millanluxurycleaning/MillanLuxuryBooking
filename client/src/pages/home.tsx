import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Services } from "@/components/Services";
import { Gallery } from "@/components/Gallery";
import { ServiceAreas } from "@/components/ServiceAreas";
import { Testimonials } from "@/components/Testimonials";
import { FAQ } from "@/components/FAQ";
import { Contact } from "@/components/Contact";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/PageSEO";

export default function Home() {
  return (
    <div className="min-h-screen">
      <PageSEO
        title="Premium Cleaning Services in Phoenix, Surprise, Scottsdale & the East Valley"
        description="Millan Luxury Cleaning offers high-end residential cleaning in Phoenix, Surprise, Chandler, Glendale, Mesa, Scottsdale, and Tempe AZ. Deep cleaning, move-in/move-out, and recurring service."
        path="/"
      />
      <Navigation />
      <main>
        <Hero />
        <About />
        <Services limit={4} showAllLink variant="luxe" />
        <Gallery />
        <ServiceAreas />
        <Testimonials />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
