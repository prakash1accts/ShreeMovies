export type Role = "customer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  phone: string | null;
  whatsapp: string | null;
  is_blocked: boolean;
  created_at: string;
}

export interface Theater {
  id: string;
  name: string;
  address: string | null;
}

export interface ScreenLayoutRow {
  label: string;
  // The exact seat numbers that exist in this row. Any number not listed is
  // a real gap in the physical row (aisle, pillar, door, step, etc.).
  seatNumbers: number[];
}

export interface ScreenLayout {
  rows: ScreenLayoutRow[];
}

export interface Screen {
  id: string;
  theater_id: string;
  name: string;
  rows: number;
  cols: number;
  // Present only for screens with a real, irregular seat map. Null means
  // "use the plain rows x cols grid" (the original default behavior).
  layout_json: ScreenLayout | null;
}

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  duration_minutes: number;
  genre: string | null;
  rating: string | null;
  language: string | null;
  created_at: string;
}

export interface Showtime {
  id: string;
  movie_id: string;
  screen_id: string;
  starts_at: string;
  price_cents: number;
  hold_minutes: number;
  // Set once an admin "closes" this showtime after the screening is done —
  // null means still active/open. See closeShowtime()/reopenShowtime() in
  // data.ts for what closing does and doesn't touch.
  closed_at: string | null;
}

// "blocked" is an admin-only state — a seat taken out of sale (broken seat,
// VIP hold, etc.) without a real booking behind it. Never set by the
// booking flow itself, only by an admin via blockSeats()/unblockSeats().
export type SeatStatus = "available" | "held" | "booked" | "blocked";

export interface Seat {
  id: string;
  showtime_id: string;
  row_label: string;
  col_number: number;
  status: SeatStatus;
}

export type BookingStatus = "pending" | "paid" | "cancelled";
// "cash_due" = seats are locked in and the ticket is printed, but the
// customer will pay cash at the door rather than having paid already —
// flagged prominently to gate staff when the ticket is scanned so they know
// to collect payment before admitting. markCashCollected() in data.ts flips
// it to "cash" once staff actually collect it.
export type PaymentTerms = "cash" | "deposit" | "cash_due";

export interface Booking {
  id: string;
  user_id: string | null;
  showtime_id: string;
  status: BookingStatus;
  total_cents: number;
  stripe_session_id: string | null;
  customer_name: string | null;
  customer_id: string | null;
  unit_price_cents: number | null;
  payment_terms: PaymentTerms | null;
  deposit_reference: string | null;
  deposit_date: string | null;
  payment_proof_url: string | null;
  booking_number: string | null;
  seats_changed_note: string | null;
  cancel_reason: string | null;
  created_by_admin: boolean;
  checked_in_at: string | null;
  created_at: string;
  // Set when a promo code was redeemed for this booking — the code text
  // itself (for display/receipts) and the amount actually knocked off
  // total_cents. discount_cents is 0 (never null) when no code was used.
  promo_code: string | null;
  discount_cents: number;
}

// Master phone -> name directory. Deliberately separate from `User` (which
// is an online login account with a password): a customer doesn't need to
// create an account to have their name on file here. Looked up by phone
// number so a name only ever has to be typed once, whether they first show
// up as an admin-entered walk-in sale or a self-service online signup.
export interface Customer {
  id: string;
  phone: string;
  name: string;
  whatsapp: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

// A discount code, e.g. for a WhatsApp campaign offering people who saw one
// movie a percentage off an upcoming show. Deliberately single-use (see
// used_at) rather than a general coupon anyone can apply repeatedly —
// customer_id and/or showtime_id, when set, lock it to one specific
// customer and/or one specific showtime so a forwarded/leaked code can't be
// redeemed outside its intended audience or show.
export interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  customer_id: string | null;
  showtime_id: string | null;
  // Null = still redeemable. Set the moment it's successfully applied to a
  // booking — see claimPromoCode()/releasePromoCode() in data.ts.
  used_at: string | null;
  created_at: string;
}

export type VoteValue = "up" | "down";

export interface MovieVoteCounts {
  up: number;
  down: number;
}
