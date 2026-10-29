import { FarmLife, WORLD_COLS, WORLD_ROWS } from "./farming.js";
import { BOX_TOOLS, BOX_PRICE, rollTool } from "./loot.js";
export const COLS = WORLD_COLS;
export const ROWS = WORLD_ROWS;
export const TILE = 32;
export const GROW_TIME = 30;
export const SAVE_KEY = "capim-e-cia:v1";

export const FARMS = [
  {
    name: "Jardim do sossego",
    cost: 0,
    bonus: 0,
    description: "Um cantinho simples, cheio de possibilidades.",
    roof: "#8a9b6f",
  },
  {
    name: "Recanto florido",
    cost: 200,
    bonus: 0.1,
    description: "Novos canteiros e uma cabana mais acolhedora.",
    roof: "#ac927a",
  },
  {
    name: "Quintal frutífero",
    cost: 700,
    bonus: 0.2,
    description: "Árvores carregadas e ainda mais vida por aqui.",
    roof: "#bf9475",
  },
  {
    name: "Fazenda florescente",
    cost: 2000,
    bonus: 0.35,
    description: "Mais flores, mais cores e um lago cheio de encanto.",
    roof: "#a58174",
  },
  {
    name: "Paraíso verde",
    cost: 5500,
    bonus: 0.5,
    description: "Seu refúgio completo. Uma pequena obra da natureza.",
    roof: "#779791",
  },
];

export const SCYTHES = BOX_TOOLS;

export const GRASS = {
  common: { name: "comum", value: 1, color: "#61994d" },
  flower: { name: "florida", value: 4, color: "#cf8ca0" },
  golden: { name: "dourada", value: 12, color: "#cfb451" },
};

export function pickGrass(random = Math.random, farmLevel = 0) {
  const roll = random();
  const golden = 0.06 + farmLevel * 0.015;
  const flower = 0.22 + farmLevel * 0.02;
  return roll < golden
    ? "golden"
    : roll < golden + flower
      ? "flower"
      : "common";
}

export function hash(x, y, salt = 0) {
  let n = (x * 374761393 + y * 668265263 + salt * 1274126177) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function createGarden(now, farmLevel = 0, cols = COLS, rows = ROWS) {
  return Array.from({ length: rows * cols }, (_, i) => {
    const x = i % cols,
      y = Math.floor(i / cols);
    let kind = "grass";
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) kind = "hedge";
    else if (x >= 2 && x <= 5 && y <= 2) kind = "shed";
    else if (x >= 19 && x <= 22 && y >= 2 && y <= 4) kind = "pond";
    else if (cols > 25 && x === 10 && y === 5) kind = "well";
    else if (x % 4 === 0 && y % 4 === 0 && !(x === 12 && y === 8))
      kind = "bush";
    else if (y === 8 || x === 12 || y === 14) kind = "path";
    else if ((x === 3 && y === 11) || (x === 20 && y === 11)) kind = "stone";
    else if (
      cols > 25 &&
      ((x >= 13 && x <= 18 && y >= 10 && y <= 13) ||
        (x >= 25 && x <= 33 && y >= 17 && y <= 23))
    )
      kind = "soil";
    return {
      x,
      y,
      kind,
      crop: null,
      damaged: false,
      repairCost: 0,
      variant:
        cols > 25
          ? hash(x, y, 32) < 0.12
            ? "flower"
            : "common"
          : pickGrass(() => hash(x, y, 32), farmLevel),
      cutAt:
        kind === "grass" && hash(x, y, 14) < 0.12
          ? now - 10 - hash(x, y, 9) * 17
          : null,
    };
  });
}

export class Garden extends FarmLife {
  constructor({ now = Date.now() / 1000, random = Math.random } = {}) {
    super();
    this.random = random;
    this.tiles = createGarden(now);
    this.player = { x: 12.5, y: 9.5, facing: "down", walking: false };
    this.coins = 0;
    this.level = 0;
    this.cutCount = 0;
    this.totalEarned = 0;
    this.lastCut = -Infinity;
    this.infiniteMoney = false;
    this.farmLevel = 0;
    this.rebirths = 0;
    this.bonusCarry = 0;
    this.initLife();
    this.scythes = Array(SCYTHES.length).fill(0);
    this.scythes[0] = 1;
    this.boxesOpened = 0;
  }

