import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { useAssets } from "@/hooks/useAssets";
import { Crown, PawPrint, KeyRound, Sun, Phone, ExternalLink, ClipboardCheck } from "lucide-react";
import { seoPages } from "@shared/seoPages";

const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

// Each "Sign Up" button opens the plan's Square checkout link (set up in Square)
const plans = [
  {
    icon: Crown,
    name: "Cleaning Membership",
    price: "From $159",
    per: "/month",
    detail: "1, 2, or 4 cleanings per month",
    description:
      "Your home kept polished all month long on a schedule that fits your life, with the same detailed Millan standard on every visit.",
    href: "https://square.link/u/r7f1RtO1",
    featured: true,
  },
  {
    icon: PawPrint,
    name: "Pet Owner Add-on",
    price: "+$15–$60",
    per: "/month",
    detail: "Add to your cleaning membership",
    description:
      "Extra attention for homes with furry family members, so pet hair and everyday mess never get ahead of you.",
    href: "https://square.link/u/HgaOGtPY",
    featured: false,
  },
  {
    icon: KeyRound,
    name: "Airbnb / Short-Term Rental Plan",
    price: "From $432",
    per: "/month",
    detail: "4 or 8 turnovers per month",
    description:
      "Consistent, guest-ready turnovers for your rental, so every arrival walks into a spotless space and your reviews stay strong.",
    href: "https://square.link/u/GuLnXGKa",
    featured: false,
  },
  {
    icon: Sun,
    name: "Snowbird Home Care",
    price: "From $129",
    per: "/month",
    detail: "Monthly cleaning and home check while you're away",
    description:
      "Peace of mind while you're out of town: we keep your Valley home clean, check on it each month, and have it ready for your return.",
    href: "https://square.link/u/5DzXk6AY",
    featured: false,
  },
];

export default function MembershipsPage() {
  const { data: assets = {} } = useAssets();
  const background = assets?.servicesBackground?.url ?? assets?.heroBackground?.url ?? fallbackBg;
  const glass =
    "rounded-2xl bg-black/25 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.35)]";

  return (
    <div className="min-h-screen">
      <PageSEO
        title={seoPages.memberships.title}
        description={seoPages.memberships.description}
        path={seoPages.memberships.path}
      />
      <Navigation />
      <main
        className="relative text-white"
        style={{ backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
      >
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="relative z-10 container mx-auto max-w-6xl px-6 md:px-8 pt-32 pb-20 space-y-12">
          <header className="text-center space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Millan Memberships</p>
            <h1 className="font-serif text-4xl md:text-5xl font-semibold">Monthly Cleaning Memberships</h1>
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
              Simple monthly plans for a home that always feels cared for. Choose your plan and sign up in minutes.
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`${glass} p-6 md:p-8 flex flex-col gap-4 ${p.featured ? "border-primary/70 ring-primary/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-white/15 ring-1 ring-white/20">
                      <p.icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-serif text-xl md:text-2xl font-semibold">{p.name}</h2>
                  </div>
                  {p.featured && (
                    <span className="shrink-0 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                      Most Popular
                    </span>
                  )}
                </div>
                <p>
                  <span className="text-3xl font-semibold text-primary">{p.price}</span>
                  <span className="text-white/70">{p.per}</span>
                </p>
                <p className="text-sm uppercase tracking-wide text-white/60">{p.detail}</p>
                <p className="text-white/80 flex-1">{p.description}</p>
                <Button asChild size="lg" className="w-full tracking-wide">
                  <a href={p.href} target="_blank" rel="noopener noreferrer" data-testid={`button-membership-${p.name}`}>
                    Sign Up <ExternalLink className="w-4 h-4 ml-2" />
                  </a>
                </Button>
              </div>
            ))}
          </div>

          <section className={`${glass} p-6 md:p-8 text-center space-y-4`}>
            <p className="text-white/80">
              Checkout is handled securely by Square. Want to know exactly what each visit covers?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline" size="lg" className="border-white/40 text-white hover:text-white">
                <a href="/service-checklist">
                  <ClipboardCheck className="w-4 h-4 mr-2" /> View Service Checklist
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/40 text-white hover:text-white">
                <a href="tel:6234321660">
                  <Phone className="w-4 h-4 mr-2" /> Questions? (623) 432-1660
                </a>
              </Button>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
