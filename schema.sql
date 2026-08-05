-- Cinema Booking App Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer', -- 'customer' | 'admin'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
  deposit_reference TEXT,
  deposit_date DATE,
  created_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS unit_price_cents INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_terms TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_reference TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS booking_seats (
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  PRIMARY KEY (booking_id, seat_id)
);

CREATE INDEX IF NOT EXISTS idx_showtimes_movie ON showtimes(movie_id);
CREATE INDEX IF NOT EXISTS idx_seats_showtime ON seats(showtime_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_showtime ON bookings(showtime_id);
