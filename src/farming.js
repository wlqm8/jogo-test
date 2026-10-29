import { BUILDINGS, QUESTS, questProgress } from "./progression.js";

export const WORLD_COLS = 41;
export const WORLD_ROWS = 29;
export const DAY_DURATION = 240;
export const NIGHT_DURATION = 60;
export const CYCLE_DURATION = DAY_DURATION + NIGHT_DURATION;
export const CROPS = {
  grass: {
    name: "Capim",
    plural: "tufos de capim",
    icon: "☘",
    seconds: 30,
    value: 5,
    packCost: 10,
    unlock: 1,
    xp: 4,
    color: "#80ad5b",
  },
  grain: {
    name: "Trigo",
    plural: "grãos",
    icon: "🌾",
    seconds: 35,
    value: 12,
    packCost: 40,
    unlock: 2,
    xp: 7,
    color: "#d8bd66",
  },
  lettuce: {
    name: "Alface",
    plural: "alfaces",
    icon: "🥬",
    seconds: 40,
    value: 18,
    packCost: 65,
    unlock: 3,
    xp: 9,
    color: "#9ec779",
  },
  carrot: {
    name: "Cenoura",
    plural: "cenouras",
    icon: "🥕",
    seconds: 50,
    value: 28,
    packCost: 100,
    unlock: 4,
    xp: 11,
    color: "#dc9454",
  },
  corn: {
    name: "Milho",
    plural: "espigas",
    icon: "🌽",
    seconds: 65,
    value: 40,
    packCost: 155,
    unlock: 6,
    xp: 14,
    color: "#e8cd63",
  },
  potato: {
    name: "Batata",
    plural: "batatas",
    icon: "🥔",
    seconds: 75,
    value: 50,
    packCost: 190,
    unlock: 7,
    xp: 17,
    color: "#c4a383",
  },
  tomato: {
    name: "Tomate",
    plural: "tomates",
    icon: "🍅",
    seconds: 85,
    value: 70,
    packCost: 280,
    unlock: 9,
    xp: 21,
    color: "#d97b64",
  },
  pumpkin: {
    name: "Abóbora",
    plural: "abóboras",
    icon: "🎃",
    seconds: 100,
    value: 90,
    packCost: 360,
    unlock: 10,
    xp: 24,
    color: "#d78245",
  },
};
export const COMPANIONS = {
  dog: {
    name: "Bento",
    title: "Cachorro coletor",
    costs: [350, 900, 2000],
    intervals: [2.4, 1.6, 1],
  },
  robot: {
    name: "Gota",
    title: "Robô de rega",
    costs: [1500, 2800, 5500],
    intervals: [2, 1.3, 0.8],
  },
};
export const HOME = { x: 4.5, y: 3.5 };
export const WELL = { x: 10.5, y: 5.5 };
export const SKILLS = {
  speed: {
    name: "Passo ligeiro",
    description: "+8% de velocidade de corrida por ponto.",
    max: 5,
    level: 2,
    branch: "Campo",
    icon: "➜",
  },
  harvest: {
    name: "Mãos ágeis",
    description: "Colha e corte 7% mais rápido por ponto.",
    max: 5,
    level: 3,
    requires: "speed",
    branch: "Campo",
    icon: "✂",
  },
  watering: {
    name: "Chuva certeira",
    description: "Regue 12% mais rápido e carregue +4 águas por ponto.",
    max: 4,
    level: 3,
    requires: "speed",
    branch: "Campo",
    icon: "♧",
  },
  profit: {
    name: "Boa negociação",
    description: "+5% de moedas por ponto em cada produção.",
    max: 5,
    level: 5,
    requires: "harvest",
    branch: "Campo",
    icon: "✦",
  },
  dog: {
    name: "Parceiro treinado",
    description: "+2 espaços de carga e +12% de velocidade do Bento.",
    max: 3,
    level: 3,
    pet: "dog",
    branch: "Ajudantes",
    icon: "🐾",
  },
  robot: {
    name: "Circuitos rápidos",
    description: "Gota trabalha 15% mais rápido; 3 pontos ampliam a rega.",
    max: 3,
    level: 5,
    pet: "robot",
    branch: "Ajudantes",
    icon: "⚙",
  },
  guard: {
    name: "Latido protetor",
    description: "Bento espanta lobos próximos. Aumenta a força do latido.",
    max: 2,
    level: 5,
    pet: "dog",
    requires: "dog",
    branch: "Ajudantes",
    icon: "♜",
  },
  repair: {
    name: "Mestre de obras",
    description: "Reparos custam 15% menos por ponto.",
    max: 3,
    level: 4,
    branch: "Proteção",
    icon: "⚒",
  },
  vigilance: {
    name: "Vigia da noite",
    description: "+1 de força contra lobos e mais luz por ponto.",
    max: 3,
    level: 6,
    requires: "repair",
    branch: "Proteção",
    icon: "☽",
  },
};
export const ACTIONS = ["harvest", "plant", "water", "repair"];
export const QUALITY_COSTS = [250, 750, 2000, 4500, 9000];
export const QUALITIES = {
  normal: { diamonds: 0, multiplier: 1 },
  golden: { diamonds: 10, multiplier: 2 },
  legendary: { diamonds: 500, multiplier: 5 },
};
const walkable = (tile) =>
  tile && ["grass", "soil", "path"].includes(tile.kind);
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// All clocks below advance only during active play, never from time spent away.
export class FarmLife {
  initLife() {
    this.worldTime = 0;
    this.selectedAction = "harvest";
    this.selectedCrop = "grass";
    this.seeds = Object.fromEntries(
      Object.keys(CROPS).map((k) => [k, k === "grass" ? 24 : 0]),
    );
    this.xp = 0;
    this.skills = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0]));
    this.water = 12;
    this.robotWater = 0;
    this.diamonds = 0;
    this.qualityLevel = 0;
    this.buildings = Object.fromEntries(
      Object.keys(BUILDINGS).map((k) => [k, 0]),
    );
    this.claimedQuests = [];
    this.protectedNights = 0;
    this.dogDiamonds = 0;
    this.dogGold = 0;
    this.dogCargo = Object.fromEntries(Object.keys(CROPS).map((k) => [k, 0]));
    this.dogReturning = false;
    this.cargoAge = 0;
    this.planted = 0;
    this.watered = 0;
    this.cropHarvested = 0;
    this.cropsLost = 0;
    this.repaired = 0;
    this.wolvesScared = 0;
    this.nightsSurvived = 0;
    this.nightLoss = 0;
    this.nightHadCrops = false;
    this.orderHarvest = Object.fromEntries(
      Object.keys(CROPS).map((k) => [k, 0]),
    );
    this.orderClaimed = false;
    this.orderType = "grass";
    this.petLevels = { dog: 0, robot: 0 };
    this.helpers = { dog: this.newAgent(), robot: this.newAgent() };
    this.wolves = [];
    this.nextWolfId = 1;
    this.lastWolfSpawn = 0;
    this.events = [];
    this.lastAction = -Infinity;
    this.agentPlanAt = 0;
  }
  newAgent() {
    const offset = [
      [-0.6, 0.6],
      [0.6, 0.6],
      [-0.6, -0.6],
      [0.6, -0.6],
      [0, 0],
    ].find(([dx, dy]) =>
      this.canWalk(this.player.x + dx, this.player.y + dy),
    ) || [0, 0];
    return {
      x: this.player.x + offset[0],
      y: this.player.y + offset[1],
      cooldown: 0,
      plan: 0,
      path: [],
      goal: null,
    };
  }
  get day() {
    return Math.floor(this.worldTime / CYCLE_DURATION) + 1;
  }
  get cycleTime() {
    return this.worldTime % CYCLE_DURATION;
  }
  get isNight() {
    return this.cycleTime >= DAY_DURATION;
  }
  get phaseRemaining() {
    return Math.ceil(
      (this.isNight ? CYCLE_DURATION : DAY_DURATION) - this.cycleTime - 1e-8,
    );
  }
  get damagedPlots() {
    return this.tiles.filter((t) => t.damaged);
  }
  get experience() {
    let level = 1,
      progress = this.xp;
    while (level < 100 && progress >= 40 + (level - 1) * 25) {
      progress -= 40 + (level - 1) * 25;
      level++;
    }
    return { level, progress, required: 40 + (level - 1) * 25 };
  }
  get skillPoints() {
    return (
      this.experience.level -
      1 -
      Object.values(this.skills).reduce((a, b) => a + b, 0)
    );
  }
  get moveSpeed() {
    return 3.5 * (1 + this.skills.speed * 0.08);
  }
  get harvestCooldown() {
    return this.tool.cooldown * (1 - this.skills.harvest * 0.07);
  }
  get cargoCount() {
    return Object.values(this.dogCargo).reduce((a, b) => a + b, 0);
  }
  get dogCapacity() {
    return this.petLevels.dog * 4 + this.skills.dog * 2;
  }
  get waterCapacity() {
    return 24 + this.skills.watering * 4 + this.buildings.cistern * 12;
  }
  get robotCapacity() {
    return 12 + this.petLevels.robot * 6 + this.buildings.cistern * 6;
  }
  get cropSpeed() {
    return 1 + this.buildings.compost * 0.1;
  }
  get wolfAttackDuration() {
    return 2 + this.buildings.fence * 1.25;
  }
  upgradeBuilding(key) {
    if (!Object.hasOwn(BUILDINGS, key)) return false;
    const building = BUILDINGS[key],
      level = this.buildings[key];
    if (
      level >= 3 ||
      this.experience.level < building.level ||
      !this.pay(building.costs[level])
    )
      return false;
    this.buildings[key]++;
    return true;
  }
  canClaimQuest(id) {
    const quest = QUESTS.find((q) => q.id === id);
    return Boolean(
      quest &&
        !this.claimedQuests.includes(id) &&
        (!quest.requires || this.claimedQuests.includes(quest.requires)) &&
        questProgress(this, quest) >= quest.target,
    );
  }
  claimQuest(id) {
    if (!this.canClaimQuest(id)) return false;
    const quest = QUESTS.find((q) => q.id === id);
    this.claimedQuests.push(id);
    this.coins += quest.gold;
    this.totalEarned += quest.gold;
    this.diamonds += quest.diamonds;
    this.gainXP(quest.xp);
    return true;
  }
  get goldenChance() {
    return 0.05 + this.qualityLevel * 0.01;
  }
  get legendaryChance() {
    return 0.001 + this.qualityLevel * 0.0002;
  }
  canAffordDiamonds(cost) {
    return this.infiniteMoney || this.diamonds >= cost;
  }
  payDiamonds(cost) {
    if (!this.canAffordDiamonds(cost)) return false;
    if (!this.infiniteMoney) this.diamonds -= cost;
    return true;
  }
  upgradeQuality() {
    const cost = QUALITY_COSTS[this.qualityLevel];
    if (!cost || !this.pay(cost)) return false;
    this.qualityLevel++;
    return true;
  }
  rollQuality() {
    const n = Math.min(
      999999,
      Math.max(0, Math.floor(this.random() * 1000000)),
    );
    const legendary = Math.round(this.legendaryChance * 1000000),
      golden = Math.round(this.goldenChance * 1000000);
    return n < legendary
      ? "legendary"
      : n < legendary + golden
        ? "golden"
        : "normal";
  }
  refillWater() {
    if (distance(this.player, WELL) > 2.2) return false;
    this.water = this.waterCapacity;
    return true;
  }
  repairPrice(tile) {
    return Math.max(
      1,
      Math.ceil(tile.repairCost * (1 - this.skills.repair * 0.15)),
    );
  }
  gainXP(amount) {
    const before = this.experience.level;
    this.xp += amount;
    if (this.experience.level > before)
      this.events.push({
        type: "level",
        message: `Nível ${this.experience.level}! Você ganhou ${this.experience.level - before} ponto(s) de habilidade.`,
      });
  }
  learnSkill(key) {
    if (!Object.hasOwn(SKILLS, key)) return false;
    const skill = SKILLS[key];
    if (
      !skill ||
      this.skillPoints < 1 ||
      this.skills[key] >= skill.max ||
      this.experience.level < skill.level ||
      (skill.requires && !this.skills[skill.requires]) ||
      (skill.pet && !this.petLevels[skill.pet])
    )
      return false;
    this.skills[key]++;
    return true;
  }
  buySeeds(type, packs = 1) {
    if (!Object.hasOwn(CROPS, type)) return false;
    const crop = CROPS[type];
    if (
      !crop ||
      !Number.isInteger(packs) ||
      packs < 1 ||
      packs > 10 ||
      (!this.infiniteMoney && this.experience.level < crop.unlock) ||
      !this.pay(crop.packCost * packs)
    )
      return false;
    this.seeds[type] += packs * 10;
    this.selectedCrop = type;
    return true;
  }
  get order() {
    const type = this.orderType;
    return {
      type,
      count: Math.min(40, 12 + Math.floor((this.day - 1) / 3) * 3),
      reward: Math.min(300, 60 + (this.day - 1) * 15),
    };
  }
  pay(cost) {
    if (!this.canAfford(cost)) return false;
    if (!this.infiniteMoney) this.coins -= cost;
    return true;
  }
  addReward(base) {
    const full = base * this.multiplier + this.bonusCarry;
    const amount = Math.floor(full + 1e-9);
    this.bonusCarry = Math.max(0, full - amount);
    this.coins += amount;
    this.totalEarned += amount;
    return amount;
  }
  cropGrowth(tile) {
    return tile.crop
      ? Math.min(1, tile.crop.progress / CROPS[tile.crop.type].seconds)
      : 0;
  }
  plantTile(tile) {
    if (
      !tile ||
      !["grass", "soil"].includes(tile.kind) ||
      tile.damaged ||
      tile.crop
    )
      return false;
    if (this.seeds[this.selectedCrop] < 1) return false;
    this.seeds[this.selectedCrop]--;
    tile.kind = "soil";
    tile.crop = {
      type: this.selectedCrop,
      progress: 0,
      watered: false,
      quality: this.rollQuality(),
    };
    this.planted++;
    this.gainXP(1);
    return true;
  }
  waterTile(tile, source = "player") {
    if (!tile?.crop || tile.damaged || tile.crop.watered) return false;
    const tank = source === "robot" ? "robotWater" : "water";
    if (this[tank] < 1) return false;
    this[tank]--;
    tile.crop.watered = true;
    this.watered++;
    this.gainXP(1);
    return true;
  }
  act(now = Date.now() / 1000) {
    if (this.selectedAction === "harvest") {
      const result = this.cut(now);
      if (!result) return null;
      const cx = Math.floor(this.player.x),
        cy = Math.floor(this.player.y);
      for (const [dx, dy] of this.tool.offsets) {
        const tile = this.tileAt(cx + dx, cy + dy);
        if (
          !tile?.crop ||
          this.cropGrowth(tile) < 1 ||
          !this.hasLineOfSight(tile.x, tile.y)
        )
          continue;
        const type = tile.crop.type,
          quality = tile.crop.quality,
          value = this.addReward(
            CROPS[type].value * QUALITIES[quality].multiplier,
          );
        this.diamonds += QUALITIES[quality].diamonds;
        result.harvested.push({
          x: tile.x + 0.5,
          y: tile.y + 0.5,
          variant: quality === "normal" ? "crop" : quality,
          crop: type,
          value,
          diamonds: QUALITIES[quality].diamonds,
        });
        result.earned += value;
        tile.crop = null;
        this.cropHarvested++;
        this.orderHarvest[type]++;
        this.gainXP(CROPS[type].xp);
      }
      result.scared = 0;
      for (const wolf of this.wolves) {
        if (
          distance(this.player, wolf) > this.tool.radius + 0.8 ||
          !this.hasLineOfSight(Math.floor(wolf.x), Math.floor(wolf.y))
        )
          continue;
        wolf.hp -= this.tool.damage + this.skills.vigilance;
        wolf.flee = 2.5;
        wolf.attack = 0;
        if (wolf.hp <= 0) {
          result.scared++;
          this.wolvesScared++;
          result.earned += this.addReward(5);
          this.gainXP(8);
        }
      }
      this.wolves = this.wolves.filter((w) => w.hp > 0);
      return result;
    }
    const actionSpeed =
      this.selectedAction === "water" ? 1 - this.skills.watering * 0.12 : 1;
    if (
      now - this.lastAction <
      Math.max(0.12, this.tool.cooldown * 0.65 * actionSpeed)
    )
      return null;
    this.lastAction = now;
    const result = {
      earned: 0,
      harvested: [],
      changed: 0,
      action: this.selectedAction,
      spent: 0,
    };
    const cx = Math.floor(this.player.x),
      cy = Math.floor(this.player.y);
    for (const [dx, dy] of this.tool.offsets) {
      const tile = this.tileAt(cx + dx, cy + dy);
      if (!tile || !this.hasLineOfSight(tile.x, tile.y)) continue;
      const before = this.coins;
      if (this.selectedAction === "plant" && this.plantTile(tile))
        result.changed++;
      if (this.selectedAction === "water" && this.waterTile(tile))
        result.changed++;
      if (
        this.selectedAction === "repair" &&
        tile.damaged &&
        this.pay(this.repairPrice(tile))
      ) {
        tile.damaged = false;
        tile.repairCost = 0;
        this.repaired++;
        result.changed++;
        this.gainXP(2);
      }
      result.spent += before - this.coins;
    }
    return result;
  }
  buyCompanion(type) {
    if (!Object.hasOwn(COMPANIONS, type)) return false;
    const data = COMPANIONS[type],
      level = this.petLevels[type];
    if (!data || level >= 3 || !this.pay(data.costs[level])) return false;
    this.petLevels[type]++;
    this.helpers[type] = this.newAgent();
    return true;
  }
  claimOrder() {
    const order = this.order;
    if (this.orderClaimed || this.orderHarvest[order.type] < order.count)
      return false;
    this.orderClaimed = true;
    this.addReward(order.reward);
    this.gainXP(25);
    return true;
  }
  findPath(from, target) {
    const sx = Math.floor(from.x),
      sy = Math.floor(from.y),
      tx = Math.floor(target.x),
      ty = Math.floor(target.y);
    if (sx === tx && sy === ty) return [];
    const start = sy * WORLD_COLS + sx,
      goal = ty * WORLD_COLS + tx;
    const queue = [start],
      previous = new Map([[start, -1]]);
    for (let i = 0; i < queue.length; i++) {
      const pos = queue[i],
        x = pos % WORLD_COLS,
        y = Math.floor(pos / WORLD_COLS);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nx = x + dx,
          ny = y + dy,
          id = ny * WORLD_COLS + nx;
        if (previous.has(id) || !walkable(this.tileAt(nx, ny))) continue;
        previous.set(id, pos);
        if (id === goal) {
          const path = [];
          let at = goal;
          while (at !== start) {
            path.push({
              x: (at % WORLD_COLS) + 0.5,
              y: Math.floor(at / WORLD_COLS) + 0.5,
            });
            at = previous.get(at);
          }
          return path.reverse();
        }
        queue.push(id);
      }
    }
    return [];
  }
  moveAgent(agent, target, dt, speed) {
    agent.plan -= dt;
    if (agent.plan <= 0 || !agent.goal || distance(agent.goal, target) > 1) {
      agent.path = this.findPath(agent, target);
      agent.goal = { ...target };
      agent.plan = 1.5;
    }
    const next = agent.path[0] || target;
    const d = distance(agent, next);
    if (d < 0.08) {
      if (agent.path.length) agent.path.shift();
      return;
    }
    const step = Math.min(d, speed * dt),
      nx = agent.x + ((next.x - agent.x) / d) * step,
      ny = agent.y + ((next.y - agent.y) / d) * step;
    if (this.canWalk(nx, ny)) {
      agent.x = nx;
      agent.y = ny;
    } else {
      agent.path = [];
      agent.plan = 0;
    }
  }
  spawnWolf() {
    const candidates = this.tiles.filter(
      (t) =>
        walkable(t) &&
        (t.x === 1 ||
          t.y === 1 ||
          t.x === WORLD_COLS - 2 ||
          t.y === WORLD_ROWS - 2),
    );
    const tile =
      candidates[
        Math.min(
          candidates.length - 1,
          Math.floor(this.random() * candidates.length),
        )
      ];
    const wolf = {
      ...this.newAgent(),
      x: tile.x + 0.5,
      y: tile.y + 0.5,
      hp: Math.min(50, 3 + Math.floor((this.day - 1) / 2) * 2),
      id: this.nextWolfId++,
      attack: 0,
      flee: 0,
    };
    this.wolves.push(wolf);
  }
  damagePlot(tile) {
    if (!tile?.crop || tile.damaged) return false;
    tile.crop = null;
    tile.damaged = true;
    tile.repairCost = Math.min(
      60,
      12 + (this.day - 1) * 2 + this.farmLevel * 3,
    );
    this.cropsLost++;
    this.nightLoss++;
    this.events.push({
      type: "damage",
      message: `Um canteiro foi destruído! Reparar custa ${tile.repairCost} moedas.`,
    });
    return true;
  }
  advance(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Integrate bounded steps so fast-forward tests and slow frames obey the same rules.
    let remaining = Math.min(dt, 600);
    while (remaining > 1e-8) {
      const step = Math.min(
        0.25,
        remaining,
        (this.isNight ? CYCLE_DURATION : DAY_DURATION) - this.cycleTime,
      );
      const wasNight = this.isNight;
      this.worldTime = Math.round((this.worldTime + step) * 1e8) / 1e8;
      remaining -= step;
      for (const tile of this.tiles)
        if (tile.crop?.watered)
          tile.crop.progress = Math.min(
            CROPS[tile.crop.type].seconds,
            tile.crop.progress + step * this.cropSpeed,
          );
      if (!wasNight && this.isNight) {
        this.nightLoss = 0;
        this.nightHadCrops = this.tiles.some((t) => t.crop);
        this.lastWolfSpawn = this.worldTime;
        for (
          let i = 0;
          i < Math.min(5, 2 + Math.floor((this.day - 1) / 3));
          i++
        )
          this.spawnWolf();
        this.events.push({
          type: "night",
          message:
            "Anoiteceu! Os lobos chegaram. Use Colher / defender para espantá-los.",
        });
      }
      if (wasNight && !this.isNight) {
        this.wolves = [];
        this.nightsSurvived++;
        const bonus =
          this.nightHadCrops && this.nightLoss === 0
            ? this.addReward(30 + this.day * 5)
            : 0;
        if (this.nightHadCrops && this.nightLoss === 0) this.protectedNights++;
        this.orderHarvest = Object.fromEntries(
          Object.keys(CROPS).map((k) => [k, 0]),
        );
        this.orderClaimed = false;
        const unlocked = Object.keys(CROPS).filter(
          (k) => CROPS[k].unlock <= this.experience.level,
        );
        this.orderType = unlocked[(this.day - 1) % unlocked.length];
        this.events.push({
          type: "day",
          message: `Amanheceu! ${bonus ? `Plantação protegida: +${bonus} moedas.` : "Os lobos foram embora. Repare os canteiros e recomece."}`,
        });
      }
      if (this.isNight) this.advanceWolves(step);
      this.advanceHelpers(step);
    }
  }
  advanceWolves(dt) {
    if (
      this.worldTime - this.lastWolfSpawn >= 20 &&
      this.cycleTime < 295 &&
      this.wolves.length < 7
    ) {
      this.spawnWolf();
      this.lastWolfSpawn = this.worldTime;
    }
    const crops = this.tiles.filter((t) => t.crop && !t.damaged);
    for (const wolf of this.wolves) {
      if (wolf.flee > 0) {
        wolf.flee = Math.max(0, wolf.flee - dt);
        const dx = wolf.x - this.player.x,
          dy = wolf.y - this.player.y,
          d = Math.hypot(dx, dy) || 1;
        const nx = wolf.x + (dx / d) * dt * 2.5,
          ny = wolf.y + (dy / d) * dt * 2.5;
        if (this.canWalk(nx, ny)) {
          wolf.x = nx;
          wolf.y = ny;
        }
        continue;
      }
      let target = null,
        best = Infinity;
      for (const tile of crops) {
        if (!tile.crop) continue;
        const d = distance(wolf, { x: tile.x + 0.5, y: tile.y + 0.5 });
        if (d < best) {
          best = d;
          target = tile;
        }
      }
      if (!target) {
        this.moveAgent(wolf, this.player, dt, 0.9);
        continue;
      }
      const destination = { x: target.x + 0.5, y: target.y + 0.5 };
      if (best < 0.72) {
        wolf.attack += dt;
        if (wolf.attack >= this.wolfAttackDuration) {
          this.damagePlot(target);
          wolf.attack = 0;
          wolf.plan = 0;
        }
      } else {
        wolf.attack = 0;
        this.moveAgent(
          wolf,
          destination,
          dt,
          1.8 + Math.min(0.7, (this.day - 1) * 0.025),
        );
      }
    }
  }
  advanceHelpers(dt) {
    if (!this.petLevels.dog && !this.petLevels.robot) return;
    const plots = this.tiles.filter((t) => t.kind === "soil" && !t.damaged);
    for (const type of ["dog", "robot"]) {
      const level = this.petLevels[type];
      if (!level) continue;
      const agent = this.helpers[type];
      agent.cooldown = Math.max(0, agent.cooldown - dt);
      if (type === "robot" && this.robotWater === 0) {
        if (distance(agent, WELL) < 1.8) this.robotWater = this.robotCapacity;
        else this.moveAgent(agent, { x: WELL.x, y: WELL.y + 1 }, dt, 2.7);
        continue;
      }
      if (
        type === "dog" &&
        this.isNight &&
        this.wolves.some((w) => distance(w, agent) < 4)
      ) {
        const wolf = this.wolves
          .filter((w) => distance(w, agent) < 4)
          .sort((a, b) => distance(a, agent) - distance(b, agent))[0];
        if (distance(agent, wolf) < 1 && agent.cooldown === 0) {
          wolf.hp -= 1 + this.skills.guard + Math.floor((level - 1) / 2);
          wolf.flee = 2;
          agent.cooldown = 2.5;
          if (wolf.hp <= 0) {
            this.wolvesScared++;
            this.addReward(5);
            this.gainXP(8);
            this.wolves = this.wolves.filter((w) => w.hp > 0);
          }
        } else this.moveAgent(agent, wolf, dt, 3.5);
        continue;
      }
      if (type === "dog" && this.cargoCount) this.cargoAge += dt;
      const ready = plots.filter((t) => t.crop && this.cropGrowth(t) >= 1);
      if (
        type === "dog" &&
        (this.dogReturning ||
          this.cargoCount >= this.dogCapacity ||
          (this.cargoCount && (!ready.length || this.cargoAge >= 12)))
      ) {
        this.dogReturning = true;
        if (distance(agent, HOME) > 0.65)
          this.moveAgent(agent, HOME, dt, 3.1 * (1 + this.skills.dog * 0.12));
        else {
          let coins = this.addReward(this.dogGold),
            amount = this.cargoCount;
          for (const [crop, count] of Object.entries(this.dogCargo)) {
            this.orderHarvest[crop] += count;
            this.dogCargo[crop] = 0;
          }
          this.diamonds += this.dogDiamonds;
          this.events.push({
            type: "delivery",
            message: `Bento entregou ${amount} colheita(s): +${coins} ouro${this.dogDiamonds ? ` e +${this.dogDiamonds} diamantes` : ""}!`,
          });
          this.dogDiamonds = 0;
          this.dogGold = 0;
          this.dogReturning = false;
          this.cargoAge = 0;
        }
        continue;
      }
      let target = null,
        best = Infinity;
      for (const tile of plots) {
        const eligible =
          type === "dog"
            ? tile.crop && this.cropGrowth(tile) >= 1
            : tile.crop && !tile.crop.watered;
        if (!eligible) continue;
        const point = { x: tile.x + 0.5, y: tile.y + 0.5 };
        const d = distance(agent, point);
        if (distance(this.player, point) < 13 + level * 2 && d < best) {
          target = tile;
          best = d;
        }
      }
      if (!target) {
        if (distance(agent, this.player) > 1.5)
          this.moveAgent(agent, this.player, dt, 3);
        continue;
      }
      if (best > 0.7)
        this.moveAgent(
          agent,
          { x: target.x + 0.5, y: target.y + 0.5 },
          dt,
          type === "dog" ? 3.1 * (1 + this.skills.dog * 0.12) : 2.7,
        );
      else if (agent.cooldown === 0) {
        if (type === "dog") {
          const crop = target.crop.type,
            quality = target.crop.quality;
          this.dogDiamonds += QUALITIES[quality].diamonds;
          this.dogCargo[crop]++;
          this.dogGold += CROPS[crop].value * QUALITIES[quality].multiplier;
          this.cropHarvested++;
          this.gainXP(CROPS[crop].xp);
          target.crop = null;
        } else {
          this.waterTile(target, "robot");
          if (level > 1 || this.skills.robot === 3)
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
            ])
              this.waterTile(
                this.tileAt(target.x + dx, target.y + dy),
                "robot",
              );
        }
        agent.cooldown =
          COMPANIONS[type].intervals[level - 1] *
          (type === "robot" ? 1 - this.skills.robot * 0.15 : 1);
      }
    }
  }
  serializeLife() {
    return {
      worldTime: this.worldTime,
      selectedAction: this.selectedAction,
      selectedCrop: this.selectedCrop,
      seeds: this.seeds,
      xp: this.xp,
      skills: this.skills,
      dogCargo: this.dogCargo,
      dogReturning: this.dogReturning,
      cargoAge: this.cargoAge,
      water: this.water,
      robotWater: this.robotWater,
      diamonds: this.diamonds,
      qualityLevel: this.qualityLevel,
      buildings: this.buildings,
      claimedQuests: this.claimedQuests,
      protectedNights: this.protectedNights,
      dogDiamonds: this.dogDiamonds,
      dogGold: this.dogGold,
      orderType: this.orderType,
      planted: this.planted,
      watered: this.watered,
      cropHarvested: this.cropHarvested,
      cropsLost: this.cropsLost,
      repaired: this.repaired,
      nightsSurvived: this.nightsSurvived,
      wolvesScared: this.wolvesScared,
      nightLoss: this.nightLoss,
      nightHadCrops: this.nightHadCrops,
      petLevels: this.petLevels,
      orderHarvest: this.orderHarvest,
      orderClaimed: this.orderClaimed,
      lastWolfSpawn: this.lastWolfSpawn,
      nextWolfId: this.nextWolfId,
      helpers: Object.fromEntries(
        Object.entries(this.helpers).map(([type, a]) => [
          type,
          { x: a.x, y: a.y, cooldown: a.cooldown },
        ]),
      ),
      wolves: this.wolves.map((w) => ({
        x: w.x,
        y: w.y,
        hp: w.hp,
        id: w.id,
        attack: w.attack,
        flee: w.flee,
      })),
      plots: this.tiles
        .filter((t) => t.kind === "soil")
        .map((t) => [t.x, t.y, t.crop, t.damaged || false, t.repairCost || 0]),
    };
  }
  validateLife(data) {
    if (
      !data ||
      !Number.isFinite(data.worldTime) ||
      data.worldTime < 0 ||
      data.worldTime > 1e10 ||
      !ACTIONS.includes(data.selectedAction) ||
      !Object.hasOwn(CROPS, data.selectedCrop)
    )
      return false;
    const count = (n) => Number.isSafeInteger(n) && n >= 0 && n < 1e12;
    if (
      !data.buildings ||
      Object.keys(data.buildings).length !== Object.keys(BUILDINGS).length ||
      !Object.keys(BUILDINGS).every(
        (k) =>
          Number.isInteger(data.buildings[k]) &&
          data.buildings[k] >= 0 &&
          data.buildings[k] <= 3,
      ) ||
      !Array.isArray(data.claimedQuests) ||
      new Set(data.claimedQuests).size !== data.claimedQuests.length ||
      !data.claimedQuests.every((id) =>
        QUESTS.some(
          (q) =>
            q.id === id &&
            (!q.requires || data.claimedQuests.includes(q.requires)),
        ),
      ) ||
      !count(data.protectedNights) ||
      data.protectedNights > data.nightsSurvived
    )
      return false;
    for (const key of [
      "planted",
      "watered",
      "cropHarvested",
      "cropsLost",
      "repaired",
      "nightsSurvived",
      "wolvesScared",
      "nightLoss",
      "nextWolfId",
    ])
      if (!count(data[key])) return false;
    for (const key of ["nightHadCrops", "orderClaimed"])
      if (typeof data[key] !== "boolean") return false;
    if (
      !Number.isFinite(data.lastWolfSpawn) ||
      data.lastWolfSpawn < 0 ||
      data.lastWolfSpawn > data.worldTime
    )
      return false;
    if (
      !data.petLevels ||
      !["dog", "robot"].every(
        (t) =>
          Number.isInteger(data.petLevels[t]) &&
          data.petLevels[t] >= 0 &&
          data.petLevels[t] <= 3,
      )
    )
      return false;
    if (
      !data.seeds ||
      !data.dogCargo ||
      Object.keys(data.seeds).length !== Object.keys(CROPS).length ||
      Object.keys(data.dogCargo).length !== Object.keys(CROPS).length ||
      !Object.keys(CROPS).every(
        (k) => count(data.seeds[k]) && count(data.dogCargo[k]),
      )
    )
      return false;
    if (
      !count(data.water) ||
      data.water > 76 ||
      !count(data.robotWater) ||
      data.robotWater > 48
    )
      return false;
    if (
      !count(data.diamonds) ||
      !count(data.dogDiamonds) ||
      !count(data.dogGold) ||
      !Number.isInteger(data.qualityLevel) ||
      data.qualityLevel < 0 ||
      data.qualityLevel > 5 ||
      !Object.hasOwn(CROPS, data.orderType)
    )
      return false;
    if (
      !count(data.xp) ||
      typeof data.dogReturning !== "boolean" ||
      !Number.isFinite(data.cargoAge) ||
      data.cargoAge < 0 ||
      data.cargoAge > 1e6
    )
      return false;
    if (
      !data.skills ||
      Object.keys(data.skills).length !== Object.keys(SKILLS).length ||
      !Object.keys(SKILLS).every(
        (k) =>
          Number.isInteger(data.skills[k]) &&
          data.skills[k] >= 0 &&
          data.skills[k] <= SKILLS[k].max,
      )
    )
      return false;
    let level = 1,
      xp = data.xp;
    while (level < 100 && xp >= 40 + (level - 1) * 25) {
      xp -= 40 + (level - 1) * 25;
      level++;
    }
    if (Object.values(data.skills).reduce((a, b) => a + b, 0) > level - 1)
      return false;
    if (
      Object.entries(BUILDINGS).some(
        ([key, b]) => data.buildings[key] && level < b.level,
      )
    )
      return false;
    for (const [key, skill] of Object.entries(SKILLS))
      if (
        data.skills[key] &&
        (level < skill.level ||
          (skill.requires && !data.skills[skill.requires]) ||
          (skill.pet && !data.petLevels[skill.pet]))
      )
        return false;
    if (
      data.water >
        24 + data.skills.watering * 4 + data.buildings.cistern * 12 ||
      data.robotWater >
        (data.petLevels.robot
          ? 12 + data.petLevels.robot * 6 + data.buildings.cistern * 6
          : 0)
    )
      return false;
    const cargo = Object.values(data.dogCargo).reduce((a, b) => a + b, 0);
    if (
      cargo > data.petLevels.dog * 4 + data.skills.dog * 2 ||
      data.dogGold > cargo * 450 ||
      data.dogDiamonds > cargo * 500
    )
      return false;
    if (
      !data.orderHarvest ||
      !Object.keys(CROPS).every((t) => count(data.orderHarvest[t]))
    )
      return false;
    const point = (p) =>
      p &&
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      this.canWalk(p.x, p.y);
    if (
      !data.helpers ||
      !["dog", "robot"].every(
        (t) =>
          point(data.helpers[t]) &&
          Number.isFinite(data.helpers[t].cooldown) &&
          data.helpers[t].cooldown >= 0 &&
          data.helpers[t].cooldown <= 10,
      )
    )
      return false;
    if (
      !Array.isArray(data.wolves) ||
      data.wolves.length > 7 ||
      (data.worldTime % CYCLE_DURATION < DAY_DURATION && data.wolves.length)
    )
      return false;
    const ids = new Set();
    for (const w of data.wolves) {
      if (
        !point(w) ||
        !Number.isInteger(w.hp) ||
        w.hp < 1 ||
        w.hp > 50 ||
        !count(w.id) ||
        ids.has(w.id) ||
        !Number.isFinite(w.attack) ||
        w.attack < 0 ||
        w.attack > 2 + data.buildings.fence * 1.25 ||
        !Number.isFinite(w.flee) ||
        w.flee < 0 ||
        w.flee > 3
      )
        return false;
      ids.add(w.id);
    }
    if (
      !Array.isArray(data.plots) ||
      data.plots.length > WORLD_COLS * WORLD_ROWS
    )
      return false;
    const seen = new Set();
    for (const row of data.plots) {
      if (!Array.isArray(row) || row.length !== 5) return false;
      const [x, y, crop, damaged, cost] = row,
        key = `${x},${y}`;
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        !["grass", "soil"].includes(this.tileAt(x, y)?.kind) ||
        seen.has(key) ||
        typeof damaged !== "boolean"
      )
        return false;
      if (
        !count(cost) ||
        (damaged ? cost < 1 || cost > 1000 || crop !== null : cost !== 0)
      )
        return false;
      if (
        crop !== null &&
        (!crop ||
          !Object.hasOwn(CROPS, crop.type) ||
          !Object.hasOwn(QUALITIES, crop.quality) ||
          typeof crop.watered !== "boolean" ||
          !Number.isFinite(crop.progress) ||
          crop.progress < 0 ||
          crop.progress > CROPS[crop.type].seconds ||
          (!crop.watered && crop.progress !== 0))
      )
        return false;
      seen.add(key);
    }
    return true;
  }
  restoreLife(data) {
    for (const key of [
      "worldTime",
      "selectedAction",
      "selectedCrop",
      "planted",
      "watered",
      "cropHarvested",
      "cropsLost",
      "repaired",
      "nightsSurvived",
      "wolvesScared",
      "nightLoss",
      "nightHadCrops",
      "orderClaimed",
      "lastWolfSpawn",
      "nextWolfId",
    ])
      this[key] = data[key];
    this.petLevels = { ...data.petLevels };
    this.orderHarvest = { ...data.orderHarvest };
    this.seeds = { ...data.seeds };
    this.skills = { ...data.skills };
    this.xp = data.xp;
    this.dogCargo = { ...data.dogCargo };
    this.dogReturning = data.dogReturning;
    this.cargoAge = data.cargoAge;
    this.water = data.water;
    this.robotWater = data.robotWater;
    this.diamonds = data.diamonds;
    this.qualityLevel = data.qualityLevel;
    this.buildings = { ...data.buildings };
    this.claimedQuests = [...data.claimedQuests];
    this.protectedNights = data.protectedNights;
    this.dogDiamonds = data.dogDiamonds;
    this.dogGold = data.dogGold;
    this.orderType = data.orderType;
    for (const type of ["dog", "robot"]) {
      const h = data.helpers[type];
      this.helpers[type] = {
        ...this.newAgent(),
        x: h.x,
        y: h.y,
        cooldown: h.cooldown,
      };
    }
    this.wolves = data.wolves.map((w) => ({
      ...this.newAgent(),
      x: w.x,
      y: w.y,
      hp: w.hp,
      id: w.id,
      attack: w.attack,
      flee: w.flee,
    }));
    for (const [x, y, crop, damaged, repairCost] of data.plots)
      Object.assign(this.tileAt(x, y), {
        kind: "soil",
        crop: crop && { ...crop },
        damaged,
        repairCost,
      });
  }
}
