import bcrypt from "bcryptjs";

// Kept separate from auth.ts (which imports next/headers) so this can also
// be used from standalone Node scripts like the database seeder.
export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
