import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { PageSEO } from "@/components/PageSEO";
import { Button } from "@/components/ui/button";
import { useAssets } from "@/hooks/useAssets";
import { Check, Plus, Minus } from "lucide-react";
import { seoPages } from "@shared/seoPages";

const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

// yes = included, addon = available for an extra charge, no = not included
type Mark = "yes" | "addon" | "no";

const columns = [
  { full: "Home Cleaning (recurring)", short: "Home" },
  { full: "Deep Cleaning", short: "Deep" },
  { full: "Move-In / Move-Out", short: "Move" },
];

const sections: { title: string; rows: { task: string; marks: [Mark, Mark, Mark] }[] }[] = [
  {
    title: "Kitchen",
    rows: [
      { task: "Countertops, backsplash, and sink", marks: ["yes", "yes", "yes"] },
      { task: "Appliance exteriors and cabinet fronts", marks: ["yes", "yes", "yes"] },
      { task: "Stainless steel polished streak-free", marks: ["no", "yes", "yes"] },
      { task: "Inside refrigerator", marks: ["no", "addon", "yes"] },
      { task: "Inside oven, stovetop, and microwave", marks: ["no", "addon", "yes"] },
      { task: "Inside cabinets and drawers", marks: ["no", "addon", "yes"] },
      { task: "Inside dishwasher", marks: ["no", "no", "yes"] },
    ],
  },
  {
    title: "Bathrooms",
    rows: [
      { task: "Toilets, tubs/showers, sinks, counters, and fixtures cleaned", marks: ["yes", "yes", "yes"] },
      { task: "Hard scrubbing of tubs, showers, and fixtures", marks: ["no", "yes", "yes"] },
      { task: "Mirrors and glass", marks: ["yes", "yes", "yes"] },
      { task: "Tile and grout detailed", marks: ["no", "no", "yes"] },
      { task: "Inside vanities and bathroom cabinets", marks: ["no", "no", "yes"] },
    ],
  },
  {
    title: "Bedrooms & Living Areas",
    rows: [
      { task: "Dust all reachable surfaces", marks: ["yes", "yes", "yes"] },
      { task: "Baseboards, vents, ledges, and corners", marks: ["no", "yes", "yes"] },
      { task: "Interior windows", marks: ["no", "yes", "no"] },
      { task: "Light switches and door handles", marks: ["no", "yes", "yes"] },
      { task: "Interior doors and wall spot-cleaning", marks: ["no", "no", "yes"] },
      { task: "Closets and shelving (inside)", marks: ["no", "addon", "yes"] },
      { task: "Make beds (linens changed if provided)", marks: ["yes", "yes", "no"] },
    ],
  },
  {
    title: "Throughout the Home",
    rows: [
      { task: "Vacuum carpets and mop hard floors", marks: ["yes", "yes", "yes"] },
      { task: "Empty trash bins", marks: ["yes", "yes", "no"] },
    ],
  },
];

const addOns = [
  "Green Luxury Upgrade (gentler, eco-conscious products)",
  "Pet hair removal",
  "Inside refrigerator, oven, or cabinets",
  "Closet refresh",
  "Exterior windows and tracks",
  "Wall washing",
  "Garage sweeping",
  "Carpet deep cleaning",
  "Appliance pull-out cleaning (behind/under stove and fridge)",
  "Laundry, bed sheets, and comforters",
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
  ) : (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/10 text-white/40" title="Not included">
      <Minus className="w-4 h-4" />
      <span className="sr-only">Not included</span>
    </span>
  );

export default function ServiceChecklistPage() {
  const { data: assets = {} } = useAssets();
  const background = assets?.servicesBackground?.url ?? assets?.heroBackground?.url ?? fallbackBg;
  const glass =
    "rounded-2xl bg-black/25 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.35)]";

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
        <div className="relative z-10 container mx-auto max-w-5xl px-4 md:px-8 pt-32 pb-20 space-y-10">
          <header className="text-center space-y-4">
            <h1 className="font-serif text-4xl md:text-5xl font-semibold">Service Checklist</h1>
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto">
              See exactly what's included in each cleaning, what's available as an add-on, and what isn't covered.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-white/80 pt-2">
              <span className="flex items-center gap-2"><MarkIcon mark="yes" /> Included</span>
              <span className="flex items-center gap-2"><MarkIcon mark="addon" /> Add-on (extra charge)</span>
              <span className="flex items-center gap-2"><MarkIcon mark="no" /> Not included</span>
            </div>
          </header>

          {sections.map((section) => (
            <section key={section.title} className={`${glass} overflow-hidden`}>
              <h2 className="font-serif text-2xl font-semibold px-5 md:px-6 pt-5 pb-3">{section.title}</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm md:text-base">
                  <thead>
                    <tr className="text-white/60 text-xs uppercase tracking-wide">
                      <th className="text-left font-medium px-5 md:px-6 py-2">Task</th>
                      {columns.map((c) => (
                        <th key={c.full} className="font-medium px-1 md:px-2 py-2 text-center w-14 md:w-36">
                          <span className="md:hidden">{c.short}</span>
                          <span className="hidden md:inline">{c.full}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.task} className="border-t border-white/10">
                        <td className="px-5 md:px-6 py-3 text-white/85">{row.task}</td>
                        {row.marks.map((m, i) => (
                          <td key={i} className="px-1 md:px-2 py-3 text-center">
                            <MarkIcon mark={m} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}

          <section className={`${glass} p-6 md:p-8 space-y-4`}>
            <h2 className="font-serif text-2xl font-semibold">Available Add-ons</h2>
            <p className="text-white/70">Not part of a standard visit, but you can add any of these when you book.</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {addOns.map((a) => (
                <li key={a} className="flex items-start gap-2 text-white/85">
                  <MarkIcon mark="addon" />
                  <span className="pt-0.5">{a}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-white/60">
              Pricing is based on your home's size. Homes over 999 sq ft need an add-on for the extra time, so please include
              your square footage when booking.
            </p>
          </section>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="tracking-wide">
              <a href="/book">Book Your Cleaning</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:text-white">
              <a href="/memberships">See Memberships</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
