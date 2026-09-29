import { clientQuery, genId, query, withTransaction } from "./db";
import type {
  Booking,
  BookingStatus,
  Customer,
  Movie,
  MovieVoteCounts,
  PromoCode,
  Screen,
  ScreenLayout,
  Seat,
  Showtime,
  Theater,
  User,
  VoteValue,
} from "./types";

// ---------- Users ----------

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const { rows } = await query<User>("SELECT * FROM users WHERE email = $1", [
    email.toLowerCase().trim(),
  ]);
  return rows[0];
}

export async function getUserById(id: string): Promise<User | undefined> {
  const { rows } = await query<User>("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0];
}

// Used to gate the one-time /setup page: once a single admin exists, that
// page stops offering to create another one.
export async function hasAnyAdmin(): Promise<boolean> {
  const { rows } = await query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM users WHERE role = 'admin') as exists"
  );
  return Boolean(rows[0]?.exists);
}

export async function createUser(params: {
  name: string;
  email: string;
  passwordHash: string;
  role?: "customer" | "admin";
  phone?: string;
  whatsapp?: string;
}): Promise<User> {
  const id = genId("usr");
  const { rows } = await query<User>(
    `INSERT INTO users (id, name, email, password_hash, role, phone, whatsapp)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      id,
      params.name,
      params.email.toLowerCase().trim(),
      params.passwordHash,
      params.role ?? "customer",
      params.phone?.trim() || null,
      params.whatsapp?.trim() || null,
    ]
  );
  return rows[0];
}

// Customer accounts for the admin Users list — name, email, phone, WhatsApp,
// and block status, so an admin can see who has an account and shut off
// abusive ones. Admin accounts are excluded; this list is for managing
// customers, not other staff logins.
export async function listCustomers(): Promise<User[]> {
  const { rows } = await query<User>(
    "SELECT * FROM users WHERE role = 'customer' ORDER BY created_at DESC"
  );
  return rows;
}

// Blocks or unblocks a customer account. A blocked user can't log in
// (checked in loginAction) or place a new booking (checked in
// bookSeatsAction) — but note this doesn't forcibly end an already-active
// login session, since sessions here are self-contained JWTs with no
// server-side revocation list; the block takes full effect the next time
// they'd need to log in or book.
export async function setUserBlocked(userId: string, blocked: boolean): Promise<User> {
  const { rows } = await query<User>(
    "UPDATE users SET is_blocked = $1 WHERE id = $2 RETURNING *",
    [blocked, userId]
  );
  if (!rows[0]) throw new Error("USER_NOT_FOUND");
  return rows[0];
}

// ---------- Customers (master phone -> name directory) ----------
//
// This is intentionally separate from `users` (online login accounts) —
// see the comment on the `Customer` type. Every booking flow (admin walk-in,
// online signup) is expected to call upsertCustomer() with whatever phone +
// name it collects, so the directory only ever grows more complete, and
// findCustomerByPhone() so a previously-seen number can autofill a name
// instead of asking for it again.

export async function findCustomerByPhone(phone: string): Promise<Customer | undefined> {
  const normalized = phone.trim();
  if (!normalized) return undefined;
  const { rows } = await query<Customer>("SELECT * FROM customers WHERE phone = $1", [
    normalized,
  ]);
  return rows[0];
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  const { rows } = await query<Customer>("SELECT * FROM customers WHERE id = $1", [id]);
  return rows[0];
}

// The full master directory, for the admin "Customers" list — newest-added
// first, so a name just captured at the box office or at signup shows up
// right away.
export async function listAllCustomers(): Promise<Customer[]> {
  const { rows } = await query<Customer>(
    "SELECT * FROM customers ORDER BY updated_at DESC"
  );
  return rows;
}

// Creates the master record the first time a phone number is seen, or
// updates the name/WhatsApp on file when that same number is used again —
// so the directory always reflects the most recently given name for a
// number rather than freezing on whatever was typed first.
export async function upsertCustomer(params: {
  phone: string;
  name: string;
  whatsapp?: string | null;
}): Promise<Customer> {
  const id = genId("cus");
  const { rows } = await query<Customer>(
    `INSERT INTO customers (id, phone, name, whatsapp)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (phone) DO UPDATE SET
       name = EXCLUDED.name,
       whatsapp = COALESCE(EXCLUDED.whatsapp, customers.whatsapp),
       updated_at = now()
     RETURNING *`,
    [id, params.phone.trim(), params.name.trim(), params.whatsapp?.trim() || null]
  );
  return rows[0];
}

// Lets an admin set a new password directly on a customer's account — for
// when a customer forgets their password and calls/messages the theatre,
// since there's no self-service "forgot password" email flow. The admin
// picks (or generates) a new password and shares it with the customer
// themselves; this only ever writes an already-hashed password, never a
// plaintext one, to the database.
export async function setUserPassword(userId: string, passwordHash: string): Promise<User> {
  const { rows } = await query<User>(
    "UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *",
    [passwordHash, userId]
  );
  if (!rows[0]) throw new Error("USER_NOT_FOUND");
  return rows[0];
}

// ---------- Promo codes ----------
//
// Single-use discount codes — e.g. a WhatsApp campaign offering people who
// saw one movie a percentage off an upcoming show. See the `PromoCode` type
// for how customer_id/showtime_id lock a code to its intended audience.

// Looks up a code as redeemable right now for the given showtime: it must
// exist, not already be used, and (if it's showtime-locked) match this
// exact showtime. Does NOT mark it used — that's claimPromoCode(), called
// only once the booking it's for is actually about to be created, so a
// preview (e.g. showing the discount before the customer submits) never
// burns the code by itself.
export async function getRedeemablePromoCode(
  code: string,
  showtimeId: string
): Promise<PromoCode | undefined> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return undefined;
  const { rows } = await query<PromoCode>(
    `SELECT * FROM promo_codes
     WHERE code = $1 AND used_at IS NULL
       AND (showtime_id IS NULL OR showtime_id = $2)`,
    [normalized, showtimeId]
  );
  return rows[0];
}

// Atomically claims a code so two simultaneous redemption attempts can't
// both succeed — returns undefined if it was already used (or never
// existed) by the time this runs, which the caller should treat as "someone
// else just used it, stop and don't create the booking".
export async function claimPromoCode(id: string): Promise<PromoCode | undefined> {
  const { rows } = await query<PromoCode>(
    "UPDATE promo_codes SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING *",
    [id]
  );
  return rows[0];
}

// Hands a code back if the booking it was just claimed for then failed to
// create for an unrelated reason (e.g. the seats were taken in the same
// instant) — so a customer never loses their one-time code over a failure
// that wasn't about the code at all.
export async function releasePromoCode(id: string): Promise<void> {
  await query("UPDATE promo_codes SET used_at = NULL WHERE id = $1", [id]);
}

export async function createPromoCode(params: {
  code: string;
  discountPercent: number;
  customerId?: string | null;
  showtimeId?: string | null;
}): Promise<PromoCode> {
  const id = genId("promo");
  const { rows } = await query<PromoCode>(
    `INSERT INTO promo_codes (id, code, discount_percent, customer_id, showtime_id)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      id,
      params.code.trim().toUpperCase(),
      params.discountPercent,
      params.customerId ?? null,
      params.showtimeId ?? null,
    ]
  );
  return rows[0];
}

