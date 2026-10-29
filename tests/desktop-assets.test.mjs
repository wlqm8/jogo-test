import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { resolveGameAsset, serveGameAsset } from "../desktop/assets.mjs";

const root = resolve(import.meta.dirname, "..");
test("o aplicativo resolve a página e todos os recursos offline na mesma origem", () => {
  for (const path of [
    "/",
    "/src/app.js",
    "/src/model.js",
    "/src/farming.js",
    "/src/loot.js",
    "/src/progression.js",
    "/src/game.js",
    "/src/style.css",
    "/favicon.svg",
  ]) {
    assert.ok(resolveGameAsset(`capim://game${path}`));
  }
  assert.equal(
    resolveGameAsset("capim://game/?desktop=1").relativePath,
    "index.html",
  );
});

test("a origem do aplicativo não aceita URLs externas nem credenciais", () => {
  for (const url of [
    "https://game/",
    "file:///etc/passwd",
    "capim://other/",
    "capim://user:password@game/",
    "capim://game:8080/",
    "invalid",
  ])
    assert.equal(resolveGameAsset(url), null);
});

test("o protocolo serve apenas os arquivos públicos do jogo", () => {
  for (const path of [
    "/.git/config",
    "/package.json",
    "/desktop/main.mjs",
    "/src/../../desktop/preload.cjs",
    "/%2e%2e%2fdesktop/main.mjs",
  ])
    assert.equal(resolveGameAsset(`capim://game${path}`), null);
});

test("o aplicativo entrega módulos JavaScript e CSS com MIME correto", async () => {
  for (const [path, type] of [
    ["/src/app.js", "text/javascript"],
    ["/src/style.css", "text/css"],
    ["/", "text/html"],
  ]) {
    const response = await serveGameAsset(root, {
      method: "GET",
      url: `capim://game${path}`,
    });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type").startsWith(type));
    assert.ok((await response.text()).length > 0);
    assert.ok(
      response.headers
        .get("content-security-policy")
        .includes("connect-src 'none'"),
    );
  }
});

test("métodos e caminhos desconhecidos retornam falhas explícitas", async () => {
  assert.equal(
    (await serveGameAsset(root, { method: "POST", url: "capim://game/" }))
      .status,
    405,
  );
  assert.equal(
    (await serveGameAsset(root, { method: "GET", url: "capim://game/missing" }))
      .status,
    404,
  );
  assert.equal(
    (
      await serveGameAsset("/not-a-capim-directory", {
        method: "GET",
        url: "capim://game/",
      })
    ).status,
    500,
  );
});
