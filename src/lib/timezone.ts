// Shree Movies operates a single venue in Luanda, Angola — West Africa
// Time, UTC+1 year round (no daylight saving, so this offset never
// changes). Showtimes should always be entered and displayed as this
// venue's local wall-clock time, regardless of what timezone the admin's
// browser, a customer's phone, or the server happens to be running in.
export const VENUE_TIMEZONE = "Africa/Luanda";
const VENUE_UTC_OFFSET = "+01:00";

// Combines a <input type="date"> value ("2026-08-16") and a
// <input type="time"> value ("12:01") into the correct UTC instant,
// treating them as venue-local time. Without this, `new Date(...)` on a
// plain "2026-08-16T12:01:00" string is parsed using whatever timezone
// the code happens to run in (UTC on Vercel), silently shifting every
// showtime by an hour.
export function parseVenueDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${VENUE_UTC_OFFSET}`);
}

// Formats a stored timestamp as venue-local time, for display anywhere in
// the app — admin dashboard, customer pages, printed/shared tickets — so
// everyone sees the same showtime, regardless of their own timezone.
export function formatVenueDateTime(
  iso: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(iso).toLocaleString(undefined, { timeZone: VENUE_TIMEZONE, ...options });
}

export function formatVenueDate(
  iso: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(iso).toLocaleDateString(undefined, { timeZone: VENUE_TIMEZONE, ...options });
}

export function formatVenueTime(
  iso: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(iso).toLocaleTimeString(undefined, { timeZone: VENUE_TIMEZONE, ...options });
}

// Splits a stored timestamp back into the separate date/time strings the
// <input type="date"> / <input type="time"> fields need, expressed in
// venue-local time — so opening "Edit showtime" and resubmitting without
// changes round-trips to the same instant instead of drifting.
export function splitVenueDateTime(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VENUE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}