  get tool() {
    return SCYTHES[this.level];
  }
  get nextTool() {
    return SCYTHES[this.level + 1] || null;
  }
  get farm() {
    return FARMS[this.farmLevel];
  }
  get nextFarm() {
    return FARMS[this.farmLevel + 1] || null;
  }
  get multiplier() {
    return (
      (1 + this.farm.bonus) *
      (1 + this.rebirths * 0.25) *
      (1 + this.skills.profit * 0.05)
    );
  }
  get canRebirth() {
    return (
      this.tool.rarity >= 3 &&
      this.tool.grade === 1 &&
      this.experience.level >= 10 &&
      this.canAfford(this.rebirthCost) &&
      this.rebirths < 999999
    );
  }
  get rebirthCost() {
    return 20000 * (this.rebirths + 1);
  }
  canAfford(cost) {
    return this.infiniteMoney || this.coins >= cost;
  }
  tileAt(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS
      ? this.tiles[Math.floor(y) * COLS + Math.floor(x)]
      : null;
  }
  growth(tile, now = Date.now() / 1000) {
    return tile.cutAt === null
      ? 1
      : Math.min(1, Math.max(0, (now - tile.cutAt) / GROW_TIME));
  }
  canWalk(x, y) {
    const r = 0.22;
    return [
      [-r, -r],
      [r, -r],
      [-r, r],
      [r, r],
    ].every(([dx, dy]) => {
      const tile = this.tileAt(x + dx, y + dy);
      return tile && ["grass", "soil", "path"].includes(tile.kind);
    });
  }

  move(dx, dy, dt) {
    const length = Math.hypot(dx, dy);
    this.player.walking = length > 0.05;
    if (!this.player.walking) return;
    if (length > 1) {
      dx /= length;
      dy /= length;
    }
    if (Math.abs(dx) > Math.abs(dy))
      this.player.facing = dx > 0 ? "right" : "left";
    else this.player.facing = dy > 0 ? "down" : "up";
    const distance = Math.min(dt, 0.1) * this.moveSpeed;
    // Substeps keep movement from tunneling through obstacles on a slow frame.
    const steps = Math.max(1, Math.ceil(distance / 0.1));
    for (let s = 0; s < steps; s++) {
      const nx = this.player.x + (dx * distance) / steps;
      if (this.canWalk(nx, this.player.y)) this.player.x = nx;
      const ny = this.player.y + (dy * distance) / steps;
      if (this.canWalk(this.player.x, ny)) this.player.y = ny;
    }
  }

  hasLineOfSight(x, y) {
    const dx = x + 0.5 - this.player.x,
      dy = y + 0.5 - this.player.y;
    const steps = Math.ceil(Math.hypot(dx, dy) * 5);
    for (let i = 1; i < steps; i++) {
      const tile = this.tileAt(
        this.player.x + (dx * i) / steps,
        this.player.y + (dy * i) / steps,
      );
      if (!tile || !["grass", "soil", "path"].includes(tile.kind)) return false;
    }
    return true;
  }

  cut(now = Date.now() / 1000) {
    if (now - this.lastCut + 1e-8 < this.harvestCooldown) return null;
    this.lastCut = now;
    const cx = Math.floor(this.player.x),
      cy = Math.floor(this.player.y);
    const harvested = [];
    let earned = 0;
    for (const [dx, dy] of this.tool.offsets) {
      const tile = this.tileAt(cx + dx, cy + dy);
      if (
        !tile ||
        tile.kind !== "grass" ||
        this.growth(tile, now) < 1 ||
        !this.hasLineOfSight(tile.x, tile.y)
      )
        continue;
      // Keep whole coins while carrying fractional bonuses into the next tuft.
      const reward =
        GRASS[tile.variant].value * this.multiplier + this.bonusCarry;
      const value = Math.floor(reward + 1e-9);
      this.bonusCarry = Math.max(0, reward - value);
      harvested.push({
        x: tile.x + 0.5,
        y: tile.y + 0.5,
        variant: tile.variant,
        value,
      });
      earned += value;
      tile.cutAt = now;
      const nextVariant = pickGrass(this.random, this.farmLevel);
      tile.variant = nextVariant === "golden" ? "common" : nextVariant;
    }
    this.coins += earned;
    this.totalEarned += earned;
    this.cutCount += harvested.length;
    if (harvested.length) this.gainXP(harvested.length);
    return { earned, harvested };
  }

