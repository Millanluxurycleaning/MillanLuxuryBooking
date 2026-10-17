import { ServiceGroupPage } from "@/components/ServiceGroupPage";

// Banner photo (your "Kitchen Deep Clean - After" gallery photo)
const BANNER_IMAGE = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/after/1777444804584.JPG";

// Square service the Home Cleaning bookings go to (🧼 Basic Cleaning)
const HOME_CLEANING_SERVICE_ID = 20;

const frequencies = [
  { value: "one-time", label: "One-Time", description: "Book a single professional home cleaning." },
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
          "One-time, weekly, bi-weekly, and monthly home cleaning in the Phoenix Valley from Millan Luxury Cleaning.",
        path: "/home-cleaning",
      }}
      bannerImage={BANNER_IMAGE}
      bannerAlt="A kitchen cleaned by Millan Luxury Cleaning"
      intro="More than a basic clean — professional equipment, detailed care, and a higher standard of service."
      subIntro="Fixed pricing based on the approximate size of your home. No hourly charges."
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
        href: `/book?serviceId=${HOME_CLEANING_SERVICE_ID}&frequency=${f.value}`,
      }))}
    />
  );
}
