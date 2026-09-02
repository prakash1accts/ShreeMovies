import { clientQuery, genId, query, withTransaction } from "./db";
import type {
  Booking,
  BookingStatus,
  Movie,
  MovieVoteCounts,
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

// Lets an admin set a new password directly on a customer's account — for
// when a customer forgets their password and calls/messages the theatre
// directly, since there's no self-service "forgot password" email flow. The
// admin picks (or generates) a new password and shares it with the customer
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

// ---------- Movies ----------

export async function listMovies(): Promise<Movie[]> {
  const { rows } = await query<Movie>("SELECT * FROM movies ORDER BY created_at DESC");
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
    "SELECT * FROM movies WHERE language = $1 ORDER BY created_at DESC LIMIT $2",
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

export async function deleteMovie(id: string) {
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

export async function listShowtimesForMovie(movieId: string): Promise<ShowtimeWithMovie[]> {
  const { rows } = await query<ShowtimeWithMovie>(
    `${SHOWTIME_SELECT} ${SHOWTIME_JOIN} WHERE st.movie_id = $1 ORDER BY st.starts_at ASC`,
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

// Batch-computes, per showtime, how many paid seats have been admitted at
// the door vs. how many were sold in total — shown as "X / Y admitted" on
// the admin Showtimes list. One grouped query for all requested showtimes
// (rather than one query per showtime) to avoid N+1 lookups, following the
// same pattern as getVoteCountsForMovies below.
export async function getAdmissionStatsForShowtimes(
  showtimeIds: string[]
): Promise<Record<string, { admitted: number; total: number }>> {
  const result: Record<string, { admitted: number; total: number }> = {};
  for (const id of showtimeIds) result[id] = { admitted: 0, total: 0 };
  if (showtimeIds.length === 0) return result;

  const { rows } = await query<{ showtime_id: string; total: string; admitted: string }>(
    `SELECT b.showtime_id,
            COUNT(bs.seat_id) as total,
            COUNT(bs.seat_id) FILTER (WHERE b.checked_in_at IS NOT NULL) as admitted
     FROM bookings b
     JOIN booking_seats bs ON bs.booking_id = b.id
     WHERE b.status = 'paid' AND b.showtime_id = ANY($1)
     GROUP BY b.showtime_id`,
    [showtimeIds]
  );
  for (const row of rows) {
    result[row.showtime_id] = { admitted: Number(row.admitted), total: Number(row.total) };
  }
  return result;
}

// Only showtimes that haven't started yet — used for the admin "new
// booking" screen so staff aren't selling tickets for a show that already
// happened.
export async function listUpcomingShowtimes(): Promise<ShowtimeWithMovie[]> {
  const { rows } = await query<ShowtimeWithMovie>(
    `${SHOWTIME_SELECT} ${SHOWTIME_JOIN} WHERE st.starts_at >= now() ORDER BY st.starts_at ASC`
  );
  return rows;
}

export async function getShowtime(id: string): Promise<ShowtimeWithMovie | undefined> {
  const { rows } = await query<ShowtimeWithMovie>(
    `${SHOWTIME_SELECT} ${SHOWTIME_JOIN} WHERE st.id = $1`,
    [id]
  );
  return rows[0];
}

// Shared by createShowtime, resyncShowtimeSeats, and updateShowtime — inserts
// one 'available' seat row per seat that actually exists on `screen`,
// whether that's a real (irregular) layout or a plain rows×cols grid.
async function insertSeatsForShowtime(
  client: import("pg").PoolClient,
  showtimeId: string,
  screen: Screen
) {
  if (screen.layout_json) {
    // Real seat map: only create the seats that actually exist, in their
    // real rows/numbers — gaps (aisles, pillars, doors) are simply absent.
    for (const row of screen.layout_json.rows) {
      for (const seatNumber of row.seatNumbers) {
        await client.query(
          "INSERT INTO seats (id, showtime_id, row_label, col_number, status) VALUES ($1, $2, $3, $4, 'available')",
          [genId("seat"), showtimeId, row.label, seatNumber]
        );
      }
    }
  } else {
    for (let r = 0; r < screen.rows; r++) {
      const rowLabel = String.fromCharCode(65 + r); // A, B, C...
      for (let c = 1; c <= screen.cols; c++) {
        await client.query(
          "INSERT INTO seats (id, showtime_id, row_label, col_number, status) VALUES ($1, $2, $3, $4, 'available')",
          [genId("seat"), showtimeId, rowLabel, c]
        );
      }
    }
  }
}

export async function createShowtime(params: {
  movieId: string;
  screenId: string;
  startsAt: string;
  priceCents: number;
  holdMinutes?: number;
}): Promise<Showtime> {
  const id = genId("sht");

  return withTransaction(async (client) => {
    const { rows } = await clientQuery<Showtime>(
      client,
      "INSERT INTO showtimes (id, movie_id, screen_id, starts_at, price_cents, hold_minutes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [
        id,
        params.movieId,
        params.screenId,
        params.startsAt,
        params.priceCents,
        params.holdMinutes ?? 15,
      ]
    );

    // Generate the seat grid for this showtime based on the screen's layout
    const { rows: screenRows } = await clientQuery<Screen>(
      client,
      "SELECT * FROM screens WHERE id = $1",
      [params.screenId]
    );
    const screen = screenRows[0];
    if (screen) await insertSeatsForShowtime(client, id, screen);

    return rows[0];
  });
}

export async function deleteShowtime(id: string) {
  await query("DELETE FROM showtimes WHERE id = $1", [id]);
}

// Updates a showtime's movie, screen, start time, and/or price. Changing the
// screen means the existing seat grid (rows/labels) may no longer make sense
// for the new screen, so when the screen actually changes, this regenerates
// the seat grid from the new screen's current layout — but only when every
// existing seat is still 'available'. If any are held or booked, the screen
// change is refused (movie/time/price changes still are not applied either,
// so the caller gets an all-or-nothing result and can decide how to proceed,
// e.g. cancelling those bookings first or creating a new showtime instead).
export async function updateShowtime(params: {
  id: string;
  movieId: string;
  screenId: string;
  startsAt: string;
  priceCents: number;
  holdMinutes?: number;
}): Promise<{ error?: string }> {
  return withTransaction(async (client) => {
    const { rows: existingRows } = await clientQuery<Showtime>(
      client,
      "SELECT * FROM showtimes WHERE id = $1",
      [params.id]
    );
    const existing = existingRows[0];
    if (!existing) return { error: "Showtime not found." };

    const screenChanged = existing.screen_id !== params.screenId;

    if (screenChanged) {
      const { rows: seatRows } = await clientQuery<{ status: string }>(
        client,
        "SELECT status FROM seats WHERE showtime_id = $1",
        [params.id]
      );
      const bookedOrHeld = seatRows.filter((s) => s.status !== "available").length;
      if (bookedOrHeld > 0) {
        return {
          error: `Can't change the screen — ${bookedOrHeld} seat(s) are already booked or held for this showtime. Cancel or edit those bookings first, or create a new showtime on the other screen instead.`,
        };
      }
    }

    await clientQuery(
      client,
      "UPDATE showtimes SET movie_id = $1, screen_id = $2, starts_at = $3, price_cents = $4, hold_minutes = $5 WHERE id = $6",
      [
        params.movieId,
        params.screenId,
        params.startsAt,
        params.priceCents,
        params.holdMinutes ?? existing.hold_minutes ?? 15,
        params.id,
      ]
    );

    if (screenChanged) {
      const { rows: screenRows } = await clientQuery<Screen>(
        client,
        "SELECT * FROM screens WHERE id = $1",
        [params.screenId]
      );
      const screen = screenRows[0];
      if (!screen) return { error: "Selected screen not found." };

      await client.query("DELETE FROM seats WHERE showtime_id = $1", [params.id]);
      await insertSeatsForShowtime(client, params.id, screen);
    }

    return {};
  });
}

// A showtime's seats are a snapshot of its screen's layout at the moment the
// showtime was created (see createShowtime above). If the screen's layout is
// edited afterward (e.g. via "Load Real Screens"), existing showtimes on
// that screen keep their old seat grid until someone resyncs them. This
// checks whether a showtime's seats still match the screen's *current*
// layout, and how many seats are booked/held (resyncing would wipe those).
export async function getShowtimeSeatSyncStatus(
  showtimeId: string,
  screen: Screen
): Promise<{ inSync: boolean; bookedOrHeldCount: number }> {
  const { rows: seats } = await query<{
    row_label: string;
    col_number: number;
    status: string;
  }>("SELECT row_label, col_number, status FROM seats WHERE showtime_id = $1", [showtimeId]);

  const bookedOrHeldCount = seats.filter((s) => s.status !== "available").length;

  const expected = new Set<string>();
  if (screen.layout_json) {
    for (const row of screen.layout_json.rows) {
      for (const seatNumber of row.seatNumbers) expected.add(`${row.label}:${seatNumber}`);
    }
  } else {
    for (let r = 0; r < screen.rows; r++) {
      const rowLabel = String.fromCharCode(65 + r);
      for (let c = 1; c <= screen.cols; c++) expected.add(`${rowLabel}:${c}`);
    }
  }

  const actual = new Set(seats.map((s) => `${s.row_label}:${s.col_number}`));
  const inSync =
    expected.size === actual.size && [...expected].every((key) => actual.has(key));

  return { inSync, bookedOrHeldCount };
}

// Regenerates a showtime's seats from its screen's *current* layout. Only
// allowed when every seat is still 'available' — if any are held or booked,
// this throws rather than silently destroying real bookings, so the caller
// should check getShowtimeSeatSyncStatus().bookedOrHeldCount === 0 first.
export async function resyncShowtimeSeats(showtimeId: string): Promise<void> {
  await withTransaction(async (client) => {
    const { rows: seatRows } = await clientQuery<{ status: string }>(
      client,
      "SELECT status FROM seats WHERE showtime_id = $1",
      [showtimeId]
    );
    if (seatRows.some((s) => s.status !== "available")) {
      throw new Error("Cannot resync: this showtime already has held or booked seats.");
    }

    const { rows: stRows } = await clientQuery<Showtime>(
      client,
      "SELECT * FROM showtimes WHERE id = $1",
      [showtimeId]
    );
    const showtime = stRows[0];
    if (!showtime) throw new Error("Showtime not found.");

    const { rows: screenRows } = await clientQuery<Screen>(
      client,
      "SELECT * FROM screens WHERE id = $1",
      [showtime.screen_id]
    );
    const screen = screenRows[0];
    if (!screen) throw new Error("Screen not found.");

    await client.query("DELETE FROM seats WHERE showtime_id = $1", [showtimeId]);
    await insertSeatsForShowtime(client, showtimeId, screen);
  });
}

// ---------- Seats ----------

// Fallback used only if a showtime row somehow has no hold_minutes (schema
// default covers normal cases) — kept in sync with the column's DEFAULT 15
// in schema.sql.
const DEFAULT_HOLD_EXPIRY_MINUTES = 15;

const HOLD_EXPIRED_CANCEL_REASON =
  "Automatically cancelled — the seat hold expired before payment was confirmed, so the seats were released back for others to book.";

// Seats held for checkout longer than the showtime's own hold_minutes go
// back to 'available' automatically (no background job needed for this
// app's scale). Each showtime can have its own hold window — set via the
// admin showtime form — instead of one fixed value for every showtime.
//
// The 'pending' booking that was holding those seats does NOT clean itself
// up otherwise — it would sit in the admin's "Pending Payment Confirmation"
// queue indefinitely even after its seats have quietly gone back into the
// pool, and confirming it later would forcibly re-book seats that may have
// since been sold to someone else. So this also cancels that booking (with
// a customer-visible reason on "My Bookings") in the same pass, before the
// seats themselves are released — the booking_seats join only works while
// the seats are still marked 'held'.
export async function releaseStaleHolds(showtimeId: string) {
  await withTransaction(async (client) => {
    const { rows: stRows } = await clientQuery<{ hold_minutes: number }>(
      client,
      "SELECT hold_minutes FROM showtimes WHERE id = $1",
      [showtimeId]
    );
    const holdMinutes = stRows[0]?.hold_minutes ?? DEFAULT_HOLD_EXPIRY_MINUTES;

    const { rows: staleBookingRows } = await clientQuery<{ booking_id: string }>(
      client,
      `SELECT DISTINCT bs.booking_id
       FROM booking_seats bs
       JOIN seats s ON s.id = bs.seat_id
       JOIN bookings b ON b.id = bs.booking_id
       WHERE s.showtime_id = $1 AND s.status = 'held' AND s.held_at IS NOT NULL
         AND s.held_at + make_interval(mins => $2) < now()
         AND b.status = 'pending'`,
      [showtimeId, holdMinutes]
    );
    const staleBookingIds = staleBookingRows.map((r) => r.booking_id);

    if (staleBookingIds.length > 0) {
      await clientQuery(
        client,
        `UPDATE bookings SET status = 'cancelled', cancel_reason = $2 WHERE id = ANY($1)`,
        [staleBookingIds, HOLD_EXPIRED_CANCEL_REASON]
      );
      // Release every seat belonging to these now-cancelled bookings — not
      // just the individual seats that crossed the stale threshold — so a
      // group booking is released as one unit rather than partially.
      await clientQuery(
        client,
        `UPDATE seats SET status = 'available', held_at = NULL
         WHERE id IN (SELECT seat_id FROM booking_seats WHERE booking_id = ANY($1))`,
        [staleBookingIds]
      );
    }

    // Catch-all: release any other stale 'held' seats on this showtime that
    // aren't tied to a still-pending booking row (e.g. an orphaned hold left
    // over from an admin-cancelled or otherwise already-resolved booking).
    await clientQuery(
      client,
      `UPDATE seats SET status = 'available', held_at = NULL
       WHERE showtime_id = $1 AND status = 'held'
         AND held_at IS NOT NULL
         AND held_at + make_interval(mins => $2) < now()`,
      [showtimeId, holdMinutes]
    );
  });
}

export async function listSeatsForShowtime(showtimeId: string): Promise<Seat[]> {
  await releaseStaleHolds(showtimeId);
  const { rows } = await query<Seat>(
    "SELECT * FROM seats WHERE showtime_id = $1 ORDER BY row_label ASC, col_number ASC",
    [showtimeId]
  );
  return rows;
}

// A seat plus who (if anyone) currently holds/booked it — powers the admin
// "seat map" view so staff can see the actual booking layout for a showtime
// (who's in which seat) instead of just a flat list of bookings with a text
// seat-label string. booking_status excludes 'cancelled' bookings (their
// seats are already back to 'available' by the time this is read, but the
// join is scoped defensively in case a cancellation and a re-read race).
export interface AdminSeatMapSeat extends Seat {
  booking_id: string | null;
  booking_number: string | null;
  booking_status: BookingStatus | null;
  checked_in_at: string | null;
  customer_name: string | null;
}

export async function getAdminSeatMapForShowtime(
  showtimeId: string
): Promise<AdminSeatMapSeat[]> {
  await releaseStaleHolds(showtimeId);
  const { rows } = await query<AdminSeatMapSeat>(
    // A seat can accumulate more than one booking_seats row over its life —
    // cancelling a booking (including the automatic hold-expiry cancel)
    // never deletes its booking_seats rows, only updates the booking's own
    // status — so a seat that was once held-then-released still carries a
    // stale row pointing at that cancelled booking, alongside a fresh row
    // for whoever holds/booked it now. Joining booking_seats directly would
    // pick up every one of those rows and duplicate the seat in the result
    // (once per historical booking). The subquery below keeps only
    // non-cancelled bookings before the join, so at most one — the current
    // one — ever matches.
    `SELECT s.*,
            b.id as booking_id,
            b.booking_number as booking_number,
            b.status as booking_status,
            b.checked_in_at as checked_in_at,
            COALESCE(b.customer_name, u.name) as customer_name
     FROM seats s
     LEFT JOIN (
       SELECT bs.seat_id, bs.booking_id
       FROM booking_seats bs
       JOIN bookings b2 ON b2.id = bs.booking_id AND b2.status <> 'cancelled'
     ) cur ON cur.seat_id = s.id
     LEFT JOIN bookings b ON b.id = cur.booking_id
     LEFT JOIN users u ON u.id = b.user_id
     WHERE s.showtime_id = $1
     ORDER BY s.row_label ASC, s.col_number ASC`,
    [showtimeId]
  );
  return rows;
}

export async function getSeatsByIds(seatIds: string[]): Promise<Seat[]> {
  if (seatIds.length === 0) return [];
  const { rows } = await query<Seat>("SELECT * FROM seats WHERE id = ANY($1)", [seatIds]);
  return rows;
}

// Groups a row's available seats into contiguous runs (consecutive seat
// numbers, no gaps). A gap in the run means an aisle/pillar/missing seat —
// seats on either side are NOT considered adjacent.
function contiguousRuns(rowSeats: Seat[]): Seat[][] {
  const sorted = [...rowSeats].sort((a, b) => a.col_number - b.col_number);
  const runs: Seat[][] = [];
  let current: Seat[] = [];
  for (const seat of sorted) {
    const prev = current[current.length - 1];
    if (!prev || seat.col_number === prev.col_number + 1) {
      current.push(seat);
    } else {
      runs.push(current);
      current = [seat];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

// Automatically picks `quantity` seats for a booking, trying hard to seat
// the whole party together instead of scattering them:
//   1. Prefer a single row with one contiguous block big enough for the
//      whole group (starting from the back/top row, same order the seat
//      map is displayed in).
//   2. If no single row has enough room, fall back to combining the
//      biggest contiguous blocks available (across rows) so the group
//      stays in as few, as-large-as-possible clusters as the house allows.
// Returns null if there simply aren't enough available seats at all.
export async function autoAllocateSeats(
  showtimeId: string,
  quantity: number
): Promise<Seat[] | null> {
  await releaseStaleHolds(showtimeId);
  const { rows: seats } = await query<Seat>(
    "SELECT * FROM seats WHERE showtime_id = $1 AND status = 'available' ORDER BY row_label ASC, col_number ASC",
    [showtimeId]
  );
  if (quantity <= 0 || seats.length < quantity) return null;

  const byRow = new Map<string, Seat[]>();
  for (const seat of seats) {
    if (!byRow.has(seat.row_label)) byRow.set(seat.row_label, []);
    byRow.get(seat.row_label)!.push(seat);
  }
  // Back row at the top, front row at the bottom — matches the seat map
  // display used everywhere else in the app.
  const rowLabels = Array.from(byRow.keys()).sort((a, b) => b.localeCompare(a));

  for (const label of rowLabels) {
    const fit = contiguousRuns(byRow.get(label)!).find((run) => run.length >= quantity);
    if (fit) return fit.slice(0, quantity);
  }

  const allRuns = rowLabels
    .flatMap((label) => contiguousRuns(byRow.get(label)!))
    .sort((a, b) => b.length - a.length);

  const picked: Seat[] = [];
  for (const run of allRuns) {
    if (picked.length >= quantity) break;
    picked.push(...run.slice(0, quantity - picked.length));
  }

  return picked.length >= quantity ? picked : null;
}

// Always called from within withTransaction(), so it takes the transaction's
// client directly rather than going through the module-level query() helper.
async function setSeatsStatus(
  seatIds: string[],
  status: string,
  client: import("pg").PoolClient
) {
  if (seatIds.length === 0) return;
  if (status === "held") {
    await client.query(
      "UPDATE seats SET status = $1, held_at = now() WHERE id = ANY($2)",
      [status, seatIds]
    );
  } else {
    await client.query(
      "UPDATE seats SET status = $1, held_at = NULL WHERE id = ANY($2)",
      [status, seatIds]
    );
  }
}

// ---------- Bookings ----------

export interface BookingWithDetails extends Booking {
  movie_title: string;
  // The movie's poster (usually a data: URL — see AdminMovieForm's resize
  // step — occasionally an admin-pasted external link) — carried along so
  // the printable ticket can show it without a second lookup. Null for a
  // movie that was never given a poster.
  movie_poster_url: string | null;
  starts_at: string;
  seat_labels: string;
  // Only set when the booking belongs to a registered (online) account —
  // null for admin-entered walk-in bookings, which use customer_name instead.
  account_phone: string | null;
  account_whatsapp: string | null;
}

export async function createPendingBooking(params: {
  userId: string;
  showtimeId: string;
  seatIds: string[];
  totalCents: number;
}): Promise<Booking> {
  const id = genId("bkg");

  return withTransaction(async (client) => {
    // Lock the requested seats and guard against double-booking: only
    // proceed if every seat is currently available.
    const { rows: seats } = await clientQuery<Seat>(
      client,
      "SELECT * FROM seats WHERE id = ANY($1) AND showtime_id = $2 FOR UPDATE",
      [params.seatIds, params.showtimeId]
    );
    if (seats.length !== params.seatIds.length) {
      throw new Error("SEATS_NOT_FOUND");
    }
    if (seats.some((s) => s.status !== "available")) {
      throw new Error("SEATS_UNAVAILABLE");
    }

    const { rows } = await clientQuery<Booking>(
      client,
      "INSERT INTO bookings (id, user_id, showtime_id, status, total_cents) VALUES ($1, $2, $3, 'pending', $4) RETURNING *",
      [id, params.userId, params.showtimeId, params.totalCents]
    );

    for (const seatId of params.seatIds) {
      await client.query(
        "INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2)",
        [id, seatId]
      );
    }

    await setSeatsStatus(params.seatIds, "held", client);

    return rows[0];
  });
}

// Admin-entered walk-in / phone booking (box-office sale). Skips the
// online 'pending' → payment step and books straight to 'paid', since the
// admin is recording a sale that already happened (cash in hand, or a
// deposit already taken).
export async function createAdminBooking(params: {
  showtimeId: string;
  seatIds: string[];
  customerName: string;
  unitPriceCents: number;
  totalCents: number;
  paymentTerms: "cash" | "deposit";
  depositReference?: string;
  depositDate?: string;
}): Promise<Booking> {
  const id = genId("bkg");

  return withTransaction(async (client) => {
    const { rows: seats } = await clientQuery<Seat>(
      client,
      "SELECT * FROM seats WHERE id = ANY($1) AND showtime_id = $2 FOR UPDATE",
      [params.seatIds, params.showtimeId]
    );
    if (seats.length !== params.seatIds.length) {
      throw new Error("SEATS_NOT_FOUND");
    }
    if (seats.some((s) => s.status !== "available")) {
      throw new Error("SEATS_UNAVAILABLE");
    }

    // Walk-in bookings are already paid at creation time (no separate
    // confirm-payment step), so hand out their booking number right away.
    let bookingNumber: string | null = null;
    const { rows: showtimeRows } = await clientQuery<{ starts_at: string; title: string }>(
      client,
      "SELECT st.starts_at, m.title FROM showtimes st JOIN movies m ON m.id = st.movie_id WHERE st.id = $1",
      [params.showtimeId]
    );
    const showtime = showtimeRows[0];
    if (showtime) {
      const { rows: seqRows } = await clientQuery<{ next_seq: number }>(
        client,
        `INSERT INTO showtime_booking_counters (showtime_id, next_seq) VALUES ($1, 1)
         ON CONFLICT (showtime_id) DO UPDATE SET next_seq = showtime_booking_counters.next_seq + 1
         RETURNING next_seq`,
        [params.showtimeId]
      );
      bookingNumber = computeBookingNumber(showtime.title, showtime.starts_at, seqRows[0].next_seq);
    }

    const { rows } = await clientQuery<Booking>(
      client,
      `INSERT INTO bookings
         (id, user_id, showtime_id, status, total_cents, customer_name,
          unit_price_cents, payment_terms, deposit_reference, deposit_date, created_by_admin,
          booking_number)
       VALUES ($1, NULL, $2, 'paid', $3, $4, $5, $6, $7, $8, true, $9)
       RETURNING *`,
      [
        id,
        params.showtimeId,
        params.totalCents,
        params.customerName,
        params.unitPriceCents,
        params.paymentTerms,
        params.depositReference ?? null,
        params.depositDate ?? null,
        bookingNumber,
      ]
    );

    for (const seatId of params.seatIds) {
      await client.query(
        "INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2)",
        [id, seatId]
      );
    }

    await setSeatsStatus(params.seatIds, "booked", client);

    return rows[0];
  });
}

// Lets an admin re-seat an existing booking — e.g. the customer asked to
// move, the wrong seats were picked at the box office, or the party size
// itself changed (newSeatIds can be a different length than the booking's
// current seats; nothing here requires the count to stay fixed). The
// booking's own current seats are always eligible to "keep"; any other
// requested seat must be genuinely available.
//
// `pricing`, when given, is applied in the same transaction as the seat
// swap — used by the admin "Edit Booking" screen, which lets an admin
// correct the price/payment terms for a booking alongside its seats in one
// save. Left out (or omitted entirely) for callers that only ever touch
// seats.
export async function updateBookingSeats(
  bookingId: string,
  newSeatIds: string[],
  pricing?: {
    unitPriceCents: number;
    totalCents: number;
    paymentTerms: "cash" | "deposit";
    depositReference: string | null;
    depositDate: string | null;
  }
): Promise<Booking> {
  return withTransaction(async (client) => {
    const { rows: bookingRows } = await clientQuery<Booking>(
      client,
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId]
    );
    const booking = bookingRows[0];
    if (!booking) throw new Error("BOOKING_NOT_FOUND");

    const { rows: oldSeatDetails } = await clientQuery<Seat>(
      client,
      `SELECT s.* FROM seats s JOIN booking_seats bs ON bs.seat_id = s.id WHERE bs.booking_id = $1`,
      [bookingId]
    );
    const oldSeatIds = oldSeatDetails.map((r) => r.id);
    const oldSeatLabels = oldSeatDetails
      .map((s) => `${s.row_label}${s.col_number}`)
      .sort()
      .join(", ");

    const { rows: newSeats } = await clientQuery<Seat>(
      client,
      "SELECT * FROM seats WHERE id = ANY($1) AND showtime_id = $2 FOR UPDATE",
      [newSeatIds, booking.showtime_id]
    );
    if (newSeats.length !== newSeatIds.length) {
      throw new Error("SEATS_NOT_FOUND");
    }
    const conflicting = newSeats.filter(
      (s) => s.status !== "available" && !oldSeatIds.includes(s.id)
    );
    if (conflicting.length > 0) {
      throw new Error("SEATS_UNAVAILABLE");
    }

    // Free the old seats and detach them from this booking.
    if (oldSeatIds.length > 0) {
      await client.query(
        "UPDATE seats SET status = 'available', held_at = NULL WHERE id = ANY($1)",
        [oldSeatIds]
      );
    }
    await client.query("DELETE FROM booking_seats WHERE booking_id = $1", [bookingId]);

    // Attach and mark the new seats, matching this booking's current status.
    for (const seatId of newSeatIds) {
      await client.query(
        "INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2)",
        [bookingId, seatId]
      );
    }
    if (newSeatIds.length > 0) {
      if (booking.status === "paid") {
        await client.query(
          "UPDATE seats SET status = 'booked', held_at = NULL WHERE id = ANY($1)",
          [newSeatIds]
        );
      } else if (booking.status === "pending") {
        await client.query(
          "UPDATE seats SET status = 'held', held_at = now() WHERE id = ANY($1)",
          [newSeatIds]
        );
      }
    }

    // Only paid bookings already have a ticket in the customer's hands, so
    // only flag those — a note here tells the customer to reprint, without
    // creating a second booking record or losing the original one. Only
    // written when the seats actually differ — this function is also called
    // to save a price/payment-terms-only edit (same seats resubmitted), and
    // that shouldn't spuriously tell the customer their seats changed.
    const newSeatIdsSorted = [...newSeatIds].sort();
    const oldSeatIdsSorted = [...oldSeatIds].sort();
    const seatsActuallyChanged =
      newSeatIdsSorted.length !== oldSeatIdsSorted.length ||
      newSeatIdsSorted.some((id, i) => id !== oldSeatIdsSorted[i]);

    if (booking.status === "paid" && seatsActuallyChanged) {
      const newSeatLabels = newSeats
        .map((s) => `${s.row_label}${s.col_number}`)
        .sort()
        .join(", ");
      const changedDate = new Date().toLocaleDateString();
      const note = `Seats changed on ${changedDate}: ${oldSeatLabels || "—"} → ${newSeatLabels || "—"}. Please reprint your ticket below.`;
      await client.query("UPDATE bookings SET seats_changed_note = $1 WHERE id = $2", [
        note,
        bookingId,
      ]);
    }

    if (pricing) {
      await client.query(
        `UPDATE bookings
         SET unit_price_cents = $1,
             total_cents = $2,
             payment_terms = $3,
             deposit_reference = $4,
             deposit_date = $5
         WHERE id = $6`,
        [
          pricing.unitPriceCents,
          pricing.totalCents,
          pricing.paymentTerms,
          pricing.depositReference,
          pricing.depositDate,
          bookingId,
        ]
      );
    }

    const { rows } = await clientQuery<Booking>(
      client,
      "SELECT * FROM bookings WHERE id = $1",
      [bookingId]
    );
    return rows[0];
  });
}

// Builds the human-friendly booking reference shown on tickets, e.g.
// "VISW161201" for the first booking of a "Viswanthan" showtime starting at
// 12:00 on the 16th. First 4 letters of the movie title (uppercased, letters
// only, padded with X if the title is short) + 2-digit day + 2-digit hour +
// 2-digit sequence number (resets per showtime).
function computeBookingNumber(movieTitle: string, startsAt: string, seq: number): string {
  const letters = movieTitle
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase()
    .padEnd(4, "X")
    .slice(0, 4);
  const d = new Date(startsAt);
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hour = String(d.getUTCHours()).padStart(2, "0");
  const seqStr = String(seq).padStart(2, "0");
  return `${letters}${day}${hour}${seqStr}`;
}

export async function markBookingPaid(
  bookingId: string,
  opts?: {
    stripeSessionId?: string;
    depositReference?: string;
    depositDate?: string;
    paymentProofUrl?: string;
  }
): Promise<Booking> {
  return withTransaction(async (client) => {
    const { rows: bookingRows } = await clientQuery<Booking>(
      client,
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId]
    );
    const booking = bookingRows[0];
    if (!booking) throw new Error("BOOKING_NOT_FOUND");

    const { rows: seatRows } = await clientQuery<{ seat_id: string }>(
      client,
      "SELECT seat_id FROM booking_seats WHERE booking_id = $1",
      [bookingId]
    );

    // Booking numbers are handed out once, atomically, the first time a
    // booking is confirmed paid — never regenerated after that.
    let bookingNumber = booking.booking_number;
    if (!bookingNumber) {
      const { rows: showtimeRows } = await clientQuery<{ starts_at: string; title: string }>(
        client,
        "SELECT st.starts_at, m.title FROM showtimes st JOIN movies m ON m.id = st.movie_id WHERE st.id = $1",
        [booking.showtime_id]
      );
      const showtime = showtimeRows[0];
      if (showtime) {
        const { rows: seqRows } = await clientQuery<{ next_seq: number }>(
          client,
          `INSERT INTO showtime_booking_counters (showtime_id, next_seq) VALUES ($1, 1)
           ON CONFLICT (showtime_id) DO UPDATE SET next_seq = showtime_booking_counters.next_seq + 1
           RETURNING next_seq`,
          [booking.showtime_id]
        );
        bookingNumber = computeBookingNumber(showtime.title, showtime.starts_at, seqRows[0].next_seq);
      }
    }

    await client.query(
      `UPDATE bookings SET
         status = 'paid',
         stripe_session_id = COALESCE($1, stripe_session_id),
         deposit_reference = COALESCE($2, deposit_reference),
         deposit_date = COALESCE($3, deposit_date),
         payment_proof_url = COALESCE($4, payment_proof_url),
         booking_number = COALESCE($5, booking_number)
       WHERE id = $6`,
      [
        opts?.stripeSessionId ?? null,
        opts?.depositReference ?? null,
        opts?.depositDate ?? null,
        opts?.paymentProofUrl ?? null,
        bookingNumber ?? null,
        bookingId,
      ]
    );
    await setSeatsStatus(
      seatRows.map((s) => s.seat_id),
      "booked",
      client
    );

    const { rows } = await clientQuery<Booking>(
      client,
      "SELECT * FROM bookings WHERE id = $1",
      [bookingId]
    );
    return rows[0];
  });
}

export async function cancelBooking(bookingId: string) {
  await withTransaction(async (client) => {
    const { rows: seatRows } = await clientQuery<{ seat_id: string }>(
      client,
      "SELECT seat_id FROM booking_seats WHERE booking_id = $1",
      [bookingId]
    );

    await client.query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [
      bookingId,
    ]);
    await setSeatsStatus(
      seatRows.map((s) => s.seat_id),
      "available",
      client
    );
  });
}

// Reverses a mistaken cancellation: puts the booking back to 'paid' and
// re-books its original seats. Refuses (throwing, so the caller can show
// the reason) if any of those seats have since been booked by someone else
// under a different, still-active booking — blindly overwriting that would
// silently double-book the seat.
export async function restoreBooking(bookingId: string) {
  await withTransaction(async (client) => {
    const { rows: seatRows } = await clientQuery<{ seat_id: string; label: string }>(
      client,
      `SELECT bs.seat_id, s.row_label || s.col_number::text as label
       FROM booking_seats bs
       JOIN seats s ON s.id = bs.seat_id
       WHERE bs.booking_id = $1`,
      [bookingId]
    );
    if (seatRows.length === 0) {
      throw new Error("This booking has no seats on file, so there is nothing to restore.");
    }
    const seatIds = seatRows.map((s) => s.seat_id);

    const { rows: conflictRows } = await clientQuery<{ label: string }>(
      client,
      `SELECT s.row_label || s.col_number::text as label
       FROM booking_seats bs
       JOIN bookings b ON b.id = bs.booking_id
       JOIN seats s ON s.id = bs.seat_id
       WHERE bs.seat_id = ANY($1) AND bs.booking_id != $2 AND b.status != 'cancelled'`,
      [seatIds, bookingId]
    );
    if (conflictRows.length > 0) {
      const labels = conflictRows.map((r) => r.label).join(", ");
      throw new Error(
        `Can't restore — seat(s) ${labels} have already been booked by someone else since this booking was cancelled.`
      );
    }

    await client.query(
      "UPDATE bookings SET status = 'paid', cancel_reason = NULL WHERE id = $1",
      [bookingId]
    );
    await setSeatsStatus(seatIds, "booked", client);
  });
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  const { rows } = await query<Booking>("SELECT * FROM bookings WHERE id = $1", [id]);
  return rows[0];
}

// Attaches a walk-in/admin-entered booking (user_id currently null) to a
// registered customer account, so it starts appearing on that customer's own
// "My Bookings" page instead of only in the admin bookings list — e.g. when
// an online customer's booking had to be recreated as a walk-in sale (a
// screen change wiping and regenerating seats forces this) and the admin
// wants to hand it back to the original account. Only allowed while the
// booking has no user_id yet — an online booking already belongs to whoever
// checked it out and shouldn't be silently reassigned to a different account
// this way.
export async function linkBookingToUser(bookingId: string, userId: string): Promise<Booking> {
  const { rows } = await query<Booking>(
    "UPDATE bookings SET user_id = $1 WHERE id = $2 AND user_id IS NULL RETURNING *",
    [userId, bookingId]
  );
  if (!rows[0]) throw new Error("BOOKING_NOT_LINKABLE");
  return rows[0];
}

const BOOKING_DETAILS_SELECT = `
  SELECT b.*, m.title as movie_title, m.poster_url as movie_poster_url, st.starts_at as starts_at,
         u.phone as account_phone, u.whatsapp as account_whatsapp,
         -- Walk-in bookings store the name directly on the booking; online
         -- bookings don't, so fall back to the account holder's name. Listed
         -- after b.* so it overwrites b.customer_name in the result row.
         COALESCE(b.customer_name, u.name) as customer_name,
         (SELECT string_agg(s.row_label || s.col_number, ', ')
          FROM booking_seats bs JOIN seats s ON s.id = bs.seat_id
          WHERE bs.booking_id = b.id) as seat_labels
  FROM bookings b
  JOIN showtimes st ON st.id = b.showtime_id
  JOIN movies m ON m.id = st.movie_id
  LEFT JOIN users u ON u.id = b.user_id
`;

export async function listBookingsForUser(userId: string): Promise<BookingWithDetails[]> {
  const { rows } = await query<BookingWithDetails>(
    `${BOOKING_DETAILS_SELECT} WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function listAllBookings(): Promise<BookingWithDetails[]> {
  const { rows } = await query<BookingWithDetails>(
    `${BOOKING_DETAILS_SELECT} ORDER BY b.created_at DESC`
  );
  return rows;
}

// Looks up a booking for the ticket QR / staff verification screen — by its
// human-friendly booking_number first (what's actually encoded in the QR
// code), falling back to the raw booking id for older/edge-case bookings
// that never got a booking_number assigned.
export async function getBookingByReference(
  ref: string
): Promise<BookingWithDetails | undefined> {
  const { rows } = await query<BookingWithDetails>(
    `${BOOKING_DETAILS_SELECT} WHERE b.booking_number = $1 OR b.id = $1 LIMIT 1`,
    [ref]
  );
  return rows[0];
}

// Marks a paid booking as admitted at the door — tapped from the ticket
// verification screen after staff scan the QR code. COALESCE means a second
// tap (or a re-scan of an already-admitted ticket) never overwrites the
// original admission time, so the running admitted count can't be inflated
// by scanning the same ticket twice.
export async function markBookingCheckedIn(bookingId: string): Promise<Booking> {
  const { rows } = await query<Booking>(
    "UPDATE bookings SET checked_in_at = COALESCE(checked_in_at, now()) WHERE id = $1 RETURNING *",
    [bookingId]
  );
  if (!rows[0]) throw new Error("BOOKING_NOT_FOUND");
  return rows[0];
}

export async function getBookingSeatIds(bookingId: string): Promise<string[]> {
  const { rows } = await query<{ seat_id: string }>(
    "SELECT seat_id FROM booking_seats WHERE booking_id = $1",
    [bookingId]
  );
  return rows.map((r) => r.seat_id);
}

// ---------- Movie demand votes ----------
// Anonymous thumbs-up ("interested") / thumbs-down ("not interested") votes
// on the homepage poster grid — a quick demand signal for movies that don't
// have a showtime yet, so we know what's worth bringing in.

export async function recordMovieVote(
  movieId: string,
  voterKey: string,
  vote: VoteValue
): Promise<void> {
  await query(
    `INSERT INTO movie_votes (id, movie_id, voter_key, vote) VALUES ($1, $2, $3, $4)
     ON CONFLICT (movie_id, voter_key) DO UPDATE SET vote = $4, created_at = now()`,
    [genId("vote"), movieId, voterKey, vote]
  );
}

export async function getVoteCountsForMovies(
  movieIds: string[]
): Promise<Record<string, MovieVoteCounts>> {
  const result: Record<string, MovieVoteCounts> = {};
  for (const id of movieIds) result[id] = { up: 0, down: 0 };
  if (movieIds.length === 0) return result;

  const { rows } = await query<{ movie_id: string; vote: string; count: string }>(
    "SELECT movie_id, vote, COUNT(*) as count FROM movie_votes WHERE movie_id = ANY($1) GROUP BY movie_id, vote",
    [movieIds]
  );
  for (const row of rows) {
    if (row.vote === "up") result[row.movie_id].up = Number(row.count);
    else if (row.vote === "down") result[row.movie_id].down = Number(row.count);
  }
  return result;
}

export async function getVoterVotes(
  voterKey: string,
  movieIds: string[]
): Promise<Record<string, VoteValue>> {
  const result: Record<string, VoteValue> = {};
  if (movieIds.length === 0) return result;
  const { rows } = await query<{ movie_id: string; vote: string }>(
    "SELECT movie_id, vote FROM movie_votes WHERE voter_key = $1 AND movie_id = ANY($2)",
    [voterKey, movieIds]
  );
  for (const row of rows) result[row.movie_id] = row.vote as VoteValue;
  return result;
}
