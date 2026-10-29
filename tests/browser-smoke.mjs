import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { connectPage, delay } from "./support/cdp.mjs";

const root = resolve(import.meta.dirname, "..");
const profile = await mkdtemp(join(tmpdir(), "capim-browser-test-"));
const html = await readFile(join(root, "dist/jogar.html"));
const requests = [];
const server = createServer((req, res) => {
  requests.push(req.url);
  if (req.url !== "/jogar.html") return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html);
});
let browser, page;
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  let logs = "";
  browser = spawn(
    process.env.CAPIM_BROWSER_PATH || "/usr/bin/chromium",
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${profile}`,
      "--remote-debugging-port=0",
      `http://127.0.0.1:${server.address().port}/jogar.html`,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let launchError;
  browser.on("error", (error) => (launchError = error));
  browser.stderr.on(
    "data",
    (chunk) => (logs = (logs + chunk.toString()).slice(-12000)),
  );
  const deadline = Date.now() + 20000;
  while (!page && Date.now() < deadline) {
    if (launchError) throw launchError;
    const match = logs.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) {
      try {
        page = await connectPage(`http://${new URL(match[1]).host}`);
      } catch {}
    }
    if (browser.exitCode !== null)
      throw new Error(`Navegador não abriu: ${logs}`);
    if (!page) await delay(100);
  }
  assert.ok(page, "Navegador não abriu no prazo esperado.");
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await delay(600);
  assert.equal(
    await page.evaluate("document.querySelector('#boot-screen')"),
    null,
  );
  await page.evaluate("document.querySelector('#tip-action').click()");
  assert.equal(await page.evaluate("document.activeElement.id"), "garden");
  await page.key("Space");
  await delay(90);
  await page.key("Space", "keyUp");
  const state = () =>
    page.evaluate("JSON.parse(localStorage.getItem('capim-e-cia:v1'))");
  assert.equal((await state()).life.planted, 2);
  await page.evaluate("document.querySelector('[data-action=water]').click()");
  await delay(800);
  await page.key("Space");
  await delay(90);
  await page.key("Space", "keyUp");
  assert.equal((await state()).life.watered, 2);
  assert.equal((await state()).version, 4);
  assert.equal(
    await page.evaluate("document.documentElement.scrollWidth > innerWidth"),
    false,
  );
  console.log(
    "PASS: HTML portátil inicia sem módulos externos, planta, rega e salva no computador.",
  );

  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await page.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await delay(150);
  assert.equal(
    await page.evaluate("document.documentElement.scrollWidth > innerWidth"),
    false,
  );
  assert.equal(
    await page.evaluate(
      "getComputedStyle(document.querySelector('#touch-controls')).display !== 'none'",
    ),
    true,
  );
  await page.evaluate("document.querySelector('#quests-button').click()");
  assert.equal(
    await page.evaluate("document.querySelectorAll('.quest-card').length"),
    14,
  );
  assert.equal(
    await page.evaluate(
      "document.querySelector('#life-dialog').scrollWidth > document.querySelector('#life-dialog').clientWidth",
    ),
    false,
  );
  const capture = async (name) => {
    await mkdir(join(root, "release"), { recursive: true });
    const shot = await page.send("Page.captureScreenshot", { format: "png" });
    await writeFile(
      join(root, "release", name),
      Buffer.from(shot.data, "base64"),
    );
  };
  await capture("missoes-celular.png");
  await page.evaluate("document.querySelector('#life-dialog').close()");
  await delay(80);
  await page.evaluate("document.querySelector('#farm-nav').click()");
  assert.equal(
    await page.evaluate("document.querySelectorAll('.building-card').length"),
    3,
  );
  assert.equal(
    await page.evaluate(
      "document.querySelector('#farm-dialog').scrollWidth > document.querySelector('#farm-dialog').clientWidth",
    ),
    false,
  );
  await capture("construcoes-celular.png");
  assert.deepEqual(page.errors, []);
  assert.deepEqual(
    requests.filter((url) => url !== "/favicon.ico"),
    ["/jogar.html"],
  );
  console.log(
    "PASS: versão móvel 390×844 com controles de toque, 14 missões e construções sem rolagem horizontal.",
  );
} finally {
  if (page) {
    await page.send("Browser.close").catch(() => {});
    page.close();
  }
  if (browser?.exitCode === null) {
    await Promise.race([
      new Promise((resolve) => browser.once("exit", resolve)),
      delay(2000),
    ]);
    if (browser.exitCode === null) browser.kill("SIGTERM");
  }
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
