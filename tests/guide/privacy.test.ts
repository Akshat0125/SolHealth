import { chromium, Browser, Page } from "playwright";
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import http from "node:http";

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const CANARY_STRING = "CANARY_SYMPTOM_TEST_998877";

function checkServerResponding(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(BASE_URL, (res) => {
      resolve(res.statusCode !== undefined && res.statusCode < 500);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkServerResponding()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

export async function runPrivacyTest(): Promise<{ passed: boolean; errors: string[] }> {
  let serverProcess: ChildProcess | null = null;
  const isRunning = await checkServerResponding();
  if (!isRunning) {
    console.log("Starting Next.js server on", BASE_URL, "...");
    serverProcess = spawn(
      process.execPath,
      [path.resolve(process.cwd(), "app/node_modules/.bin/next"), "start", "app", "-p", String(PORT)],
      {
        cwd: process.cwd(),
        stdio: "inherit",
        env: { ...process.env, PORT: String(PORT), NEXT_PUBLIC_ENABLE_DEMO: "true" },
      }
    );
    const started = await waitForServer(30000);
    if (!started) {
      if (serverProcess) serverProcess.kill();
      throw new Error(`Failed to start Next.js server on ${BASE_URL}`);
    }
  }

  const errors: string[] = [];
  const leakedRequests: string[] = [];

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Monitor all outgoing network requests
  context.on("request", (req) => {
    const url = req.url();
    const postData = req.postData() || "";
    if (url.includes(CANARY_STRING) || postData.includes(CANARY_STRING)) {
      leakedRequests.push(`Request to ${url} contained canary string! (postData: ${postData.slice(0, 100)})`);
    }
  });

  const page: Page = await context.newPage();

  try {
    // 1. Navigate to /patient
    await page.goto(`${BASE_URL}/patient`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // 2. Click Guide launcher
    const launcher = page.locator('button.guide-launcher');
    await launcher.waitFor({ state: "visible", timeout: 5000 });
    await launcher.click();
    await page.waitForTimeout(300);

    // 3. Click Symptom tab
    const symptomTab = page.locator('button[role="tab"]:has-text("Symptom precautions")');
    await symptomTab.waitFor({ state: "visible", timeout: 3000 });
    await symptomTab.click();
    await page.waitForTimeout(200);

    // 4. Enter symptom text containing canary string
    const textarea = page.locator("#symptom-input");
    await textarea.waitFor({ state: "visible", timeout: 3000 });
    await textarea.fill(`I have a mild headache ${CANARY_STRING}`);

    // 5. Submit form
    const submitBtn = page.locator('button:has-text("Check precautions")');
    await submitBtn.click();
    await page.waitForTimeout(600);

    // 6. Assert zero network requests leaked canary string
    if (leakedRequests.length > 0) {
      errors.push(...leakedRequests);
    }

    // 7. Assert localStorage does NOT contain canary string
    const localStorageDumps = await page.evaluate(() => {
      const dump: Record<string, string> = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i) || "";
        dump[k] = window.localStorage.getItem(k) || "";
      }
      return dump;
    });

    for (const [k, v] of Object.entries(localStorageDumps)) {
      if (k.includes(CANARY_STRING) || v.includes(CANARY_STRING)) {
        errors.push(`localStorage key "${k}" contained canary string: "${v}"`);
      }
    }

    // 8. Assert sessionStorage does NOT contain canary string
    const sessionStorageDumps = await page.evaluate(() => {
      const dump: Record<string, string> = {};
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i) || "";
        dump[k] = window.sessionStorage.getItem(k) || "";
      }
      return dump;
    });

    for (const [k, v] of Object.entries(sessionStorageDumps)) {
      if (k.includes(CANARY_STRING) || v.includes(CANARY_STRING)) {
        errors.push(`sessionStorage key "${k}" contained canary string: "${v}"`);
      }
    }

    // 9. Assert Cookies do NOT contain canary string
    const cookies = await context.cookies();
    for (const cookie of cookies) {
      if (cookie.name.includes(CANARY_STRING) || cookie.value.includes(CANARY_STRING)) {
        errors.push(`Cookie "${cookie.name}" contained canary string: "${cookie.value}"`);
      }
    }

    // 10. Assert URL does NOT contain canary string
    const currentUrl = page.url();
    if (currentUrl.includes(CANARY_STRING)) {
      errors.push(`Page URL contained canary string: ${currentUrl}`);
    }

    // 11. Assert closing panel clears input and results from memory
    const closeBtn = page.locator('button[aria-label="Close guide"]');
    await closeBtn.click();
    await page.waitForTimeout(300);

    // Re-open panel
    await launcher.click();
    await page.waitForTimeout(300);

    // Click Symptom tab again
    await symptomTab.click();
    await page.waitForTimeout(200);

    const reOpenedValue = await textarea.inputValue();
    if (reOpenedValue !== "") {
      errors.push(`Textarea was not cleared on close! Remained: "${reOpenedValue}"`);
    }
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPrivacyTest()
    .then((res) => {
      if (res.passed) {
        console.log("✓ Privacy test PASSED: Zero network leaks, zero storage traces, memory cleared on close.");
        process.exit(0);
      } else {
        console.error("✗ Privacy test FAILED:\n" + res.errors.join("\n"));
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Privacy test execution error:", err);
      process.exit(1);
    });
}
