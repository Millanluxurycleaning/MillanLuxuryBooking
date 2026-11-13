import { ServiceGroupPage } from "@/components/ServiceGroupPage";
import { packageByKey } from "@/data/servicePackages";

const deep = packageByKey("deep")!;
const move = packageByKey("move")!;

// Square services these options book
const MOVE_IN_OUT_SERVICE_ID = 11; // 🪴 Move-In / Move-Out

const sqftNote =
  "Please include your home's square footage when booking. Homes over 999 sq ft need an add-on for the extra time.";

export default function FirstTimeCleaningPage() {
  return (
    <ServiceGroupPage
      title="One / First Time Cleaning"
      seo={{
        title: "Deep Cleaning & Move-In/Move-Out Cleaning in Phoenix, AZ | Millan Luxury Cleaning",
        description:
          "First-time and one-time deep cleaning and move-in/move-out cleaning in the Phoenix Valley from Millan Luxury Cleaning.",
        path: "/first-time-cleaning",
      }}
      intro="A detailed, top-to-bottom clean for a first visit, a one-time reset, or a move."
      subIntro="Fixed pricing based on the approximate size of your home. No hourly charges."
      included={[
        {
          title: "What's Included in Luxury Deep Reset Cleaning?",
          items: [deep.includedIntro ?? "", ...deep.included].filter(Boolean),
          note: `${sqftNote} Optional add-ons: inside fridge, oven, interior windows, and more. Want it all? Choose Millan VIP Signature Cleaning.`,
        },
        {
          title: "What's Included in Luxury Move-In / Move-Out Reset?",
          items: move.included,
          note: `${sqftNote} Best for empty homes.`,
        },
      ]}
      optionsHeading="What type of cleaning do you need?"
      options={[
        {
          label: "Luxury Deep Reset Cleaning",
          description: "Best for a first visit or a home that hasn't been cleaned in the past month.",
          href: "/book?choose=deep-cleaning",
        },
        {
          label: "Luxury Move-In / Move-Out Reset",
          description: "A complete reset of an empty home before you move in or after you move out.",
          href: `/book?serviceId=${MOVE_IN_OUT_SERVICE_ID}`,
        },
      ]}
    />
  );
}
