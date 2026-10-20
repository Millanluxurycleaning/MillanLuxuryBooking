import { useEffect } from "react";
import { Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAssets } from "@/hooks/useAssets";
import { Sparkles, Home, Truck, KeyRound, MapPin, Phone } from "lucide-react";
import NotFound from "@/pages/not-found";
import { BASE_URL } from "@shared/seoPages";
import {
  cityPageBySlug,
  cityPagePath,
  cityPageTitle,
  cityPageDescription,
  cityKeywords,
} from "@shared/cityPages";

const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

export default function CityPage({ params }: { params: { city: string } }) {
  const { data: assets = {} } = useAssets();
  // Opening a city (from the homepage or a nearby-city link) should start at the top of the page
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.city]);
  const c = cityPageBySlug[params.city];
  if (!c) return <NotFound />;

  const background = assets?.servicesBackground?.url ?? assets?.heroBackground?.url ?? fallbackBg;
  const path = cityPagePath(c.slug);
  const keywords = cityKeywords(c);

  const services = [
    {
      icon: Sparkles,
      title: `Deep Cleaning in ${c.city}`,
      text: "A detailed, top-to-bottom clean for apartments and houses. Every new client starts here.",
      href: "/book?choose=deep-cleaning",
      cta: "Book Deep Cleaning",
    },
    {
      icon: Home,
      title: `Recurring House Cleaning in ${c.city}`,
      text: "Weekly, bi-weekly, or monthly maid service, with a recurring discount after your first deep cleaning.",
      href: "/home-cleaning",
      cta: "See Home Cleaning Plans",
    },
    {
      icon: Truck,
      title: `Move-In / Move-Out Cleaning in ${c.city}`,
      text: "Inside cabinets, drawers, and appliances, for tenants, landlords, buyers, and sellers.",
      href: "/first-time-cleaning",
      cta: "Book Move-In / Move-Out",
    },
    {
      icon: KeyRound,
      title: `Airbnb & Vacation Rental Cleaning in ${c.city}`,
      text: "Consistent, guest-ready turnovers that protect your reviews, with laundry available.",
      href: "/services",
      cta: "See Airbnb Services",
    },
  ];

  const faqs = [
    {
      q: `Do you offer house cleaning near me in ${c.city}?`,
      a: `Yes. Millan Luxury Cleaning serves all of ${c.city}, AZ, including ${c.neighborhoods.slice(0, 4).join(", ")}, and nearby communities. You can book online in minutes or call (602) 596-7393.`,
    },
    {
      q: `How much does house cleaning cost in ${c.city}?`,
      a: "Pricing is based on the size of your home, not by the hour. Deep cleaning starts at $210 for an apartment and $380 for a house, and the final price can vary with your home's size and condition. You'll see the price for your home's size when you book.",
    },
    {
      q: "Do you offer recurring cleaning discounts?",
      a: "Yes. Recurring plans start with a deep cleaning at full price, then your weekly, bi-weekly, or monthly cleanings after that receive a recurring discount.",
    },
    {
      q: `Do you clean apartments and condos in ${c.city}?`,
      a: "Yes. We clean apartments, condos, townhomes, and houses, including move-in and move-out cleanings for renters and landlords.",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "LocalBusiness",
        "@id": `${BASE_URL}/#business`,
        name: "Millan Luxury Cleaning",
        url: BASE_URL,
        telephone: "+1-602-596-7393",
        priceRange: "$$$",
        areaServed: [
          { "@type": "City", name: `${c.city}, AZ` },
          ...c.neighborhoods.map((n) => ({ "@type": "Place", name: `${n}, ${c.city}, AZ` })),
        ],
      },
      {
        "@type": "Service",
        serviceType: "House Cleaning",
        name: `House Cleaning in ${c.city}, AZ`,
        provider: { "@id": `${BASE_URL}/#business` },
        areaServed: { "@type": "City", name: `${c.city}, AZ` },
        url: `${BASE_URL}${path}`,
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  const glass = "rounded-2xl bg-black/25 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.35)]";

  return (
    <div className="min-h-screen">
      <PageSEO
        title={cityPageTitle(c.city)}
        description={cityPageDescription(c)}
        path={path}
        schema={schema}
        keywords={keywords.map((k) => k.label)}
      />
      <Navigation />
      <main
        className="relative text-white"
        style={{ backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
      >
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="relative z-10 container mx-auto max-w-5xl px-6 md:px-8 pt-32 pb-20 space-y-14">
          {/* Heading */}
          <header className="text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60 flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> {c.city}, Arizona
            </p>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold">Luxury House Cleaning in {c.city}, AZ</h1>
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">{c.tagline}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button asChild size="lg" className="tracking-wide">
                <a href="/book">Book Your Cleaning</a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:text-white">
                <a href="tel:+16025967393">
                  <Phone className="w-4 h-4 mr-2" /> (602) 596-7393
                </a>
              </Button>
            </div>
          </header>

          {/* Intro */}
          <section className={`${glass} p-6 md:p-8 space-y-4 text-white/85 text-base md:text-lg leading-relaxed`}>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-white">Your {c.city} Cleaning Service</h2>
            <p>{c.intro}</p>
            <p>{c.localNote}</p>
          </section>

          {/* Services */}
          <section className="space-y-6">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center">Cleaning Services in {c.city}</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {services.map((s) => (
                <div key={s.title} className={`${glass} p-6 flex flex-col gap-4`}>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-white/15 ring-1 ring-white/20">
                      <s.icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold">{s.title}</h3>
                  </div>
                  <p className="text-white/75 flex-1">{s.text}</p>
                  <Button asChild className="w-full">
                    <a href={s.href}>{s.cta}</a>
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Popular searches */}
          <section className={`${glass} p-6 md:p-8 space-y-4`}>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold">Cleaning Services We Offer in {c.city}</h2>
            <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
              {keywords.map((k) => (
                <li key={k.label}>
                  <a href={k.href} className="flex items-center gap-2 text-white/85 hover:text-primary transition-colors">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {k.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Neighborhoods */}
          <section className={`${glass} p-6 md:p-8 space-y-4`}>
            <h2 className="font-serif text-2xl md:text-3xl font-semibold">{c.city} Neighborhoods We Serve</h2>
            <ul className="flex flex-wrap gap-2">
              {c.neighborhoods.map((n) => (
                <li key={n} className="rounded-full border border-white/25 px-4 py-1.5 text-sm text-white/85">
                  {n}
                </li>
              ))}
            </ul>
            <p className="text-white/70 text-sm">Don't see your neighborhood? We serve all of {c.city} and the surrounding area. Just ask.</p>
          </section>

          {/* FAQ */}
          <section className="space-y-4">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center">{c.city} House Cleaning FAQ</h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q} className={`${glass} px-5 border-none`}>
                  <AccordionTrigger className="font-sans font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-white/80 text-base">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Nearby cities */}
          <section className="text-center space-y-3">
            <p className="text-white/70">We also clean homes in nearby cities:</p>
            <div className="flex flex-wrap justify-center gap-3">
              {c.nearby.map((slug) => {
                const n = cityPageBySlug[slug];
                return n ? (
                  <Link key={slug} href={cityPagePath(slug)} className="text-primary underline underline-offset-4 hover:opacity-80">
                    House cleaning in {n.city}
                  </Link>
                ) : null;
              })}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
