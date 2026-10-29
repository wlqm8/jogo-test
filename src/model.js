export const COLS = 25;
export const ROWS = 17;
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

const tools = [
  [
    "Madeira",
    0,
    1.1,
    1,
    "#b99560",
    "Todo grande jardim começa com um pequeno corte.",
  ],
  [
    "Cobre",
    60,
    0.94,
    Math.SQRT2,
    "#c8875c",
    "Um brilho novo para suas pequenas conquistas.",
  ],
  [
    "Ferro",
    160,
    0.8,
    2,
    "#a4b4b1",
    "Firme, confiável e pronta para o trabalho.",
  ],
  [
    "Aço",
    360,
    0.67,
    Math.sqrt(5),
    "#b9ced0",
    "Um corte leve, um jardim cheio de possibilidades.",
  ],
  [
    "Prata",
    750,
    0.55,
    Math.sqrt(8),
    "#d5e3e7",
    "O luar também tem seu lugar no jardim.",
  ],
  ["Ouro", 1400, 0.44, 3, "#e6be51", "Cada movimento vale um pequeno tesouro."],
  [
    "Esmeralda",
    2500,
    0.35,
    Math.sqrt(10),
    "#70c59a",
    "A força da natureza na palma da sua mão.",
  ],
  [
    "Safira",
    4200,
    0.27,
    4,
    "#79b6e2",
    "Tão serena quanto o céu. Tão veloz quanto o vento.",
  ],
  [
    "Ametista",
    7000,
    0.2,
    Math.sqrt(18),
    "#bc94da",
    "Um toque de magia em cada novo caminho.",
  ],
  [
    "Lendária",
    11000,
    0.14,
    5,
    "#e3cd83",
    "De um pequeno corte a um jardim de lendas.",
  ],
];

export const SCYTHES = tools.map(
  ([material, cost, cooldown, radius, color, description], level) => {
    const offsets = [];
    for (let y = -5; y <= 5; y++)
      for (let x = -5; x <= 5; x++) {
        if (x * x + y * y <= radius * radius + 0.001) offsets.push([x, y]);
      }
    return {
      name: level === 9 ? "Foice Lendária" : `Foice de ${material}`,
      cost,
      cooldown,
      radius,
      color,
      description,
      offsets,
      area: offsets.length,
      level,
    };
  },
);

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

function createGarden(now, farmLevel = 0) {
  return Array.from({ length: ROWS * COLS }, (_, i) => {
    const x = i % COLS,
      y = Math.floor(i / COLS);
    let kind = "grass";
    if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) kind = "hedge";
    else if (x >= 2 && x <= 5 && y <= 2) kind = "shed";
    else if (x >= 19 && x <= 22 && y >= 2 && y <= 4) kind = "pond";
    else if (x % 4 === 0 && y % 4 === 0 && !(x === 12 && y === 8))
      kind = "bush";
    else if (y === 8 || x === 12 || y === 14) kind = "path";
    else if ((x === 3 && y === 11) || (x === 20 && y === 11)) kind = "stone";
    return {
      x,
      y,
      kind,
      variant: pickGrass(() => hash(x, y, 32), farmLevel),
      cutAt:
        kind === "grass" && hash(x, y, 14) < 0.12
          ? now - 10 - hash(x, y, 9) * 17
          : null,
    };
  });
}

export class Garden {
  constructor({ now = Date.now() / 1000, random = Math.random } = {}) {
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
    return (1 + this.farm.bonus) * (1 + this.rebirths * 0.25);
  }
  get canRebirth() {
    return this.level === SCYTHES.length - 1 && this.rebirths < 999999;
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
      return tile && (tile.kind === "grass" || tile.kind === "path");
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
    const distance = Math.min(dt, 0.1) * 3.5;
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
      if (!tile || !["grass", "path"].includes(tile.kind)) return false;
    }
    return true;
  }

  cut(now = Date.now() / 1000) {
    if (now - this.lastCut + 1e-8 < this.tool.cooldown) return null;
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
      tile.variant = pickGrass(this.random, this.farmLevel);
    }
    this.coins += earned;
    this.totalEarned += earned;
    this.cutCount += harvested.length;
    return { earned, harvested };
  }

  upgrade() {
    const next = this.nextTool;
    if (!next || !this.canAfford(next.cost)) return false;
    if (!this.infiniteMoney) this.coins -= next.cost;
    this.level++;
    this.lastCut = -Infinity;
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
        "MONEY ativado! Dinheiro infinito liberado para testar foices e melhorias da fazenda.",
    };
  }

  rebirth(now = Date.now() / 1000) {
    if (!this.canRebirth) return false;
    this.rebirths++;
    this.level = 0;
    this.coins = 0;
    this.bonusCarry = 0;
    this.lastCut = -Infinity;
    this.tiles = createGarden(now, this.farmLevel);
    this.player = { x: 12.5, y: 9.5, facing: "down", walking: false };
    return true;
  }

  serialize() {
    const { x, y, facing } = this.player;
    return JSON.stringify({
      version: 1,
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
        .filter((t) => t.kind === "grass")
        .map((t) => [t.x, t.y, t.variant, t.cutAt]),
    });
  }

  restore(raw, now = Date.now() / 1000) {
    // Validate the complete save before changing any live state.
    try {
      const data = JSON.parse(raw);
      const validCount = (n) => Number.isSafeInteger(n) && n >= 0 && n < 1e12;
      if (
        !data ||
        data.version !== 1 ||
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
          this.tiles.filter((t) => t.kind === "grass").length
      )
        return false;
      const seen = new Set();
      for (const row of data.grass) {
        if (!Array.isArray(row) || row.length !== 4) return false;
        const [x, y, variant, cutAt] = row;
        if (
          !Number.isInteger(x) ||
          !Number.isInteger(y) ||
          this.tileAt(x, y)?.kind !== "grass" ||
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
        !this.canWalk(p.x, p.y)
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
        x: p.x,
        y: p.y,
        facing: ["up", "down", "left", "right"].includes(p.facing)
          ? p.facing
          : "down",
        walking: false,
      };
      for (const [x, y, variant, cutAt] of data.grass)
        Object.assign(this.tileAt(x, y), { variant, cutAt });
      return true;
    } catch {
      return false;
    }
  }
}