  openCrates(count = 1) {
    if (!Number.isInteger(count) || ![1, 11].includes(count))
      return { ok: false, items: [], cost: 0 };
    const cost = BOX_PRICE[count];
    if (!cost || !this.payDiamonds(cost))
      return { ok: false, items: [], cost: 0 };
    const items = [];
    for (let i = 0; i < count; i++) {
      const index = rollTool(this.random);
      this.scythes[index]++;
      items.push(index);
      if (SCYTHES[index].power > this.tool.power) this.level = index;
    }
    this.boxesOpened += count;
    return { ok: true, items, cost };
  }
  equipScythe(index) {
    if (!Number.isInteger(index) || !this.scythes[index]) return false;
    this.level = index;
    return true;
  }
  fuseScythe(index) {
    const tool = SCYTHES[index];
    if (!tool || tool.grade === 1 || this.scythes[index] < 5) return false;
    this.scythes[index] -= 5;
    this.scythes[index + 1]++;
    if (
      (this.level === index && !this.scythes[index]) ||
      SCYTHES[index + 1].power > this.tool.power
    )
      this.level = index + 1;
    return true;
  }

  upgradeFarm() {
    const next = this.nextFarm;
    if (!next || !this.canAfford(next.cost)) return false;
    if (!this.infiniteMoney) this.coins -= next.cost;
    this.farmLevel++;
    return true;
  }

  redeemCode(code) {
    if (typeof code !== "string" || code.trim().toUpperCase() !== "MONEY")
      return {
        ok: false,
        message: "Código não encontrado. Confira e tente de novo.",
      };
    if (this.infiniteMoney)
      return {
        ok: true,
        message: "O dinheiro infinito já está ativado nesta sessão de testes.",
      };
    this.infiniteMoney = true;
    return {
      ok: true,
      message:
        "MONEY ativado! Ouro e diamantes infinitos para testar caixas, sementes e melhorias.",
    };
  }

  rebirth(now = Date.now() / 1000) {
    if (!this.canRebirth) return false;
    this.rebirths++;
    this.level = 0;
    this.scythes[0] = Math.max(1, this.scythes[0]);
    this.coins = 0;
    this.bonusCarry = 0;
    this.lastCut = -Infinity;
    this.tiles = createGarden(now, this.farmLevel);
    this.player = { x: 12.5, y: 9.5, facing: "down", walking: false };
    this.wolves = [];
    this.dogReturning = false;
    this.cargoAge = 0;
    this.dogDiamonds = 0;
    this.dogGold = 0;
    this.dogCargo = Object.fromEntries(
      Object.keys(this.dogCargo).map((k) => [k, 0]),
    );
    this.helpers = { dog: this.newAgent(), robot: this.newAgent() };
    return true;
  }

  serialize() {
    const { x, y, facing } = this.player;
    return JSON.stringify({
      version: 4,
      scythes: this.scythes,
      boxesOpened: this.boxesOpened,
      coins: this.coins,
      level: this.level,
      cutCount: this.cutCount,
      totalEarned: this.totalEarned,
      infiniteMoney: this.infiniteMoney,
      farmLevel: this.farmLevel,
      rebirths: this.rebirths,
      bonusCarry: this.bonusCarry,
      player: { x, y, facing },
      grass: this.tiles
        .filter((t) => ["grass", "soil"].includes(t.kind))
        .map((t) => [t.x, t.y, t.variant, t.cutAt]),
      life: this.serializeLife(),
    });
  }

