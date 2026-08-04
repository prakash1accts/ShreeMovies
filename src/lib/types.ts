export type Role = "customer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: string;
}

export interface Theater {
  id: string;
  name: string;
  address: string | null;
}

export interface Screen {
  id: string;
  theater_id: string;
  name: string;
  rows: number;
  cols: number;
}

export interface Movie {
  id: string;
  title: string;
  description: string | null;
  poster_url: string | null;
  duration_minutes: number;
  genre: string | null;
  rating: string | null;
  created_at: string;
}

export interface Showtime {
  id: string;
  movie_id: string;
  screen_id: string;
  starts_at: string;
  price_cents: number;
}

export type SeatStatus = "available" | "held" | "booked";

export interface Seat {
  id: string;
  showtime_id: string;
  row_label: string;
  col_number: number;
  status: SeatStatus;
}

export type BookingStatus = "pending" | "paid" | "cancelled";

export interface Booking {
  id: string;
  user_id: string;
  showtime_id: string;
  status: BookingStatus;
  total_cents: number;
  stripe_session_id: string | null;
  created_at: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}
