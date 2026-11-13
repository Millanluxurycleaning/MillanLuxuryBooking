import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { useAssets } from "@/hooks/useAssets";
import { Check, Plus, Minus, Crown, Sparkles } from "lucide-react";
import { seoPages } from "@shared/seoPages";
import type { ServiceItem } from "@shared/types";
import { servicePackages, signatureFinish, packageForService, type PackageKey } from "@/data/servicePackages";

const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

// yes = included, addon = available for an extra charge, no = not included, or a short note (e.g. "Light")
type Mark = "yes" | "addon" | "no" | string;

const columns: { key: PackageKey; short: string }[] = [
  { key: "essential", short: "Essential" },
  { key: "deep", short: "Deep Reset" },
  { key: "vip", short: "VIP" },
  { key: "move", short: "Move-In/Out" },
];

// Order: Essential, Deep Reset, VIP, Move-In / Move-Out
const comparison: { title: string; rows: { task: string; marks: [Mark, Mark, Mark, Mark] }[] }[] = [
  {
    title: "Throughout the Home",
    rows: [
      { task: "Dust and wipe accessible surfaces", marks: ["yes", "Damp wipe", "Damp wipe", "Wet-wipe"] },
      { task: "Vacuum and mop floors", marks: ["yes", "yes", "yes", "yes"] },
      { task: "Empty trash", marks: ["yes", "yes", "yes", "no"] },
      { task: "Light tidying & final room reset", marks: ["yes", "yes", "yes", "no"] },
      { task: "Blinds and shutters", marks: ["Light dust", "Detailed", "Detailed", "Detailed"] },
      { task: "Ceiling fans", marks: ["Dusted", "Detailed", "Detailed", "no"] },
      { task: "Baseboards", marks: ["addon", "Wet-dusted", "Detailed", "Wet-dusted"] },
      { task: "Doors and door frames", marks: ["no", "Detailed", "Detailed", "Detailed"] },
      { task: "High-touch areas and switch plates", marks: ["Spot-clean", "Detailed", "Detailed", "no"] },
      { task: "Accessible vents and light fixtures", marks: ["no", "yes", "yes", "no"] },
      { task: "Corners and edges detailed", marks: ["no", "yes", "yes", "yes"] },
      { task: "Couch vacuuming", marks: ["no", "no", "yes", "no"] },
      { task: "Interior windows and tracks", marks: ["addon", "addon", "Up to 4", "addon"] },
      { task: "Inside closets", marks: ["addon", "addon", "addon", "yes"] },
    ],
  },
  {
    title: "Kitchen",
    rows: [
      { task: "Counters, tables, sink, and faucet", marks: ["yes", "Detailed", "Detailed", "yes"] },
      { task: "Appliance exteriors", marks: ["yes", "yes", "yes", "yes"] },
      { task: "Microwave inside and outside", marks: ["yes", "yes", "yes", "yes"] },
      { task: "Cabinet fronts and backsplash", marks: ["Spot-clean", "Detailed", "Detailed", "yes"] },
      { task: "Inside cabinets and drawers", marks: ["addon", "addon", "addon", "yes"] },
      { task: "Inside oven", marks: ["addon", "addon", "yes", "yes"] },
      { task: "Inside refrigerator", marks: ["addon", "addon", "yes", "yes"] },
    ],
  },
  {
    title: "Bathrooms",
    rows: [
      { task: "Sinks, vanities, mirrors, and fixtures", marks: ["yes", "Deep-cleaned", "Premium detail", "Deep-cleaned"] },
      { task: "Tubs and showers", marks: ["Wipe-down", "Hard scrub", "Hard scrub", "Hard scrub"] },
    ],
  },
  {
    title: "The Finish",
    rows: [
      { task: "Luxury scent finish", marks: ["no", "yes", "Signature", "no"] },
      { task: "Final walkthrough", marks: ["Room reset", "Quality check", "VIP check", "Vacant-home check"] },
    ],
  },
];

const MarkIcon = ({ mark }: { mark: Mark }) =>
  mark === "yes" ? (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300" title="Included">
      <Check className="w-4 h-4" />
      <span className="sr-only">Included</span>
    </span>
  ) : mark === "addon" ? (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary" title="Add-on (extra charge)">
      <Plus className="w-4 h-4" />
      <span className="sr-only">Add-on</span>
    </span>
  ) : mark === "no" ? (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white/40" title="Not included">
      <Minus className="w-4 h-4" />
      <span className="sr-only">Not included</span>
    </span>
  ) : (
    <span className="inline-block text-[0.7rem] md:text-xs font-medium leading-tight text-emerald-200">{mark}</span>
  );

