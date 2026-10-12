import { lang } from "./locale.ts";

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat(lang, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(iso));
}
