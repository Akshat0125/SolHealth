import { spawn } from "node:child_process";

const routes = ["/", "/issuer", "/patient", "/doctor", "/audit"];
const port = 9222;

console.log("Launching headless Google Chrome on port", port);
const chrome = spawn("/usr/bin/google-chrome", [
  "--headless=new",
  `--remote-debugging-port=${port}`,
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
]);

await new Promise((resolve) => setTimeout(resolve, 1500));

try {
  const versionRes = await fetch(`http://127.0.0.1:${port}/json/version`);
  const versionData = await versionRes.json();
  const wsUrl = versionData.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => (ws.onopen = resolve));

  let msgId = 1;
  function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve) => {
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener("message", handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

  function sendSession(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve) => {
      const handler = (evt) => {
        const msg = JSON.parse(evt.data);
        if (msg.id === id) {
          ws.removeEventListener("message", handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener("message", handler);
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }

  await sendSession("Page.enable");
  await sendSession("Runtime.enable");

  const errors = [];
  ws.addEventListener("message", (evt) => {
    const msg = JSON.parse(evt.data);
    if (msg.sessionId === sessionId) {
      if (msg.method === "Runtime.consoleAPICalled") {
        const type = msg.params.type;
        const text = msg.params.args.map((a) => a.value || JSON.stringify(a)).join(" ");
        if (type === "error" || text.includes("Hydration") || text.includes("mismatch")) {
          errors.push(`Console ${type}: ${text}`);
        }
      } else if (msg.method === "Runtime.exceptionThrown") {
        errors.push(`Exception: ${msg.params.exceptionDetails.text}`);
      }
    }
  });

  // State 1: First load
  console.log("=== State 1: First load (no localStorage seed) ===");
  for (const route of routes) {
    const url = `http://localhost:3000${route}`;
    console.log(`Checking route: ${route} ...`);
    await sendSession("Page.navigate", { url });
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // State 2: Refresh with keypairs saved in localStorage
  console.log("=== State 2: Reload with keypairs saved in localStorage ===");
  for (const route of routes) {
    const url = `http://localhost:3000${route}`;
    console.log(`Checking reload: ${route} ...`);
    await sendSession("Page.navigate", { url });
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await sendSession("Page.reload", {});
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  // State 3: Test role card navigation from home page
  console.log("=== State 3: Test role card clicks on Home Page ===");
  await sendSession("Page.navigate", { url: "http://localhost:3000/" });
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Click patient card
  console.log("Clicking Patient role card...");
  await sendSession("Runtime.evaluate", {
    expression: `
      const btn = Array.from(document.querySelectorAll("button")).find((b) =>
        b.textContent.includes("Enter as Patient")
      );
      if (btn) btn.click();
    `,
  });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const navUrl = await sendSession("Runtime.evaluate", {
    expression: "window.location.pathname",
  });
  console.log("Current path after Patient card click:", navUrl.result.value);

  ws.close();
  chrome.kill();

  if (errors.length > 0) {
    console.error("FAIL: Browser errors detected:", errors);
    process.exit(1);
  } else if (navUrl.result.value !== "/patient") {
    console.error(`FAIL: Expected /patient but got ${navUrl.result.value}`);
    process.exit(1);
  } else {
    console.log("PASS: All 5 routes verified cleanly, role navigation verified, 0 hydration/console errors!");
  }
} catch (err) {
  console.error("Error running browser check:", err);
  chrome.kill();
  process.exit(1);
}
