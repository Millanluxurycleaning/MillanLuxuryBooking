import { Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <PageSEO
        title="Page Not Found"
        description="The page you were looking for doesn't exist. Explore our cleaning services or book online."
        noindex
      />
      <Navigation />
      <main className="flex-1 flex items-center justify-center px-6 pt-32 pb-20">
        <div className="max-w-xl text-center space-y-6">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">404</p>
          <h1 className="text-4xl font-serif font-semibold">We couldn't find that page</h1>
          <p className="text-muted-foreground">
            The page may have moved. Here are some places to start, or call us at{" "}
            <a href="tel:6025967393" className="text-primary hover:underline">
              (602) 596-7393
            </a>
            .
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/book">Book a Cleaning</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/services">View Services</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
