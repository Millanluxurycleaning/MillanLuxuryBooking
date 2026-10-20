// City landing pages (/cleaning/<slug>) for local search.
// Each city has its own wording on purpose: search engines ignore pages that only swap the city name.

export interface CityPage {
  slug: string;
  city: string;
  /** Short line under the main heading */
  tagline: string;
  /** Opening paragraph */
  intro: string;
  /** What's different about cleaning homes in this city */
  localNote: string;
  neighborhoods: string[];
  /** Nearby cities to link to */
  nearby: string[];
}

export const cityPages: CityPage[] = [
  {
    slug: "phoenix",
    city: "Phoenix",
    tagline: "Luxury house cleaning and maid service across Phoenix, from Arcadia to Desert Ridge.",
    intro:
      "Phoenix is home to some of the Valley's most beautiful residences, from mid-century ranch homes in Arcadia to modern builds in Desert Ridge. Millan Luxury Cleaning brings a detailed, white-glove standard to every Phoenix home we care for, whether you need a one-time deep cleaning, a recurring weekly or bi-weekly maid service, or a move-out clean before the keys change hands.",
    localNote:
      "Phoenix homes face fine desert dust, hard water, and long, sunny days that highlight every streak. We work top to bottom, polish glass and fixtures until they are spot-free, and pay special attention to vents, ledges, and baseboards where dust settles between visits.",
    neighborhoods: ["Arcadia", "Biltmore", "Ahwatukee", "Desert Ridge", "North Central", "Moon Valley", "Encanto-Palmcroft", "Camelback East"],
    nearby: ["scottsdale", "tempe", "glendale"],
  },
  {
    slug: "scottsdale",
    city: "Scottsdale",
    tagline: "White-glove home cleaning for Scottsdale estates, condos, and vacation homes.",
    intro:
      "Scottsdale homes are designed to impress, with natural stone, custom cabinetry, and indoor-outdoor living. Our Scottsdale house cleaning service is built for that level of detail: careful, stone-safe methods, polished finishes, and a discreet team that treats your home with respect.",
    localNote:
      "Many Scottsdale homeowners split their year between the desert and somewhere cooler. We prepare seasonal homes before you arrive, reset them after you leave, and offer recurring cleaning plans so your home is always ready, even when you are away.",
    neighborhoods: ["Old Town", "McCormick Ranch", "Gainey Ranch", "DC Ranch", "Silverleaf", "Troon", "Grayhawk", "North Scottsdale"],
    nearby: ["phoenix", "tempe", "mesa"],
  },
  {
    slug: "chandler",
    city: "Chandler",
    tagline: "Reliable, detailed house cleaning for Chandler families and busy professionals.",
    intro:
      "Chandler families juggle work, school, and weekend activities, and the last thing anyone wants is to spend Saturday cleaning. Millan Luxury Cleaning offers recurring house cleaning in Chandler on a weekly, bi-weekly, or monthly schedule, starting with a thorough deep cleaning so your home begins at the right standard.",
    localNote:
      "Chandler homes often have open floor plans, large kitchens, and lots of tile and glass. We focus on the high-traffic areas families use most, from kitchen islands to bathroom vanities, and leave floors spotless from edge to edge.",
    neighborhoods: ["Ocotillo", "Fulton Ranch", "Downtown Chandler", "Chandler Heights", "Layton Lakes", "Clemente Ranch"],
    nearby: ["gilbert", "tempe", "mesa"],
  },
  {
    slug: "mesa",
    city: "Mesa",
    tagline: "Deep cleaning, recurring maid service, and move-out cleaning throughout Mesa.",
    intro:
      "From the foothills of Las Sendas to newer communities like Eastmark, Mesa offers a wide range of homes, and each one deserves a careful, consistent clean. Our Mesa cleaning team handles everything from first-time deep cleanings to move-in and move-out cleanings for homeowners, landlords, and real estate professionals.",
    localNote:
      "Mesa's newer neighborhoods often mean new-construction dust that lingers in cabinets, window tracks, and vents. Our move-in cleaning clears it out before your furniture arrives, so your new home feels truly fresh from day one.",
    neighborhoods: ["Las Sendas", "Red Mountain Ranch", "Eastmark", "Dobson Ranch", "Mountain Bridge", "Downtown Mesa"],
    nearby: ["gilbert", "chandler", "tempe"],
  },
  {
    slug: "gilbert",
    city: "Gilbert",
    tagline: "Premium recurring house cleaning for Gilbert homes, done right every visit.",
    intro:
      "Gilbert is known for welcoming, family-friendly neighborhoods, and a clean home is a big part of that feeling. Millan Luxury Cleaning provides house cleaning in Gilbert with the same team-level care on every visit, so your home stays guest-ready week after week.",
    localNote:
      "With pets, kids, and busy schedules, Gilbert homes need a cleaning plan that keeps up. Our recurring service handles dusting, kitchens, bathrooms, and floors on your schedule, with optional add-ons like pet hair removal and our Green Luxury Upgrade for gentler products.",
    neighborhoods: ["Agritopia", "Power Ranch", "Val Vista Lakes", "Seville", "Morrison Ranch", "Heritage District"],
    nearby: ["chandler", "mesa", "queen-creek"],
  },
  {
    slug: "tempe",
    city: "Tempe",
    tagline: "House cleaning, apartment deep cleaning, and move-out cleaning in Tempe.",
    intro:
      "Tempe blends lakeside living, historic neighborhoods, and modern apartments and condos. Whether you own a home in South Tempe or rent near Tempe Town Lake, Millan Luxury Cleaning offers apartment and house deep cleaning, recurring maid service, and move-out cleaning to help you get your deposit back.",
    localNote:
      "Tempe sees a lot of moves each year. Our move-in and move-out cleaning covers the inside of cabinets, drawers, and appliances, wall spot-cleaning, and every floor, so landlords, tenants, and sellers can hand over a home that is ready for inspection.",
    neighborhoods: ["South Tempe", "Downtown Tempe", "Tempe Town Lake", "The Lakes", "Kiwanis Park", "Warner Ranch"],
    nearby: ["phoenix", "chandler", "mesa"],
  },
  {
    slug: "glendale",
    city: "Glendale",
    tagline: "Trusted house cleaning and deep cleaning services in Glendale, AZ.",
    intro:
      "Glendale homeowners in Arrowhead Ranch, Westgate, and the historic Catlin Court district trust Millan Luxury Cleaning for a detailed, dependable clean. We offer deep cleaning for first visits and one-time resets, recurring home cleaning plans, and move-in and move-out cleaning.",
    localNote:
      "West Valley homes see plenty of dust from monsoon season. After a storm, a deep cleaning that reaches vents, window tracks, ceiling fans, and baseboards brings your home back to fresh and comfortable.",
    neighborhoods: ["Arrowhead Ranch", "Westgate", "Catlin Court", "Bellair", "Sierra Verde"],
    nearby: ["peoria", "phoenix", "goodyear"],
  },
  {
    slug: "peoria",
    city: "Peoria",
    tagline: "Luxury home cleaning for Peoria, from Vistancia to Westbrook Village.",
    intro:
      "Peoria offers some of the West Valley's most scenic living, from homes near Lake Pleasant to the golf course communities of Vistancia and Westbrook Village. Millan Luxury Cleaning brings premium house cleaning to Peoria with deep cleaning, recurring maid service, and move-out cleaning.",
    localNote:
      "Many Peoria residents are retirees, snowbirds, and second-home owners. We prepare homes before seasonal arrivals, keep them fresh with recurring visits, and work quietly and respectfully around your routine.",
    neighborhoods: ["Vistancia", "Westbrook Village", "Fletcher Heights", "Lake Pleasant", "Terramar"],
    nearby: ["glendale", "goodyear", "phoenix"],
  },
  {
    slug: "goodyear",
    city: "Goodyear",
    tagline: "Detailed house cleaning and move-in cleaning for Goodyear's growing communities.",
    intro:
      "Goodyear is one of the fastest-growing cities in the Valley, with beautiful new communities like Estrella and Palm Valley. Millan Luxury Cleaning offers house cleaning in Goodyear for new homeowners and longtime residents alike, from move-in cleaning to recurring weekly and bi-weekly service.",
    localNote:
      "New construction in Goodyear often comes with leftover builder dust. Our move-in cleaning gets inside every cabinet, closet, and drawer, wipes down every surface, and leaves your new home ready to live in.",
    neighborhoods: ["Estrella", "Palm Valley", "PebbleCreek", "Canyon Trails", "Centerra"],
    nearby: ["glendale", "peoria", "phoenix"],
  },
  {
    slug: "queen-creek",
    city: "Queen Creek",
    tagline: "Premium house cleaning for Queen Creek homes, from Hastings Farms to Encanterra.",
    intro:
      "Queen Creek combines a relaxed, small-town feel with spacious, beautiful homes. Millan Luxury Cleaning serves Queen Creek with luxury house cleaning, including deep cleaning for larger homes, recurring maid service, and move-in cleaning for new construction.",
    localNote:
      "Queen Creek homes are often larger, with more bedrooms, bathrooms, and living space. Our pricing is based on your home's size, and our deep cleaning takes the time to give every room the same careful attention.",
    neighborhoods: ["Hastings Farms", "Harvest Queen Creek", "Queen Creek Station", "Encanterra", "Spur Cross"],
    nearby: ["gilbert", "mesa", "chandler"],
  },
];

