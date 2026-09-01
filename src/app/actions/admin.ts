"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  autoAllocateSeats,
  cancelBooking,
  createAdminBooking,
  createMovie,
  createScreen,
  createShowtime,
  createTheater,
  deleteMovie,
  deleteScreen,
  deleteShowtime,
  linkBookingToUser,
  listScreens,
  listTheaters,
  markBookingCheckedIn,
  markBookingPaid,
  resyncShowtimeSeats,
  setUserBlocked,
  setUserPassword,
  updateBookingSeats,
  updateMovie,
  updateScreenLayout,
  updateShowtime,
} from "@/lib/data";
import { layoutMaxSeatNumber, REAL_SCREENS } from "@/lib/real-screens";
import { parseVenueDateTime } from "@/lib/timezone";

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
  // No longer auto-creates a placeholder "Screen 1" — real screens (Screen 2,
  // 3, 4, 6, 7, Sala VIP) are loaded from /admin/screens instead.
  const screens = await listScreens(theaters[0].id);
  return { theater: theaters[0], screen: screens[0] };
}

// Removes a screen — only allowed while it has no showtimes attached, so this
// can never silently orphan a booking history. Used to clean up the old
// placeholder "Screen 1" (or any screen created by mistake).
export async function deleteScreenAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  try {
    await deleteScreen(id);
  } catch (err) {
    const message =
      err instanceof Error && err.message === "SCREEN_HAS_SHOWTIMES"
        ? "This screen has showtimes on it and can't be removed — delete or move those showtimes first."
        : "Could not remove this screen.";
    redirect(`/admin/screens?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/admin/screens");
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
  const holdMinutesRaw = Number(formData.get("holdMinutes"));
  const holdMinutes =
    Number.isFinite(holdMinutesRaw) && holdMinutesRaw > 0 ? Math.round(holdMinutesRaw) : 15;

  if (!movieId || !screenId || !date || !time) {
    return { error: "Please fill in all fields." };
  }

  const startsAt = parseVenueDateTime(date, time);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Invalid date/time." };
  }

  await createShowtime({
    movieId,
    screenId,
    startsAt: startsAt.toISOString(),
    priceCents: Math.round(price * 100),
    holdMinutes,
  });

  revalidatePath("/admin/showtimes");
  revalidatePath("/");
  return { error: undefined };
}

export async function updateShowtimeAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireAdmin();

  const id = String(formData.get("id") || "");
  const movieId = String(formData.get("movieId") || "");
  const screenId = String(formData.get("screenId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const price = Number(formData.get("price") || 12);
  const holdMinutesRaw = Number(formData.get("holdMinutes"));
  const holdMinutes =
    Number.isFinite(holdMinutesRaw) && holdMinutesRaw > 0 ? Math.round(holdMinutesRaw) : 15;

  if (!id) return { error: "Missing showtime id." };
  if (!movieId || !screenId || !date || !time) {
    return { error: "Please fill in all fields." };
  }

  const startsAt = parseVenueDateTime(date, time);
  if (Number.isNaN(startsAt.getTime())) {
    return { error: "Invalid date/time." };
  }

  const result = await updateShowtime({
    id,
    movieId,
    screenId,
    startsAt: startsAt.toISOString(),
    priceCents: Math.round(price * 100),
    holdMinutes,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/admin/showtimes");
  revalidatePath(`/showtimes/${id}`);
  revalidatePath("/");
  redirect("/admin/showtimes");
}

export async function deleteShowtimeAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) await deleteShowtime(id);
  revalidatePath("/admin/showtimes");
  revalidatePath("/");
}

// Regenerates a showtime's seat grid from its screen's current layout — for
// showtimes that were created before a screen's real seat map was loaded (or
// updated), so they're still showing the old plain grid. The showtimes page
// only renders this button when it has already confirmed zero booked/held
// seats, so the guard inside resyncShowtimeSeats should never actually fire
// here, but it stays as a last line of defense against destroying bookings.
export async function resyncShowtimeSeatsAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) {
    try {
      await resyncShowtimeSeats(id);
    } catch {
      // A booking/hold landed between page render and submit — safest thing
      // is to leave the seats as-is rather than fail loudly on a form with
      // nowhere to show the error.
    }
  }
  revalidatePath("/admin/showtimes");
  revalidatePath(`/showtimes/${id}`);
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

// Called from the admin "Pending Payment Confirmation" list once the admin
// has verified (in person / by phone / by bank transfer) that a customer's
// online booking was actually paid for — this is what finalizes a 'pending'
// booking to 'paid' and locks in the held seats as 'booked'.
export async function confirmBookingPaymentAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const depositReference = String(formData.get("depositReference") || "").trim();
  const depositDate = String(formData.get("depositDate") || "").trim();
  const proofFile = formData.get("paymentProof");

  let paymentProofUrl: string | undefined;
  if (proofFile instanceof File && proofFile.size > 0) {
    const buf = Buffer.from(await proofFile.arrayBuffer());
    paymentProofUrl = `data:${proofFile.type || "application/octet-stream"};base64,${buf.toString(
      "base64"
    )}`;
  }

  if (id) {
    await markBookingPaid(id, {
      depositReference: depositReference || undefined,
      depositDate: depositDate || undefined,
      paymentProofUrl,
    });
  }
  revalidatePath("/admin/bookings");
  revalidatePath("/account");
}

// Cancels any booking (pending or paid) and releases its seats back to
// 'available'. Used both for pending bookings that never got paid, and for
// paid bookings a customer asked to cancel.
export async function cancelBookingAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) await cancelBooking(id);
  revalidatePath("/admin/bookings");
  revalidatePath("/account");
}

// Re-seats an existing booking to a different set of seats (same ticket
// count) — e.g. fixing a mis-picked seat at the box office.
export async function editBookingSeatsAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  await requireAdmin();

  const bookingId = String(formData.get("bookingId") || "");
  const seatIds = formData.getAll("seatIds").map(String);

  if (!bookingId) return { error: "Missing booking id." };
  if (seatIds.length === 0) return { error: "Please select seats." };

  try {
    await updateBookingSeats(bookingId, seatIds);
  } catch (err) {
    if (err instanceof Error && err.message === "SEATS_UNAVAILABLE") {
      return { error: "One or more selected seats are already taken. Please pick again." };
    }
    return { error: "Could not update seats. Please try again." };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/account");
  redirect("/admin/bookings");
}

// Attaches a walk-in/admin-entered booking to a registered customer account
// so it starts showing up on that customer's own "My Bookings" page. Silently
// no-ops if the booking is already linked (e.g. double-submit) rather than
// showing an error on a form with nowhere to display one.
export async function linkBookingToUserAction(formData: FormData) {
  await requireAdmin();
  const bookingId = String(formData.get("bookingId") || "");
  const userId = String(formData.get("userId") || "");
  if (bookingId && userId) {
    try {
      await linkBookingToUser(bookingId, userId);
    } catch {
      // Already linked, or the booking no longer exists — nothing to do.
    }
  }
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${bookingId}/edit`);
  revalidatePath("/account");
}

