import { cp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

async function copyIfExists(src, dest) {
  if (!existsSync(src)) {
    console.log(`[prepare-standalone] skip ${path.relative(root, src)} (not found)`);
    return;
  }
  try {
    await cp(src, dest, { recursive: true, force: true, errorOnExist: false });
  } catch (err) {
    // Retry on Windows file lock errors — common with DLLs.
    if (err.code === "EPERM" || err.code === "EBUSY") {
      console.warn(`[prepare-standalone] retrying ${path.relative(root, dest)} after EPERM/EBUSY...`);
      await new Promise((r) => setTimeout(r, 3000));
      try {
        await rm(dest, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
      } catch {
        // If rm still fails, fall through and let cp try anyway
      }
      await cp(src, dest, { recursive: true, force: true, errorOnExist: false });
    } else {
      throw err;
    }
  }
  console.log(`[prepare-standalone] copied ${path.relative(root, src)} → ${path.relative(root, dest)}`);
}

await copyIfExists(path.join(root, "public"), path.join(standalone, "public"));
await copyIfExists(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
// Drizzle migration files are read at runtime by the PGlite migrator. Copy
// them into the standalone output so the server is fully self-contained.
await copyIfExists(path.join(root, "drizzle"), path.join(standalone, "drizzle"));
// textbook.json is already traced into the standalone at src/lib/textbook.json
// by Next.js output file tracing. textbook-search.ts checks both the root
// textbook.json and src/lib/textbook.json paths, so no need to duplicate it.

// PGlite's WASM used to crash under Electron's Node runtime, so we shipped a
// standalone node.exe (88 MB). main.js now falls back to ELECTRON_RUN_AS_NODE
// automatically when the binary isn't present, saving significant installer size.
// To restore the bundled binary, uncomment the block below.
//
// const nodeExeName = os.platform() === "win32" ? "node.exe" : "node";
// const bundledNodePath = path.join(standalone, nodeExeName);
// try {
//   await copyFile(process.execPath, bundledNodePath);
//   console.log(`[prepare-standalone] copied Node binary → ${path.relative(root, bundledNodePath)}`);
// } catch (err) {
//   console.error(`[prepare-standalone] failed to copy Node binary: ${err.message}`);
// }
