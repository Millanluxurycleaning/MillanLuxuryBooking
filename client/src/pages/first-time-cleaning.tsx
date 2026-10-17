import { ServiceGroupPage } from "@/components/ServiceGroupPage";

// Banner photo (your "Bathroom Reset - After" gallery photo)
const BANNER_IMAGE = "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/after/1777442884548.jpeg";

// Square services these options book
const DEEP_CLEANING_SERVICE_ID = 9; // 🫧 Deep Cleaning
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
      bannerImage={BANNER_IMAGE}
      bannerAlt="A bathroom cleaned by Millan Luxury Cleaning"
      intro="A detailed, top-to-bottom clean for a first visit, a one-time reset, or a move."
      subIntro="Fixed pricing based on the approximate size of your home. No hourly charges."
      included={[
        {
          title: "What's Included in Deep Cleaning?",
          items: [
            "Detailed sanitizing of kitchens and bathrooms",
            "Hard scrubbing of tubs/showers, sinks, toilets, and fixtures",
            "Dusting top to bottom (vents, corners, ledges, baseboards)",
            "Interior windows, light switches, and door handles",
            "Polish stainless steel and high-touch surfaces",
            "Deep vacuuming and mopping of all floors",
            "Trash emptied in all rooms",
            "Beds made (linen change if provided)",
          ],
          note: `${sqftNote} Optional add-ons: inside fridge, oven, cabinets, or closet refresh.`,
        },
        {
          title: "What's Included in Move-In / Move-Out?",
          items: [
            "Full top-to-bottom clean of every room",
            "Detailed dusting of baseboards, vents, and fixtures",
            "Closets, shelves, cabinets, and drawers cleaned inside & out",
            "Kitchen: inside & out of fridge, oven, microwave, dishwasher, and stovetop",
            "Bathrooms: deep sanitizing of toilets, tubs/showers, vanities, tile, and grout",
            "Wall spot-cleaning, doors, and sanitized touchpoints",
            "Deep vacuuming and mopping of all floors",
          ],
          note: `${sqftNote} Best for empty homes.`,
        },
      ]}
      optionsHeading="What type of cleaning do you need?"
      options={[
        {
          label: "Deep Cleaning",
          description: "Best for a first visit or a home that hasn't been cleaned in the past month.",
          href: `/book?serviceId=${DEEP_CLEANING_SERVICE_ID}`,
        },
        {
          label: "Move-In / Move-Out",
          description: "A complete clean of an empty home before you move in or after you move out.",
          href: `/book?serviceId=${MOVE_IN_OUT_SERVICE_ID}`,
        },
      ]}
    />
  );
}
