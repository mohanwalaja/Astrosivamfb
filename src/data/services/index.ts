import type { Service } from "../../types";
import { jathagam } from "./jathagam";
import { kidsJathagam } from "./kidsJathagam";
import { studentsJathagam } from "./studentsJathagam";
import { marriage } from "./marriage";
import { babyNaming } from "./babyNaming";
import { muhurtham } from "./muhurtham";
import { panchangam } from "./panchangam";
import { transits } from "./transits";
import { trust } from "./trust";

export const SERVICES: Service[] = [
  jathagam,
  kidsJathagam,
  studentsJathagam,
  marriage,
  babyNaming,
  muhurtham,
  panchangam,
  transits,
  trust,
];

export const SERVICE_MAP: Record<string, Service> = Object.fromEntries(
  SERVICES.map((service) => [service.id, service]),
);

export const getService = (id: string): Service => SERVICE_MAP[id] ?? SERVICES[0];

export const PAID_SERVICES = SERVICES.filter((service) => service.kind === "Paid report");

export const totalHashtags = () =>
  new Set(SERVICES.flatMap((s) => [...s.ig.hashtags, ...s.ig.extendedHashtags])).size;

// Age-gated Birth Jathagam helpers — mirrors the live site logic on /birth-jathagam
export type AgePlan = "kids-jathagam" | "students-jathagam" | "jathagam";
export const resolveBirthPlan = (ageYears: number): AgePlan => {
  if (ageYears >= 0 && ageYears <= 10) return "kids-jathagam";
  if (ageYears >= 11 && ageYears <= 18) return "students-jathagam";
  return "jathagam";
};
export const ageFromDob = (dob: string, today: Date = new Date()): number | null => {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age;
};