export interface PromoCodeWithDetails extends PromoCode {
  customer_name: string | null;
  showtime_label: string | null;
}

// For the admin Promotions list — newest first, with the showtime and
// customer it's locked to (if any) resolved to something readable instead
// of raw ids.
export async function listPromoCodes(): Promise<PromoCodeWithDetails[]> {
  const { rows } = await query<PromoCodeWithDetails>(
    `SELECT p.*, c.name as customer_name,
            CASE WHEN st.id IS NOT NULL
              THEN m.title || ' — ' || to_char(st.starts_at, 'DD Mon YYYY HH24:MI')
              ELSE NULL
            END as showtime_label
     FROM promo_codes p
     LEFT JOIN customers c ON c.id = p.customer_id
     LEFT JOIN showtimes st ON st.id = p.showtime_id
     LEFT JOIN movies m ON m.id = st.movie_id
     ORDER BY p.created_at DESC`
  );
  return rows;
}

// ---------- Movies ----------

export async function listMovies(): Promise<Movie[]> {
  const { rows } = await query<Movie>("SELECT * FROM movies ORDER BY created_at DESC");
  return rows;
}

// Customer-facing equivalent of listMovies() — excludes archived movies.
// Use this (not listMovies()) for anything a visitor sees: the homepage
// grids, language marquees, etc. listMovies() stays admin-only so the
// Movies admin page can still see and manage archived titles.
export async function listVisibleMovies(): Promise<Movie[]> {
  const { rows } = await query<Movie>(
    "SELECT * FROM movies WHERE archived_at IS NULL ORDER BY created_at DESC"
  );
  return rows;
}

export async function getMovie(id: string): Promise<Movie | undefined> {
  const { rows } = await query<Movie>("SELECT * FROM movies WHERE id = $1", [id]);
  return rows[0];
}

export async function listMoviesByLanguage(
  language: string,
  limit = 5
): Promise<Movie[]> {
  const { rows } = await query<Movie>(
    "SELECT * FROM movies WHERE language = $1 AND archived_at IS NULL ORDER BY created_at DESC LIMIT $2",
    [language, limit]
  );
  return rows;
}

