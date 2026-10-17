import { useLocation } from "wouter";
import { PageSEO } from "@/components/PageSEO";
import { useAnnouncement } from "@/contexts/AnnouncementContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Check } from "lucide-react";

// Banner photo (your "Kitchen Deep Clean - After" gallery photo)
const BANNER_IMAGE = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/after/1777444804584.JPG";

// Square service the Home Cleaning bookings go to (🧼 Basic Cleaning)
const HOME_CLEANING_SERVICE_ID = 20;

const frequencies = [
  {
    value: "one-time",
    label: "One-Time",
    description: "Book a single professional home cleaning.",
  },
  {
    value: "weekly",
    label: "Weekly",
    description: "Recurring professional cleaning every week.",
  },
  {
    value: "bi-weekly",
    label: "Bi-Weekly",
    description: "Recurring professional cleaning every two weeks.",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Recurring professional cleaning once a month.",
  },
] as const;

const included = [
  "Dust all surfaces in living areas and bedrooms",
  "Vacuum carpets and mop hard floors",
  "Clean mirrors and glass surfaces",
  "Kitchen: countertops, backsplash, sink, appliance exteriors, and cabinet fronts",
  "Bathrooms: toilets, tubs/showers, sinks, counters, and fixtures",
  "Empty trash bins",
  "Make beds (linen change if provided)",
];

export default function HomeCleaningPage() {
  const [, navigate] = useLocation();
  const { isVisible: isBannerVisible } = useAnnouncement();

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#11231d] text-white" style={{ paddingTop: isBannerVisible ? 40 : 0 }}>
      <PageSEO
        title="Home Cleaning in Phoenix, AZ | Millan Luxury Cleaning"
        description="One-time, weekly, bi-weekly, and monthly home cleaning in the Phoenix Valley from Millan Luxury Cleaning."
        path="/home-cleaning"
      />

      {/* Top bar */}
      <header className="bg-[#11231d] border-b border-white/5">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="absolute left-3 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-sans text-lg font-semibold">Home Cleaning</h1>
        </div>
      </header>

      <main>
        {/* Banner photo */}
        <img
          src={BANNER_IMAGE}
          alt="A kitchen cleaned by Millan Luxury Cleaning"
          className="w-full h-48 md:h-72 object-cover"
        />

        <div className="px-4 md:px-6 py-6 space-y-6">
          <div className="space-y-1">
            <p className="text-base md:text-lg">
              More than a basic clean — professional equipment, detailed care, and a higher standard of service.
            </p>
            <p className="text-white/60">Fixed pricing based on the approximate size of your home. No hourly charges.</p>
          </div>

          <Accordion type="single" collapsible className="rounded-xl bg-white/[0.04] px-5">
            <AccordionItem value="included" className="border-none">
              <AccordionTrigger className="font-sans font-semibold hover:no-underline">
                What's Included in Home Cleaning?
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2">
                  {included.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-white/80">
                      <Check className="w-4 h-4 mt-1 text-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-sm text-white/60">
                  Please include your home's square footage when booking. Homes over 999 sq ft need an add-on for the
                  extra time.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="space-y-3">
            <h2 className="font-serif text-lg font-semibold">How often do you need cleaning?</h2>
            {frequencies.map((f) => (
              <a
                key={f.value}
                href={`/book?serviceId=${HOME_CLEANING_SERVICE_ID}&frequency=${f.value}`}
                className="block rounded-xl border-2 border-white/10 px-6 py-4 transition-colors hover:border-primary focus-visible:border-primary outline-none"
              >
                <p className="font-semibold">{f.label}</p>
                <p className="text-sm text-white/60 mt-1 pl-8">{f.description}</p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