// ---------- Ticket check-in (QR scan at the door) ----------

// Called from the ticket-verification screen when staff tap "Admit" on a
// valid, paid ticket. markBookingCheckedIn is idempotent (first tap wins),
// so tapping twice — or re-scanning an already-admitted ticket — never
// double-counts against the showtime's admitted total.
export async function checkInBookingAction(formData: FormData) {
  await requireAdmin();
  const bookingId = String(formData.get("bookingId") || "");
  const ref = String(formData.get("ref") || "");
  if (bookingId) {
    await markBookingCheckedIn(bookingId);
  }
  revalidatePath("/admin/showtimes");
  redirect(`/verify/${ref}`);
}

// ---------- Customer accounts ----------

// Blocking stops the account from logging in (checked in loginAction) or
// booking (re-checked in bookSeatsAction) — see setUserBlocked's comment in
// data.ts for why an already-active session isn't forcibly ended.
export async function blockUserAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) await setUserBlocked(id, true);
  revalidatePath("/admin/users");
}

export async function unblockUserAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (id) await setUserBlocked(id, false);
  revalidatePath("/admin/users");
}

// For when a customer forgets their password and contacts the theatre
// directly (there's no self-service "forgot password" email flow) — the
// admin types in a new password here and shares it with the customer
// themselves (call/WhatsApp), then the customer logs in and can change it
// again from their account if they want to. Mirrors signupAction's own
// minimum-length rule; too-short attempts are silently ignored rather than
// erroring, matching blockUserAction/unblockUserAction's simple style, since
// the input already enforces this in the browser.
export async function resetUserPasswordAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const newPassword = String(formData.get("newPassword") || "");
  if (!id || newPassword.length < 6) return;
  const passwordHash = await hashPassword(newPassword);
  await setUserPassword(id, passwordHash);
  revalidatePath("/admin/users");
}
