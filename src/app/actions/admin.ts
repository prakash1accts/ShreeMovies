"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  autoAllocateSeats,
  createAdminBooking,
  createMovie,
  createScreen,
  createShowtime,
  createTheater,
  deleteMovie,
  deleteShowtime,
  listScreens,
  listTheaters,
  updateMovie,
  updateScreenLayout,
} from "@/lib/data";
import { layoutMaxSeatNumber, REAL_SCREENS } from "@/lib/real-screens";

export async function createMovieAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const posterUrl = String(formData.get("posterUrl") || "").trim();
  const durationMinutes = Number(formData.get("durationMinutes") || 120);
  const genre = String(formData.get("genre") || "").trim();
  const rating = String(formData.get("rating") || "").trim();
  const language = String(formData.get("language") || "").trim();

  if (!title) return { error: "Title is required." };

  await createMovie({
    title,
    description,
    posterUrl,
    durationMinutes,
    genre,
    rating,
    language,
  });

  revalidatePath("/admin/movies");
  revalidatePath("/");
  return { error: undefined };
}

export async function updateMovieAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const posterUrl = String(formData.get("posterUrl") || "").trim();
  const durationMinutes = Number(formData.get("durationMinutes") || 120);
  const genre = String(formData.get("genre") || "").trim();
  const rating = String(formData.get("rating") || "").trim();
  const language = String(formData.get("language") || "").trim();

  if (!id) return { error: "Missing movie id." };
  if (!title) return { error: "Title is required." };

  await updateMovie(id, {
    title,
    description,
    posterUrl,
    durationMinutes,
    genre,
    rating,
    language,
  });

  revalidatePath("/admin/movies");
  revalidatePath(`/movies/${id}`);
  revalidatePath("/");
  redirect("/admin/movies");
}

export async function deleteMovieAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) await deleteMovie(id);
  revalidatePath("/admin/movies");
  revalidatePath("/");
}

export async function ensureDefaultTheaterAndScreen() {
  await requireAdmin();
  let theaters = await listTheaters();
  if (theaters.length === 0) {
    await createTheater("Shree Movies", "");
    theaters = await listTheaters();
  }
  let screens = await listScreens(theaters[0].id);
  if (screens.length === 0) {
    await createScreen({ theaterId: theaters[0].id, name: "Screen 1", rows: 8, cols: 10 });
    screens = await listScreens(theaters[0].id);
  }
  return { theater: theaters[0], screen: screens[0] };
}

// Creates (or, if they already exist by name, updates in place) the real
// seat maps for Screen 4, Screen 6, and Screen 7 — transcribed from the
// theater's own box-office seating-chart photos. Safe to click more than
// once: it never creates duplicate screens.
export async function loadRealScreensAction() {
  await requireAdmin();

  let theaters = await listTheaters();
  if (theaters.length === 0) {
    await createTheater("Shree Movies");
    theaters = await listTheaters();
  }
  const theater = theaters[0];
  const existingScreens = await listScreens(theater.id);

  for (const def of REAL_SCREENS) {
    const existing = existingScreens.find((s) => s.name === def.name);
    const rowCount = def.layout.rows.length;
    const maxSeat = layoutMaxSeatNumber(def.layout);
    if (existing) {
      await updateScreenLayout({
        screenId: existing.id,
        layout: def.layout,
        rows: rowCount,
        cols: maxSeat,
      });
    } else {
      await createScreen({
        theaterId: theater.id,
        name: def.name,
        rows: rowCount,
        cols: maxSeat,
        layout: def.layout,
      });
    }
  }

  revalidatePath("/admin/screens");
  revalidatePath("/admin/showtimes");
}

