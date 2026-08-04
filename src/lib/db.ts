import { Pool } from "pg";
import fs from "node:fs";
import path from "node:path";

// Production/deployed database. Works with any standard Postgres connection
// string — Neon, Supabase, Railway, Render, or a self-hosted instance all
// work the same way. See README.md "Going live" for how to get one.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env.local (see .env.example) — " +
      "a free Postgres database from neon.tech takes about 2 minutes to set up."
  );
}
const connectionString: string = process.env.DATABASE_URL;

declare global {
  // eslint-disable-next-line no-var
  var __cinemaPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __cinemaSchemaReady: Promise<void> | undefined;
}

function createPool() {
  return new Pool({
    connectionString,
    // Most hosted Postgres providers (Neon, Supabase, Railway, Render) require
    // TLS but use certificates that Node won't validate by default.
    ssl: connectionString.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });
}

// Reuse a single pool across hot reloads in dev and across invocations in
// serverless environments that keep the module warm.
export const pool = global.__cinemaPool ?? createPool();
if (process.env.NODE_ENV !== "production") {
  global.__cinemaPool = pool;
}

function ensureSchema() {
  const schemaPath = path.join(process.cwd(), "src", "lib", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf-8");
  return pool.query(schema).then(() => undefined);
}

// The schema uses CREATE TABLE IF NOT EXISTS, so re-running it on every cold
// start is safe and keeps a fresh database self-provisioning on first use.
export function ready(): Promise<void> {
  if (!global.__cinemaSchemaReady) {
    global.__cinemaSchemaReady = ensureSchema();
  }
  return global.__cinemaSchemaReady;
}

export function genId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// Thin query helper that guarantees the schema exists before every query —
// cheap after the first call since ready() caches its promise. Deliberately
// untyped at the pg layer (our own interfaces in types.ts don't have index
// signatures) — the cast happens once here instead of at every call site.
export async function query<T>(
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[] }> {
  await ready();
  const result = await pool.query(text, params);
  return result as unknown as { rows: T[] };
}

// Same cast-based typing as query() above, but for a specific client inside
// a transaction (see withTransaction below).
export async function clientQuery<T>(
  client: import("pg").PoolClient,
  text: string,
  params: unknown[] = []
): Promise<{ rows: T[] }> {
  const result = await client.query(text, params);
  return result as unknown as { rows: T[] };
}

// Run several statements atomically. Pass a callback that receives a
// connected client and use clientQuery(client, ...) for each statement inside it.
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  await ready();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
