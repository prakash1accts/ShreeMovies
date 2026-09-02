"use client";

import { useState } from "react";
import QRCode from "qrcode";
import type { BookingWithDetails } from "@/lib/data";
import { formatVenueDateTime } from "@/lib/timezone";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Needed so a canvas that has drawn this image can still be exported via
    // toDataURL() — without it, an image from a plain (non-data:) URL
    // "taints" the canvas and toDataURL throws. A data: URL (how most
    // posters are stored — see AdminMovieForm's resize-on-upload step) is
    // unaffected either way. If a source doesn't actually support CORS, the
    // image just fails to load here, and the caller falls back to a
    // placeholder instead of drawing something it could never export.
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Crops `img` to fill exactly (w, h) without distorting it — the canvas
// equivalent of CSS `object-fit: cover` — so a poster of any aspect ratio
// fills its panel edge to edge instead of being squashed or leaving blank
// bars.
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Word-wraps `text` to `maxWidth` using the context's current font, without
// drawing anything. Used twice: once just to measure how many lines a block
// of text will take (before the canvas's final height is known), and again
// afterward, with the same result, to actually draw it line by line.
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Collapses a booking's seats into one summary line per physical row instead
// of listing every seat — e.g. "M13, M14, M9, M10, M11, M12" becomes a single
// "M9 to M14 = 6 Nos" line, the way a printed group ticket would read. A row
// whose booked seats aren't a single unbroken run (rare, but possible after
// an edit that leaves a gap) falls back to listing that row's seat numbers
// explicitly rather than claiming a range that isn't real.
function formatSeatGroups(seatLabelsRaw: string): string[] {
  const seats = seatLabelsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (seats.length === 0) return ["—"];

  const byRow = new Map<string, number[]>();
  const unparsed: string[] = [];
  for (const seat of seats) {
    const m = seat.match(/^([A-Za-z]+)(\d+)$/);
    if (!m) {
      unparsed.push(seat);
      continue;
    }
    const [, row, numStr] = m;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row)!.push(Number(numStr));
  }

  const lines: string[] = [];
  for (const row of Array.from(byRow.keys()).sort()) {
    const nums = byRow.get(row)!.sort((a, b) => a - b);
    if (nums.length === 1) {
      lines.push(`${row}${nums[0]} (1 No)`);
    } else if (nums[nums.length - 1] - nums[0] + 1 === nums.length) {
      lines.push(`${row}${nums[0]} to ${row}${nums[nums.length - 1]} = ${nums.length} Nos`);
    } else {
      lines.push(`${nums.map((n) => `${row}${n}`).join(", ")} = ${nums.length} Nos`);
    }
  }
  lines.push(...unparsed);
  return lines.length > 0 ? lines : ["—"];
}

