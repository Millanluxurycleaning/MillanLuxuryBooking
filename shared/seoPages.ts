// Single source of truth for page-level SEO metadata.
// Used by the React pages (via <PageSEO>) AND by scripts/prerender-head.ts,
// which writes these tags into static HTML at build time so crawlers and
// social previews see the correct title/description/canonical without JS.

import { cityPages, cityPagePath, cityPageTitle, cityPageDescription } from "./cityPages.js";

export const SITE_NAME = "Millan Luxury Cleaning";
export const BASE_URL = "https://millanluxurycleaning.com";
export const DEFAULT_OG_IMAGE =
  "https://gwzcdrue1bdrchlh.public.blob.vercel-storage.com/static/dark-botanical-bg.png";

export interface SeoPage {
  path: string;
  title: string; // without the " | Millan Luxury Cleaning" suffix
  description: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: number;
  /** Exclude from sitemap / prerender (e.g. noindex pages) */
  hidden?: boolean;
}

export const seoPages = {
  home: {
    path: "/",
    title: "Luxury House Cleaning Services in Phoenix, AZ",
    description:
      "Premium house cleaning in Phoenix, Scottsdale, Chandler, Mesa, Gilbert and across the Valley. Deep cleaning, recurring, move-out and Airbnb cleaning. Call (602) 596-7393.",
    changefreq: "weekly",
    priority: 1.0,
  },
  services: {
    path: "/services",
    title: "Cleaning Services — Deep Clean, Move-In/Out, Recurring & More",
    description:
      "Browse all Millan Luxury Cleaning services: deep cleaning, move-in/move-out, recurring weekly and biweekly cleaning, and Airbnb turnovers. Serving Phoenix and the surrounding Valley.",
    changefreq: "weekly",
    priority: 0.9,
  },
  book: {
    path: "/book",
    title: "Book a Cleaning — Schedule Online in Minutes",
    description:
      "Book your cleaning online. Choose your service, pick a date and time, and secure your spot. Serving Phoenix, Scottsdale, Chandler, Mesa and the surrounding Valley.",
    changefreq: "monthly",
    priority: 0.8,
  },
  blog: {
    path: "/blog",
    title: "Blog — Cleaning Tips, Guides & Advice",
    description:
      "Cleaning tips, home care guides and checklists from the Millan Luxury Cleaning team in Phoenix, AZ.",
    changefreq: "weekly",
    priority: 0.7,
  },
  partners: {
    path: "/partners",
    title: "Partner With Us — Brand Affiliates & Cleaning Partners",
    description:
      "Join the Millan Luxury Cleaning partner network. Apply as a brand affiliate or cleaning partner and grow alongside a premium Arizona cleaning brand.",
    changefreq: "monthly",
    priority: 0.4,
  },
  fragrances: {
    path: "/fragrances",
    title: "Luxury Fragrances — Handmade Soy Candles, Room Sprays & Car Diffusers",
    description:
      "Shop Millan Luxury handmade fragrances: organic soy candles, room sprays, car diffusers and all-purpose cleaners, crafted with natural luxury scents.",
    changefreq: "monthly",
    priority: 0.5,
  },
} satisfies Record<string, SeoPage>;

// One page per city (/cleaning/<city>) for local search
export const cityLandingPages: SeoPage[] = cityPages.map((c) => ({
  path: cityPagePath(c.slug),
  title: cityPageTitle(c.city),
  description: cityPageDescription(c),
  changefreq: "monthly",
  priority: 0.8,
}));

export const indexablePages: SeoPage[] = [...Object.values(seoPages), ...cityLandingPages];
