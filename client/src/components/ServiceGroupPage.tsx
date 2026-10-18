import { useLocation } from "wouter";
import { PageSEO } from "@/components/PageSEO";
import { useAnnouncement } from "@/contexts/AnnouncementContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Check } from "lucide-react";
import { useAssets } from "@/hooks/useAssets";

const fallbackBg = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

export type ServiceGroupOption = {
  label: string;
  description: string;
  href: string;
};

export type IncludedSection = {
  title: string;
  items: string[];
  note?: string;
};

type ServiceGroupPageProps = {
  title: string;
  seo: { title: string; description: string; path: string };
  intro: string;
  subIntro?: string;
  included: IncludedSection[];
  optionsHeading: string;
  options: ServiceGroupOption[];
};

// Shared layout for grouped service pages (Home Cleaning, One / First Time Cleaning)
export function ServiceGroupPage({
  title,
  seo,
  intro,
  subIntro,
  included,
  optionsHeading,
  options,
}: ServiceGroupPageProps) {
  const [, navigate] = useLocation();
  const { isVisible: isBannerVisible } = useAnnouncement();
  const { data: assets = {} } = useAssets();
  // Same botanical background as the "Our Services" section on the homepage
  const background = assets?.servicesBackground?.url ?? assets?.heroBackground?.url ?? fallbackBg;

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  return (
    <div
      className="relative min-h-screen text-white"
      style={{
        paddingTop: isBannerVisible ? 40 : 0,
        backgroundImage: `url(${background})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-black/70 pointer-events-none" />
      <div className="relative z-10">
      <PageSEO title={seo.title} description={seo.description} path={seo.path} />

      {/* Top bar */}
      <header className="bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="relative flex items-center justify-center h-14 px-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="absolute left-3 p-2 rounded-full hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="font-sans text-lg font-semibold">{title}</h1>
        </div>
      </header>

      <main>
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">
          <div className="space-y-1">
            <p className="text-base md:text-lg text-white/90">{intro}</p>
            {subIntro && <p className="text-white/70">{subIntro}</p>}
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {included.map((section) => (
              <AccordionItem
                key={section.title}
                value={section.title}
                className="rounded-xl bg-black/25 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 px-5"
              >
                <AccordionTrigger className="font-sans font-semibold hover:no-underline">
                  {section.title}
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-white/80">
                        <Check className="w-4 h-4 mt-1 text-primary shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {section.note && <p className="mt-4 text-sm text-white/60">{section.note}</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="space-y-3">
            <h2 className="font-serif text-xl md:text-2xl font-semibold">{optionsHeading}</h2>
            {options.map((option) => (
              <a
                key={option.label}
                href={option.href}
                className="block rounded-xl bg-black/25 backdrop-blur-2xl border border-white/20 ring-1 ring-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.35)] px-6 py-4 transition-colors hover:border-primary focus-visible:border-primary outline-none"
              >
                <p className="font-serif text-lg font-semibold">{option.label}</p>
                <p className="text-sm text-white/70 mt-1 pl-8">{option.description}</p>
              </a>
            ))}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}
