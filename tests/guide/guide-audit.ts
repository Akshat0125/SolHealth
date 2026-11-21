import { chromium, Browser, Page } from "playwright";
import { spawn, ChildProcess } from "node:child_process";
import path from "node:path";
import http from "node:http";

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WIDTHS = [360, 768, 1280];

interface AuditIssue {
  state: string;
  width: number;
  issue: string;
}

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

async function checkLayout(page: Page, state: string, width: number): Promise<string[]> {
  return await page.evaluate(({ state, width }) => {
    const issues: string[] = [];

    // 1. Horizontal scroll check
    const docEl = document.documentElement;
    const body = document.body;
    const scrollW = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
    if (scrollW > window.innerWidth + 1) {
      issues.push(`Horizontal scroll detected: scrollWidth ${scrollW}px > window ${window.innerWidth}px`);
    }

    // 2. Button checks inside guide
    const buttons = Array.from(document.querySelectorAll<HTMLElement>(".guide-panel-container button, .guide-launcher"));
    for (const btn of buttons) {
      if (btn.offsetParent === null) continue;
      const rect = btn.getBoundingClientRect();
      if (rect.height > 56.5) {
        issues.push(`Button "${btn.innerText.slice(0, 25)}" height is ${rect.height.toFixed(1)}px (> 56px)`);
      }
    }

    // 3. Overflow check inside guide panel
    const guideEls = Array.from(document.querySelectorAll<HTMLElement>(".guide-panel-container *"));
    for (const el of guideEls) {
      if (el.clientWidth === 0 || el.clientHeight === 0) continue;
      const style = window.getComputedStyle(el);
      if (style.overflowX === "auto" || style.overflowX === "scroll") continue;
      if (el.scrollWidth > el.clientWidth + 2) {
        issues.push(`Element overflow inside guide: <${el.tagName.toLowerCase()}> scrollWidth ${el.scrollWidth}px > clientWidth ${el.clientWidth}px`);
      }
    }

    // 4. Overlap check: Launcher vs footer
    const launcher = document.querySelector<HTMLElement>(".guide-launcher");
    const footer = document.querySelector<HTMLElement>("footer");
    if (launcher && footer && launcher.offsetParent !== null) {
      const lRect = launcher.getBoundingClientRect();
      const fText = footer.querySelector("div") || footer;
      const fRect = fText.getBoundingClientRect();
      // Ensure launcher does not cover the footer text
      const overlap = !(
        lRect.right < fRect.left ||
        lRect.left > fRect.right ||
        lRect.bottom < fRect.top ||
        lRect.top > fRect.bottom
      );
      if (overlap) {
        issues.push(`Launcher collides with footer text`);
      }
    }

    return issues;
  }, { state, width });
}

export async function runGuideUiAudit(): Promise<{ passed: boolean; issues: AuditIssue[] }> {
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

  const allIssues: AuditIssue[] = [];
  const browser: Browser = await chromium.launch({ headless: true });

  try {
    for (const width of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewportSize({ width, height: 800 });

      // State 1: Closed Launcher on Home and Patient
      await page.goto(`${BASE_URL}/patient`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      let errs = await checkLayout(page, "closed", width);
      errs.forEach((e) => allIssues.push({ state: "closed", width, issue: e }));

      // Open Guide
      const launcher = page.locator("button.guide-launcher");
      await launcher.click();
      await page.waitForTimeout(300);

      // State 2: Help tab open
      errs = await checkLayout(page, "help-open", width);
      errs.forEach((e) => allIssues.push({ state: "help-open", width, issue: e }));

      // Switch to Symptom tab
      const symptomTab = page.locator('button[role="tab"]:has-text("Symptom precautions")');
      await symptomTab.click();
      await page.waitForTimeout(300);

      // State 3: Symptom tab empty
      errs = await checkLayout(page, "symptom-empty", width);
      errs.forEach((e) => allIssues.push({ state: "symptom-empty", width, issue: e }));

      // State 4: Red-flag result
      const textarea = page.locator("#symptom-input");
      await textarea.fill("I have crushing chest pain and shortness of breath");
      await page.locator('button:has-text("Check precautions")').click();
      await page.waitForTimeout(400);
      errs = await checkLayout(page, "symptom-redflag", width);
      errs.forEach((e) => allIssues.push({ state: "symptom-redflag", width, issue: e }));

      // State 5: Group match result
      await textarea.fill("I have a high fever and runny nose");
      await page.locator('button:has-text("Check precautions")').click();
      await page.waitForTimeout(400);
      errs = await checkLayout(page, "symptom-group-match", width);
      errs.forEach((e) => allIssues.push({ state: "symptom-group-match", width, issue: e }));

      // State 6: No match result
      await textarea.fill("I want to buy a bicycle today");
      await page.locator('button:has-text("Check precautions")').click();
      await page.waitForTimeout(400);
      errs = await checkLayout(page, "symptom-no-match", width);
      errs.forEach((e) => allIssues.push({ state: "symptom-no-match", width, issue: e }));

      // State 7: Smart matching downloading state
      const toggle = page.locator("#smart-matching-toggle");
      await toggle.check();
      await page.waitForTimeout(200);
      errs = await checkLayout(page, "smart-matching-downloading", width);
      errs.forEach((e) => allIssues.push({ state: "smart-matching-downloading", width, issue: e }));

      await page.close();
    }
  } finally {
    await browser.close();
    if (serverProcess) {
      serverProcess.kill();
    }
  }

  return {
    passed: allIssues.length === 0,
    issues: allIssues,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runGuideUiAudit()
    .then((res) => {
      if (res.passed) {
        console.log("✓ Guide UI audit passed with 0 layout/overflow issues across 360, 768, 1280px!");
        process.exit(0);
      } else {
        console.error("✗ Guide UI audit found issues:\n" + res.issues.map((i) => `[${i.state}] (${i.width}px): ${i.issue}`).join("\n"));
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error("Guide UI audit execution error:", err);
      process.exit(1);
    });
}