  restore(raw, now = Date.now() / 1000) {
    // Validate the complete save before changing any live state.
    try {
      const data = JSON.parse(raw);
      const validCount = (n) => Number.isSafeInteger(n) && n >= 0 && n < 1e12;
      if (
        !data ||
        ![1, 2, 3, 4].includes(data.version) ||
        ![data.coins, data.cutCount, data.totalEarned].every(validCount) ||
        !Number.isInteger(data.level) ||
        data.level < 0 ||
        data.level >= SCYTHES.length
      )
        return false;
      const infiniteMoney = data.infiniteMoney ?? false,
        farmLevel = data.farmLevel ?? 0,
        rebirths = data.rebirths ?? 0,
        bonusCarry = data.bonusCarry ?? 0;
      if (
        data.version >= 3 &&
        (!Array.isArray(data.scythes) ||
          data.scythes.length !== SCYTHES.length ||
          !data.scythes.every(validCount) ||
          !data.scythes[data.level] ||
          !validCount(data.boxesOpened))
      )
        return false;
      const legacy = data.version === 1;
      const baseTiles = legacy ? createGarden(now, 0, 25, 17) : this.tiles;
      const life =
        data.version < 4 && data.life
          ? {
              ...data.life,
              buildings: { cistern: 0, fence: 0, compost: 0 },
              claimedQuests: [],
              protectedNights: 0,
            }
          : data.life;
      // Version 2.0 used 20 seconds for planted capim. Keep its growth fraction
      // when adopting the requested 30-second base time.
      if (data.version === 3 && Array.isArray(life?.plots))
        life.plots = life.plots.map((row) => {
          if (!Array.isArray(row) || row[2]?.type !== "grass") return row;
          const copy = [...row];
          copy[2] = { ...row[2], progress: row[2].progress * 1.5 };
          return copy;
        });
      if (!legacy && !this.validateLife(life)) return false;
      if (
        typeof infiniteMoney !== "boolean" ||
        !Number.isInteger(farmLevel) ||
        farmLevel < 0 ||
        farmLevel >= FARMS.length ||
        !Number.isInteger(rebirths) ||
        rebirths < 0 ||
        rebirths > 999999 ||
        !Number.isFinite(bonusCarry) ||
        bonusCarry < 0 ||
        bonusCarry >= 1
      )
        return false;
      if (
        !Array.isArray(data.grass) ||
        data.grass.length !==
          baseTiles.filter((t) => ["grass", "soil"].includes(t.kind)).length
      )
        return false;
      const seen = new Set();
      for (const row of data.grass) {
        if (!Array.isArray(row) || row.length !== 4) return false;
        const [x, y, variant, cutAt] = row;
        if (
          !Number.isInteger(x) ||
          !Number.isInteger(y) ||
          (legacy
            ? baseTiles[y * 25 + x]?.kind !== "grass" ||
              x < 0 ||
              x >= 25 ||
              y < 0 ||
              y >= 17
            : !["grass", "soil"].includes(this.tileAt(x, y)?.kind)) ||
          !Object.hasOwn(GRASS, variant) ||
          (cutAt !== null &&
            (!Number.isFinite(cutAt) || cutAt < 0 || cutAt > now + GROW_TIME))
        )
          return false;
        const key = `${x},${y}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      const p = data.player;
      if (
        !p ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        !(legacy
          ? [
              [-0.22, -0.22],
              [0.22, -0.22],
              [-0.22, 0.22],
              [0.22, 0.22],
            ].every(([dx, dy]) => {
              const x = Math.floor(p.x + dx),
                y = Math.floor(p.y + dy);
              return (
                x >= 0 &&
                x < 25 &&
                y >= 0 &&
                y < 17 &&
                ["grass", "path"].includes(baseTiles[y * 25 + x]?.kind)
              );
            })
          : this.canWalk(p.x, p.y))
      )
        return false;
      Object.assign(this, {
        coins: data.coins,
        level: data.level,
        cutCount: data.cutCount,
        totalEarned: data.totalEarned,
        infiniteMoney,
        farmLevel,
        rebirths,
        bonusCarry,
      });
      this.player = {
        x: this.canWalk(p.x, p.y) ? p.x : 12.5,
        y: this.canWalk(p.x, p.y) ? p.y : 9.5,
        facing: ["up", "down", "left", "right"].includes(p.facing)
          ? p.facing
          : "down",
        walking: false,
      };
      for (const [x, y, variant, cutAt] of data.grass)
        Object.assign(this.tileAt(x, y), { variant, cutAt });
      if (!legacy) this.restoreLife(life);
      if (data.version >= 3) {
        this.scythes = [...data.scythes];
        this.boxesOpened = data.boxesOpened;
      } else {
        const migrated =
          Math.min(20, Math.floor(data.level / 2) * 4) +
          (data.level % 2 ? 1 : 0);
        this.scythes = Array(SCYTHES.length).fill(0);
        this.scythes[0] = 1;
        this.scythes[migrated]++;
        this.level = migrated;
      }
      return true;
    } catch {
      return false;
    }
  }
}
