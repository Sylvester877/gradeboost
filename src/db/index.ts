import { drizzle } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & { __pglite?: PGlite };

const pglitePath = process.env.PGLITE_DB_PATH || "./.pglite_db";

// PGlite's WASM cannot run during Next.js static generation, so the build
// pipeline sets NEXT_SKIP_DB=1. In that case we create a stub client that
// will never be queried; at runtime we instantiate the real database.
const isBuildPhase =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.NEXT_PHASE === "phase-development-build";
const shouldSkipDb =
  isBuildPhase ||
  process.env.NEXT_SKIP_DB === "1" ||
  process.env.NEXT_SKIP_DB === "true";

function createClient(): PGlite {
  const client = globalForDb.__pglite ?? new PGlite(pglitePath);
  // Always cache on globalThis so instrumentation and route bundles share
  // the same PGlite file lock.
  globalForDb.__pglite = client;
  return client;
}

const client = shouldSkipDb ? ({} as PGlite) : createClient();

export const db = drizzle(client, { schema });