export async function createMovie(params: {
  title: string;
  description?: string;
  posterUrl?: string;
  durationMinutes?: number;
  genre?: string;
  rating?: string;
  language?: string;
}): Promise<Movie> {
  const id = genId("mov");
  const { rows } = await query<Movie>(
    `INSERT INTO movies (id, title, description, poster_url, duration_minutes, genre, rating, language)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      id,
      params.title,
      params.description ?? null,
      params.posterUrl ?? null,
      params.durationMinutes ?? 120,
      params.genre ?? null,
      params.rating ?? null,
      params.language ?? null,
    ]
  );
  return rows[0];
}

export async function updateMovie(
  id: string,
  params: {
    title: string;
    description?: string;
    posterUrl?: string;
    durationMinutes?: number;
    genre?: string;
    rating?: string;
    language?: string;
  }
): Promise<Movie> {
  const { rows } = await query<Movie>(
    `UPDATE movies
     SET title = $1, description = $2, poster_url = $3,
         duration_minutes = $4, genre = $5, rating = $6, language = $8
     WHERE id = $7
     RETURNING *`,
    [
      params.title,
      params.description ?? null,
      params.posterUrl ?? null,
      params.durationMinutes ?? 120,
      params.genre ?? null,
      params.rating ?? null,
      id,
      params.language ?? null,
    ]
  );
  return rows[0];
}

// Hides a movie from every customer-facing screen (homepage grids, the
// language poster marquee, its own /movies/[id] page) without touching its
// showtimes, seats, or bookings — the safe alternative to deleteMovie().
// Reversible via unarchiveMovie().
export async function archiveMovie(id: string): Promise<Movie> {
  const { rows } = await query<Movie>(
    "UPDATE movies SET archived_at = now() WHERE id = $1 RETURNING *",
    [id]
  );
  return rows[0];
}

export async function unarchiveMovie(id: string): Promise<Movie> {
  const { rows } = await query<Movie>(
    "UPDATE movies SET archived_at = NULL WHERE id = $1 RETURNING *",
    [id]
  );
  return rows[0];
}

// Deleting a movie cascades (via FK ON DELETE CASCADE) through all of its
// showtimes, seats, bookings, and booking_seats — permanently and
// irrecoverably. Refuse when any non-cancelled booking exists anywhere
// under this movie, so an admin who wants a movie off the site is forced
// into archiveMovie() (or closeShowtime() for a single session) instead of
// silently destroying real booking/revenue history.
export async function deleteMovie(id: string) {
  const { rows } = await query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM bookings b
     JOIN showtimes st ON st.id = b.showtime_id
     WHERE st.movie_id = $1 AND b.status != 'cancelled'`,
    [id]
  );
  if (Number(rows[0]?.count ?? 0) > 0) {
    throw new Error("MOVIE_HAS_BOOKINGS");
  }
  await query("DELETE FROM movies WHERE id = $1", [id]);
}

// ---------- Theaters / Screens ----------

export async function listTheaters(): Promise<Theater[]> {
  const { rows } = await query<Theater>("SELECT * FROM theaters");
  return rows;
}

export async function createTheater(name: string, address?: string): Promise<Theater> {
  const id = genId("thr");
  const { rows } = await query<Theater>(
    "INSERT INTO theaters (id, name, address) VALUES ($1, $2, $3) RETURNING *",
    [id, name, address ?? null]
  );
  return rows[0];
}

export async function listScreens(theaterId?: string): Promise<Screen[]> {
  if (theaterId) {
    const { rows } = await query<Screen>(
      "SELECT * FROM screens WHERE theater_id = $1",
      [theaterId]
    );
    return rows;
  }
  const { rows } = await query<Screen>("SELECT * FROM screens");
  return rows;
}

export async function getScreen(id: string): Promise<Screen | undefined> {
  const { rows } = await query<Screen>("SELECT * FROM screens WHERE id = $1", [id]);
  return rows[0];
}

export async function createScreen(params: {
  theaterId: string;
  name: string;
  rows?: number;
  cols?: number;
  layout?: ScreenLayout;
}): Promise<Screen> {
  const id = genId("scr");
  const { rows } = await query<Screen>(
    "INSERT INTO screens (id, theater_id, name, rows, cols, layout_json) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
    [
      id,
      params.theaterId,
      params.name,
      params.rows ?? 8,
      params.cols ?? 10,
      params.layout ? JSON.stringify(params.layout) : null,
    ]
  );
  return rows[0];
}

