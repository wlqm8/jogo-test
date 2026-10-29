import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Garden } from "../src/model.js";
import { CROPS, WELL } from "../src/farming.js";
import { BUILDINGS, QUESTS, questProgress } from "../src/progression.js";

const NOW = 10000;
const fresh = () => new Garden({ now: NOW, random: () => 0.8 });
const planted = (g) => {
  const t = g.tileAt(13, 10);
  assert.ok(g.plantTile(t));
  return t;
};

test("capim plantado precisa de 30 segundos regado na fazenda inicial", () => {
  const g = fresh(),
    tile = planted(g);
  g.waterTile(tile);
  assert.equal(CROPS.grass.seconds, 30);
  g.advance(29.9);
  assert.ok(g.cropGrowth(tile) < 1);
  g.advance(0.1);
  assert.equal(g.cropGrowth(tile), 1);
});

test("construções exigem nível e ouro, são compradas uma por vez e param no nível 3", () => {
  for (const [key, building] of Object.entries(BUILDINGS)) {
    const g = fresh();
    g.coins = 100000;
    const before = g.serialize();
    assert.equal(g.upgradeBuilding(key), false);
    assert.equal(g.serialize(), before);
    g.gainXP(1000);
    for (const [level, cost] of building.costs.entries()) {
      g.coins = cost - 1;
      assert.equal(g.upgradeBuilding(key), false);
      assert.equal(g.buildings[key], level);
      g.coins++;
      assert.equal(g.upgradeBuilding(key), true);
      assert.equal(g.coins, 0);
      assert.equal(g.buildings[key], level + 1);
    }
    assert.equal(g.upgradeBuilding(key), false);
    assert.equal(g.upgradeBuilding("__proto__"), false);
  }
});

test("a cisterna amplia os dois reservatórios e a habilidade de rega continua somando", () => {
  const g = fresh();
  g.gainXP(195);
  g.coins = 300;
  assert.ok(g.upgradeBuilding("cistern"));
  assert.ok(g.learnSkill("speed"));
  assert.ok(g.learnSkill("watering"));
  assert.equal(g.waterCapacity, 40);
  g.player = { x: WELL.x, y: WELL.y + 1, facing: "down" };
  assert.ok(g.refillWater());
  assert.equal(g.water, 40);
  g.coins = 1500;
  assert.ok(g.buyCompanion("robot"));
  assert.equal(g.robotCapacity, 24);
  g.helpers.robot.x = WELL.x;
  g.helpers.robot.y = WELL.y + 1;
  g.advance(0.25);
  assert.equal(g.robotWater, 24);
  assert.ok(fresh().restore(g.serialize(), NOW));
});

test("a composteira acelera de fato uma cultura e não substitui a rega", () => {
  const g = fresh(),
    tile = planted(g);
  g.gainXP(195);
  g.infiniteMoney = true;
  for (let i = 0; i < 3; i++) assert.ok(g.upgradeBuilding("compost"));
  g.advance(30);
  assert.equal(tile.crop.progress, 0);
  g.waterTile(tile);
  g.advance(23);
  assert.ok(g.cropGrowth(tile) < 1);
  g.advance(0.1);
  assert.equal(g.cropGrowth(tile), 1);
  assert.equal(g.cropSpeed, 1.3);
});

test("cerca reforçada aumenta o tempo real de ataque antes de destruir o canteiro", () => {
  for (const reinforced of [false, true]) {
    const g = fresh(),
      tile = planted(g);
    if (reinforced) {
      g.gainXP(195);
      g.coins = 450;
      assert.ok(g.upgradeBuilding("fence"));
    }
    g.worldTime = 245;
    g.lastWolfSpawn = 245;
    g.spawnWolf();
    const w = g.wolves[0];
    w.x = tile.x + 0.5;
    w.y = tile.y + 0.5;
    g.advance(2);
    assert.equal(tile.damaged, !reinforced);
    if (reinforced) {
      assert.ok(fresh().restore(g.serialize(), NOW));
      g.advance(1.25);
      assert.equal(tile.damaged, true);
    }
  }
});

test("missões respeitam progresso, pré-requisitos e resgate único com recompensas fixas", () => {
  const g = fresh();
  assert.equal(QUESTS.length, 14);
  assert.equal(g.claimQuest("sowing"), false);
  assert.equal(g.claimQuest("__proto__"), false);
  g.watered = 20;
  assert.equal(g.claimQuest("watering"), false);
  for (const t of g.tiles.filter((t) => t.kind === "soil").slice(0, 10))
    assert.ok(g.plantTile(t));
  g.farmLevel = 2;
  const before = { gold: g.coins, diamonds: g.diamonds, xp: g.xp };
  assert.ok(g.claimQuest("sowing"));
  assert.equal(g.coins, before.gold + 50);
  assert.equal(g.diamonds, before.diamonds + 5);
  assert.equal(g.xp, before.xp + 10);
  const after = g.serialize();
  assert.equal(g.claimQuest("sowing"), false);
  assert.equal(g.serialize(), after);
  assert.ok(g.claimQuest("watering"));
  const restored = fresh();
  assert.ok(restored.restore(g.serialize(), NOW));
  assert.equal(restored.claimQuest("watering"), false);
  assert.deepEqual(restored.claimedQuests, ["sowing", "watering"]);
});

