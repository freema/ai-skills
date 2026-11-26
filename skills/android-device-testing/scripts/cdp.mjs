// Minimal Chrome DevTools Protocol client for Chrome on an Android phone.
// Needs Node 22+ (global fetch and WebSocket) and a port forward:
//   adb -s <serial> forward tcp:9222 localabstract:chrome_devtools_remote
//
// usage:
//   node cdp.mjs targets                 list tabs
//   node cdp.mjs eval '<js expression>'  evaluate in the matched tab, print the result
//   node cdp.mjs console [seconds]       print console messages and exceptions (default 5 s)
//   node cdp.mjs center '<selector>'     print "cssX cssY dpr" of the element's centre
//   node cdp.mjs close                   close the matched tab
//
// env: CDP_URL (default http://localhost:9222), CDP_MATCH (substring of the tab URL,
// default "localhost") picks the first page target whose URL contains it.

const [, , cmd, arg] = process.argv;
const base = process.env.CDP_URL || "http://localhost:9222";
const match = process.env.CDP_MATCH || "localhost";

const list = await (await fetch(base + "/json/list")).json();
if (cmd === "targets") {
  for (const t of list) console.log(t.id, "|", t.type, "|", t.url, "|", t.title);
  process.exit(0);
}

const page = list.find((t) => t.type === "page" && t.url.includes(match));
if (!page) {
  const targets = list.map((t) => t.type + " " + t.url);
  console.error("no page matching " + match + "; targets:", targets.join(", "));
  process.exit(1);
}
if (cmd === "close") {
  await fetch(base + "/json/close/" + page.id);
  console.log("closed", page.url);
  process.exit(0);
}

const timer = setTimeout(() => {
  console.error("timed out after 60 s");
  process.exit(3);
}, 60_000);

const ws = new WebSocket(page.webSocketDebuggerUrl);
let nextId = 0;
const pending = new Map();
const events = [];
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    const p = pending.get(d.id);
    pending.delete(d.id);
    if (d.error) p.reject(new Error(JSON.stringify(d.error)));
    else p.resolve(d.result);
  } else events.push(d);
};
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = () => reject(new Error("websocket error"));
});

const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

try {
  if (cmd === "eval") {
    const v = await evaluate(arg);
    console.log(typeof v === "string" ? v : JSON.stringify(v, null, 1));
  } else if (cmd === "center") {
    const sel = JSON.stringify(arg);
    const v = await evaluate(`(() => {
      const el = document.querySelector(${sel});
      if (!el) return "missing";
      const r = el.getBoundingClientRect();
      return [r.x + r.width / 2, r.y + r.height / 2].map((n) => n.toFixed(1)).join(" ") + " " + devicePixelRatio;
    })()`);
    if (v === "missing") throw new Error("no element for " + arg);
    console.log(v);
  } else if (cmd === "console") {
    await send("Runtime.enable");
    await send("Log.enable");
    await new Promise((r) => setTimeout(r, Number(arg || 5) * 1000));
    for (const e of events) {
      if (e.method === "Runtime.consoleAPICalled") {
        const text = e.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
        console.log("[" + e.params.type + "]", text.slice(0, 300));
      } else if (e.method === "Runtime.exceptionThrown") {
        const details = e.params.exceptionDetails;
        console.log("[exception]", (details.exception?.description ?? details.text).slice(0, 400));
      } else if (e.method === "Log.entryAdded") {
        const entry = e.params.entry;
        console.log("[log:" + entry.level + "]", entry.text.slice(0, 300), entry.url ?? "");
      }
    }
  } else {
    console.error("unknown command; see the header of this file");
    process.exitCode = 2;
  }
} catch (err) {
  console.error("ERROR", err.message);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  ws.close();
}
