// The four residential cleaning packages (Essential → Deep Reset → VIP → Move-In/Out).
// Used by the Services page, the Service Checklist / comparison page, and the booking add-ons.

export type PackageKey = "essential" | "deep" | "vip" | "move";

export interface ServicePackage {
  key: PackageKey;
  name: string;
  shortName: string;
  emoji: string;
  description: string;
  bestFor: string;
  includedIntro?: string;
  included: string[];
  addOns: string[];
  cta: string;
  featured?: boolean;
  // Square add-on names (from "Optional Add-ons") already covered by this package, hidden at booking
  hideAddOns: RegExp[];
}

export const servicePackages: ServicePackage[] = [
  {
    key: "essential",
    name: "Essential Maintenance Cleaning",
    shortName: "Essential Maintenance",
    emoji: "🧼",
    description:
      "Routine upkeep that keeps your home fresh, polished, and guest-ready between deeper cleanings.",
    bestFor: "Best for recurring weekly and bi-weekly clients whose home is already in good shape.",
    included: [
      "Dust accessible surfaces",
      "Vacuum and mop floors",
      "Empty trash",
      "Light tidying of accessible items only",
      "Straighten pillows, cushions, and blankets",
      "Light dusting of blinds",
      "Dust ceiling fans",
      "Wipe accessible surfaces",
      "Clean mirrors",
      "Bathroom maintenance cleaning",
      "Clean tubs and showers (no hard scrubbing)",
      "Clean sinks and vanities",
      "Shine fixtures",
      "Clean kitchen counters, tables, and chairs",
      "Spot-clean cabinet fronts and backsplash",
      "Clean microwave inside and outside",
      "Clean appliance exteriors",
      "Clean sink and faucet",
      "Clean common areas",
      "Spot-clean high-touch areas",
      "Luxury scent finish",
      "Final room reset",
    ],
    addOns: [
      "Inside oven",
      "Inside refrigerator",
      "Inside cabinets",
      "Interior windows",
      "Detailed blinds and baseboards",
      "Pet hair removal",
    ],
    cta: "Book Your Cleaning",
    hideAddOns: [],
  },
  {
    key: "deep",
    name: "Luxury Deep Reset Cleaning",
    shortName: "Luxury Deep Reset",
    emoji: "🫧",
    description:
      "A meticulous, top-to-bottom clean that resets your home. Every new client starts here.",
    bestFor: "Best for first visits, monthly and one-time cleanings, and homes that need extra attention.",
    includedIntro: "Everything in Essential Maintenance, plus:",
    included: [
      "Damp wipe surfaces",
      "Wet-dust baseboards",
      "Detailed doors and door frames",
      "Detailed blinds and shutters",
      "Detailed ceiling fans",
      "Hard scrubbing of bathrooms",
      "Scrub tubs and showers",
      "Deep-clean sinks and vanities",
      "Detail cabinet fronts",
      "Detailed kitchen surfaces",
      "Detailed high-touch areas and switch plates",
      "Accessible vents dusted",
      "Light fixtures detailed",
      "Corners and edges detailed",
      "Luxury scent finish",
      "Final quality-control walkthrough",
    ],
    addOns: [
      "Inside refrigerator",
      "Inside oven",
      "Interior windows",
      "Full wall washing",
      "Garage cleaning",
      "Patio cleaning",
      "Appliance pull-outs",
    ],
    cta: "Book Your Cleaning",
    hideAddOns: [/blinds/i],
  },
  {
    key: "vip",
    name: "Millan VIP Signature Cleaning",
    shortName: "VIP Signature",
    emoji: "👑",
    description:
      "Our flagship experience: a complete deep reset with the inside of your fridge and cabinets, windows, VIP detailing, and a free add-on every month.",
    bestFor: "Best for clients who want the complete, white-glove Millan experience.",
    includedIntro: "Everything in Luxury Deep Reset, plus:",
    included: [
      "One free add-on every month: inside oven, inside fridge, cabinets, or any other add-on",
      "Inside refrigerator",
      "Inside cabinets, up to 6 (must be empty or at least 70% empty)",
      "Up to 4 interior windows and window tracks",
      "Couch vacuuming",
      "Detailed baseboards",
      "Accessible vents",
      "Light fixtures",
      "Detailed doors and door frames",
      "Cabinet and drawer fronts",
      "Premium bathroom detailing",
      "Millan signature luxury fragrance finish",
      "Final VIP quality-control walkthrough",
    ],
    addOns: [
      "Inside oven",
      "Additional windows",
      "More than 6 cabinets",
      "Full wall washing",
      "Garage cleaning",
      "Patio cleaning",
      "Appliance pull-outs",
      "Heavy pet-hair removal",
      "Excessive buildup",
      "Organization",
      "Specialty floor treatment",
    ],
    cta: "Upgrade to VIP",
    featured: true,
    hideAddOns: [/inside fridge w\/o food/i, /inside cabinets/i, /blinds/i, /baseboard/i],
  },
  {
    key: "move",
    name: "Luxury Move-In / Move-Out Reset",
    shortName: "Move-In / Move-Out",
    emoji: "🪴",
    description:
      "A complete reset of an empty home, inside cabinets, closets, and appliances, ready for the next chapter.",
    bestFor: "Best for empty homes only: tenants, landlords, buyers, and sellers.",
    included: [
      "Dust and wet-wipe surfaces",
      "Wet-dust baseboards",
      "Detail doors and door frames",
      "Detail blinds and shutters",
      "High vents dusted",
      "Light fixtures detailed",
      "Light switches and switch plates",
      "Vacuum and mop floors",
      "Clean inside closets",
      "Clean inside cabinets and drawers",
      "Clean refrigerator interior",
      "Clean oven interior",
      "Clean microwave inside and outside",
      "Clean stovetop and hood",
      "Clean appliance exteriors",
      "Deep-clean bathrooms",
      "Clean mirrors and fixtures",
      "Clean laundry appliance exteriors",
      "Clean empty-room edges and corners",
      "Final vacant-home walkthrough",
    ],
    addOns: [
      "Interior windows",
      "Steam mop upgrade",
      "Patio cleaning",
      "Garage cleaning",
      "Appliance pull-outs",
      "Full wall washing",
      "Specialty floor work",
      "Heavy trash/debris removal",
    ],
    cta: "Book Your Cleaning",
    hideAddOns: [/inside fridge/i, /^inside oven/i, /inside cabinets/i, /closet/i, /blinds/i, /baseboard/i],
  },
];

