/**
 * Real seat maps for Shree Movies, transcribed from box-office seating-chart
 * photos sent by the theater owner. Each row lists the exact seat numbers
 * that physically exist in that row — any number NOT listed is a real gap
 * (aisle, pillar, door, or step) in that row, not a missing seat.
 *
 * If you add or correct a screen, edit the row below and re-run the
 * "Load Screen 4, 6 & 7 seat maps" button on /admin/screens (safe to run
 * again — it updates the layout for a screen that already exists by name
 * instead of creating a duplicate).
 */
import type { ScreenLayout } from "./types";

function range(start: number, end: number): number[] {
  const out: number[] = [];
  for (let n = start; n <= end; n++) out.push(n);
  return out;
}

// ---------- Screen 4 ----------
// 16 rows (A front, closest to screen -> R back), up to 24 seats across.
const screen4: ScreenLayout = {
  rows: [
    { label: "A", seatNumbers: range(1, 9) },
    { label: "B", seatNumbers: range(1, 22) },
    { label: "C", seatNumbers: range(1, 22) },
    { label: "D", seatNumbers: range(1, 22) },
    { label: "E", seatNumbers: range(1, 22) },
    { label: "F", seatNumbers: range(1, 22) },
    { label: "G", seatNumbers: range(1, 22) },
    { label: "H", seatNumbers: range(1, 22) },
    { label: "J", seatNumbers: [1, 2, 3, 4, 19, 20, 21, 22] },
    { label: "L", seatNumbers: range(5, 19) },
    { label: "M", seatNumbers: range(5, 22) },
    { label: "N", seatNumbers: range(5, 22) },
    { label: "O", seatNumbers: range(5, 22) },
    { label: "P", seatNumbers: range(5, 22) },
    { label: "Q", seatNumbers: range(5, 22) },
    { label: "R", seatNumbers: range(4, 24) },
  ],
};

// ---------- Screen 6 ----------
// 13 rows (A front -> O back), up to 24 seats across. Row O is the back-most
// row and, unlike the rows in front of it, runs continuously across all 24
// seats with no center gap. Row B has a big center gap (3-6 on the left,
// 18-21 on the right).
const screen6: ScreenLayout = {
  rows: [
    { label: "A", seatNumbers: range(3, 21) },
    { label: "B", seatNumbers: [...range(3, 6), ...range(18, 21)] },
    { label: "C", seatNumbers: range(8, 14) },
    { label: "D", seatNumbers: range(3, 18) },
    { label: "E", seatNumbers: range(3, 18) },
    { label: "F", seatNumbers: range(3, 18) },
    { label: "G", seatNumbers: range(3, 18) },
    { label: "H", seatNumbers: range(3, 18) },
    { label: "J", seatNumbers: range(3, 18) },
    { label: "L", seatNumbers: range(3, 18) },
    { label: "M", seatNumbers: [...range(3, 18), ...range(22, 24)] },
    { label: "N", seatNumbers: [...range(3, 18), ...range(22, 24)] },
    { label: "O", seatNumbers: range(1, 24) },
  ],
};

// ---------- Screen 7 ----------
// 7 rows (A front, closest to screen -> G back).
// Row F has a gap at seat 18 (obstruction). Row C is a short row with only
// a few seats (8, 12-14) between long aisle sections.
const screen7: ScreenLayout = {
  rows: [
    { label: "A", seatNumbers: range(1, 21) },
    { label: "B", seatNumbers: range(1, 22) },
    { label: "C", seatNumbers: [8, 12, 13, 14] },
    { label: "D", seatNumbers: range(3, 19) },
    { label: "E", seatNumbers: range(3, 19) },
    { label: "F", seatNumbers: [...range(3, 17), 19] },
    { label: "G", seatNumbers: [...range(1, 21), 22] },
  ],
};

// ---------- Screen 2 ----------
// 13 rows (A front, closest to screen -> O back), up to 22 seats across.
// Row C is a short row (only 7 seats); row B has a big center gap.
const screen2: ScreenLayout = {
  rows: [
    { label: "A", seatNumbers: range(3, 21) },
    { label: "B", seatNumbers: [...range(3, 6), ...range(18, 21)] },
    { label: "C", seatNumbers: range(1, 7) },
    { label: "D", seatNumbers: range(6, 21) },
    { label: "E", seatNumbers: range(6, 21) },
    { label: "F", seatNumbers: range(6, 21) },
    { label: "G", seatNumbers: range(6, 21) },
    { label: "H", seatNumbers: range(6, 21) },
    { label: "J", seatNumbers: range(6, 21) },
    { label: "L", seatNumbers: range(6, 21) },
    { label: "M", seatNumbers: [1, 2, 3, ...range(6, 21)] },
    { label: "N", seatNumbers: [1, 2, 3, ...range(6, 21)] },
    { label: "O", seatNumbers: range(1, 22) },
  ],
};

