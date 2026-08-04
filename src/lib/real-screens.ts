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
// 12 rows (A front -> N back), up to 24 seats across.
const screen6: ScreenLayout = {
  rows: [
    { label: "A", seatNumbers: range(3, 21) },
    { label: "B", seatNumbers: range(3, 6) },
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
  ],
};

// ---------- Screen 7 ----------
// 7 rows (B front -> G back); row A has no bookable seats in the photo.
// Row F has a gap at seat 18 (obstruction). Row C is a short row with only
// a few seats (8, 12-14, 17-22) between long aisle sections.
const screen7: ScreenLayout = {
  rows: [
    { label: "B", seatNumbers: range(3, 22) },
    { label: "C", seatNumbers: [8, 12, 13, 14, 17, 18, 19, 20, 21, 22] },
    { label: "D", seatNumbers: range(3, 19) },
    { label: "E", seatNumbers: range(3, 19) },
    { label: "F", seatNumbers: [...range(3, 17), 19] },
    { label: "G", seatNumbers: range(1, 21) },
  ],
};

export interface RealScreenDef {
  name: string;
  layout: ScreenLayout;
}

export const REAL_SCREENS: RealScreenDef[] = [
  { name: "Screen 4", layout: screen4 },
  { name: "Screen 6", layout: screen6 },
  { name: "Screen 7", layout: screen7 },
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
