"use server";

import { findCustomerByPhone } from "@/lib/data";

// Called directly as a plain async function from client components (not via
// a <form action>) the moment a phone number field is filled in — on the
// admin walk-in booking form, the admin Edit Booking form, and the public
// signup form — so a previously-seen number can autofill its name from the
// master directory instead of making the person type it again.
//
// Returns null for an unknown number (nothing to autofill) or a blank
// input. Only ever does an exact-match lookup on a single phone number
// (never a search/listing), which keeps this from being usable to browse
// the directory.
export async function lookupCustomerByPhoneAction(
  phone: string
): Promise<{ name: string; whatsapp: string | null } | null> {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const customer = await findCustomerByPhone(trimmed);
  if (!customer) return null;
  return { name: customer.name, whatsapp: customer.whatsapp };
}
