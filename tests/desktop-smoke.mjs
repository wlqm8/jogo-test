import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile, readFile } from "node:fs/promises";
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
        await page.send("Emulation.setDeviceMetricsOverride", {
          width: 1440,
          height: 960,
          deviceScaleFactor: 1,
          mobile: false,
        });
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
const state = () =>
  page.evaluate("JSON.parse(localStorage.getItem('capim-e-cia:v1'))");
async function tap(code, hold = 80) {
  await page.key(code);
  await delay(hold);
  await page.key(code, "keyUp");
}
async function click(selector) {
  const point = await page.evaluate(
    `(()=>{const node=document.querySelector(${JSON.stringify(selector)});node.scrollIntoView({block:'center',behavior:'instant'});const r=node.getBoundingClientRect();const point={x:r.x+r.width/2,y:r.y+r.height/2};if(!node.contains(document.elementFromPoint(point.x,point.y)))throw new Error('Controle fora de alcance: '+${JSON.stringify(selector)});return point})()`,
  );
  await page.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    clickCount: 1,
    ...point,
  });
  await page.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    clickCount: 1,
    ...point,
  });
}
async function closeModal(id) {
  await page.evaluate(`document.querySelector('#${id}').close()`);
  await delay(70);
}
async function loadSave(raw) {
  const { identifier } = await page.send(
    "Page.addScriptToEvaluateOnNewDocument",
    { source: `localStorage.setItem('capim-e-cia:v1',${JSON.stringify(raw)})` },
  );
  await page.send("Page.reload", { ignoreCache: true });
  await delay(650);
  await page.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
  assert.equal(
    await page.evaluate("document.querySelector('#boot-screen')"),
    null,
  );
}
async function fixture(source) {
  const raw = await page.evaluate(
    `(async()=>{const {Garden}=await import('/src/model.js');const g=new Garden({random:()=>.8});${source};return g.serialize();})()`,
  );
  await loadSave(raw);
}
async function screenshot(name) {
  await mkdir(join(root, "release"), { recursive: true });
  const result = await page.send("Page.captureScreenshot", { format: "png" });
  await writeFile(
    join(root, "release", name),
    Buffer.from(result.data, "base64"),
  );
}
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
  for (const [width, height] of [
    [960, 640],
    [1024, 768],
    [1366, 768],
    [1440, 960],
    [1920, 1080],
  ]) {
    await page.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await delay(100);
    assert.equal(
      await page.evaluate("document.documentElement.scrollHeight>innerHeight"),
      false,
    );
    assert.ok(
      await page.evaluate(
        "document.querySelector('.game-controls').getBoundingClientRect().bottom<=innerHeight",
      ),
    );
  }
  await page.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 960,
    deviceScaleFactor: 1,
    mobile: false,
  });
  assert.ok(
    await page.evaluate(
      "document.querySelector('#context-tip').textContent.includes('Passo 1/3')",
    ),
  );
  await screenshot("primeiros-passos.png");
  await click("#tip-action");
  assert.equal(await page.evaluate("document.activeElement.id"), "garden");
  await tap("Space");
  await delay(300);
  assert.equal((await state()).life.planted, 2);
  assert.equal((await state()).life.seeds.grass, 22);
  await click("[data-equip=plant]");
  assert.equal(await page.evaluate("document.activeElement.id"), "garden");
  assert.equal(
    await page.evaluate(
      "document.querySelector('[data-action=plant]').getAttribute('aria-pressed')",
    ),
    "true",
  );
  assert.ok(
    await page.evaluate(
      "document.querySelector('#context-tip').textContent.includes('Passo 2/3')",
    ),
  );
  await delay(700);
  await click("[data-equip=water]");
  assert.equal(await page.evaluate("document.activeElement.id"), "garden");
  await tap("Space");
  await delay(300);
  assert.equal((await state()).life.watered, 2);
  assert.equal((await state()).life.water, 10);
  assert.ok(
    await page.evaluate(
      "document.querySelector('#context-tip').textContent.includes('pronta em')",
    ),
  );
  await tap("KeyW", 800);
  await tap("KeyA", 450);
  await tap("KeyR");
  await delay(150);
  assert.equal((await state()).life.water, 24);
  console.log(
    "PASS: janela mínima 960×640, guia inicial, clique nas ferramentas seguido de Espaço, plantio, rega e poço.",
  );
  const initial = await state();
  initial.life.xp = 40;
  await loadSave(JSON.stringify(initial));
  await page.evaluate(
    "document.querySelector('#skills-button').click();document.querySelector('[data-learn=speed]').click()",
  );
  assert.equal((await state()).life.skills.speed, 1);
  assert.equal(
    await page.evaluate(
      "document.querySelector('[data-learn=speed]').disabled",
    ),
    true,
  );
  await closeModal("life-dialog");
  await page.evaluate(
    "document.querySelector('#codes-button').click();document.querySelector('#code-input').value='MONEY';document.querySelector('#code-form').requestSubmit()",
  );
  assert.equal(
    await page.evaluate(
      "document.querySelector('#balance-diamonds').textContent",
    ),
    "∞",
  );
  await closeModal("codes-dialog");
  await page.evaluate("document.querySelector('#market-button').click()");
  assert.equal(
    await page.evaluate("document.querySelectorAll('.seed-card').length"),
    8,
  );
  await page.evaluate(
    "document.querySelector('[data-buy-seed=carrot][data-packs=\"1\"]').click()",
  );
  assert.equal((await state()).life.seeds.carrot, 10);
  await page.evaluate("document.querySelector('#quality-button').click()");
  assert.equal((await state()).life.qualityLevel, 1);
  await screenshot("mercado-e-sementes.png");
  await page.evaluate(
    "document.querySelector('[data-life-tab=helpers]').click();document.querySelector('[data-buy-helper=dog]').click();document.querySelector('[data-buy-helper=dog]').click();document.querySelector('[data-buy-helper=robot]').click()",
  );
  assert.equal((await state()).life.petLevels.dog, 2);
  assert.equal((await state()).life.petLevels.robot, 1);
  await screenshot("ajudantes.png");
  await closeModal("life-dialog");
  await page.evaluate("document.querySelector('#workshop-nav').click()");
  assert.equal(
    await page.evaluate("document.querySelectorAll('.collection-item').length"),
    24,
  );
  assert.ok(
    await page.evaluate(
      "document.querySelector('.box-odds').textContent.includes('0,0018%')",
    ),
  );
  for (let i = 0; i < 3; i++)
    await page.evaluate("document.querySelector('[data-box=\"11\"]').click()");
  assert.equal((await state()).boxesOpened, 33);
  const before = (await state()).scythes.reduce((a, b) => a + b, 0);
  await page.evaluate(
    "document.querySelector('[data-fuse]:not(:disabled)').click()",
  );
  assert.equal(
    (await state()).scythes.reduce((a, b) => a + b, 0),
    before - 4,
  );
  await screenshot("caixas-e-fusoes.png");
  await closeModal("workshop-dialog");
  console.log(
    "PASS: habilidades, sementes, pesquisa, compra/upgrades de parceiros, chances visíveis, caixas e fusões.",
  );
  await fixture(
    `g.coins=12;g.worldTime=245;g.lastWolfSpawn=245;const a=g.tileAt(11,9);g.plantTile(a);a.crop.watered=true;a.crop.progress=30;a.crop.quality='golden';const b=g.tileAt(13,9);g.plantTile(b);g.damagePlot(b);g.spawnWolf();g.wolves[0].x=16.5;g.wolves[0].y=9.5;`,
  );
  assert.ok(
    await page.evaluate(
      "document.querySelector('#cycle-label').textContent.includes('NOITE')",
    ),
  );
  await screenshot("noite-na-fazenda.png");
  await tap("Digit4");
  await tap("Space");
  await delay(250);
  assert.equal((await state()).coins, 0);
  assert.equal((await state()).life.repaired, 1);
  await delay(700);
  await tap("Digit1");
  await tap("Space");
  await delay(250);
  assert.equal((await state()).life.diamonds, 10);
  assert.equal((await state()).life.cropHarvested, 1);
  await page.evaluate("document.querySelector('#pause-button').click()");
  const clock = await page.evaluate(
    "document.querySelector('#phase-time').textContent",
  );
  await delay(700);
  assert.equal(
    await page.evaluate("document.querySelector('#phase-time').textContent"),
    clock,
  );
  await page.evaluate("document.querySelector('#resume-button').click()");
  console.log(
    "PASS: noite, reparo pago em ouro, colheita dourada com 10 diamantes e pausa.",
  );
  await fixture(
    `g.coins=350;g.buyCompanion('dog');const t=g.tileAt(5,3);g.plantTile(t);t.crop.watered=true;t.crop.progress=30;t.crop.quality='golden';g.helpers.dog.x=5.5;g.helpers.dog.y=3.5;`,
  );
  await delay(2800);
  const delivered = await state();
  assert.equal(delivered.life.dogCargo.grass, 0);
  assert.equal(delivered.life.diamonds, 10);
  assert.equal(delivered.life.cropHarvested, 1);
  assert.equal(delivered.coins, 10);
  const saved = await state();
  assert.deepEqual(page.errors, []);
  await screenshot("desktop-smoke.png");
  await closeGame(page);
  page = null;
  page = await openGame();
  const restored = await state();
  assert.equal(restored.life.diamonds, saved.life.diamonds);
  assert.equal(restored.life.petLevels.dog, 1);
  assert.equal(restored.life.cropHarvested, 1);
  assert.equal(restored.coins, 10);
  assert.deepEqual(page.errors, []);
  console.log(
    "PASS: Bento entrega em casa e o estado completo permanece após fechar/reabrir.",
  );
  await fixture(
    `g.xp=195;g.coins=4000;g.planted=10;g.watered=20;g.cropHarvested=30;g.cutCount=100;g.wolvesScared=5;`,
  );
  await click("#quests-button");
  assert.equal(
    await page.evaluate("document.querySelectorAll('.quest-card').length"),
    14,
  );
  assert.equal(
    await page.evaluate(
      "document.querySelector('[data-claim-quest=watering]').disabled",
    ),
    true,
  );
  for (const id of ["sowing", "watering", "harvest", "gardener"])
    await page.evaluate(
      `document.querySelector('[data-claim-quest=${id}]').click()`,
    );
  assert.deepEqual((await state()).life.claimedQuests, [
    "sowing",
    "watering",
    "harvest",
    "gardener",
  ]);
  assert.equal((await state()).life.diamonds, 45);
  assert.equal(
    await page.evaluate(
      "document.querySelector('[data-claim-quest=sowing]').disabled",
    ),
    true,
  );
  await screenshot("missoes.png");
  await closeModal("life-dialog");
  await click("#farm-nav");
  for (const key of ["cistern", "fence", "compost", "cistern"])
    await page.evaluate(
      `document.querySelector('[data-build=${key}]').click()`,
    );
  assert.deepEqual((await state()).life.buildings, {
    cistern: 2,
    fence: 1,
    compost: 1,
  });
  await screenshot("construcoes.png");
  await closeModal("farm-dialog");
  await closeGame(page);
  page = null;
  page = await openGame();
  assert.deepEqual((await state()).life.buildings, {
    cistern: 2,
    fence: 1,
    compost: 1,
  });
  assert.equal((await state()).life.claimedQuests.length, 4);
  console.log(
    "PASS: mural com 14 missões, recompensas sem duplicação, três construções funcionais e persistência ao reabrir.",
  );
  const legacyV2 = await readFile(
    join(root, "tests/fixtures/legacy-v2.json"),
    "utf8",
  );
  await loadSave(legacyV2);
  assert.equal((await state()).coins, 4321);
  assert.equal((await state()).life.diamonds, 77);
  assert.equal((await state()).boxesOpened, 11);
  assert.equal(
    await page.evaluate("localStorage.getItem('capim-e-cia:v1:before-v2-1')"),
    legacyV2,
  );
  console.log(
    "PASS: atualização do save 2.0 com backup completo e conservação de ouro, diamantes e coleção.",
  );
  const legacy = await readFile(
    join(root, "tests/fixtures/legacy-v1.json"),
    "utf8",
  );
  await loadSave(legacy);
  assert.equal((await state()).coins, 4321);
  assert.equal((await state()).rebirths, 3);
  assert.equal((await state()).version, 4);
  assert.equal(
    await page.evaluate("localStorage.getItem('capim-e-cia:v1:before-v2')"),
    legacy,
  );
  console.log(
    "PASS: atualização do save 1.1 com cópia de segurança e preservação do progresso.",
  );
} finally {
  if (page) await closeGame(page);
  else if (child?.exitCode === null) child.kill("SIGTERM");
  await rm(profile, { recursive: true, force: true });
}
