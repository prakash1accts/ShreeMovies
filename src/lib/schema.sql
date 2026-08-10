-- Cinema Booking App Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  phone TEXT, -- local phone number, captured at signup for calls/SMS
  whatsapp TEXT, -- WhatsApp number, captured separately since it may differ from `phone`
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp TEXT;

CREATE TABLE IF NOT EXISTS theaters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS screens (
  id TEXT PRIMARY KEY,
  theater_id TEXT NOT NULL REFERENCES theaters(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL DEFAULT 8,
  cols INTEGER NOT NULL DEFAULT 10,
  -- Optional real seat map: { rows: [{ label: "A", seatNumbers: [3,4,5,...] }, ...] }.
  -- When set, showtimes on this screen use this exact layout (with its real
  -- gaps for aisles/pillars) instead of a plain rows x cols grid.
  layout_json JSONB
);
ALTER TABLE screens ADD COLUMN IF NOT EXISTS layout_json JSONB;

CREATE TABLE IF NOT EXISTS movies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 120,
  genre TEXT,
  rating TEXT, -- e.g. PG-13
  language TEXT, -- e.g. "Hindi", "Tamil", "Telugu", "English" — used for the homepage poster carousel
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE movies ADD COLUMN IF NOT EXISTS language TEXT;

CREATE TABLE IF NOT EXISTS showtimes (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  screen_id TEXT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 1200
);

-- One row per seat per showtime, created at showtime-creation time
CREATE TABLE IF NOT EXISTS seats (
  id TEXT PRIMARY KEY,
  showtime_id TEXT NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
  row_label TEXT NOT NULL,
  col_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'held' | 'booked'
  held_at TIMESTAMPTZ, -- when status was set to 'held', so stale holds can expire
  UNIQUE(showtime_id, row_label, col_number)
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE, -- null for admin-entered walk-in/phone bookings with no online account
  showtime_id TEXT NOT NULL REFERENCES showtimes(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled'
  total_cents INTEGER NOT NULL,
  stripe_session_id TEXT,
  customer_name TEXT, -- set for admin-entered bookings (walk-in customer name)
  unit_price_cents INTEGER, -- price per ticket, for admin-entered bookings
  payment_terms TEXT, -- 'cash' | 'deposit' (admin-entered bookings only)
  deposit_reference TEXT, -- bank transfer / deposit slip reference, captured either at booking (walk-ins) or when confirming an online payment
  deposit_date DATE,
  payment_proof_url TEXT, -- photo/PDF of the transfer receipt, captured when admin confirms payment
  booking_number TEXT, -- human-friendly reference assigned on payment confirmation, e.g. "VISW161201"
  seats_changed_note TEXT, -- set when admin re-seats a paid booking, so the customer sees "seats changed" and knows to reprint
  created_by_admin BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ, -- set when staff tap "Admit" on the ticket-verification screen (QR scan at the door); null means not yet admitted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_reference TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_number TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seats_changed_note TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, seat_id)
);

-- One counter per showtime, used to hand out sequential booking numbers
-- (e.g. the "01" in "VISW161201") atomically without a race between two
-- payments confirmed at the same moment.
CREATE TABLE IF NOT EXISTS showtime_booking_counters (
  showtime_id TEXT PRIMARY KEY REFERENCES showtimes(id) ON DELETE CASCADE,
  next_seq INTEGER NOT NULL DEFAULT 1
);

-- Anonymous "interested / not interested" votes on movies, shown as a
-- thumbs-up / thumbs-down count on the homepage poster grid. voter_key is a
-- random id stored in a browser cookie (no account needed to vote), so each
-- visitor's vote on a given movie can be changed but not duplicated.
CREATE TABLE IF NOT EXISTS movie_votes (
  id TEXT PRIMARY KEY,
  movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  voter_key TEXT NOT NULL,
  vote TEXT NOT NULL, -- 'up' | 'down'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(movie_id, voter_key)
);

CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON showtimes(movie_id);
CREATE INDEX IF NOT EXISTS idx_seats_showtime ON seats(showtime_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_showtime ON bookings(showtime_id);
CREATE INDEX IF NOT EXISTS idx_movie_votes_movie ON movie_votes(movie_id);
