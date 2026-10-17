import type { ServiceItem } from "@shared/types";

// "Home Cleaning" groups two Square services under one card:
//   - "Weekly & Biweekly Cleaning"          -> weekly / bi-weekly
//   - "Reset, Monthly & One Time Cleaning"  -> one-time / monthly

export type CleaningFrequency = "one-time" | "weekly" | "bi-weekly" | "monthly";

export const HOME_CLEANING_TITLE = "🏠 Home Cleaning";
export const HOME_CLEANING_DESCRIPTION =
  "Choose a one-time refresh or a recurring plan to keep your home polished and welcoming.";

export const HOME_CLEANING_OPTIONS: { frequency: CleaningFrequency; label: string; discount: number }[] = [
  { frequency: "one-time", label: "One-Time Cleaning", discount: 0 },
  { frequency: "weekly", label: "Weekly Cleaning", discount: 20 },
  { frequency: "bi-weekly", label: "Biweekly Cleaning", discount: 15 },
  { frequency: "monthly", label: "Monthly Cleaning", discount: 10 },
];

const lowerTitle = (service: ServiceItem) => (service.title ?? service.name ?? "").toLowerCase();

const isRecurringHomeService = (service: ServiceItem) => {
  const t = lowerTitle(service);
  return t.includes("weekly") && (t.includes("biweekly") || t.includes("bi-weekly"));
};

const isOneTimeHomeService = (service: ServiceItem) => {
  const t = lowerTitle(service);
  return t.includes("monthly") && (t.includes("one time") || t.includes("one-time"));
};

export const isHomeCleaningService = (service: ServiceItem) =>
  isRecurringHomeService(service) || isOneTimeHomeService(service);

export const isCleaningFrequency = (value: unknown): value is CleaningFrequency =>
  HOME_CLEANING_OPTIONS.some((option) => option.frequency === value);

export const findHomeCleaningService = (services: ServiceItem[], frequency: CleaningFrequency) =>
  services.find(
    frequency === "weekly" || frequency === "bi-weekly" ? isRecurringHomeService : isOneTimeHomeService,
  );

export const getHomeCleaningLabel = (frequency: CleaningFrequency) =>
  HOME_CLEANING_OPTIONS.find((option) => option.frequency === frequency)?.label ?? "Home Cleaning";
