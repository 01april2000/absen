import type { Hari } from "@/generated/prisma/enums";

export const TIME_ZONE = "Asia/Jakarta";
export const GRACE_MINUTES = 15;

const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const HARI_BY_WEEKDAY: Record<number, Hari> = {
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
} as const;

export type JakartaParts = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getPartsInZone(date: Date, timeZone: string): JakartaParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hours: get("hour"),
    minutes: get("minute"),
    seconds: get("second"),
  };
}

export function getJakartaParts(date: Date): JakartaParts {
  return getPartsInZone(date, TIME_ZONE);
}

export function getJakartaNow(): Date {
  return new Date();
}

export function jakartaDateFromMs(ms: number): Date {
  return new Date(ms);
}

export function getHari(date: Date): Hari {
  const p = getJakartaParts(date);
  const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
  return HARI_BY_WEEKDAY[weekday];
}

export function getJakartaMinutes(date: Date): number {
  const p = getJakartaParts(date);
  return p.hours * 60 + p.minutes;
}

export function startOfJakartaDay(date: Date): Date {
  const p = getJakartaParts(date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - JAKARTA_OFFSET_MS);
}

export function startOfJakartaNextDay(date: Date): Date {
  return new Date(startOfJakartaDay(date).getTime() + DAY_MS);
}

export function toMinutes(value: string): number {
  const [h, m] = value.split(":");
  return Number(h) * 60 + Number(m);
}

export function formatJam(p: JakartaParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.hours)}:${pad(p.minutes)}:${pad(p.seconds)}`;
}

export function computeStatus(scanMin: number, startMin: number): "Hadir" | "Terlambat" {
  return scanMin <= startMin + GRACE_MINUTES ? "Hadir" : "Terlambat";
}