// Draws a boarding-pass-style ticket: the movie poster as its own panel on
// the left, booking details in a wide middle panel, and a perforated QR
// "stub" on the right — the same three-part shape as an airline ticket, so
// the same information reads at a glance instead of as one tall block of
// text. Rendered on a canvas (no server round-trip, no extra dependencies)
// so it can be downloaded as a PNG or shared as text via WhatsApp/Email/SMS
// links — browsers don't allow auto-attaching an image to those share
// links, so the flow is: download the image, then attach it manually in
// whichever app you're sending it through.
//
// `verifyUrl` is baked into the stub as a QR code so theatre staff can scan
// the printed/screenshotted ticket at the door — scanning opens
// /verify/<ref>, which requires a staff login to view the booking, so a
// photo of someone else's ticket can't be used to see their details.
async function drawTicket(
  booking: BookingWithDetails,
  verifyUrl: string
): Promise<string | null> {
  // The ticket is the customer-facing artifact — it's meant to show what's
  // true *now*, not the editing history behind it. A "seats changed, please
  // reprint" note only makes sense as a heads-up on the account page (which
  // still shows it) telling the customer a fresh ticket exists; printing it
  // on the fresh ticket itself would just be confusing, so it's
  // deliberately left off here.
  //
  // A group booking's seats are summarized one row per line (e.g. "M9 to
  // M14 = 6 Nos") rather than run together in one long comma string or
  // listed one seat per line, so a party of several people can read
  // straight down a short list instead of a run-on line or a long column.
  const seatLines = formatSeatGroups(booking.seat_labels || "");

  const CANVAS_W = 1050;
  const POSTER_W = 230;
  const ACCENT_W = 8;
  const STUB_W = 230;
  const mainX = POSTER_W + ACCENT_W + 34;
  const stubX = CANVAS_W - STUB_W;
  const dividerX = stubX - 22;
  const mainMaxWidth = dividerX - 26 - mainX;

  // A throwaway context purely for measuring text — resizing the real
  // canvas later clears it, so all wrapping/height math has to happen
  // before the actual drawing pass.
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) return null;
  measure.font = "bold 24px Arial";
  const titleLines = wrapLines(measure, booking.movie_title, mainMaxWidth);

  let mainCursor = 40;
  mainCursor += 30; // brand line
  mainCursor += 22; // "Admit One"
  mainCursor += 24; // divider + gap
  mainCursor += (titleLines.length - 1) * 30; // extra movie-title lines
  mainCursor += 40; // showtime + screen line
  mainCursor += 30; // guest line
  mainCursor += 26; // "Seats:" label
  mainCursor += (seatLines.length - 1) * 28; // extra seat lines (bold, larger font)
  mainCursor += 44; // total line
  const mainBottom = mainCursor + 30;

  // The stub's own minimum height — enough room for the "E-TICKET" label,
  // the QR code, and the highlighted Booking Ref badge with the status and
  // caption below it.
  const qrSize = 150;
  const stubContentHeight = qrSize + 150;
  const canvasHeight = Math.max(mainBottom, stubContentHeight + 40, 380);

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, CANVAS_W, canvasHeight);

  // Poster panel — the movie's poster fills the left edge of the ticket
  // like the photo strip on a boarding pass, so the ticket is recognizable
  // at a glance before reading a word of it.
  let posterImg: HTMLImageElement | null = null;
  if (booking.movie_poster_url) {
    try {
      posterImg = await loadImage(booking.movie_poster_url);
    } catch {
      posterImg = null;
    }
  }
  if (posterImg) {
    drawCoverImage(ctx, posterImg, 0, 0, POSTER_W, canvasHeight);
    // A light dark wash keeps a bright poster from competing with the
    // ticket details right next to it.
    ctx.fillStyle = "rgba(17, 24, 39, 0.15)";
    ctx.fillRect(0, 0, POSTER_W, canvasHeight);
  } else {
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, POSTER_W, canvasHeight);
    ctx.fillStyle = "#4b5563";
    ctx.font = "48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🎬", POSTER_W / 2, canvasHeight / 2 + 16);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "#dc2626";
  ctx.fillRect(POSTER_W, 0, ACCENT_W, canvasHeight);

  // Perforated divider between the main panel and the QR stub, with punched
  // (fully transparent) notch circles top and bottom for the classic
  // torn-ticket look — real transparency via destination-out, so it reads
  // correctly on any background the exported PNG ends up on.
  ctx.save();
  ctx.strokeStyle = "#3f3f46";
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(dividerX, 16);
  ctx.lineTo(dividerX, canvasHeight - 16);
  ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(dividerX, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(dividerX, canvasHeight, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Main panel
  let y = 40;
  ctx.fillStyle = "#f5f5f5";
  ctx.font = "bold 24px Arial";
  y += 24;
  ctx.fillText("🎬 Shree Movies", mainX, y);

  ctx.font = "13px Arial";
  ctx.fillStyle = "#a3a3a3";
  y += 22;
  ctx.fillText("Admit One", mainX, y);

  y += 12;
  ctx.strokeStyle = "#3f3f46";
  ctx.beginPath();
  ctx.moveTo(mainX, y);
  ctx.lineTo(dividerX - 26, y);
  ctx.stroke();
  y += 30;

  ctx.fillStyle = "#f5f5f5";
  ctx.font = "bold 24px Arial";
  titleLines.forEach((line, i) => ctx.fillText(line, mainX, y + i * 30));
  y += (titleLines.length - 1) * 30;

  y += 34;
  ctx.font = "16px Arial";
  ctx.fillStyle = "#d4d4d8";
  ctx.fillText(
    `${formatVenueDateTime(booking.starts_at)} · ${booking.screen_name}`,
    mainX,
    y
  );

  y += 30;
  ctx.fillText(`Guest: ${booking.customer_name || "—"}`, mainX, y);

  y += 30;
  ctx.font = "14px Arial";
  ctx.fillStyle = "#d4d4d8";
  ctx.fillText("Seats:", mainX, y);
  // Seat numbers are the thing a customer squints at hardest at the door —
  // bold and noticeably larger than the surrounding labels so they're the
  // easiest thing to read on the whole ticket.
  ctx.font = "bold 19px Arial";
  ctx.fillStyle = "#f5f5f5";
  seatLines.forEach((seat, i) => {
    ctx.fillText(seat, mainX + 20, y + 28 + i * 28);
  });
  y += 28 + (seatLines.length - 1) * 28;

  y += 38;
  ctx.font = "17px Arial";
  ctx.fillStyle = "#f5f5f5";
  ctx.fillText(`Total: AOA ${(booking.total_cents / 100).toFixed(2)}`, mainX, y);

  // Stub panel — vertically centered
  const stubCenterX = stubX + STUB_W / 2;
  let sy = (canvasHeight - stubContentHeight) / 2;
  ctx.textAlign = "center";

  ctx.font = "12px Arial";
  ctx.fillStyle = "#a3a3a3";
  sy += 12;
  ctx.fillText("E-TICKET", stubCenterX, sy);

  sy += 20;
  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      width: qrSize,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    });
    const qrImg = await loadImage(qrDataUrl);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(stubCenterX - qrSize / 2 - 8, sy - 8, qrSize + 16, qrSize + 16);
    ctx.drawImage(qrImg, stubCenterX - qrSize / 2, sy, qrSize, qrSize);
  } catch {
    // Ticket still renders without a scannable code if QR generation fails.
  }
  sy += qrSize + 34;

  // Booking Ref — the one thing staff and the customer both need to find
  // instantly — gets a highlighted badge and a noticeably larger font
  // instead of blending in with the smaller labels around it.
  const refText = booking.booking_number || booking.id;
  ctx.font = "bold 20px Arial";
  const refWidth = ctx.measureText(refText).width;
  const badgePaddingX = 14;
  const badgeHeight = 34;
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.roundRect(
    stubCenterX - refWidth / 2 - badgePaddingX,
    sy - badgeHeight + 8,
    refWidth + badgePaddingX * 2,
    badgeHeight,
    8
  );
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(refText, stubCenterX, sy);

  sy += 34;
  ctx.font = "13px Arial";
  ctx.fillStyle = "#a1a1aa";
  ctx.fillText(booking.status.toUpperCase(), stubCenterX, sy);

  sy += 22;
  ctx.font = "10px Arial";
  ctx.fillText("Scan at the door", stubCenterX, sy);
  ctx.textAlign = "left";

  return canvas.toDataURL("image/png");
}

