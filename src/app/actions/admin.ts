"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  createMovie,
  createScreen,
  createShowtime,
  createTheater,
  deleteMovie,
  deleteShowtime,
  listScreens,
  listTheaters,
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

  if (!title) return { error: "Title is required." };

  await createMovie({
    title,
    description,
    posterUrl,
    durationMinutes,
    genre,
    rating,
  });

  revalidatePath("/admin/movies");
  revalidatePath("/");
  return { error: undefined };
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
    await createTheater("Main Street Cinema", "123 Main Street");
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
