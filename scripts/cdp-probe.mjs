// Quick CDP probe: lists targets and inspects window.gradeboostUpdater in the app page.
const PORT = Number(process.argv[2] || 9222);

async function main() {
  const list = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json());
  for (const t of list) {
    console.log(`TARGET: ${t.type} | ${t.title} | ${t.url.slice(0, 80)}`);
  }
  const pages = list.filter((t) => t.type === "page");
  for (const page of pages) {
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0;
    const pend = new Map();
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    };
    const send = (method, params) =>
      new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
    const evalJS = async (expr) => {
      const m = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (m.result?.exceptionDetails) {
        return "EXC: " + JSON.stringify(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text).slice(0, 160);
      }
      return m.result?.result?.value;
    };
    console.log(`--- page: ${page.url.slice(0, 60)} ---`);
    console.log("readyState:", await evalJS("document.readyState"));
    console.log("typeof updater:", await evalJS("typeof window.gradeboostUpdater"));
    console.log("location:", await evalJS("location.href"));
    console.log("updater keys:", await evalJS("window.gradeboostUpdater ? Object.keys(window.gradeboostUpdater).join(',') : 'N/A'"));
    ws.close();
  }
}

main().catch((e) => { console.error("PROBE ERROR:", e.message); process.exit(1); });
