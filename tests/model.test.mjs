import test from "node:test";
import assert from "node:assert/strict";
import {
  Garden,
  SCYTHES,
  FARMS,
  GRASS,
  COLS,
  ROWS,
  GROW_TIME,
  pickGrass,
} from "../src/model.js";

const NOW = 10000;
const fresh = () => new Garden({ now: NOW, random: () => 0.5 });

test("as 10 foices evoluem em velocidade, área e custo", () => {
  assert.equal(SCYTHES.length, 10);
  assert.deepEqual(
    SCYTHES.map((t) => t.area),
    [5, 9, 13, 21, 25, 29, 37, 49, 61, 81],
  );
  for (let i = 1; i < SCYTHES.length; i++) {
    assert.ok(SCYTHES[i].cooldown < SCYTHES[i - 1].cooldown);
    assert.ok(SCYTHES[i].area > SCYTHES[i - 1].area);
    assert.ok(SCYTHES[i].cost > SCYTHES[i - 1].cost);
  }
});

test("as probabilidades de grama preservam os limites e as recompensas", () => {
  assert.equal(
    pickGrass(() => 0),
    "golden",
  );
  assert.equal(
    pickGrass(() => 0.05999),
    "golden",
  );
  assert.equal(
    pickGrass(() => 0.06),
    "flower",
  );
  assert.equal(
    pickGrass(() => 0.27999),
    "flower",
  );
  assert.equal(
    pickGrass(() => 0.28),
    "common",
  );
  assert.equal(
    pickGrass(() => 0.9999),
    "common",
  );
  assert.deepEqual(
    Object.values(GRASS).map((g) => g.value),
    [1, 4, 12],
  );
});

test("o mapa é finito e todas as áreas caminháveis são alcançáveis", () => {
  const garden = fresh();
  assert.equal(garden.tiles.length, COLS * ROWS);
  assert.ok(garden.canWalk(garden.player.x, garden.player.y));
  assert.equal(garden.canWalk(-1, 4), false);
  assert.equal(garden.canWalk(COLS + 1, 4), false);
  assert.equal(garden.canWalk(4.5, 4.5), false);
  const queue = [[12, 9]],
    seen = new Set(["12,9"]);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = x + dx,
        ny = y + dy,
        key = `${nx},${ny}`;
      if (!seen.has(key) && garden.canWalk(nx + 0.5, ny + 0.5)) {
        seen.add(key);
        queue.push([nx, ny]);
      }
    }
  }
  assert.equal(
    seen.size,
    garden.tiles.filter((t) => ["path", "grass"].includes(t.kind)).length,
  );
});

test("o personagem não atravessa pedras, lago, cerca ou arbustos", () => {
  const garden = fresh();
  garden.player = { x: 3.5, y: 4.5, facing: "right" };
  for (let i = 0; i < 100; i++) garden.move(1, 0, 0.1);
  assert.ok(garden.player.x < 4);
  assert.ok(garden.canWalk(garden.player.x, garden.player.y));
  assert.equal(garden.canWalk(19.5, 3.5), false);
  garden.player.x = 1.5;
  garden.player.y = 8.5;
  for (let i = 0; i < 100; i++) garden.move(-1, 0, 0.1);
  assert.ok(garden.player.x > 1);
});

test("o movimento diagonal não é mais rápido que o horizontal", () => {
  const horizontal = fresh(),
    diagonal = fresh();
  horizontal.move(1, 0, 0.05);
  diagonal.move(1, 1, 0.05);
  const distance = (g) => Math.hypot(g.player.x - 12.5, g.player.y - 9.5);
  assert.ok(Math.abs(distance(horizontal) - distance(diagonal)) < 1e-9);
});

test("cortar credita moedas por variante e impede colheita duplicada", () => {
  const garden = fresh();
  const left = garden.tileAt(11, 9),
    right = garden.tileAt(13, 9);
  left.variant = "golden";
  right.variant = "flower";
  left.cutAt = right.cutAt = null;
  const result = garden.cut(NOW);
  assert.equal(result.earned, 16);
  assert.equal(result.harvested.length, 2);
  assert.equal(garden.coins, 16);
  assert.equal(garden.totalEarned, 16);
  assert.equal(garden.cutCount, 2);
  assert.equal(garden.cut(NOW + 0.5), null);
  assert.equal(garden.cut(NOW + 1.1).earned, 0);
  assert.equal(garden.coins, 16);
});

