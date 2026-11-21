import { chromium, Browser, Page } from "playwright";
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import http from "node:http";

const PORT = 3001; // separate port to avoid conflicts
const BASE_URL = `http://127.0.0.1:${PORT}`;

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

export async function runFlagTest(): Promise<{ passed: boolean; errors: string[] }> {
  const errors: string[] = [];
  const requestedUrls: string[] = [];

  console.log(`Starting Next.js server with NEXT_PUBLIC_ENABLE_GUIDE=false on port ${PORT}...`);
  const serverProcess: ChildProcess = spawn(
    process.execPath,
    [path.resolve(process.cwd(), "app/node_modules/.bin/next"), "start", "app", "-p", String(PORT)],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env, PORT: String(PORT), NEXT_PUBLIC_ENABLE_GUIDE: "false" },
    }
  );

  const started = await waitForServer(30000);
  if (!started) {
    serverProcess.kill();
    throw new Error(`Failed to start server on ${BASE_URL}`);
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  context.on("request", (req) => {
    const url = req.url().toLowerCase();
    requestedUrls.push(url);
    if (url.includes("guidepanel") || url.includes("guide-embed") || url.includes("minisearch")) {
      errors.push(`Guide chunk requested over network when flag is false: ${req.url()}`);
    }
  });

  const page: Page = await context.newPage();

  try {
    // 1. Visit home page
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const launcherHomeCount = await page.locator("button.guide-launcher").count();
    if (launcherHomeCount !== 0) {
      errors.push(`Guide launcher rendered on / when NEXT_PUBLIC_ENABLE_GUIDE=false (count: ${launcherHomeCount})`);
    }

    // 2. Visit patient page
    await page.goto(`${BASE_URL}/patient`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    const launcherPatientCount = await page.locator("button.guide-launcher").count();
    if (launcherPatientCount !== 0) {
      errors.push(`Guide launcher rendered on /patient when NEXT_PUBLIC_ENABLE_GUIDE=false (count: ${launcherPatientCount})`);
    }
  } finally {
    await browser.close();
    serverProcess.kill();
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFlagTest()
    .then((res) => {
      if (res.passed) {
        console.log("✓ Flag test PASSED: Launcher does NOT render and no guide chunks are loaded when NEXT_PUBLIC_ENABLE_GUIDE=false.");
        process.exit(0);
      } else {
        console.error("✗ Flag test FAILED:\n" + res.errors.join("\n"));
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Flag test execution error:", err);
      process.exit(1);
    });
}
