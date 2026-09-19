import { TZDate } from "@date-fns/tz";
import { clsx, type ClassValue } from "clsx";
import { format, formatRelative as formatRelativeTo, startOfMonth } from "date-fns";
import { et } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value: Date | string): string {
  return format(new TZDate(toDate(value), "Europe/Tallinn"), "d. MMM yyyy HH:mm", { locale: et });
}

export function formatDate(value: Date | string): string {
  return format(new TZDate(toDate(value), "Europe/Tallinn"), "d. MMM yyyy", { locale: et });
}

export function formatRelative(value: Date | string): string {
  return formatRelativeTo(
    new TZDate(toDate(value), "Europe/Tallinn"),
    TZDate.tz("Europe/Tallinn"),
    { locale: et },
  );
}

export function startOfMonthInTallinn(now: Date = new Date()): Date {
  return startOfMonth(new TZDate(now, "Europe/Tallinn"));
}

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}
