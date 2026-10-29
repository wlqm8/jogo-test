import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Garden, SCYTHES } from "../src/model.js";
import {
  CROPS,
  DAY_DURATION,
  NIGHT_DURATION,
  WELL,
  HOME,
} from "../src/farming.js";
import { RARITIES, rollTool } from "../src/loot.js";

const NOW = 10000;
const fresh = () => new Garden({ now: NOW, random: () => 0.8 });
const plant = (g, x = 13, y = 10, type = "grass") => {
  g.selectedCrop = type;
  const t = g.tileAt(x, y);
  assert.equal(g.plantTile(t), true);
  return t;
};
const stand = (g, t) => {
  g.player.x = t.x + 0.5;
  g.player.y = t.y + 0.5;
};
const noWildRewards = (g) => {
  for (const t of g.tiles) if (t.kind === "grass") t.cutAt = NOW;
};

test("começa com 24 sementes de capim, água e uma foice comum G4", () => {
  const g = fresh();
  assert.equal(g.seeds.grass, 24);
  assert.equal(
    Object.values(g.seeds).reduce((a, b) => a + b),
    24,
  );
  assert.equal(g.water, 12);
  assert.equal(g.level, 0);
  assert.equal(g.scythes[0], 1);
  assert.equal(g.diamonds, 0);
  assert.equal(Object.keys(CROPS).length, 8);
});
test("plantar consome semente e não cresce antes de regar", () => {
  const g = fresh(),
    t = plant(g);
  assert.equal(g.seeds.grass, 23);
  assert.equal(g.planted, 1);
  g.advance(19);
  assert.equal(t.crop.progress, 0);
  assert.equal(g.cropGrowth(t), 0);
  assert.equal(g.plantTile(t), false);
  assert.equal(g.seeds.grass, 23);
});
test("cada cultura respeita seu tempo de crescimento após a rega", () => {
  for (const [type, crop] of Object.entries(CROPS)) {
    const g = fresh();
    g.seeds[type] = 1;
    const t = plant(g, 13, 10, type);
    assert.ok(g.waterTile(t));
    g.advance(crop.seconds - 0.1);
    assert.ok(g.cropGrowth(t) < 1);
    g.advance(0.1);
    assert.equal(g.cropGrowth(t), 1);
  }
});
test("colheita imatura não rende; madura é coletada uma única vez", () => {
  const g = fresh(),
    t = plant(g);
  stand(g, t);
  noWildRewards(g);
  g.waterTile(t);
  g.selectedAction = "harvest";
  assert.equal(g.act(NOW).earned, 0);
  g.advance(29);
  assert.equal(g.act(NOW + 2).earned, 0);
  g.advance(1);
  assert.equal(g.act(NOW + 4).earned, 5);
  assert.equal(g.cropHarvested, 1);
  assert.equal(g.orderHarvest.grass, 1);
  assert.equal(t.crop, null);
  assert.equal(g.act(NOW + 6).earned, 0);
});
test("sementes exigem nível e ouro, sem gastar quando faltam requisitos", () => {
  const g = fresh();
  g.coins = 100;
  assert.equal(g.buySeeds("carrot"), false);
  assert.equal(g.coins, 100);
  g.gainXP(195);
  assert.equal(g.experience.level, 4);
  assert.equal(g.buySeeds("carrot"), true);
  assert.equal(g.coins, 0);
  assert.equal(g.seeds.carrot, 10);
  assert.equal(g.buySeeds("carrot"), false);
  assert.equal(g.buySeeds("grass", -1), false);
  assert.equal(g.buySeeds("unknown"), false);
});
test("sem sementes não planta nem gasta água", () => {
  const g = fresh();
  g.selectedCrop = "potato";
  assert.equal(g.plantTile(g.tileAt(13, 10)), false);
  assert.equal(g.water, 12);
  assert.equal(g.seeds.potato, 0);
});
test("balde vazio impede rega e só reabastece perto do poço", () => {
  const g = fresh(),
    t = plant(g);
  g.water = 0;
  assert.equal(g.waterTile(t), false);
  assert.equal(t.crop.watered, false);
  assert.equal(g.refillWater(), false);
  g.player.x = WELL.x;
  g.player.y = WELL.y + 1;
  assert.equal(g.refillWater(), true);
  assert.equal(g.water, 24);
  assert.equal(g.waterTile(t), true);
  assert.equal(g.water, 23);
  assert.equal(g.waterTile(t), false);
  assert.equal(g.water, 23);
});
test("dia dura 240s, noite 60s e nenhum tempo passa ao restaurar o save", () => {
  const g = fresh();
  g.advance(DAY_DURATION - 0.25);
  assert.equal(g.isNight, false);
  g.advance(0.25);
  assert.equal(g.isNight, true);
  assert.equal(g.phaseRemaining, 60);
  assert.ok(g.wolves.length >= 2);
  g.advance(NIGHT_DURATION - 0.25);
  assert.equal(g.isNight, true);
  g.advance(0.25);
  assert.equal(g.isNight, false);
  assert.equal(g.day, 2);
  assert.equal(g.wolves.length, 0);
  const r = fresh();
  assert.ok(r.restore(g.serialize(), NOW + 999999));
  assert.equal(r.worldTime, g.worldTime);
});
test("lobos destroem canteiros e reparo exige o custo exato em ouro", () => {
  const g = fresh(),
    t = plant(g);
  g.advance(240);
  for (const w of g.wolves) {
    w.x = t.x + 0.5;
    w.y = t.y + 0.5;
  }
  g.advance(2.5);
  assert.equal(t.damaged, true);
  assert.equal(t.crop, null);
  assert.equal(t.repairCost, 12);
  assert.equal(g.cropsLost, 1);
  assert.equal(g.plantTile(t), false);
  stand(g, t);
  g.selectedAction = "repair";
  g.coins = 11;
  assert.equal(g.act(NOW).changed, 0);
  assert.equal(g.coins, 11);
  g.coins = 12;
  assert.equal(g.act(NOW + 2).changed, 1);
  assert.equal(g.coins, 0);
  assert.equal(t.damaged, false);
  assert.equal(t.crop, null);
  assert.equal(g.plantTile(t), true);
});
test("foice espanta lobos sem conceder duas recompensas", () => {
  const g = fresh();
  g.advance(240);
  const w = g.wolves[0];
  g.wolves = [w];
  w.x = g.player.x + 0.5;
  w.y = g.player.y;
  w.hp = 1;
  const result = g.act(NOW);
  assert.equal(result.scared, 1);
  assert.equal(g.wolves.length, 0);
  assert.equal(g.wolvesScared, 1);
  assert.equal(g.act(NOW + 0.1), null);
  assert.equal(g.wolvesScared, 1);
});
test("reparos ficam mais baratos com Mestre de obras", () => {
  const g = fresh(),
    t = plant(g);
  g.damagePlot(t);
  g.gainXP(195);
  assert.equal(g.learnSkill("repair"), true);
  assert.equal(g.repairPrice(t), Math.ceil(12 * 0.85));
});
test("companheiros precisam ser comprados antes de evoluir e param em 3", () => {
  const g = fresh();
  assert.equal(g.buyCompanion("dog"), false);
  g.coins = 350;
  assert.equal(g.buyCompanion("dog"), true);
  assert.equal(g.petLevels.dog, 1);
  assert.equal(g.coins, 0);
  assert.equal(g.buyCompanion("dog"), false);
  g.infiniteMoney = true;
  assert.equal(g.buyCompanion("dog"), true);
  assert.equal(g.petLevels.dog, 2);
  assert.equal(g.buyCompanion("dog"), true);
  assert.equal(g.buyCompanion("dog"), false);
  assert.equal(g.petLevels.dog, 3);
  assert.equal(g.buyCompanion("robot"), true);
  assert.equal(g.petLevels.robot, 1);
});
test("comprar um parceiro perto da cerca não o coloca dentro de um obstáculo", () => {
  const g = fresh();
  g.player.x = 1.24;
  g.player.y = 1.24;
  assert.ok(g.canWalk(g.player.x, g.player.y));
  g.coins = 350;
  assert.ok(g.buyCompanion("dog"));
  assert.ok(g.canWalk(g.helpers.dog.x, g.helpers.dog.y));
  assert.ok(fresh().restore(g.serialize(), NOW));
});
test("Bento não planta: colhe, transporta e paga apenas ao chegar em casa", () => {
  const g = fresh();
  g.coins = 350;
  g.buyCompanion("dog");
  const t = plant(g, 5, 3);
  t.crop.watered = true;
  t.crop.progress = CROPS.grass.seconds;
  t.crop.quality = "golden";
  g.helpers.dog.x = 5.5;
  g.helpers.dog.y = 3.5;
  g.advance(0.25);
  assert.equal(g.cropHarvested, 1);
  assert.equal(g.cargoCount, 1);
  assert.equal(t.crop, null);
  assert.equal(g.coins, 0);
  assert.equal(g.diamonds, 0);
  g.advance(1);
  assert.equal(g.cargoCount, 0);
  assert.equal(g.coins, 10);
  assert.equal(g.diamonds, 10);
  assert.equal(g.orderHarvest.grass, 1);
  assert.equal(g.dogReturning, false);
  const p = g.planted;
  g.advance(3);
  assert.equal(g.planted, p);
});
test("Bento ajuda contra lobos mesmo sem habilidade comprada", () => {
  const g = fresh();
  g.petLevels.dog = 1;
  g.advance(240);
  g.wolves = [g.wolves[0]];
  const w = g.wolves[0];
  w.x = g.helpers.dog.x + 0.2;
  w.y = g.helpers.dog.y;
  const hp = w.hp;
  g.advance(0.25);
  assert.ok(w.hp < hp);
  assert.equal(g.skills.guard, 0);
});
test("Gota busca água no poço e rega sem usar a água do jogador", () => {
  const g = fresh();
  g.coins = 1500;
  assert.ok(g.buyCompanion("robot"));
  const t = plant(g, 11, 6);
  g.helpers.robot.x = WELL.x;
  g.helpers.robot.y = WELL.y + 1;
  g.advance(0.25);
  assert.equal(g.robotWater, 18);
  g.advance(2);
  assert.equal(t.crop.watered, true);
  assert.equal(g.water, 12);
  assert.equal(g.robotWater, 17);
});
test("cada nível dá 1 ponto e habilidades respeitam requisitos e não gastam duas vezes", () => {
  const g = fresh();
  assert.equal(g.skillPoints, 0);
  assert.equal(g.learnSkill("speed"), false);
  g.gainXP(40);
  assert.equal(g.experience.level, 2);
  assert.equal(g.skillPoints, 1);
  assert.ok(g.learnSkill("speed"));
  assert.equal(g.skillPoints, 0);
  assert.equal(g.moveSpeed, 3.5 * 1.08);
  assert.equal(g.learnSkill("speed"), false);
  g.gainXP(65);
  assert.equal(g.experience.level, 3);
  assert.equal(g.learnSkill("robot"), false);
  assert.ok(g.learnSkill("watering"));
  assert.equal(g.waterCapacity, 28);
  assert.equal(g.skillPoints, 0);
});
test("verduras douradas têm 5% e lendárias 0,1%, com limites exatos", () => {
  const g = fresh();
  assert.equal(g.goldenChance, 0.05);
  assert.equal(g.legendaryChance, 0.001);
  for (const [n, kind] of [
    [0, "legendary"],
    [0.000999, "legendary"],
    [0.001, "golden"],
    [0.050999, "golden"],
    [0.051, "normal"],
    [0.999, "normal"],
  ]) {
    g.random = () => n;
    assert.equal(g.rollQuality(), kind);
  }
});
test("pesquisa usa ouro e aumenta as chances das próximas sementes", () => {
  const g = fresh();
  assert.equal(g.upgradeQuality(), false);
  g.coins = 250;
  assert.ok(g.upgradeQuality());
  assert.equal(g.coins, 0);
  assert.ok(Math.abs(g.goldenChance - 0.06) < 1e-9);
  assert.ok(Math.abs(g.legendaryChance - 0.0012) < 1e-9);
  g.infiniteMoney = true;
  for (let i = 0; i < 4; i++) assert.ok(g.upgradeQuality());
  assert.equal(g.qualityLevel, 5);
  assert.equal(g.upgradeQuality(), false);
});
test("colheita dourada rende 10 diamantes e lendária rende 500", () => {
  for (const [quality, diamonds, gold] of [
    ["golden", 10, 10],
    ["legendary", 500, 25],
  ]) {
    const g = fresh(),
      t = plant(g);
    t.crop.quality = quality;
    t.crop.watered = true;
    t.crop.progress = CROPS.grass.seconds;
    stand(g, t);
    noWildRewards(g);
    g.act(NOW);
    assert.equal(g.diamonds, diamonds);
    assert.equal(g.coins, gold);
    g.act(NOW + 2);
    assert.equal(g.diamonds, diamonds);
  }
});
test("chances das caixas somam 100% e correspondem exatamente à última referência", () => {
  assert.deepEqual(
    RARITIES.map((r) => r.chance),
    [33.1, 43.5, 18.4, 4.7982, 0.2, 0.0018],
  );
  assert.equal(
    RARITIES.reduce((n, r) => n + r.weight, 0),
    1000000,
  );
  const counts = Array(6).fill(0);
  for (let i = 0; i < 1000000; i++)
    counts[rollTool(() => (i + 0.5) / 1000000) / 4]++;
  assert.deepEqual(
    counts,
    RARITIES.map((r) => r.weight),
  );
});
test("11 caixas custam 500 diamantes e quantidade inválida não muda o saldo", () => {
  const g = fresh();
  g.diamonds = 500;
  assert.ok(g.openCrates(11).ok);
  assert.equal(g.boxesOpened, 11);
  assert.equal(g.diamonds, 0);
  assert.equal(
    g.scythes.reduce((a, b) => a + b),
    12,
  );
  for (const n of [0, -1, 2, 100]) assert.equal(g.openCrates(n).ok, false);
  assert.equal(g.boxesOpened, 11);
});
test("5 foices idênticas viram 1 do grau melhor e grau 1 é o máximo", () => {
  const g = fresh();
  assert.equal(g.fuseScythe(0), false);
  g.scythes[0] = 5;
  assert.ok(g.fuseScythe(0));
  assert.equal(g.scythes[0], 0);
  assert.equal(g.scythes[1], 1);
  assert.equal(g.level, 1);
  assert.equal(g.equipScythe(0), false);
  assert.equal(g.fuseScythe(1), false);
  g.scythes[3] = 10;
  assert.equal(g.fuseScythe(3), false);
  assert.equal(g.scythes[4], 0);
  assert.ok(g.equipScythe(3));
});
test("rebirth devolve uma foice inicial mesmo depois de fundir todas as comuns G4", () => {
  const g = fresh();
  g.scythes[0] = 5;
  g.fuseScythe(0);
  assert.equal(g.scythes[0], 0);
  g.scythes[15] = 1;
  g.level = 15;
  g.gainXP(1260);
  g.coins = g.rebirthCost;
  assert.ok(g.rebirth(NOW));
  assert.equal(g.scythes[0], 1);
  assert.equal(g.level, 0);
  assert.ok(fresh().restore(g.serialize(), NOW));
});
test("pedido paga apenas uma vez e um novo dia reinicia a meta", () => {
  const g = fresh();
  g.orderHarvest.grass = g.order.count;
  assert.ok(g.claimOrder());
  assert.equal(g.coins, 60);
  assert.equal(g.claimOrder(), false);
  g.advance(300);
  assert.equal(g.orderClaimed, false);
  assert.equal(
    Object.values(g.orderHarvest).reduce((a, b) => a + b),
    0,
  );
});
test("save restaura ciclo, canteiros, sementes, carga, água, XP e coleção sem simular ausência", () => {
  const g = fresh();
  g.infiniteMoney = true;
  g.gainXP(250);
  g.learnSkill("speed");
  g.learnSkill("watering");
  g.buySeeds("carrot");
  g.buyCompanion("dog");
  g.buyCompanion("robot");
  g.upgradeQuality();
  const t = plant(g, 13, 10, "carrot");
  g.waterTile(t);
  g.advance(5);
  g.dogCargo.grass = 1;
  g.dogGold = 10;
  g.dogDiamonds = 10;
  g.diamonds = 25;
  const raw = g.serialize(),
    r = fresh();
  assert.ok(r.restore(raw, NOW + 9999));
  assert.equal(r.serialize(), raw);
  assert.equal(r.worldTime, 5);
  assert.equal(r.tileAt(13, 10).crop.progress, 5);
});
test("estado de noite com medo temporário dos lobos continua salvável", () => {
  const g = fresh();
  g.advance(240);
  g.wolves[0].flee = 0.01;
  g.advance(0.1);
  assert.ok(g.wolves.every((w) => w.flee >= 0));
  assert.ok(fresh().restore(g.serialize(), NOW));
});
test("dados inválidos de sementes, caixa, habilidade ou plantação são rejeitados atomicamente", () => {
  const g = fresh(),
    raw = g.serialize();
  for (const mutate of [
    (d) => (d.life.water = -1),
    (d) => (d.life.seeds.grass = -1),
    (d) => (d.life.skills.speed = 3),
    (d) => (d.scythes[0] = 0),
    (d) => (d.life.qualityLevel = 6),
    (d) => (d.life.diamonds = -1),
    (d) =>
      (d.life.plots[0][2] = {
        type: "grass",
        watered: false,
        progress: 10,
        quality: "normal",
      }),
  ]) {
    const d = JSON.parse(raw);
    mutate(d);
    assert.equal(g.restore(JSON.stringify(d), NOW), false);
    assert.equal(g.serialize(), raw);
  }
});
test("migra o save real da versão 1.1 sem perder ouro, fazenda e rebirth", async () => {
  const raw = await readFile(
    new URL("./fixtures/legacy-v1.json", import.meta.url),
    "utf8",
  );
  const g = fresh();
  assert.ok(g.restore(raw, NOW));
  assert.equal(g.coins, 4321);
  assert.equal(g.farmLevel, 2);
  assert.equal(g.rebirths, 3);
  assert.equal(g.cutCount, 123);
  assert.equal(g.seeds.grass, 24);
  assert.equal(g.worldTime, 0);
  assert.ok(g.canWalk(g.player.x, g.player.y));
  assert.equal(g.scythes[g.level], 1);
  assert.ok(fresh().restore(g.serialize(), NOW));
});
