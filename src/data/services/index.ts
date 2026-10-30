import type { Service } from "../../types";
import { jathagam } from "./jathagam";
import { marriage } from "./marriage";
import { babyNaming } from "./babyNaming";
import { muhurtham } from "./muhurtham";
import { panchangam } from "./panchangam";
import { transits } from "./transits";
import { trust } from "./trust";

export const SERVICES: Service[] = [
  jathagam,
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
