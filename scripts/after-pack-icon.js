/**
 * electron-builder afterPack hook.
 *
 * electron-builder only embeds the .ico into the exe when `signAndEditExecutable`
 * is enabled, but that flag triggers a winCodeSign download that fails on some
 * Windows machines (symlink privilege error during 7z extraction). So we keep
 * `signAndEditExecutable: false` and stamp the icon ourselves with the rcedit
 * binary that electron-builder already cached (it ships inside the winCodeSign
 * package).
 */
const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

function findRcedit() {
  // 1) Prefer the vendored copy — always present, works on fresh machines/CI.
  const vendored = path.join(__dirname, "vendor", "rcedit-x64.exe");
  if (fs.existsSync(vendored)) return vendored;
  // 2) Fall back to the electron-builder winCodeSign cache (older setups).
  const cacheRoot = path.join(
    os.homedir(),
    "AppData",
    "Local",
    "electron-builder",
    "Cache",
    "winCodeSign"
  );
  if (!fs.existsSync(cacheRoot)) return null;
  const dirs = fs
    .readdirSync(cacheRoot)
    .filter((d) => /^\d+$/.test(d))
    .sort((a, b) => {
      const sa = fs.statSync(path.join(cacheRoot, a)).mtimeMs;
      const sb = fs.statSync(path.join(cacheRoot, b)).mtimeMs;
      return sb - sa;
    });
  for (const dir of dirs) {
    const candidate = path.join(cacheRoot, dir, "rcedit-x64.exe");
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "win32") return;

  const rcedit = findRcedit();
  if (!rcedit) {
    console.warn("[after-pack-icon] rcedit-x64.exe not found in electron-builder cache — icon NOT stamped");
    return;
  }

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  if (!fs.existsSync(exePath)) {
    console.warn(`[after-pack-icon] exe not found at ${exePath} — icon NOT stamped`);
    return;
  }

  const iconPath = path.resolve(__dirname, "..", "public", "icon.ico");
  if (!fs.existsSync(iconPath)) {
    console.warn(`[after-pack-icon] icon not found at ${iconPath} — icon NOT stamped`);
    return;
  }

  await new Promise((resolve, reject) => {
    execFile(
      rcedit,
      [exePath, "--set-icon", iconPath],
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          console.error("[after-pack-icon] rcedit failed:", stderr || error.message);
          reject(error);
          return;
        }
        console.log(`[after-pack-icon] Stamped icon on ${exePath}`);
        resolve();
      }
    );
  });
};