export default function ServiceChecklistPage() {
  const { data: assets = {} } = useAssets();
  const { data: services = [] } = useQuery<ServiceItem[]>({ queryKey: ["/api/services"] });
  const background = assets?.servicesBackground?.url ?? assets?.heroBackground?.url ?? fallbackBg;
  const glass =
    "rounded-2xl bg-black/25 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.35)]";

  const ctaHref = (key: PackageKey) => {
    if (key === "essential") return "/home-cleaning";
    if (key === "deep") return "/book?choose=deep-cleaning";
    const list = Array.isArray(services) ? services : [];
    const svc = list.find((s) => packageForService(s.title || s.name) === key);
    return svc ? `/book?serviceId=${svc.id}` : "/book";
  };

  return (
    <div className="min-h-screen">
      <PageSEO
        title={seoPages.serviceChecklist.title}
        description={seoPages.serviceChecklist.description}
        path={seoPages.serviceChecklist.path}
      />
      <Navigation />
      <main
        className="relative text-white"
        style={{ backgroundImage: `url(${background})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}
      >
        <div className="absolute inset-0 bg-black/70 pointer-events-none" />
        <div className="relative z-10 container mx-auto max-w-5xl px-4 md:px-8 pt-28 md:pt-32 pb-20 space-y-10">
          <header className="text-center space-y-4">
            <h1 className="font-serif text-3xl md:text-5xl font-semibold">Our Cleaning Packages</h1>
            <p className="text-base md:text-xl text-white/80 max-w-3xl mx-auto">
              From routine upkeep to our white-glove VIP experience. See exactly what's included in each package and what's available as an add-on.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs md:text-sm">
              {servicePackages.map((p, i) => (
                <span key={p.key} className="flex items-center gap-2">
                  <a
                    href={`#${p.key}`}
                    className={`rounded-full border px-3 py-1.5 transition-colors hover:border-primary ${
                      p.featured ? "border-primary text-primary" : "border-white/30 text-white/85"
                    }`}
                  >
                    {p.emoji} {p.shortName}
                  </a>
                  {i < servicePackages.length - 1 && <span className="text-white/40">→</span>}
                </span>
              ))}
            </div>
            <a href="#compare" className="inline-block text-sm text-white/70 underline underline-offset-4 hover:text-primary">
              Jump to the comparison chart
            </a>
          </header>

          {servicePackages.map((pkg) => (
            <section
              key={pkg.key}
              id={pkg.key}
              className={`scroll-mt-28 p-5 md:p-8 space-y-5 ${
                pkg.featured
                  ? "rounded-2xl bg-gradient-to-br from-black/60 via-[rgba(20,45,30,0.55)] to-black/60 backdrop-blur-2xl border-2 border-primary shadow-[0_30px_80px_rgba(212,175,55,0.25)]"
                  : glass
              }`}
              data-testid={`section-package-${pkg.key}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="font-serif text-2xl md:text-3xl font-semibold">
                    <span className="mr-2">{pkg.emoji}</span>
                    {pkg.name}
                  </h2>
                  <p className="text-white/80 text-base md:text-lg">{pkg.description}</p>
                </div>
                {pkg.featured && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
                    <Crown className="w-3.5 h-3.5" /> Our Flagship Service
                  </span>
                )}
              </div>
              <p className="text-sm md:text-base text-primary/90 italic">{pkg.bestFor}</p>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">What's Included</h3>
                {pkg.includedIntro && <p className="font-semibold text-primary">{pkg.includedIntro}</p>}
                <ul className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {pkg.included.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-white/85">
                      <Check className="w-4 h-4 mt-1 shrink-0 text-emerald-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Popular Add-ons</h3>
                <div className="flex flex-wrap gap-2">
                  {pkg.addOns.map((a) => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs md:text-sm text-white/90">
                      <Plus className="w-3 h-3 text-primary" /> {a}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button asChild size="lg" className="tracking-wide">
                  <a href={ctaHref(pkg.key)}>{pkg.cta}</a>
                </Button>
                {pkg.key === "deep" && (
                  <Button asChild size="lg" variant="outline" className="border-primary/60 text-primary bg-transparent hover:bg-primary/10 hover:text-primary">
                    <a href="#vip">Upgrade to VIP</a>
                  </Button>
                )}
              </div>
            </section>
          ))}

          <section className="rounded-2xl border border-primary/50 bg-black/40 backdrop-blur-2xl p-6 md:p-8 text-center space-y-3">
            <Sparkles className="w-7 h-7 text-primary mx-auto" />
            <h2 className="font-serif text-2xl md:text-3xl font-semibold">The Millan Signature Finish</h2>
            <p className="text-white/80 text-base md:text-lg max-w-3xl mx-auto leading-relaxed">{signatureFinish}</p>
          </section>

          <section id="compare" className="scroll-mt-28 space-y-4">
            <div className="text-center space-y-3">
              <h2 className="font-serif text-2xl md:text-4xl font-semibold">Compare Packages</h2>
              <div className="flex flex-wrap justify-center gap-4 text-xs md:text-sm text-white/80">
                <span className="flex items-center gap-2"><MarkIcon mark="yes" /> Included</span>
                <span className="flex items-center gap-2"><MarkIcon mark="addon" /> Add-on (extra charge)</span>
                <span className="flex items-center gap-2"><MarkIcon mark="no" /> Not included</span>
              </div>
            </div>
            {comparison.map((section) => (
              <div key={section.title} className={`${glass} overflow-hidden`}>
                <h3 className="font-serif text-xl md:text-2xl font-semibold px-4 md:px-6 pt-5 pb-3">{section.title}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm md:text-base">
                    <thead>
                      <tr className="text-white/60 text-[0.65rem] md:text-xs uppercase tracking-wide">
                        <th className="text-left font-medium px-4 md:px-6 py-2">Task</th>
                        {columns.map((c) => (
                          <th
                            key={c.key}
                            className={`font-medium px-1 md:px-2 py-2 text-center w-[4.25rem] md:w-32 ${c.key === "vip" ? "text-primary" : ""}`}
                          >
                            {c.short}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row) => (
                        <tr key={row.task} className="border-t border-white/10">
                          <td className="px-4 md:px-6 py-3 text-white/85">{row.task}</td>
                          {row.marks.map((m, i) => (
                            <td key={i} className={`px-1 md:px-2 py-3 text-center ${columns[i].key === "vip" ? "bg-primary/5" : ""}`}>
                              <MarkIcon mark={m} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
            <p className="text-sm text-white/60 text-center">
              Pricing is based on your home's size. Homes over 999 sq ft need an add-on for the extra time, so please include
              your square footage when booking. Add-ons can be chosen when you book.
            </p>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="tracking-wide">
              <a href="/book">Book Your Cleaning</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:text-white">
              <a href="tel:+16234321660">Request an Estimate: (623) 432-1660</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
