import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { db } from "./index";

export const migrationPromise = (async () => {
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build";
  const shouldSkipDb =
    isBuildPhase ||
    process.env.NEXT_SKIP_DB === "1" ||
    process.env.NEXT_SKIP_DB === "true";

  if (shouldSkipDb) return;

  // Resolve to an absolute path so migrations are found regardless of which
  // directory the server is started from (dev, standalone, or Electron).
  const migrationsFolder =
    process.env.MIGRATIONS_DIR || path.resolve(process.cwd(), "drizzle");

  await migrate(db, { migrationsFolder }).catch((err) => {
    console.error("[db] Migration failed:", err);
    throw err;
  });
})();