test("a grama cresce gradativamente e só pode ser colhida após 30 segundos", () => {
  const garden = fresh(),
    tile = garden.tileAt(11, 9);
  tile.variant = "common";
  tile.cutAt = null;
  garden.cut(NOW);
  assert.equal(garden.growth(tile, NOW), 0);
  assert.equal(garden.growth(tile, NOW + 7.5), 0.25);
  assert.equal(garden.growth(tile, NOW + 15), 0.5);
  assert.equal(garden.growth(tile, NOW + 29.99) < 1, true);
  assert.equal(garden.cut(NOW + 28).earned, 0);
  assert.equal(garden.growth(tile, NOW + GROW_TIME), 1);
  assert.ok(garden.cut(NOW + GROW_TIME).earned >= 1);
});

test("obstáculos bloqueiam o alcance da foice", () => {
  const garden = fresh();
  garden.player.x = 3.5;
  garden.player.y = 4.5;
  garden.level = 9;
  const hidden = garden.tileAt(5, 4);
  hidden.cutAt = null;
  assert.equal(garden.hasLineOfSight(5, 4), false);
  const result = garden.cut(NOW);
  assert.equal(
    result.harvested.some((t) => t.x === 5.5 && t.y === 4.5),
    false,
  );
  assert.equal(hidden.cutAt, null);
});

test("as melhorias descontam o custo, seguem a ordem e param no nível máximo", () => {
  const garden = fresh();
  assert.equal(garden.upgrade(), false);
  garden.coins = 59;
  assert.equal(garden.upgrade(), false);
  assert.equal(garden.coins, 59);
  garden.coins = 60;
  assert.equal(garden.upgrade(), true);
  assert.equal(garden.level, 1);
  assert.equal(garden.coins, 0);
  const sum = SCYTHES.slice(2).reduce((total, t) => total + t.cost, 0);
  garden.coins = sum;
  for (let i = 2; i < 10; i++) assert.equal(garden.upgrade(), true);
  assert.equal(garden.coins, 0);
  assert.equal(garden.level, 9);
  assert.equal(garden.nextTool, null);
  assert.equal(garden.upgrade(), false);
});

test("o save restaura equipamento, moedas, posição, grama e crescimento offline", () => {
  const garden = fresh();
  garden.coins = 120;
  garden.upgrade();
  garden.cut(NOW);
  garden.move(0.4, 0, 0.05);
  const saved = garden.serialize();
  const restored = fresh();
  assert.equal(restored.restore(saved, NOW + 40), true);
  assert.equal(restored.coins, garden.coins);
  assert.equal(restored.level, garden.level);
  assert.equal(restored.cutCount, garden.cutCount);
  assert.equal(restored.totalEarned, garden.totalEarned);
  assert.equal(restored.player.x, garden.player.x);
  assert.equal(restored.growth(restored.tileAt(11, 9), NOW + 40), 1);
  assert.equal(restored.serialize(), saved);
});

test("um save inválido é rejeitado por completo, sem alterar o jogo", () => {
  const garden = fresh(),
    original = garden.serialize();
  const invalid = ["{", "null", "{}"];
  for (const changes of [
    { coins: -1 },
    { level: 10 },
    { level: 0.5 },
    { coins: "100" },
    { player: { x: 4.5, y: 4.5 } },
    { grass: [] },
  ])
    invalid.push(JSON.stringify({ ...JSON.parse(original), ...changes }));
  const corrupt = JSON.parse(original);
  corrupt.grass[1] = corrupt.grass[0];
  invalid.push(JSON.stringify(corrupt));
  const future = JSON.parse(original);
  future.grass[0][3] = NOW + GROW_TIME + 1;
  invalid.push(JSON.stringify(future));
  for (const raw of invalid) {
    assert.equal(garden.restore(raw, NOW), false);
    assert.equal(garden.serialize(), original);
  }
});

test("MONEY ativa testes sem converter o saldo em Infinity ou gastar moedas reais", () => {
  const garden = fresh();
  garden.coins = 17;
  assert.equal(garden.redeemCode("invalido").ok, false);
  assert.equal(garden.infiniteMoney, false);
  assert.equal(garden.redeemCode(null).ok, false);
  assert.equal(garden.redeemCode("  money  ").ok, true);
  assert.equal(garden.infiniteMoney, true);
  assert.equal(garden.redeemCode("MONEY").ok, true);
  for (let i = 1; i < SCYTHES.length; i++) assert.equal(garden.upgrade(), true);
  for (let i = 1; i < FARMS.length; i++)
    assert.equal(garden.upgradeFarm(), true);
  assert.equal(garden.coins, 17);
  assert.equal(JSON.parse(garden.serialize()).infiniteMoney, true);
  assert.equal(JSON.parse(garden.serialize()).coins, 17);
  garden.infiniteMoney = false;
  assert.equal(garden.canAfford(18), false);
});