export async function createGridScreenAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireAdmin();

  const name = String(formData.get("name") || "").trim();
  const rows = Number(formData.get("rows") || 8);
  const cols = Number(formData.get("cols") || 10);

  if (!name) return { error: "Screen name is required." };
  if (!Number.isFinite(rows) || rows < 1 || rows > 26) {
    return { error: "Rows must be between 1 and 26." };
  }
  if (!Number.isFinite(cols) || cols < 1 || cols > 60) {
    return { error: "Seats per row must be between 1 and 60." };
  }

  let theaters = await listTheaters();
  if (theaters.length === 0) {
    await createTheater("Shree Movies");
    theaters = await listTheaters();
  }

  await createScreen({ theaterId: theaters[0].id, name, rows, cols });

  revalidatePath("/admin/screens");
  revalidatePath("/admin/showtimes");
  return { error: undefined };
}

export async function createShowtimeAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireAdmin();

  const movieId = String(formData.get("movieId") || "");
  const screenId = String(formData.get("screenId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const price = Number(formData.get("price") || 12);

  if (!movieId || !screenId || !date || !time) {
    return { error: "Please fill in all fields." };
  }

  const startsAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Invalid date/time." };
  }

  await createShowtime({
    movieId,
    screenId,
    startsAt: startsAt.toISOString(),
    priceCents: Math.round(price * 100),
  });

  revalidatePath("/admin/showtimes");
  revalidatePath("/");
  return { error: undefined };
}

export async function deleteShowtimeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) await deleteShowtime(id);
  revalidatePath("/admin/showtimes");
  revalidatePath("/");
}

// ---------- Admin-entered (walk-in / phone) bookings ----------

export async function createAdminBookingAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireAdmin();

  const showtimeId = String(formData.get("showtimeId") || "");
  const customerName = String(formData.get("customerName") || "").trim();
  const ticketCount = Number(formData.get("ticketCount") || 0);
  const unitPrice = Number(formData.get("unitPrice") || 0); // dollars
  const paymentTerms = String(formData.get("paymentTerms") || "cash") as
    | "cash"
    | "deposit";
  const depositReference = String(formData.get("depositReference") || "").trim();
  const depositDate = String(formData.get("depositDate") || "").trim();
  const autoAllocate = String(formData.get("autoAllocate") || "yes") === "yes";
  const manualSeatIds = formData.getAll("seatIds").map(String);

  if (!showtimeId) return { error: "Please choose a showtime." };
  if (!customerName) return { error: "Customer name is required." };
  if (!Number.isFinite(ticketCount) || ticketCount < 1) {
    return { error: "Number of tickets must be at least 1." };
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { error: "Price must be a valid number." };
  }
  if (paymentTerms === "deposit" && !depositReference) {
    return { error: "Deposit reference is required when payment terms is Deposit." };
  }

  const unitPriceCents = Math.round(unitPrice * 100);
  const totalCents = unitPriceCents * ticketCount;

  let seatIds: string[];
  if (autoAllocate) {
    const seats = await autoAllocateSeats(showtimeId, ticketCount);
    if (!seats) {
      return {
        error:
          "Not enough seats are available to seat the whole group together for this showtime. Try a different showtime, or turn off automatic allocation to pick seats manually.",
      };
    }
    seatIds = seats.map((s) => s.id);
  } else {
    if (manualSeatIds.length === 0) {
      return { error: "Please select seats on the seat map." };
    }
    if (manualSeatIds.length !== ticketCount) {
      return {
        error: `Number of tickets is ${ticketCount}, but ${manualSeatIds.length} seat(s) were selected — they must match.`,
      };
    }
    seatIds = manualSeatIds;
  }

  try {
    await createAdminBooking({
      showtimeId,
      seatIds,
      customerName,
      unitPriceCents,
      totalCents,
      paymentTerms,
      depositReference: paymentTerms === "deposit" ? depositReference : undefined,
      depositDate: paymentTerms === "deposit" ? depositDate : undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SEATS_UNAVAILABLE") {
      return {
        error: "One or more selected seats were just booked by someone else. Please pick again.",
      };
    }
    return { error: "Could not create the booking. Please try again." };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/");
  redirect("/admin/bookings");
}
