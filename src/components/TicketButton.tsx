"use client";

import { useState } from "react";
import type { BookingWithDetails } from "@/lib/data";

// Draws a simple ticket image on a canvas (no server round-trip, no extra
// dependencies) so it can be downloaded as a PNG or shared as text via
// WhatsApp/Email/SMS links. Browsers don't allow auto-attaching an image to
// those share links, so the flow is: download the image, then attach it
// manually in whichever app you're sending it through.
function drawTicket(booking: BookingWithDetails): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(0, 0, 14, canvas.height);

  ctx.fillStyle = "#f5f5f5";
  ctx.font = "bold 32px Arial";
  ctx.fillText("🎬 Shree Movies", 45, 60);

  ctx.font = "18px Arial";
  ctx.fillStyle = "#a3a3a3";
  ctx.fillText("Admit One", 45, 90);

  ctx.strokeStyle = "#3f3f46";
  ctx.beginPath();
  ctx.moveTo(45, 112);
  ctx.lineTo(canvas.width - 45, 112);
  ctx.stroke();

  ctx.fillStyle = "#f5f5f5";
  ctx.font = "bold 28px Arial";
  wrapText(ctx, booking.movie_title, 45, 155, canvas.width - 90, 32);

  ctx.font = "19px Arial";
  ctx.fillStyle = "#d4d4d8";
  ctx.fillText(new Date(booking.starts_at).toLocaleString(), 45, 195);

  ctx.font = "19px Arial";
  ctx.fillStyle = "#d4d4d8";
  ctx.fillText(`Guest: ${booking.customer_name || "—"}`, 45, 235);
  ctx.fillText(`Seats: ${booking.seat_labels || "—"}`, 45, 265);
  ctx.fillText(`Total: $${(booking.total_cents / 100).toFixed(2)}`, 45, 295);

  ctx.font = "14px Arial";
  ctx.fillStyle = "#71717a";
  ctx.fillText(`Booking Ref: ${booking.id}`, 45, 350);
  ctx.fillText(`Status: ${booking.status.toUpperCase()}`, 45, 370);

  return canvas.toDataURL("image/png");
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, cursorY);
}

export default function TicketButton({ booking }: { booking: BookingWithDetails }) {
  const [open, setOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  function handleOpen() {
    setImageUrl(drawTicket(booking));
    setOpen(true);
  }

  const shareText = `Shree Movies ticket — ${booking.movie_title}, ${new Date(
    booking.starts_at
  ).toLocaleString()}, Seats: ${booking.seat_labels || "—"}, Ref: ${booking.id}`;

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
            className="max-w-lg rounded-lg bg-neutral-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 font-semibold">Ticket</h3>
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
                
                  href={imageUrl}
                  download={`ticket-${booking.id}.png`}
                  className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500"
                >
                  Download image
                </a>
              )}
              
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-600"
              >
                Share via WhatsApp
              </a>
              
                href={`mailto:?subject=${encodeURIComponent(
                  "Your Shree Movies ticket"
                )}&body=${encodeURIComponent(shareText)}`}
                className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-700"
              >
                Email
              </a>
              
                href={`sms:?body=${encodeURIComponent(shareText)}`}
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
