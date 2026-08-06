import { clientQuery, genId, query, withTransaction } from "./db";
import type {
  Booking,
  Movie,
  Screen,
  ScreenLayout,
  Seat,
  Showtime,
  Theater,
  User,
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
}): Promise<User> {
  const id = genId("usr");
  const { rows } = await query<User>(
    `INSERT INTO users (id, name, email, password_hash, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, params.name, params.email.toLowerCase().trim(), params.passwordHash, params.role ?? "customer"]
  );
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

export async function createShowtime(params: {
  movieId: string;
  screenId: string;
  startsAt: string;
  priceCents: number;
}): Promise<Showtime> {
  const id = genId("sht");

  return withTransaction(async (client) => {
    const { rows } = await clientQuery<Showtime>(
      client,
      "INSERT INTO showtimes (id, movie_id, screen_id, starts_at, price_cents) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [id, params.movieId, params.screenId, params.startsAt, params.priceCents]
    );

    // Generate the seat grid for this showtime based on the screen's layout
    const { rows: screenRows } = await clientQuery<Screen>(
      client,
      "SELECT * FROM screens WHERE id = $1",
      [params.screenId]
    );
    const screen = screenRows[0];
    if (screen?.layout_json) {
      // Real seat map: only create the seats that actually exist, in their
      // real rows/numbers — gaps (aisles, pillars, doors) are simply absent.
      for (const row of screen.layout_json.rows) {
        for (const seatNumber of row.seatNumbers) {
          await client.query(
            "INSERT INTO seats (id, showtime_id, row_label, col_number, status) VALUES ($1, $2, $3, $4, 'available')",
            [genId("seat"), id, row.label, seatNumber]
          );
        }
      }
    } else if (screen) {
      for (let r = 0; r < screen.rows; r++) {
        const rowLabel = String.fromCharCode(65 + r); // A, B, C...
        for (let c = 1; c <= screen.cols; c++) {
          await client.query(
            "INSERT INTO seats (id, showtime_id, row_label, col_number, status) VALUES ($1, $2, $3, $4, 'available')",
            [genId("seat"), id, rowLabel, c]
          );
        }
      }
    }

    return rows[0];
  });
}

export async function deleteShowtime(id: string) {
  await query("DELETE FROM showtimes WHERE id = $1", [id]);
}

// ---------- Seats ----------

const HOLD_EXPIRY_MINUTES = 15;

// Seats held for checkout longer than HOLD_EXPIRY_MINUTES go back to
// 'available' automatically (no background job needed for this app's scale).
export async function releaseStaleHolds(showtimeId: string) {
  await query(
    `UPDATE seats SET status = 'available', held_at = NULL
     WHERE showtime_id = $1 AND status = 'held'
       AND held_at IS NOT NULL
       AND held_at + INTERVAL '${HOLD_EXPIRY_MINUTES} minutes' < now()`,
    [showtimeId]
  );
}

export async function listSeatsForShowtime(showtimeId: string): Promise<Seat[]> {
  await releaseStaleHolds(showtimeId);
  const { rows } = await query<Seat>(
    "SELECT * FROM seats WHERE showtime_id = $1 ORDER BY row_label ASC, col_number ASC",
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
  starts_at: string;
  seat_labels: string;
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

    const { rows } = await clientQuery<Booking>(
      client,
      `INSERT INTO bookings
         (id, user_id, showtime_id, status, total_cents, customer_name,
          unit_price_cents, payment_terms, deposit_reference, deposit_date, created_by_admin)
       VALUES ($1, NULL, $2, 'paid', $3, $4, $5, $6, $7, $8, true)
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

// Lets an admin re-seat an existing booking (same ticket count, different
// seats) — e.g. the customer asked to move, or the wrong seats were picked
// at the box office. The booking's own current seats are always eligible
// to "keep"; any other requested seat must be genuinely available.
export async function updateBookingSeats(
  bookingId: string,
  newSeatIds: string[]
): Promise<Booking> {
  return withTransaction(async (client) => {
    const { rows: bookingRows } = await clientQuery<Booking>(
      client,
      "SELECT * FROM bookings WHERE id = $1 FOR UPDATE",
      [bookingId]
    );
    const booking = bookingRows[0];
    if (!booking) throw new Error("BOOKING_NOT_FOUND");

    const { rows: oldSeatRows } = await clientQuery<{ seat_id: string }>(
      client,
      "SELECT seat_id FROM booking_seats WHERE booking_id = $1",
      [bookingId]
    );
    const oldSeatIds = oldSeatRows.map((r) => r.seat_id);

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

    const { rows } = await clientQuery<Booking>(
      client,
      "SELECT * FROM bookings WHERE id = $1",
      [bookingId]
    );
    return rows[0];
  });
}

export async function markBookingPaid(bookingId: string, stripeSessionId?: string) {
  await withTransaction(async (client) => {
    const { rows: seatRows } = await clientQuery<{ seat_id: string }>(
      client,
      "SELECT seat_id FROM booking_seats WHERE booking_id = $1",
      [bookingId]
    );

    await client.query(
      "UPDATE bookings SET status = 'paid', stripe_session_id = $1 WHERE id = $2",
      [stripeSessionId ?? null, bookingId]
    );
    await setSeatsStatus(
      seatRows.map((s) => s.seat_id),
      "booked",
      client
    );
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

export async function getBooking(id: string): Promise<Booking | undefined> {
  const { rows } = await query<Booking>("SELECT * FROM bookings WHERE id = $1", [id]);
  return rows[0];
}

const BOOKING_DETAILS_SELECT = `
  SELECT b.*, m.title as movie_title, st.starts_at as starts_at,
         (SELECT string_agg(s.row_label || s.col_number, ', ')
          FROM booking_seats bs JOIN seats s ON s.id = bs.seat_id
          WHERE bs.booking_id = b.id) as seat_labels
  FROM bookings b
  JOIN showtimes st ON st.id = b.showtime_id
  JOIN movies m ON m.id = st.movie_id
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

export async function getBookingSeatIds(bookingId: string): Promise<string[]> {
  const { rows } = await query<{ seat_id: string }>(
    "SELECT seat_id FROM booking_seats WHERE booking_id = $1",
    [bookingId]
  );
  return rows.map((r) => r.seat_id);
}
