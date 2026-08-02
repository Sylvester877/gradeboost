/**
 * CDP driver for the GradeBoost auto-updater end-to-end test.
 *
 * Connects to the packaged app's remote debugging port (--remote-debugging-port)
 * and drives the preload-exposed `window.gradeboostUpdater` API:
 *   check() -> poll getStatus() until stage === "available"
 *   download() -> poll getStatus() until stage === "downloaded"
 *   install() -> quitAndInstall
 *
 * Usage: node scripts/cdp-update-test.mjs <port> <phase>
 *   phase: check | download | install | status
 */
const PORT = Number(process.argv[2] || 9222);
const PHASE = process.argv[3] || "status";
const SLEEP_MS = Number(process.argv[4] || 2500);

async function getPageTarget() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  const targets = await res.json();
  const page = targets.find(
    (t) => t.type === "page" && /127\.0\.0\.1/.test(t.url)
  );
  if (!page) throw new Error(`No page target found. Targets: ${targets.map((t) => t.type + ":" + t.url).join(", ")}`);
  return page;
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(new Error("WS error: " + (e.message || "unknown")));
  });
}

let msgId = 0;
const pending = new Map();

function send(ws, method, params) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(ws, expression) {
  const res = await send(ws, "Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (res.exceptionDetails) {
    throw new Error("Eval exception: " + JSON.stringify(res.exceptionDetails.exception?.description || res.exceptionDetails.text));
  }
  // send() resolves with msg.result, so the evaluated value is at res.result.value
  return res.result?.value;
}

async function main() {
  const target = await getPageTarget();
  console.log(`[cdp] target: ${target.title} | ${target.url}`);
  const ws = await connect(target.webSocketDebuggerUrl);
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    }
  };
  // If the app quits (e.g. quitAndInstall) mid-request, settle everything
  // so the script exits cleanly instead of hanging forever.
  ws.onclose = () => {
    for (const p of pending.values()) p.reject(new Error("websocket closed (app quit?)"));
    pending.clear();
  };

  // Confirm the updater API is exposed (i.e. this is a packaged app with preload).
  // Right after app launch the page may still be initializing, so poll briefly.
  let hasApi = null;
  for (let i = 0; i < 20; i++) {
    hasApi = await evaluate(ws, `typeof window.gradeboostUpdater`);
    if (hasApi === "object") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log(`[cdp] window.gradeboostUpdater: ${hasApi}`);
  if (hasApi !== "object") {
    console.error("[cdp] FATAL: updater API not exposed — installed app lacks the updater.");
    process.exit(1);
  }

  if (PHASE === "check") {
    console.log("[cdp] calling check()...");
    await evaluate(ws, `window.gradeboostUpdater.check()`);
    // Poll until the stage leaves "checking".
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, SLEEP_MS));
      const status = await evaluate(ws, `window.gradeboostUpdater.getStatus()`);
      console.log(`[cdp] status: ${JSON.stringify(status)}`);
      if (status && status.stage !== "checking" && status.stage !== "idle") break;
    }
  } else if (PHASE === "download") {
    console.log("[cdp] calling download()...");
    await evaluate(ws, `window.gradeboostUpdater.download()`);
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, SLEEP_MS));
      const status = await evaluate(ws, `window.gradeboostUpdater.getStatus()`);
      if (i % 4 === 0) console.log(`[cdp] status: ${JSON.stringify(status)}`);
      if (status && (status.stage === "downloaded" || status.stage === "error")) {
        console.log(`[cdp] final status: ${JSON.stringify(status)}`);
        break;
      }
    }
  } else if (PHASE === "install") {
    console.log("[cdp] calling install() (quitAndInstall)...");
    await evaluate(ws, `window.gradeboostUpdater.install()`);
    console.log("[cdp] install() invoked — app should quit and run the installer.");
  } else {
    const status = await evaluate(ws, `window.gradeboostUpdater.getStatus()`);
    console.log(`[cdp] status: ${JSON.stringify(status)}`);
  }

  ws.close();
}

main().catch((e) => {
  console.error("[cdp] ERROR:", e.message);
  process.exit(1);
});