export const signatureFinish =
  "Before leaving, our team completes a final walkthrough, resets presentation details, polishes final touchpoints, and finishes the home with our signature luxury scent for the complete Millan Luxury Cleaning experience.";

// Which package a Square service belongs to (works with both the old and the new Square names).
// Airbnb services (Weekly & Biweekly, Reset/Monthly/One Time, Final/Move-Out) are not packages.
export function packageForService(title?: string | null): PackageKey | null {
  const t = (title ?? "").toLowerCase();
  if (!t) return null;
  if (/airbnb|weekly & bi|reset, monthly|final\s*\/?\s*move/.test(t)) return null;
  if (/move-in|move in|move-out|move out/.test(t)) return "move";
  if (/vip|signature/.test(t)) return "vip";
  if (/deep/.test(t)) return "deep";
  if (/basic cleaning|essential maintenance/.test(t)) return "essential";
  return null;
}

export const packageByKey = (key: PackageKey | null) => servicePackages.find((p) => p.key === key) ?? null;

// Show the new package names on the website, whatever the service is still called in Square.
const renames: [RegExp, string][] = [
  [/basic cleaning/i, "Essential Maintenance Cleaning"],
  [/deep cleaning(?=\s*[-–—])/i, "Luxury Deep Reset"],
  [/^(\W*)deep cleaning$/i, "$1Luxury Deep Reset Cleaning"],
  [/millan signature vip cleaning/i, "Millan VIP Signature Cleaning"],
];
export function displayServiceName(title?: string | null): string {
  let name = title ?? "";
  // Move-In / Move-Out service (not the Airbnb "Final/ Move-Out" one)
  if (packageForService(name) === "move" && !/reset/i.test(name)) {
    name = name.replace(/move-in\s*\/\s*move-out(\s*cleaning)?/i, "Luxury Move-In / Move-Out Reset");
  }
  for (const [pattern, replacement] of renames) name = name.replace(pattern, replacement);
  return name;
}