// Search phrases for each city (shown on the page as "Cleaning Services We Offer in <city>",
// each linking to the right booking page, and added to the page's keywords tag)
export interface CityKeyword {
  label: string;
  href: string;
}

export const cityKeywords = (c: CityPage): CityKeyword[] => [
  { label: `House cleaning in ${c.city}`, href: "/book" },
  { label: `Maid service in ${c.city}`, href: "/home-cleaning" },
  { label: `Luxury cleaning service in ${c.city}`, href: "/services" },
  { label: `Deep cleaning in ${c.city}`, href: "/book?choose=deep-cleaning" },
  { label: `Apartment cleaning in ${c.city}`, href: "/book?choose=deep-cleaning" },
  { label: `Move-out cleaning in ${c.city}`, href: "/first-time-cleaning" },
  { label: `Move-in cleaning in ${c.city}`, href: "/first-time-cleaning" },
  { label: `Weekly house cleaning in ${c.city}`, href: "/home-cleaning" },
  { label: `Bi-weekly house cleaning in ${c.city}`, href: "/home-cleaning" },
  { label: `Monthly house cleaning in ${c.city}`, href: "/home-cleaning" },
  { label: `Airbnb cleaning in ${c.city}`, href: "/services" },
  { label: `Vacation rental cleaning in ${c.city}`, href: "/services" },
  { label: `Residential cleaning in ${c.city}, AZ`, href: "/book" },
  { label: `House cleaners near me in ${c.city}`, href: "/book" },
  { label: `House cleaning in ${c.neighborhoods[0]}`, href: "/book" },
];

export const cityPageBySlug = Object.fromEntries(cityPages.map((c) => [c.slug, c])) as Record<string, CityPage>;

export const cityPagePath = (slug: string) => `/cleaning/${slug}`;

export const cityPageTitle = (city: string) => `House Cleaning in ${city}, AZ — Deep Cleaning, Maid Service & Move-Out`;

export const cityPageDescription = (c: CityPage) =>
  `Luxury house cleaning in ${c.city}, AZ: deep cleaning, recurring weekly and bi-weekly maid service, move-in/move-out and Airbnb cleaning. Serving ${c.neighborhoods
    .slice(0, 3)
    .join(", ")} and more. Call (602) 596-7393.`;
