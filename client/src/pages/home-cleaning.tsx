import { ServiceGroupPage } from "@/components/ServiceGroupPage";

// Home Cleaning is recurring only. New clients start with a Deep Cleaning (full price);
// the recurring discount applies to the cleanings after that.
const frequencies = [
  { value: "weekly", label: "Weekly", description: "Recurring professional cleaning every week." },
  { value: "bi-weekly", label: "Bi-Weekly", description: "Recurring professional cleaning every two weeks." },
  { value: "monthly", label: "Monthly", description: "Recurring professional cleaning once a month." },
];

export default function HomeCleaningPage() {
  return (
    <ServiceGroupPage
      title="Home Cleaning"
      seo={{
        title: "Home Cleaning in Phoenix, AZ | Millan Luxury Cleaning",
        description:
          "Weekly, bi-weekly, and monthly recurring home cleaning in the Phoenix Valley from Millan Luxury Cleaning.",
        path: "/home-cleaning",
      }}
      intro="More than a basic clean — professional equipment, detailed care, and a higher standard of service."
      subIntro="Your first visit is a Deep Cleaning at full price. Your recurring discount starts with your next cleaning. Final price may vary based on your home's size and condition."
      included={[
        {
          title: "What's Included in Home Cleaning?",
          items: [
            "Dust all surfaces in living areas and bedrooms",
            "Vacuum carpets and mop hard floors",
            "Clean mirrors and glass surfaces",
            "Kitchen: countertops, backsplash, sink, appliance exteriors, and cabinet fronts",
            "Bathrooms: toilets, tubs/showers, sinks, counters, and fixtures",
            "Empty trash bins",
            "Make beds (linen change if provided)",
          ],
          note: "Please include your home's square footage when booking. Homes over 999 sq ft need an add-on for the extra time.",
        },
      ]}
      optionsHeading="How often do you need cleaning?"
      options={frequencies.map((f) => ({
        label: f.label,
        description: f.description,
        href: `/book?choose=deep-cleaning&frequency=${f.value}`,
      }))}
    />
  );
}
