export async function register() {
  // Instrumentation can run in both Node and Edge runtimes; PGlite needs Node.
  if (typeof process === "undefined" || process.env.NEXT_RUNTIME === "edge") return;

  // Skip DB work during `next build` static generation — PGlite's WASM cannot
  // run in that context and would abort the build.
  const isBuildPhase =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.NEXT_PHASE === "phase-development-build";
  if (isBuildPhase || process.env.NEXT_SKIP_DB === "1" || process.env.NEXT_SKIP_DB === "true") return;

  // Dynamic import keeps Node-only modules out of the Edge runtime bundle.
  // Webpack bundles this for the Node.js server instrumentation hook.
  const { migrationPromise } = await import("./db/migrate");
  try {
    await migrationPromise;
    console.log("[db] migrations ready");
  } catch (err) {
    console.error("[db] Migration failed:", err);
    throw err;
  }
}
