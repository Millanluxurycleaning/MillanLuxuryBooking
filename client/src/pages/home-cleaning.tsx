import { ServiceGroupPage } from "@/components/ServiceGroupPage";
import { packageByKey } from "@/data/servicePackages";

const essential = packageByKey("essential")!;
const deep = packageByKey("deep")!;

// Home Cleaning is recurring only. New clients start with a Deep Cleaning (full price);
// the recurring discount applies to the cleanings after that.
const frequencies = [
  { value: "weekly", label: "Weekly", description: "Essential Maintenance Cleaning every week." },
  { value: "bi-weekly", label: "Bi-Weekly", description: "Essential Maintenance Cleaning every two weeks." },
  { value: "monthly", label: "Monthly", description: "Luxury Deep Reset Cleaning once a month." },
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
      intro="Recurring cleaning for your home: Essential Maintenance every week or two, or a Luxury Deep Reset once a month."
      subIntro="Your first visit is a Luxury Deep Reset at full price. Your recurring discount starts with your next cleaning. Final price may vary based on your home's size and condition."
      included={[
        {
          title: "What's Included in Essential Maintenance Cleaning?",
          items: essential.included,
          note: "Weekly and bi-weekly cleanings. Please include your home's square footage when booking. Homes over 999 sq ft need an add-on for the extra time.",
        },
        {
          title: "Monthly Cleaning: Luxury Deep Reset",
          items: [deep.includedIntro ?? "", ...deep.included].filter(Boolean),
          note: "Monthly cleanings get the full Luxury Deep Reset, since more builds up between visits.",
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
