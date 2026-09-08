export const CONSUMER_SOURCES = [
  { id: "equifax", label: "Equifax" },
  { id: "experian", label: "Experian" },
  { id: "transunion", label: "TransUnion" },
] as const;

export const CONSUMER_PRODUCTS = [
  { id: "fico8", label: "FICO Score 8" },
  { id: "fico9", label: "FICO Score 9" },
  { id: "fico10", label: "FICO Score 10" },
  { id: "vantage4", label: "VantageScore 4.0" },
] as const;

export const BUSINESS_SOURCES = [
  { id: "experianBusiness", label: "Experian Business" },
  { id: "equifaxBusiness", label: "Equifax Business (SBFE)" },
  { id: "dnb", label: "Dun & Bradstreet" },
] as const;

export const BUSINESS_PRODUCTS: Record<string, { id: string; label: string }[]> = {
  experianBusiness: [
    { id: "intelliscorePlus", label: "Intelliscore Plus" },
    { id: "fsr", label: "Financial Stability Risk" },
  ],
  equifaxBusiness: [
    { id: "oneScore", label: "OneScore for Commercial" },
    { id: "sbfeBlend", label: "SBFE blended delinquency" },
  ],
  dnb: [
    { id: "paydex", label: "PAYDEX" },
    { id: "dnbRating", label: "D&B Rating" },
  ],
};

export type ConsumerSourceId = (typeof CONSUMER_SOURCES)[number]["id"];
export type ConsumerProductId = (typeof CONSUMER_PRODUCTS)[number]["id"];
export type BusinessSourceId = (typeof BUSINESS_SOURCES)[number]["id"];