test("a fazenda tem 5 níveis, cobra corretamente e não permite pular etapas", () => {
  const garden = fresh();
  assert.equal(FARMS.length, 5);
  assert.equal(garden.upgradeFarm(), false);
  garden.coins = 199;
  assert.equal(garden.upgradeFarm(), false);
  garden.coins = FARMS.slice(1).reduce((sum, farm) => sum + farm.cost, 0);
  for (let i = 1; i < 5; i++) {
    assert.equal(garden.upgradeFarm(), true);
    assert.equal(garden.farmLevel, i);
    assert.equal(garden.multiplier, 1 + FARMS[i].bonus);
  }
  assert.equal(garden.coins, 0);
  assert.equal(garden.nextFarm, null);
  assert.equal(garden.upgradeFarm(), false);
});

test("melhorias da fazenda aumentam a chance de grama especial", () => {
  assert.equal(
    pickGrass(() => 0.1, 0),
    "flower",
  );
  assert.equal(
    pickGrass(() => 0.1, 4),
    "golden",
  );
  assert.equal(
    pickGrass(() => 0.4, 0),
    "common",
  );
  assert.equal(
    pickGrass(() => 0.4, 4),
    "flower",
  );
  assert.equal(
    pickGrass(() => 0.43, 4),
    "common",
  );
});

test("os bônus acumulam frações sem perder moedas ao arredondar cada tufo", () => {
  const garden = fresh();
  garden.farmLevel = 1;
  for (const tile of garden.tiles)
    if (tile.kind === "grass") {
      tile.variant = "common";
      tile.cutAt = null;
    }
  let paid = 0;
  for (let i = 0; i < 5; i++) paid += garden.cut(NOW + i * 30).earned;
  assert.equal(garden.cutCount, 10);
  assert.equal(paid, 11);
  assert.equal(garden.coins, 11);
  assert.equal(garden.totalEarned, 11);
  assert.ok(garden.bonusCarry < 1e-8);
});

test("rebirth exige a foice lendária e mantém fazenda, histórico e bônus permanentes", () => {
  const garden = fresh();
  garden.coins = 400;
  garden.farmLevel = 4;
  garden.cutCount = 120;
  garden.totalEarned = 900;
  assert.equal(garden.rebirth(NOW), false);
  assert.equal(garden.coins, 400);
  garden.level = 9;
  assert.equal(garden.canRebirth, true);
  assert.equal(garden.rebirth(NOW), true);
  assert.equal(garden.level, 0);
  assert.equal(garden.coins, 0);
  assert.equal(garden.rebirths, 1);
  assert.equal(garden.farmLevel, 4);
  assert.equal(garden.cutCount, 120);
  assert.equal(garden.totalEarned, 900);
  assert.equal(garden.multiplier, 1.5 * 1.25);
  assert.equal(garden.canRebirth, false);
  assert.equal(garden.rebirth(NOW), false);
  garden.level = 9;
  garden.rebirth(NOW + 100);
  assert.equal(garden.rebirths, 2);
  assert.equal(garden.multiplier, 1.5 * 1.5);
});

test("fazenda, rebirth, frações de bônus e modo MONEY sobrevivem ao save", () => {
  const garden = fresh();
  garden.farmLevel = 3;
  garden.rebirths = 4;
  garden.redeemCode("MONEY");
  garden.bonusCarry = 0.75;
  const restored = fresh();
  assert.equal(restored.restore(garden.serialize(), NOW), true);
  assert.equal(restored.serialize(), garden.serialize());
  assert.equal(restored.multiplier, 2.7);
});

test("saves anteriores às novas funções continuam compatíveis", () => {
  const data = JSON.parse(fresh().serialize());
  for (const key of ["farmLevel", "rebirths", "infiniteMoney", "bonusCarry"])
    delete data[key];
  data.coins = 61;
  const restored = fresh();
  assert.equal(restored.restore(JSON.stringify(data), NOW), true);
  assert.equal(restored.coins, 61);
  assert.equal(restored.infiniteMoney, false);
  assert.equal(restored.farmLevel, 0);
  assert.equal(restored.rebirths, 0);
  assert.equal(restored.bonusCarry, 0);
});

test("saves com progresso inválido não alteram a partida", () => {
  const garden = fresh(),
    original = garden.serialize();
  for (const changes of [
    { farmLevel: 5 },
    { farmLevel: -1 },
    { rebirths: 0.5 },
    { rebirths: -1 },
    { infiniteMoney: "true" },
    { bonusCarry: 1 },
    { bonusCarry: -0.2 },
  ]) {
    assert.equal(
      garden.restore(
        JSON.stringify({ ...JSON.parse(original), ...changes }),
        NOW,
      ),
      false,
    );
    assert.equal(garden.serialize(), original);
  }
});
