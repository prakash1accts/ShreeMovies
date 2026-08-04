import { clientQuery, genId, query, withTransaction } from "./db";
import type {
  Booking,
  Movie,
  Screen,
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

export async function createMovie(params: {
  title: string;
  description?: string;
  posterUrl?: string;
  durationMinutes?: number;
  genre?: string;
  rating?: string;
}): Promise<Movie> {
  const id = genId("mov");
  const { rows } = await query<Movie>(
    `INSERT INTO movies (id, title, description, poster_url, duration_minutes, genre, rating)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [
      id,
      params.title,
      params.description ?? null,
      params.posterUrl ?? null,
      params.durationMinutes ?? 120,
      params.genre ?? null,
      params.rating ?? null,
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
}): Promise<Screen> {
  const id = genId("scr");
  const { rows } = await query<Screen>(
    "INSERT INTO screens (id, theater_id, name, rows, cols) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [id, params.theaterId, params.name, params.rows ?? 8, params.cols ?? 10]
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
    if (screen) {
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
