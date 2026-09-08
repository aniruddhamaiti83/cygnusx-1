export const ACCOUNT_ROLES = [
  { id: "borrower", label: "Borrower" },
  { id: "coborrower", label: "Co-borrower" },
  { id: "signor", label: "Signor" },
  { id: "guarantor", label: "Guarantor" },
  { id: "relatedParty", label: "Related party" },
] as const;

export type AccountRole = (typeof ACCOUNT_ROLES)[number]["id"];

export const GENDERS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
  { id: "other", label: "Other" },
  { id: "preferNotToSay", label: "Prefer not to say" },
] as const;

export const RACES = [
  { id: "americanIndian", label: "American Indian or Alaska Native" },
  { id: "asian", label: "Asian" },
  { id: "black", label: "Black or African American" },
  { id: "pacificIslander", label: "Native Hawaiian or Other Pacific Islander" },
  { id: "white", label: "White" },
  { id: "preferNotToSay", label: "Prefer not to say" },
] as const;

export const ETHNICITIES = [
  { id: "hispanic", label: "Hispanic or Latino" },
  { id: "notHispanic", label: "Not Hispanic or Latino" },
  { id: "preferNotToSay", label: "Prefer not to say" },
] as const;

export const BUSINESS_TYPES = [
  { id: "soleProp", label: "Sole proprietorship" },
  { id: "llc", label: "LLC" },
  { id: "corp", label: "Corporation" },
  { id: "lp", label: "Limited partnership" },
  { id: "gp", label: "General partnership" },
  { id: "nonprofit", label: "Nonprofit" },
  { id: "trust", label: "Trust" },
  { id: "other", label: "Other" },
] as const;

export type PostalAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
};

export const EMPTY_ADDRESS: PostalAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
};

export function newId(): string {
  return crypto.randomUUID();
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatSsn(value: string): string {
  const d = digitsOnly(value).slice(0, 9);
  if (d.length <= 3) return d;
  if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

export function formatEin(value: string): string {
  const d = digitsOnly(value).slice(0, 9);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}-${d.slice(2)}`;
}

export async function tokenizeTaxId(raw: string): Promise<{ token: string; last4: string }> {
  const digits = digitsOnly(raw);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`cx1.tax:${digits}`));
  const token = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return { token, last4: digits.slice(-4) };
}

export function isCompleteAddress(a: PostalAddress): boolean {
  return Boolean(a.line1.trim() && a.city.trim() && a.state && digitsOnly(a.postalCode).length === 5);
}

export function adultOn(dob: string): boolean {
  if (!dob) return false;
  const born = new Date(`${dob}T00:00:00`);
  if (Number.isNaN(born.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1;
  return age >= 18;
}

export function formatMoneyInput(value: string): string {
  const d = value.replace(/[^\d.]/g, "");
  const [whole, frac] = d.split(".");
  return frac !== undefined ? `${whole}.${frac.slice(0, 2)}` : whole;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatPhone(value: string): string {
  const d = digitsOnly(value).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function isPhone(value: string): boolean {
  return digitsOnly(value).length === 10;
}