// ---------- Screen 3 ----------
// 16 rows (A front, closest to screen -> R back), up to 24 seats across.
// Row J is a short row (a middle gap); row L is short and irregular.
const screen3: ScreenLayout = {
  rows: [
    { label: "A", seatNumbers: range(3, 24) },
    { label: "B", seatNumbers: range(3, 24) },
    { label: "C", seatNumbers: range(3, 24) },
    { label: "D", seatNumbers: range(3, 24) },
    { label: "E", seatNumbers: range(3, 24) },
    { label: "F", seatNumbers: range(3, 24) },
    { label: "G", seatNumbers: range(3, 24) },
    { label: "H", seatNumbers: range(3, 24) },
    { label: "J", seatNumbers: [3, 4, 5, 6, 21, 22, 23, 24] },
    { label: "L", seatNumbers: [3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17] },
    { label: "M", seatNumbers: range(3, 20) },
    { label: "N", seatNumbers: range(3, 20) },
    { label: "O", seatNumbers: range(3, 20) },
    { label: "P", seatNumbers: range(3, 20) },
    { label: "Q", seatNumbers: range(3, 20) },
    { label: "R", seatNumbers: range(1, 21) },
  ],
};

// ---------- Sala VIP ----------
// 4 rows (A front, closest to screen -> D back), 13 seats across.
const salaVip: ScreenLayout = {
  rows: [
    { label: "A", seatNumbers: range(1, 13) },
    { label: "B", seatNumbers: range(1, 13) },
    { label: "C", seatNumbers: range(1, 13) },
    { label: "D", seatNumbers: range(1, 13) },
  ],
};

// ---------- IMAX ----------
// 16 rows (A front, closest to screen -> R back), up to 31 seats across.
// Rows A-H, J, L, M, N all run the full width (1-31) with no gaps.
// Row O is short (3-24, no gap). Row P has single VIP/companion seats
// at 9 and 23 flanking a center
// block (10-22) plus a 3-seat VIP block at the far end (29-31). Rows Q and
// R are the back-most premium/recliner rows, centered under the screen
// (Q: 11-21, R: 6-25) rather than packed to the left. There's a wider
// walkway behind Q (between the recliners and the rest of the house),
// so Q is marked gapAfter.
const imax: ScreenLayout = {
  rows: [
    { label: "A", seatNumbers: range(1, 31) },
    { label: "B", seatNumbers: range(1, 31) },
    { label: "C", seatNumbers: range(1, 31) },
    { label: "D", seatNumbers: range(1, 31) },
    { label: "E", seatNumbers: range(1, 31) },
    { label: "F", seatNumbers: range(1, 31) },
    { label: "G", seatNumbers: range(1, 31) },
    { label: "H", seatNumbers: range(1, 31) },
    { label: "J", seatNumbers: range(1, 31) },
    { label: "L", seatNumbers: range(1, 31) },
    { label: "M", seatNumbers: range(1, 31) },
    { label: "N", seatNumbers: range(1, 31) },
    { label: "O", seatNumbers: range(3, 24) },
    { label: "P", seatNumbers: [...range(9, 23), ...range(29, 31)] },
    { label: "Q", seatNumbers: range(11, 21), gapAfter: true },
    { label: "R", seatNumbers: range(6, 25) },
  ],
};

export interface RealScreenDef {
  name: string;
  layout: ScreenLayout;
}

export const REAL_SCREENS: RealScreenDef[] = [
  { name: "Screen 2", layout: screen2 },
  { name: "Screen 3", layout: screen3 },
  { name: "Screen 4", layout: screen4 },
  { name: "Screen 6", layout: screen6 },
  { name: "Screen 7", layout: screen7 },
  { name: "Sala VIP", layout: salaVip },
  { name: "IMAX", layout: imax },
];

export function layoutSeatCount(layout: ScreenLayout): number {
  return layout.rows.reduce((sum, r) => sum + r.seatNumbers.length, 0);
}

export function layoutMaxSeatNumber(layout: ScreenLayout): number {
  let max = 0;
  for (const row of layout.rows) {
    for (const n of row.seatNumbers) max = Math.max(max, n);
  }
  return max;
}

// Row labels that should get a wider visual aisle gap drawn after them in
// the seat map (see ScreenLayoutRow.gapAfter). Safe to call with a plain
// grid screen's null layout_json — returns an empty list.
export function layoutGapAfterLabels(layout: ScreenLayout | null | undefined): string[] {
  if (!layout) return [];
  return layout.rows.filter((r) => r.gapAfter).map((r) => r.label);
}

// A seat's actual price: its row's override if the showtime has one for
// that row, otherwise the showtime's flat price_cents. Used everywhere a
// seat needs a real price — the seat map, the checkout total, and the
// server-side charge calculation — so there's exactly one place this logic
// lives (see bookSeatsAction in app/actions/booking.ts for why that matters:
// the server never trusts a client-submitted total).
export function rowPriceCents(
  showtime: { price_cents: number; row_price_overrides: Record<string, number> | null },
  rowLabel: string
): number {
  return showtime.row_price_overrides?.[rowLabel] ?? showtime.price_cents;
}

// IMAX's three ticket tiers (all in price_cents, i.e. AOA * 100):
// R, Q, P (the back premium/recliner rows) = 22000; O down through H = 18000;
// G down through A (the rest of the house) = 16000. A named preset so it can
// just be applied from the admin Showtime form instead of hand-typed.
export const IMAX_ROW_PRICE_TIERS: Record<string, number> = {
  R: 2200000,
  Q: 2200000,
  P: 2200000,
  O: 1800000,
  N: 1800000,
  M: 1800000,
  L: 1800000,
  J: 1800000,
  H: 1800000,
  G: 1600000,
  F: 1600000,
  E: 1600000,
  D: 1600000,
  C: 1600000,
  B: 1600000,
  A: 1600000,
};
