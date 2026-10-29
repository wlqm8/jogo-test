import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import { connectPage, delay } from "./support/cdp.mjs";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const electron = require("electron");
const profile = await mkdtemp(join(tmpdir(), "capim-desktop-test-"));
let child;
async function openGame() {
  let logs = "";
  const flags =
    process.platform === "linux"
      ? [
          "--ozone-platform=headless",
          "--no-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
        ]
      : [];
  child = spawn(
    electron,
    [...flags, `--user-data-dir=${profile}`, "--remote-debugging-port=0", root],
    { cwd: root, stdio: ["ignore", "ignore", "pipe"] },
  );
  child.stderr.on("data", (chunk) => {
    logs = (logs + chunk.toString()).slice(-12000);
  });
  const until = Date.now() + 20000;
  while (Date.now() < until) {
    const match = logs.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      const url = new URL(match[1]);
      try {
        const page = await connectPage(`http://${url.host}`);
        await delay(500);
        return page;
      } catch {
        /* The devtools port can become ready before the game page. */
      }
    }
    if (child.exitCode !== null)
      throw new Error(`Aplicativo encerrou com erro: ${logs}`);
    await delay(100);
  }
  throw new Error(`Aplicativo não abriu no prazo esperado: ${logs}`);
}
async function closeGame(page) {
  await page.send("Browser.close").catch(() => {});
  page.close();
  if (child.exitCode === null)
    await Promise.race([
      new Promise((resolve) => child.once("exit", resolve)),
      delay(4000),
    ]);
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    await delay(300);
  }
}
let page;
try {
  page = await openGame();
  assert.equal(await page.evaluate("location.origin"), "capim://game");
  assert.equal(
    await page.evaluate("typeof window.capimDesktop.onAction"),
    "function",
  );
  assert.equal(await page.evaluate("typeof require"), "undefined");
  assert.equal(
    await page.evaluate("document.querySelector('#boot-screen')"),
    null,
  );
  assert.equal(
    await page.evaluate(
      "document.documentElement.classList.contains('desktop-app')",
    ),
    true,
  );
  for (const [width, height] of [
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    await page.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(80);
    assert.equal(
      await page.evaluate(
        "document.documentElement.scrollHeight > innerHeight",
      ),
      false,
      `Rolagem em ${width} × ${height}`,
    );
    assert.ok(
      await page.evaluate(
        "document.querySelector('.game-controls').getBoundingClientRect().bottom <= innerHeight",
      ),
    );
  }
  await page.evaluate("document.querySelector('#garden').focus()");
  await page.key("Space");
  await page.key("KeyD");
  await delay(1400);
  await page.key("KeyD", "keyUp");
  await page.key("Space", "keyUp");
  const earned = await page.evaluate(
    "JSON.parse(localStorage.getItem('capim-e-cia:v1')).coins",
  );
  assert.ok(earned >= 2);
  await page.evaluate(
    "document.querySelector('#codes-button').click();document.querySelector('#code-input').value='MONEY';document.querySelector('#code-form').requestSubmit()",
  );
  assert.equal(
    await page.evaluate("document.querySelector('#balance').textContent"),
    "∞",
  );
  await page.evaluate("document.querySelector('#codes-dialog').close()");
  await delay(50);
  await page.evaluate("document.querySelector('#workshop-nav').click()");
  for (let level = 1; level < 10; level++)
    await page.evaluate(
      `document.querySelector('[data-buy="${level}"]').click()`,
    );
  await page.evaluate("document.querySelector('#workshop-dialog').close()");
  await delay(50);
  await page.evaluate("document.querySelector('#farm-nav').click()");
  for (let i = 1; i < 5; i++)
    await page.evaluate(
      "document.querySelector('#farm-upgrade-button').click()",
    );
  await page.evaluate(
    "document.querySelector('#rebirth-button').click();document.querySelector('#confirm-rebirth').click()",
  );
  const saved = await page.evaluate(
    "JSON.parse(localStorage.getItem('capim-e-cia:v1'))",
  );
  assert.equal(saved.rebirths, 1);
  assert.equal(saved.farmLevel, 4);
  assert.equal(saved.level, 0);
  assert.equal(saved.infiniteMoney, true);
  await page.evaluate("document.querySelector('#farm-dialog').close()");
  await delay(100);
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await delay(400);
  await page.evaluate("document.querySelector('#toast').hidden = true");
  await mkdir(join(root, "release"), { recursive: true });
  const shot = await page.send("Page.captureScreenshot", { format: "png" });
  await writeFile(
    join(root, "release/desktop-smoke.png"),
    Buffer.from(shot.data, "base64"),
  );
  assert.deepEqual(page.errors, []);
  console.log(
    "PASS: aplicativo offline, teclado, 10 foices, MONEY, fazenda, rebirth e layout de computador.",
  );
  await closeGame(page);
  page = null;
  page = await openGame();
  const restored = await page.evaluate(
    "JSON.parse(localStorage.getItem('capim-e-cia:v1'))",
  );
  assert.equal(restored.rebirths, saved.rebirths);
  assert.equal(restored.farmLevel, saved.farmLevel);
  assert.equal(restored.infiniteMoney, true);
  assert.equal(
    await page.evaluate("document.querySelector('#balance').textContent"),
    "∞",
  );
  assert.deepEqual(page.errors, []);
  console.log("PASS: progresso preservado ao fechar e reabrir o aplicativo.");
} finally {
  if (page) await closeGame(page);
  else if (child?.exitCode === null) child.kill("SIGTERM");
  await rm(profile, { recursive: true, force: true });
}
