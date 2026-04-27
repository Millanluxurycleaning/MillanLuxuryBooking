import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeArrayData } from "@/lib/arrayUtils";
import type { Faq } from "@shared/types";

export function FAQ() {
  const { data: faqsPayload, isLoading, error } = useQuery<Faq[]>({
    queryKey: ["/api/faqs"],
    retry: false,
  });

  const { items: faqs, isValid } = normalizeArrayData<Faq>(faqsPayload);
  const priorityMatchers = [
    (question: string) => question.toLowerCase().includes("deep") && question.toLowerCase().includes("clean"),
    (question: string) => question.toLowerCase().includes("pet"),
    (question: string) => question.toLowerCase().includes("cancel") || question.toLowerCase().includes("resched"),
    (question: string) => question.toLowerCase().includes("book") || question.toLowerCase().includes("schedule"),
    (question: string) =>
      question.toLowerCase().includes("service area") || question.toLowerCase().includes("areas"),
  ];

  const selectedFaqs = (() => {
    const selected: Faq[] = [];
    const used = new Set<number>();

    priorityMatchers.forEach((matches) => {
      const match = faqs.find((faq) => !used.has(faq.id) && matches(faq.question));
      if (match) {
        selected.push(match);
        used.add(match.id);
      }
    });

    faqs.forEach((faq) => {
      if (selected.length >= 5) return;
      if (!used.has(faq.id)) {
        selected.push(faq);
        used.add(faq.id);
      }
    });

    return selected;
  })();

  useEffect(() => {
    if (!isValid && !isLoading && !error) {
      // eslint-disable-next-line no-console
      console.warn("[Public] Unexpected FAQ payload shape.", faqsPayload);
    }
  }, [faqsPayload, isValid, isLoading, error]);

  const faqSchema = selectedFaqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": selectedFaqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  } : null;

  return (
    <section id="faq" className="py-20 md:py-32 bg-background">
      {faqSchema && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        </Helmet>
      )}
      <div className="container mx-auto px-6 md:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl md:text-5xl font-semibold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground">
            Everything you need to know about our services
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="border rounded-md px-6 py-4 bg-card space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center text-muted-foreground">Unable to load FAQs right now.</div>
          ) : selectedFaqs.length === 0 ? (
            <div className="text-center text-muted-foreground">No FAQs available yet. Check back soon!</div>
          ) : (
            <Accordion type="single" collapsible className="space-y-4">
              {selectedFaqs.map((faq, index) => (
                <AccordionItem
                  key={faq.id ?? index}
                  value={`item-${faq.id ?? index}`}
                  className="border rounded-md px-6 bg-card"
                  data-testid={`faq-item-${faq.id ?? index}`}
                >
                  <AccordionTrigger className="text-left font-semibold text-base md:text-lg py-4 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </section>
  );
}