export default function TicketButton({ booking }: { booking: BookingWithDetails }) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setOpen(true);
    setLoading(true);
    setImageUrl(null);
    const verifyUrl = `${window.location.origin}/verify/${booking.booking_number || booking.id}`;
    const url = await drawTicket(booking, verifyUrl);
    setImageUrl(url);
    setLoading(false);
  }

  const shareText = `Shree Movies ticket — ${booking.movie_title}, ${formatVenueDateTime(
    booking.starts_at
  )}, Seats: ${booking.seat_labels || "—"}, Ref: ${booking.booking_number || booking.id}`;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-700"
      >
        Ticket
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-2xl rounded-lg bg-neutral-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 font-semibold">Ticket</h3>
            {loading && <p className="text-sm text-neutral-400">Generating ticket…</p>}
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Ticket"
                className="w-full rounded-md border border-neutral-800"
              />
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {imageUrl && (
                <a href={imageUrl}
                  download={`ticket-${booking.id}.png`}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
                >
                  Download image
                </a>
              )}
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-600"
              >
                Share via WhatsApp
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(
                  "Your Shree Movies ticket"
                )}&body=${encodeURIComponent(shareText)}`}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
              >
                Email
              </a>
              <a href={`sms:?body=${encodeURIComponent(shareText)}`}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
              >
                SMS
              </a>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              WhatsApp/Email/SMS open with the ticket details pre-filled as text — download the
              image above first and attach it manually, since browsers don&apos;t allow
              auto-attaching images through these links.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 text-sm text-neutral-400 hover:text-neutral-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
