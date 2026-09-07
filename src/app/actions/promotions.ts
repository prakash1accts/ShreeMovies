"use server";

import { requireAdmin } from "@/lib/auth";
import { createPromoCode, getRedeemablePromoCode } from "@/lib/data";

// Read-only check used by the booking forms (admin walk-in, and the public
// checkout) to preview a code's discount before the booking is actually
// submitted. Deliberately never marks the code used itself — only
// claimPromoCode() (called from booking.ts / admin.ts right before the
// booking is created) does that — so typing a code in and pausing never
// burns it.
export async function previewPromoCodeAction(
  code: string,
  showtimeId: string
): Promise<{ discountPercent: number } | null> {
  if (!code.trim() || !showtimeId) return null;
  const promo = await getRedeemablePromoCode(code, showtimeId);
  return promo ? { discountPercent: promo.discount_percent } : null;
}

export async function createPromoCodeAction(
  _prevState: { error?: string; success?: string } | undefined,
  formData: FormData
) {
  await requireAdmin();

  const code = String(formData.get("code") || "").trim();
  const discountPercent = Number(formData.get("discountPercent") || 0);
  const showtimeId = String(formData.get("showtimeId") || "").trim();

  if (!code) return { error: "Enter a code." };
  if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
    return { error: "Discount percent must be between 1 and 100." };
  }

  try {
    await createPromoCode({
      code,
      discountPercent,
      showtimeId: showtimeId || null,
    });
  } catch (err) {
    if (err instanceof Error && err.message.toLowerCase().includes("duplicate")) {
      return { error: `The code "${code.toUpperCase()}" already exists.` };
    }
    return { error: "Could not create the code. Please try again." };
  }

  return { success: `Code "${code.toUpperCase()}" created.` };
}
