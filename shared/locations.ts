// Service areas for Millan Luxury Cleaning in Arizona
export const serviceAreas = [
  {
    city: "Phoenix",
    state: "AZ",
    keywords: "house cleaning Phoenix AZ, deep cleaning Phoenix, move out cleaning Phoenix"
  },
  {
    city: "Scottsdale",
    state: "AZ",
    keywords: "house cleaning Scottsdale AZ, deep cleaning Scottsdale, move out cleaning Scottsdale"
  },
  {
    city: "Chandler",
    state: "AZ",
    keywords: "house cleaning Chandler AZ, deep cleaning Chandler, move out cleaning Chandler"
  },
  {
    city: "Mesa",
    state: "AZ",
    keywords: "house cleaning Mesa AZ, deep cleaning Mesa, move out cleaning Mesa"
  },
  {
    city: "Gilbert",
    state: "AZ",
    keywords: "house cleaning Gilbert AZ, deep cleaning Gilbert, move out cleaning Gilbert"
  },
  {
    city: "Tempe",
    state: "AZ",
    keywords: "house cleaning Tempe AZ, deep cleaning Tempe, move out cleaning Tempe"
  },
  {
    city: "Glendale",
    state: "AZ",
    keywords: "house cleaning Glendale AZ, deep cleaning Glendale, move out cleaning Glendale"
  },
  {
    city: "Peoria",
    state: "AZ",
    keywords: "house cleaning Peoria AZ, deep cleaning Peoria, move out cleaning Peoria"
  },
  {
    city: "Goodyear",
    state: "AZ",
    keywords: "house cleaning Goodyear AZ, deep cleaning Goodyear, move out cleaning Goodyear"
  },
  {
    city: "Queen Creek",
    state: "AZ",
    keywords: "house cleaning Queen Creek AZ, deep cleaning Queen Creek, move out cleaning Queen Creek"
  }
];

// Additional cities from the Google Business Profile service area
export const additionalServiceAreas = ["Surprise", "Sun City", "El Mirage", "Avondale", "Tolleson", "Litchfield Park", "Buckeye", "Paradise Valley", "Fountain Hills"];

export const googleMyBusinessInfo = {
  businessName: "Millan Luxury Cleaning",
  address: "Phoenix, AZ",
  phone: "(602) 596-7393",
  serviceAreas: [...serviceAreas.map(area => `${area.city}, ${area.state}`), ...additionalServiceAreas.map(city => `${city}, AZ`)],
  businessType: "House Cleaning Service",
  description: "Premium luxury cleaning services serving Phoenix and surrounding areas with deep cleaning, move-in/move-out, and laundry services"
};

export const locationKeywords = [
  "luxury cleaning Phoenix",
  "premium house cleaning Arizona",
  "deep cleaning Surprise",
  "moving cleaning Chandler",
  "residential cleaning Glendale",
  "home cleaning Mesa",
  "professional cleaning Scottsdale",
  "move in out cleaning Tempe",
  ...serviceAreas.flatMap(area => area.keywords.split(", "))
];

export function getLocationsList(): string {
  return serviceAreas.map(area => `${area.city}, AZ`).join(", ");
}