test("MONEY não completa missões nem ignora o nível das construções", () => {
  const g = fresh();
  g.redeemCode("MONEY");
  assert.equal(g.claimQuest("sowing"), false);
  assert.equal(g.upgradeBuilding("compost"), false);
  g.gainXP(195);
  assert.ok(g.upgradeBuilding("compost"));
  assert.equal(g.coins, 0);
  assert.equal(g.diamonds, 0);
});

test("missões de parceiros, construções e nível usam a progressão existente", () => {
  const g = fresh();
  g.gainXP(1000);
  g.infiniteMoney = true;
  g.buyCompanion("dog");
  g.buyCompanion("robot");
  for (const key of ["fence", "cistern"])
    for (let i = 0; i < 3; i++) g.upgradeBuilding(key);
  assert.equal(
    questProgress(
      g,
      QUESTS.find((q) => q.id === "friend"),
    ),
    1,
  );
  assert.equal(
    questProgress(
      g,
      QUESTS.find((q) => q.id === "automation"),
    ),
    1,
  );
  assert.equal(
    questProgress(
      g,
      QUESTS.find((q) => q.id === "builder"),
    ),
    6,
  );
  assert.equal(
    questProgress(
      g,
      QUESTS.find((q) => q.id === "farmer"),
    ),
    g.experience.level,
  );
});

test("noite protegida exige planta ao anoitecer e nenhuma perda; noite vazia não conta", () => {
  for (const scenario of ["empty", "protected", "damaged"]) {
    const g = fresh();
    g.spawnWolf = () => {};
    const t = scenario === "empty" ? null : planted(g);
    g.advance(240);
    if (scenario === "damaged") g.damagePlot(t);
    g.advance(60);
    assert.equal(g.nightsSurvived, 1);
    assert.equal(g.protectedNights, scenario === "protected" ? 1 : 0);
    assert.ok(fresh().restore(g.serialize(), NOW));
  }
});

test("rebirth mantém construções, missões já resgatadas e noites protegidas", () => {
  const g = fresh();
  g.gainXP(2000);
  g.infiniteMoney = true;
  for (const key of Object.keys(BUILDINGS)) g.upgradeBuilding(key);
  g.planted = 10;
  g.claimQuest("sowing");
  g.nightsSurvived = 3;
  g.protectedNights = 2;
  g.scythes[15] = 1;
  g.equipScythe(15);
  assert.ok(g.rebirth(NOW));
  assert.deepEqual(g.buildings, { cistern: 1, fence: 1, compost: 1 });
  assert.deepEqual(g.claimedQuests, ["sowing"]);
  assert.equal(g.protectedNights, 2);
  assert.ok(fresh().restore(g.serialize(), NOW));
});

test("saves com construções, missões ou capacidades inválidas são rejeitados sem alterar a partida", () => {
  const cases = [
    (s) => (s.life.buildings.cistern = 4),
    (s) => (s.life.buildings.extra = 1),
    (s) => (s.life.buildings.fence = 1),
    (s) => (s.life.claimedQuests = ["does-not-exist"]),
    (s) => (s.life.claimedQuests = ["sowing", "sowing"]),
    (s) => (s.life.claimedQuests = ["watering"]),
    (s) => (s.life.protectedNights = 1),
    (s) => (s.life.water = 25),
    (s) => (s.life.robotWater = 1),
  ];
  const g = fresh();
  const before = g.serialize();
  for (const change of cases) {
    const s = JSON.parse(before);
    change(s);
    assert.equal(g.restore(JSON.stringify(s), NOW), false);
    assert.equal(g.serialize(), before);
  }
});

test("save real da versão 2.0 preserva carteira, coleção, culturas e proporção de crescimento", async () => {
  const raw = await readFile(
    new URL("fixtures/legacy-v2.json", import.meta.url),
    "utf8",
  );
  const g = fresh();
  assert.ok(g.restore(raw, NOW));
  assert.equal(g.coins, 4321);
  assert.equal(g.diamonds, 77);
  assert.equal(g.boxesOpened, 11);
  assert.equal(g.qualityLevel, 2);
  assert.equal(g.cropGrowth(g.tileAt(13, 10)), 0.5);
  assert.equal(g.cropGrowth(g.tileAt(14, 10)), 1);
  assert.deepEqual(g.buildings, { cistern: 0, fence: 0, compost: 0 });
  assert.deepEqual(g.claimedQuests, []);
  const migrated = JSON.parse(g.serialize());
  assert.equal(migrated.version, 4);
  const r = fresh();
  assert.ok(r.restore(JSON.stringify(migrated), NOW));
  assert.equal(r.cropGrowth(r.tileAt(13, 10)), 0.5);
});