// Removes a screen, but only if no showtimes have ever been scheduled on it —
// otherwise this would silently cascade-delete those showtimes (and any
// bookings/tickets tied to them). Used to clean up placeholder screens.
export async function deleteScreen(id: string): Promise<void> {
  const { rows } = await query<{ count: string }>(
    "SELECT COUNT(*) as count FROM showtimes WHERE screen_id = $1",
    [id]
  );
  if (Number(rows[0]?.count ?? 0) > 0) {
    throw new Error("SCREEN_HAS_SHOWTIMES");
  }
  await query("DELETE FROM screens WHERE id = $1", [id]);
}

// Updates an existing screen's real seat map in place (used when re-loading
// the theater's official layouts — safe to run repeatedly since it matches
// by screen id, not by inserting a new row).
export async function updateScreenLayout(params: {
  screenId: string;
  layout: ScreenLayout;
  rows: number;
  cols: number;
}): Promise<Screen> {
  const { rows } = await query<Screen>(
    "UPDATE screens SET layout_json = $1, rows = $2, cols = $3 WHERE id = $4 RETURNING *",
    [JSON.stringify(params.layout), params.rows, params.cols, params.screenId]
  );
  return rows[0];
}

// ---------- Showtimes ----------

export interface ShowtimeWithMovie extends Showtime {
  movie_title: string;
  screen_name: string;
  theater_name: string;
}

const SHOWTIME_JOIN = `
  FROM showtimes st
  JOIN movies m ON m.id = st.movie_id
  JOIN screens sc ON sc.id = st.screen_id
  JOIN theaters th ON th.id = sc.theater_id
`;
const SHOWTIME_SELECT = `SELECT st.*, m.title as movie_title, sc.name as screen_name, th.name as theater_name`;

// Customer-facing (movie detail page), so a closed showtime never appears
// as bookable again.
export async function listShowtimesForMovie(movieId: string): Promise<ShowtimeWithMovie[]> {
  const { rows } = await query<ShowtimeWithMovie>(
    `${SHOWTIME_SELECT} ${SHOWTIME_JOIN} WHERE st.movie_id = $1 AND st.closed_at IS NULL ORDER BY st.starts_at ASC`,
    [movieId]
  );
  return rows;
}

export async function listAllShowtimes(): Promise<ShowtimeWithMovie[]> {
  const { rows } = await query<ShowtimeWithMovie>(
    `${SHOWTIME_SELECT} ${SHOWTIME_JOIN} ORDER BY st.starts_at ASC`
  );
  return rows;
}

// Every showtime that hasn't been closed yet — what the day-to-day admin
// Showtimes dashboard shows, so a closed showtime (its screening is done)
// stops cluttering the operational list. Reports still uses listAllShowtimes
// above so closed showtimes remain fully selectable there for historical
// CSVs/printouts.
export async function listActiveShowtimes(): Promise<ShowtimeWithMovie[]> {
  const { rows } = await query<ShowtimeWithMovie>(
    `${SHOWTIME_SELECT} ${SHOWTIME_JOIN} WHERE st.closed_at IS NULL ORDER BY st.starts_at ASC`
  );
  return rows;
}

// Showtimes an admin has explicitly closed — most-recently-closed screening
// first, so the admin Showtimes page's "Closed shows" section reads newest
// on top.
export async function listClosedShowtimes(): Promise<ShowtimeWithMovie[]> {
  const { rows } = await query<ShowtimeWithMovie>(
    `${SHOWTIME_SELECT} ${SHOWTIME_JOIN} WHERE st.closed_at IS NOT NULL ORDER BY st.starts_at DESC`
  );
  return rows;
}

// Closes a showtime once its screening is done — hides it from every
// customer-facing and day-to-day admin screen (homepage, movie page, new
// walk-in booking, the active Showtimes dashboard) without touching a
// single booking, seat, or ticket record: this only ever sets a timestamp,
// never deletes anything, so every booking reference and ticket count stays
// fully intact for Reports/CSV lookups later. Reversible via
// reopenShowtime below. COALESCE means re-closing an already-closed
// showtime never overwrites the original close time.
export async function closeShowtime(id: string): Promise<void> {
  await query("UPDATE showtimes SET closed_at = COALESCE(closed_at, now()) WHERE id = $1", [id]);
}

// Undoes a close — e.g. it was closed by mistake, or a walk-in sale needs
// to be added after all.
export async function reopenShowtime(id: string): Promise<void> {
  await query("UPDATE showtimes SET closed_at = NULL WHERE id = $1", [id]);
}

// Batch-computes, per showtime, how many paid seats have been admitted at
// the door vs. how many were sold in total — shown as "X / Y admitted" on
// the admin Showtimes list. One grouped query for all requested showtimes
// (rather than one query per
