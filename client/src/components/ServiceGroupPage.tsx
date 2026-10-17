import { useLocation } from "wouter";
import { PageSEO } from "@/components/PageSEO";
import { useAnnouncement } from "@/contexts/AnnouncementContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Check } from "lucide-react";

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
  bannerImage: string;
  bannerAlt: string;
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
  bannerImage,
  bannerAlt,
  intro,
  subIntro,
  included,
  optionsHeading,
  options,
}: ServiceGroupPageProps) {
  const [, navigate] = useLocation();
  const { isVisible: isBannerVisible } = useAnnouncement();

  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#11231d] text-white" style={{ paddingTop: isBannerVisible ? 40 : 0 }}>
      <PageSEO title={seo.title} description={seo.description} path={seo.path} />

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
          <h1 className="font-sans text-lg font-semibold">{title}</h1>
        </div>
      </header>

      <main>
        {/* Banner photo */}
        <img src={bannerImage} alt={bannerAlt} className="w-full h-48 md:h-72 object-cover" />

        <div className="px-4 md:px-6 py-6 space-y-6">
          <div className="space-y-1">
            <p className="text-base md:text-lg">{intro}</p>
            {subIntro && <p className="text-white/60">{subIntro}</p>}
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {included.map((section) => (
              <AccordionItem
                key={section.title}
                value={section.title}
                className="rounded-xl bg-white/[0.04] px-5 border-none"
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
            <h2 className="font-serif text-lg font-semibold">{optionsHeading}</h2>
            {options.map((option) => (
              <a
                key={option.label}
                href={option.href}
                className="block rounded-xl border-2 border-white/10 px-6 py-4 transition-colors hover:border-primary focus-visible:border-primary outline-none"
              >
                <p className="font-semibold">{option.label}</p>
                <p className="text-sm text-white/60 mt-1 pl-8">{option.description}</p>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
