// Preload script — runs in the renderer with access to ipcRenderer but keeps
// contextIsolation intact. Exposes a minimal, safe updater API to the page.
const { contextBridge, ipcRenderer } = require("electron");

const CHANNEL = "updater:status";

contextBridge.exposeInMainWorld("gradeboostUpdater", {
  // Current state snapshot (stage, version, percent, message...)
  getStatus: () => ipcRenderer.invoke("updater:get-status"),
  // Ask the main process to check for an update now.
  check: () => ipcRenderer.invoke("updater:check"),
  // Download the available update in the background.
  download: () => ipcRenderer.invoke("updater:download"),
  // Quit and install the downloaded update.
  install: () => ipcRenderer.invoke("updater:install"),
  // Subscribe to status changes pushed from the main process.
  // Returns an unsubscribe function.
  onStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(CHANNEL, listener);
    return () => ipcRenderer.removeListener(CHANNEL, listener);
  },
});
