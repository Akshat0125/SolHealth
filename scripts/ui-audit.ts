import { chromium, Browser, Page } from "playwright";
import { spawn, ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const PORT = 3000;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const WIDTHS = [360, 768, 1280];
const ROUTES = [
  { path: "/", slug: "home" },
  { path: "/publisher", slug: "publisher" },
  { path: "/patient", slug: "patient" },
  { path: "/doctor", slug: "doctor" },
  { path: "/audit", slug: "audit" },
];

const SCREENSHOT_DIR = path.resolve(process.cwd(), "ui-audit");

interface AuditFailure {
  route: string;
  width: number;
  state: string;
  rule: string;
  details: string;
}

const failures: AuditFailure[] = [];

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
    if (await checkServerResponding()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runPageAudit(
  page: Page,
  routePath: string,
  routeSlug: string,
  width: number,
  stateName: string
) {
  // Check 1: Horizontal page scroll
  const horizontalScroll = await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body ? body.scrollWidth : 0);
    const clientWidth = window.innerWidth;
    return {
      hasScroll: scrollWidth > clientWidth + 1,
      scrollWidth,
      clientWidth,
    };
  });

  if (horizontalScroll.hasScroll) {
    failures.push({
      route: routePath,
      width,
      state: stateName,
      rule: "horizontal-page-scroll",
      details: `Page has horizontal scroll: scrollWidth ${horizontalScroll.scrollWidth}px > clientWidth ${horizontalScroll.clientWidth}px`,
    });
  }

  // Check 2: Buttons height <= 56px and single-line text
  const buttonAudit = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-ui="btn"]'));
    const results: Array<{ text: string; height: number; multiline: boolean }> = [];

    for (const btn of buttons) {
      if (btn.offsetParent === null && btn.clientHeight === 0) continue; // hidden
      const rect = btn.getBoundingClientRect();
      const text = (btn.innerText || btn.textContent || "").trim();

      // Check text line count
      const range = document.createRange();
      const walker = document.createTreeWalker(btn, NodeFilter.SHOW_TEXT);
      const textRects: DOMRect[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (node.textContent && node.textContent.trim()) {
          range.selectNodeContents(node);
          const rectList = Array.from(range.getClientRects());
          textRects.push(...rectList);
        }
      }

      // Check if text rects are on different vertical baselines (> 3px apart)
      let multiline = false;
      if (textRects.length > 1) {
        const firstTop = textRects[0].top;
        for (let i = 1; i < textRects.length; i++) {
          if (Math.abs(textRects[i].top - firstTop) > 4) {
            multiline = true;
            break;
          }
        }
      }

      if (rect.height > 56.5 || multiline) {
        results.push({
          text: text.slice(0, 40),
          height: Math.round(rect.height),
          multiline,
        });
      }
    }
    return results;
  });

  for (const btnErr of buttonAudit) {
    if (btnErr.height > 56.5) {
      failures.push({
        route: routePath,
        width,
        state: stateName,
        rule: "button-height",
        details: `Button "${btnErr.text}" height is ${btnErr.height}px (> 56px)`,
      });
    }
    if (btnErr.multiline) {
      failures.push({
        route: routePath,
        width,
        state: stateName,
        rule: "button-multiline",
        details: `Button "${btnErr.text}" text wraps to multiple lines`,
      });
    }
  }

  // Check 3: Text / Element overflow (scrollWidth > clientWidth + 1)
  const elementOverflowAudit = await page.evaluate(() => {
    const allEls = Array.from(document.querySelectorAll<HTMLElement>("*"));
    const overflowing: Array<{ tag: string; className: string; text: string; scrollW: number; clientW: number }> = [];

    for (const el of allEls) {
      if (el.clientWidth === 0 || el.clientHeight === 0) continue;
      const tag = el.tagName.toLowerCase();
      if (tag === "html" || tag === "body" || tag === "svg" || tag === "path") continue;

      const style = window.getComputedStyle(el);
      const isScrollable =
        style.overflowX === "auto" ||
        style.overflowX === "scroll" ||
        el.classList.contains("soft-table-container") ||
        el.hasAttribute("data-scrollable");

      if (isScrollable) continue;

      if (el.scrollWidth > el.clientWidth + 1.5) {
        overflowing.push({
          tag,
          className: el.className.toString().slice(0, 60),
          text: (el.innerText || el.textContent || "").trim().slice(0, 35),
          scrollW: el.scrollWidth,
          clientW: el.clientWidth,
        });
      }
    }
    return overflowing.slice(0, 10);
  });

  for (const ov of elementOverflowAudit) {
    failures.push({
      route: routePath,
      width,
      state: stateName,
      rule: "element-overflow",
      details: `<${ov.tag}> (class="${ov.className}") "${ov.text}" scrollWidth ${ov.scrollW}px > clientWidth ${ov.clientW}px`,
    });
  }

  // Check 4: StepRow alignment (marker vertical centre vs label first line vertical centre <= 2px)
  const stepRowAudit = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-ui="step-row"]'));
    const results: Array<{ labelText: string; diffY: number; markerCenterY: number; labelFirstLineCenterY: number }> = [];

    for (const row of rows) {
      const marker = row.querySelector<HTMLElement>('[data-ui="marker"]');
      const label = row.querySelector<HTMLElement>('[data-ui="step-label"]');
      if (!marker || !label) continue;

      const markerRect = marker.getBoundingClientRect();
      const markerCenterY = markerRect.top + markerRect.height / 2;

      // Find first line of label
      const range = document.createRange();
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
      const textNode = walker.nextNode() || label;
      range.selectNodeContents(textNode);
      const lineRects = Array.from(range.getClientRects());

      let labelFirstLineCenterY = 0;
      if (lineRects.length > 0) {
        labelFirstLineCenterY = lineRects[0].top + lineRects[0].height / 2;
      } else {
        const lRect = label.getBoundingClientRect();
        labelFirstLineCenterY = lRect.top + lRect.height / 2;
      }

      const diffY = Math.abs(markerCenterY - labelFirstLineCenterY);
      if (diffY > 2.05) {
        results.push({
          labelText: (label.innerText || label.textContent || "").trim(),
          diffY: Math.round(diffY * 100) / 100,
          markerCenterY,
          labelFirstLineCenterY,
        });
      }
    }
    return results;
  });

  for (const rowErr of stepRowAudit) {
    failures.push({
      route: routePath,
      width,
      state: stateName,
      rule: "steprow-marker-label-alignment",
      details: `StepRow "${rowErr.labelText}": marker centre (${rowErr.markerCenterY.toFixed(1)}px) differs from label first line centre (${rowErr.labelFirstLineCenterY.toFixed(1)}px) by ${rowErr.diffY}px (> 2px)`,
    });
  }

  // Check 5: Number inside marker centered within circle <= 1px
  const markerNumberAudit = await page.evaluate(() => {
    const markers = Array.from(document.querySelectorAll<HTMLElement>('[data-ui="marker"]'));
    const results: Array<{ numText: string; diffX: number; diffY: number }> = [];

    for (const marker of markers) {
      const numEl = marker.querySelector<HTMLElement>('[data-ui="marker-num"]') || marker;
      const markerRect = marker.getBoundingClientRect();
      const circleCenterX = markerRect.left + markerRect.width / 2;
      const circleCenterY = markerRect.top + markerRect.height / 2;

      const numRect = numEl.getBoundingClientRect();
      const numCenterX = numRect.left + numRect.width / 2;
      const numCenterY = numRect.top + numRect.height / 2;

      const diffX = Math.abs(circleCenterX - numCenterX);
      const diffY = Math.abs(circleCenterY - numCenterY);

      if (diffX > 1.05 || diffY > 1.05) {
        results.push({
          numText: (numEl.innerText || numEl.textContent || "").trim(),
          diffX: Math.round(diffX * 100) / 100,
          diffY: Math.round(diffY * 100) / 100,
        });
      }
    }
    return results;
  });

  for (const mErr of markerNumberAudit) {
    failures.push({
      route: routePath,
      width,
      state: stateName,
      rule: "marker-number-centering",
      details: `Marker "${mErr.numText}": number centre differs from circle centre by X: ${mErr.diffX}px, Y: ${mErr.diffY}px (> 1px)`,
    });
  }

  // Save screenshot
  const screenshotPath = path.join(
    SCREENSHOT_DIR,
    `${stateName}-${routeSlug}-${width}.png`
  );
  await page.screenshot({ path: screenshotPath, fullPage: true });
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let serverProcess: ChildProcess | null = null;
  const isAlreadyRunning = await checkServerResponding();

  if (!isAlreadyRunning) {
    console.log("Starting Next.js production server on port", PORT, "...");
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
      console.error("Failed to start server on", BASE_URL);
      if (serverProcess) serverProcess.kill();
      process.exit(1);
    }
    console.log("Server ready on", BASE_URL);
  } else {
    console.log("Connected to existing server on", BASE_URL);
  }

  const browser: Browser = await chromium.launch({
    headless: true,
  });

  try {
    // 1. Audit State: Disconnected (clean localStorage)
    console.log(`\n=== Auditing State: disconnected ===`);
    {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        window.localStorage.removeItem("solhealth_use_demo");
        window.localStorage.removeItem("solhealth_demo_role");
      });

      for (const route of ROUTES) {
        for (const width of WIDTHS) {
          const page = await context.newPage();
          await page.setViewportSize({ width, height: 800 });
          await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
          await page.waitForTimeout(300);
          await runPageAudit(page, route.path, route.slug, width, "disconnected");
          await page.close();
        }
      }
      await context.close();
    }

    // 2. Audit State: Connected with Demo Identity (All roles: patient, publisher, doctor, audit)
    console.log(`\n=== Auditing State: demo-identity ===`);
    {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        window.localStorage.setItem("solhealth_use_demo", "true");
        window.localStorage.setItem("solhealth_demo_role", "patient");
      });

      for (const route of ROUTES) {
        for (const width of WIDTHS) {
          const page = await context.newPage();
          await page.setViewportSize({ width, height: 800 });
          await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "networkidle" });
          await page.waitForTimeout(300);
          await runPageAudit(page, route.path, route.slug, width, "demo-identity");
          await page.close();
        }
      }
      await context.close();
    }

    // 3. Audit State: Home page with Get Started checklist & unactivated encryption
    console.log(`\n=== Auditing State: home-checklist-unactivated ===`);
    {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        window.localStorage.setItem("solhealth_use_demo", "true");
        window.localStorage.setItem("solhealth_demo_role", "patient");
      });

      for (const width of WIDTHS) {
        const page = await context.newPage();
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
        await page.waitForTimeout(300);

        // Verify StepRow elements exist on home
        const rowsCount = await page.locator('[data-ui="step-row"]').count();
        if (rowsCount < 3) {
          // If demo checkbox needs to be checked in UI:
          const checkbox = page.locator('input[type="checkbox"]');
          if (await checkbox.isVisible()) {
            await checkbox.check();
            await page.waitForTimeout(300);
          }
        }

        await runPageAudit(page, "/", "home", width, "home-checklist");
        await page.close();
      }
      await context.close();
    }

    // 4. Audit State: StepRow with an inline error under a step
    console.log(`\n=== Auditing State: inline-error ===`);
    {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        window.localStorage.setItem("solhealth_use_demo", "true");
        window.localStorage.setItem("solhealth_demo_role", "patient");
      });

      for (const width of WIDTHS) {
        const page = await context.newPage();
        await page.setViewportSize({ width, height: 800 });
        await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
        await page.waitForTimeout(300);

        const checkbox = page.locator('input[type="checkbox"]');
        if (await checkbox.isVisible()) {
          await checkbox.check();
          await page.waitForTimeout(200);
        }

        // Inject simulated inline error into Step 2 of StepRow
        await page.evaluate(() => {
          const stepRows = document.querySelectorAll('[data-ui="step-row"]');
          if (stepRows.length >= 2) {
            const step2 = stepRows[1];
            if (!step2.querySelector('.bg-\\[\\#fde8e6\\]')) {
              const errDiv = document.createElement("div");
              errDiv.className = "ml-[42px] mt-2 space-y-1.5";
              errDiv.innerHTML = `<div class="p-2.5 rounded-[12px] bg-[#fde8e6] border border-[#fbd0cb] text-[11px] text-[#b42318] leading-relaxed">Simulated wallet signing error: user cancelled encryption activation.</div>`;
              step2.appendChild(errDiv);
            }
          }
        });

        await runPageAudit(page, "/", "home", width, "inline-error");
        await page.close();
      }
      await context.close();
    }
  } finally {
    await browser.close();
    if (serverProcess) {
      console.log("Shutting down audit server...");
      serverProcess.kill();
    }
  }

  // Print Summary
  console.log("\n================ AUDIT SUMMARY ================");
  if (failures.length === 0) {
    console.log("✓ ALL UI ALIGNMENT CHECKS PASSED (0 failures)");
    console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
    process.exit(0);
  } else {
    console.error(`✗ FOUND ${failures.length} UI ALIGNMENT FAILURES:\n`);
    for (const f of failures) {
      console.error(
        `[${f.state}] ${f.route} (${f.width}px) - [${f.rule}]: ${f.details}`
      );
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Audit runner failed:", err);
  process.exit(1);
});
