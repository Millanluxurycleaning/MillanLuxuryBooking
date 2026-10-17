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
import { seoPages } from "@shared/seoPages";

export default function Home() {
  return (
    <div className="min-h-screen">
      <PageSEO title={seoPages.home.title} description={seoPages.home.description} path={seoPages.home.path} />
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
