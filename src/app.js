import { Garden, SCYTHES, FARMS, SAVE_KEY } from "./model.js";
import { GameView, drawScythe } from "./game.js";
import {
  CROPS,
  COMPANIONS,
  SKILLS,
  ACTIONS,
  WELL,
  QUALITY_COSTS,
} from "./farming.js";
import { RARITIES, BOX_PRICE } from "./loot.js";

const desktopMode = Boolean(window.capimDesktop);
document.documentElement.classList.toggle("desktop-app", desktopMode);
const $ = (selector) => document.querySelector(selector);
const number = (value) => new Intl.NumberFormat("pt-BR").format(value);
const seconds = (value) => value.toFixed(2).replace(".", ",");
const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const model = new Garden();
let toastTimer,
  saveAvailable = true,
  soundEnabled = false,
  audio;
let lastSave = "",
  emptyHintAt = 0;
const workshop = $("#workshop-dialog"),
  help = $("#help-dialog"),
  codes = $("#codes-dialog"),
  farmDialog = $("#farm-dialog");
const lifeDialog = $("#life-dialog");
const dialogs = [workshop, help, codes, farmDialog, lifeDialog];
let activeLifeTab = "seeds",
  lastDrops = [],
  seedSignature = "";
const probability = (value) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value);
const put = (id, value) => {
  const node = document.getElementById(id);
  if (node && node.textContent !== String(value)) node.textContent = value;
};
const balanceLabel = () => (model.infiniteMoney ? "∞" : number(model.coins));
const diamondLabel = () => (model.infiniteMoney ? "∞" : number(model.diamonds));

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.hidden = true;
  }, 3800);
}

try {
  const saved = localStorage.getItem(SAVE_KEY);
  if (saved) {
    let version;
    try {
      version = JSON.parse(saved)?.version;
    } catch {
      version = null;
    }
    if (version !== 3 && !localStorage.getItem(SAVE_KEY + ":before-v2")) {
      try {
        localStorage.setItem(SAVE_KEY + ":before-v2", saved);
      } catch {
        /* A full storage must not prevent playing. */
      }
    }
  }
  if (saved && !model.restore(saved)) {
    try {
      localStorage.setItem(SAVE_KEY + ":recovery", saved);
    } catch {}
    toast(
      "Não foi possível ler o progresso anterior. Um novo jardim espera por você.",
    );
  }
} catch {
  saveAvailable = false;
}

function save() {
  const raw = model.serialize();
  if (raw === lastSave) return;
  try {
    localStorage.setItem(SAVE_KEY, raw);
    lastSave = raw;
    saveAvailable = true;
  } catch {
    saveAvailable = false;
  }
  $("#save-status").innerHTML =
    `<span></span>${saveAvailable ? "Progresso salvo" : "Sessão sem salvamento"}`;
  $("#save-status").title = saveAvailable
    ? desktopMode
      ? "Seu jardim é salvo automaticamente neste computador."
      : "Seu jardim é salvo automaticamente neste navegador."
    : "O navegador bloqueou o armazenamento. Seu progresso durará apenas nesta sessão.";
}

function playTone(kind, value = 1) {
  if (!soundEnabled) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume().catch(() => {});
    const time = audio.currentTime;
    const notes =
      kind === "upgrade"
        ? [523, 659, 784, 1047]
        : kind === "cut"
          ? [180]
          : [value >= 12 ? 1047 : 784, 1175];
    notes.forEach((frequency, i) => {
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = kind === "cut" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(frequency, time + i * 0.07);
      gain.gain.setValueAtTime(0, time + i * 0.07);
      gain.gain.linearRampToValueAtTime(
        kind === "cut" ? 0.018 : 0.045,
        time + i * 0.07 + 0.01,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.07 + 0.14);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(time + i * 0.07);
      osc.stop(time + i * 0.07 + 0.16);
    });
  } catch {
    /* Sound is optional; gameplay remains available without Web Audio. */
  }
}

const view = new GameView($("#garden"), model, {
  onStep() {
    updateHUD();
  },
  onHarvest(result) {
    if (result.earned) {
      updateUI();
      save();
      playTone("coin", Math.max(...result.harvested.map((t) => t.value)));
      $("#game-announcement").textContent =
        `${result.harvested.length} gramas cortadas. Mais ${result.earned} moedas.`;
      if (
        model.cutCount === result.harvested.length &&
        model.cropHarvested === 0
      )
        toast(
          "Primeira colheita! A grama cortada ficará pronta de novo em 30 segundos.",
        );
    } else if (result.changed) {
      updateUI();
      save();
      playTone("cut");
    } else {
      playTone("cut");
      if (
        !view.autoCut &&
        model.selectedAction === "harvest" &&
        model.cutCount === 0 &&
        Date.now() - emptyHintAt > 12000
      ) {
        emptyHintAt = Date.now();
        toast(
          "Aproxime-se da grama alta e segure Espaço para colher suas primeiras moedas.",
        );
      }
    }
  },
  onPause() {
    togglePause();
  },
});

function upgrade() {
  openModal(workshop);
}

function updateUI() {
  updateHUD();
  const tool = model.tool;
  $("#tool-name").textContent = tool.name;
  $("#tool-description").textContent = tool.description;
  $("#level-badge").textContent =
    `${tool.rarityName.toUpperCase()} · G${tool.grade}`;
  $("#level-badge").style.color = tool.color;
  $("#tool-speed").innerHTML =
    `${seconds(model.harvestCooldown)}s <small>/ ação</small>`;
  $("#tool-area").innerHTML =
    `${tool.area} <small>blocos · ${tool.damage} dano</small>`;
  $("#speed-meter").style.width =
    `${Math.min(100, (0.12 / tool.cooldown) * 100)}%`;
  $("#area-meter").style.width = `${(tool.area / SCYTHES.at(-1).area) * 100}%`;
  drawScythe($("#scythe-art"), tool, true);
  $("#next-level").textContent = "6 RARIDADES";
  $("#next-name").textContent = "Caixa das colheitas";
  $("#next-benefit").textContent = "1 por 50 diamantes · 11 por 500";
  const progress = model.infiniteMoney
    ? 100
    : Math.min(100, (model.diamonds / 50) * 100);
  $("#upgrade-progress-label").textContent = model.infiniteMoney
    ? "MONEY ativo · saldo infinito"
    : `${number(Math.min(model.diamonds, 50))} de 50 diamantes`;
  $("#upgrade-percent").textContent = `${Math.floor(progress)}%`;
  $("#upgrade-progress-bar").style.width = `${progress}%`;
  $("#upgrade-button").disabled = false;
  $("#upgrade-button").innerHTML =
    `${icon("gift")}<span>Comprar caixas</span>${icon("arrow")}`;
  $("#upgrade-button").setAttribute(
    "aria-label",
    "Abrir loja de caixas de foice",
  );
  $("#all-scythes").innerHTML = `Coleção e fusões ${icon("arrow")}`;
  $(".next-upgrade-heading>span").textContent = "PRÓXIMA DESCOBERTA";
  $(".nav-count").textContent = "24";
  if (farmDialog.open) renderFarm();
}

function renderWorkshop() {
  $("#workshop-balance").textContent = diamondLabel();
  workshop.querySelector("h2").innerHTML =
    "Uma caixa, novas possibilidades<span>.</span>";
  workshop.querySelector(".eyebrow").textContent =
    "6 RARIDADES · 4 GRAUS · A SUA COLEÇÃO";
  workshop.querySelector(".modal-header p").textContent =
    "Compre com diamantes. Combine 5 iguais para melhorar o grau.";
  workshop.querySelector(".workshop-note").textContent =
    `${number(model.boxesOpened)} caixas abertas`;
  const grid = $("#scythe-grid");
  grid.classList.add("loot-workshop");
  grid.innerHTML = `<div class="crate-section"><div class="crate-card"><span class="crate-art">✦</span><div><span class="eyebrow">CAIXA DAS COLHEITAS</span><h3>Uma nova foice espera por você.</h3><p>Todas as foices sorteadas chegam no grau 4. O grau 1 é o melhor.</p><div class="crate-buttons">${[1, 11].map((n) => `<button data-box="${n}" ${!model.canAffordDiamonds(BOX_PRICE[n]) ? "disabled" : ""}><strong>Abrir ×${n}</strong><span class="diamond-symbol">◇</span>${BOX_PRICE[n]}</button>`).join("")}</div></div></div><div class="box-odds"><strong>Probabilidades por caixa</strong>${RARITIES.map((r) => `<div><span style="color:${r.color}">● ${r.name}</span><b>${probability(r.chance)}%</b></div>`).join("")}</div></div>${lastDrops.length ? `<div class="crate-results" role="status"><strong>Você encontrou</strong>${lastDrops.map((i) => `<span style="--rarity:${SCYTHES[i].color}">${SCYTHES[i].rarityName} G4</span>`).join("")}</div>` : ""}<div class="collection-title"><h3>Sua coleção</h3><span>5 cópias iguais → 1 do próximo grau · Grau 1 é o máximo</span></div><div class="collection-rows">${RARITIES.map(
    (r, ri) =>
      `<section class="collection-row"><h4 style="color:${r.color}">${r.name}</h4><div>${[
        0, 1, 2, 3,
      ]
        .map((g) => {
          const i = ri * 4 + g,
            t = SCYTHES[i],
            count = model.scythes[i];
          return `<article class="collection-item ${model.level === i ? "equipped" : ""} ${!count ? "unowned" : ""}" style="--rarity:${r.color}"><span class="collection-grade">GRAU ${t.grade}</span><canvas width="160" height="104" data-tool-art="${i}"></canvas><strong>${t.damage} dano <small>· ${seconds(t.cooldown)}s</small></strong><span class="copy-count">${count} ${t.grade === 1 ? "cópias" : "/ 5 cópias"}</span><div><button data-equip-scythe="${i}" ${!count || model.level === i ? "disabled" : ""}>${model.level === i ? "Equipada" : "Equipar"}</button><button data-fuse="${i}" ${count < 5 || t.grade === 1 ? "disabled" : ""}>${t.grade === 1 ? "Máximo" : "Fundir 5"}</button></div></article>`;
        })
        .join("")}</div></section>`,
  ).join("")}</div>`;
  for (const canvas of grid.querySelectorAll("[data-tool-art]"))
    drawScythe(canvas, SCYTHES[Number(canvas.dataset.toolArt)]);
  for (const button of grid.querySelectorAll("[data-box]"))
    button.onclick = () => {
      const result = model.openCrates(Number(button.dataset.box));
      if (!result.ok) return;
      lastDrops = result.items;
      updateUI();
      save();
      renderWorkshop();
      playTone("upgrade");
    };
  for (const button of grid.querySelectorAll("[data-equip-scythe]"))
    button.onclick = () => {
      if (model.equipScythe(Number(button.dataset.equipScythe))) {
        updateUI();
        save();
        renderWorkshop();
      }
    };
  for (const button of grid.querySelectorAll("[data-fuse]"))
    button.onclick = () => {
      if (model.fuseScythe(Number(button.dataset.fuse))) {
        updateUI();
        save();
        renderWorkshop();
        playTone("upgrade");
        toast("Fusão concluída! 5 foices viraram 1 de grau melhor.");
      }
    };
}

function updateHUD() {
  for (const id of ["balance", "world-coins", "farm-wallet", "life-balance"])
    put(id, balanceLabel());
  for (const id of ["world-diamonds", "balance-diamonds", "workshop-balance"])
    put(id, diamondLabel());
  $("#test-badge").hidden = !model.infiniteMoney;
  $("#test-mode-panel").hidden = !model.infiniteMoney;
  $("#codes-button").classList.toggle("test-active", model.infiniteMoney);
  put(
    "wallet-note",
    model.infiniteMoney
      ? "MONEY ativo · dinheiro infinito para testes."
      : "Plante, cuide e colha novas possibilidades.",
  );
  put("garden-name", model.farm.name);
  put(
    "farm-summary",
    `Fazenda ${model.farmLevel + 1}/5 · ${model.rebirths} rebirths`,
  );
  put("cut-count", model.cropHarvested);
  put("total-earned", number(model.totalEarned));
  $(".stats-sprout").innerHTML =
    `produção ×${seconds(model.multiplier)} ${icon("leaf")}`;
  const xp = model.experience;
  put("player-level", xp.level);
  put("life-level", `Nível ${xp.level}`);
  put(
    "life-points",
    `${model.skillPoints} ${model.skillPoints === 1 ? "ponto" : "pontos"}`,
  );
  put(
    "skill-points-badge",
    `${model.skillPoints} ${model.skillPoints === 1 ? "ponto" : "pontos"}`,
  );
  put("xp-label", `${number(xp.progress)} / ${number(xp.required)} XP`);
  $("#xp-progress").style.width =
    `${Math.min(100, (xp.progress / xp.required) * 100)}%`;
  $("#skills-button").classList.toggle("has-points", model.skillPoints > 0);
  put("water-stock", `${model.water}/${model.waterCapacity}`);
  put("cycle-label", `${model.isNight ? "NOITE" : "DIA"} ${model.day}`);
  put("phase-icon", model.isNight ? "☾" : "☀");
  const remaining = Math.max(0, model.phaseRemaining);
  put(
    "phase-time",
    `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`,
  );
  $(".garden-panel").classList.toggle("night", model.isNight);
  put(
    "weather-title",
    model.isNight ? "Proteja sua colheita" : "Um novo dia no campo",
  );
  const weatherText = document.querySelector(".weather>div>span");
  if (weatherText) weatherText.textContent = "Dia: 4 min · noite: 1 min";
  const damaged = model.damagedPlots.length;
  $("#threat-status").hidden = !model.isNight && !damaged;
  put(
    "threat-status",
    `${model.isNight ? `${model.wolves.length} ${model.wolves.length === 1 ? "lobo" : "lobos"} no campo` : "Campo danificado"}${damaged ? ` · ${damaged} canteiros para reparar` : ""}`,
  );
  const sig = JSON.stringify(model.seeds) + model.selectedCrop;
  if (sig !== seedSignature) {
    seedSignature = sig;
    $("#seed-select").innerHTML = Object.entries(CROPS)
      .map(
        ([k, c]) =>
          `<option value="${k}" ${model.selectedCrop === k ? "selected" : ""}>${c.icon} ${c.name} (${model.seeds[k]})</option>`,
      )
      .join("");
  }
  const actionNames = {
    harvest: "Colher / defender",
    plant: "Plantar",
    water: "Regar",
    repair: "Reparar",
  };
  for (const b of document.querySelectorAll("[data-action]")) {
    const active = b.dataset.action === model.selectedAction;
    b.classList.toggle("selected", active);
    b.setAttribute("aria-pressed", String(active));
  }
  for (const b of document.querySelectorAll("[data-equip]"))
    b.classList.toggle(
      "selected",
      b.dataset.equip === model.selectedAction ||
        (b.dataset.equip === "repair" && model.selectedAction === "plant"),
    );
  put(
    "equipped-name",
    model.selectedAction === "harvest"
      ? "FOICE"
      : model.selectedAction === "water"
        ? "BALDE"
        : "ENXADA",
  );
  put("action-hint", actionNames[model.selectedAction]);
  put(
    "touch-action-label",
    actionNames[model.selectedAction].split(" / ")[0].toUpperCase(),
  );
  const tips = {
    harvest: "Foice: colha plantas maduras, corte o mato e espante os lobos.",
    plant: `${CROPS[model.selectedCrop].name}: ${model.seeds[model.selectedCrop]} sementes. Plante e depois regue.`,
    water: model.water
      ? "Use o balde nas mudas secas. Pressione R perto do poço para reabastecer."
      : "Seu balde está vazio. Vá ao poço (azul no mapa) e pressione R.",
    repair: `Use a enxada nos canteiros destruídos. Reparos custam moedas; depois replante.`,
  };
  if (model.selectedAction === "repair") {
    const cx = Math.floor(model.player.x),
      cy = Math.floor(model.player.y);
    const near = model.tool.offsets
      .map(([dx, dy]) => model.tileAt(cx + dx, cy + dy))
      .filter((t) => t?.damaged && model.hasLineOfSight(t.x, t.y));
    tips.repair = near.length
      ? `${near.length} canteiro(s) ao alcance: ${near.reduce((n, t) => n + model.repairPrice(t), 0)} ouro no total. Use a enxada e depois replante.`
      : "Aproxime-se dos canteiros destruídos. O custo em ouro aparece em cada um.";
  }
  put(
    "context-tip",
    model.planted === 0 && model.cutCount === 0
      ? "Você ganhou 24 sementes de capim! Selecione Plantar (2) e segure Espaço."
      : tips[model.selectedAction],
  );
  put(
    "helpers-summary",
    `${model.petLevels.dog ? `Bento nv.${model.petLevels.dog}${model.cargoCount ? ` · carga ${model.cargoCount}/${model.dogCapacity}` : ""}` : "Bento: não adquirido"} · ${model.petLevels.robot ? `Gota nv.${model.petLevels.robot}` : "Gota: não adquirido"}`,
  );
  const order = model.order;
  put("order-title", `${order.count} ${CROPS[order.type].plural}`);
  put(
    "order-progress",
    `${Math.min(order.count, model.orderHarvest[order.type])}/${order.count} colhidos · bônus ${order.reward} moedas`,
  );
  $("#claim-order").disabled =
    model.orderClaimed || model.orderHarvest[order.type] < order.count;
  put("claim-order", model.orderClaimed ? "Pedido concluído" : "Receber bônus");
  const events = model.events.splice(0);
  if (events.length) {
    const event = events.findLast((e) => e.type === "level") || events.at(-1);
    toast(event.message);
    save();
  }
}

function renderLife() {
  updateHUD();
  for (const button of document.querySelectorAll("[data-life-tab]")) {
    const active = button.dataset.lifeTab === activeLifeTab;
    button.classList.toggle("selected", active);
    button.setAttribute("aria-selected", String(active));
    $("#panel-" + button.dataset.lifeTab).hidden = !active;
  }
  const qCost = QUALITY_COSTS[model.qualityLevel];
  $("#quality-research").innerHTML =
    `<div><span class="eyebrow">BOTÂNICA · NÍVEL ${model.qualityLevel}/5</span><h3>Pequenas chances, grandes colheitas.</h3><p><span>✦ Dourada: ${probability(model.goldenChance * 100)}% · +10 diamantes</span><br><span>◆ Lendária: ${probability(model.legendaryChance * 100)}% · +500 diamantes</span></p><small>Cada pesquisa aumenta as chances em +1% dourada e +0,02% lendária.</small></div><button class="button primary" id="quality-button" ${!qCost || !model.canAfford(qCost) ? "disabled" : ""}>${qCost ? `Pesquisar · ${number(qCost)} ouro` : "Pesquisa completa"}</button>`;
  $("#quality-button").onclick = () => {
    if (model.upgradeQuality()) {
      save();
      renderLife();
      toast(
        "Pesquisa concluída! As próximas sementes terão mais chances de colheita especial.",
      );
    }
  };
  $("#seed-shop").innerHTML = Object.entries(CROPS)
    .map(([k, c]) => {
      const locked = !model.infiniteMoney && model.experience.level < c.unlock;
      return `<article class="seed-card ${locked ? "locked" : ""} ${model.selectedCrop === k ? "active" : ""}"><div class="crop-art">${c.icon}</div><span class="crop-stock">${model.seeds[k]} sementes</span><h3>${c.name}</h3><div class="crop-specs"><span>${c.seconds}s · regada</span><strong>${c.value} moedas</strong></div><div class="seed-buy">${[1, 10].map((n) => `<button data-buy-seed="${k}" data-packs="${n}" ${locked || !model.canAfford(c.packCost * n) ? "disabled" : ""}>${n * 10} sementes<br><b>${number(c.packCost * n)} moedas</b></button>`).join("")}</div><p class="unlock-note">${locked ? `Desbloqueia no nível ${c.unlock}` : k === "grass" ? "A sua primeira colheita." : "Mais cuidado, mais recompensa."}</p></article>`;
    })
    .join("");
  $("#helper-shop").innerHTML = Object.entries(COMPANIONS)
    .map(([k, c]) => {
      const lv = model.petLevels[k],
        max = lv === 3,
        cost = c.costs[lv];
      return `<article class="helper-card"><div class="helper-art">${k === "dog" ? "🐕" : "🤖"}<span class="helper-status">${lv ? `NÍVEL ${lv} / 3` : "NÃO ADQUIRIDO"}</span></div><h3>${c.name}<span>${c.title}</span></h3><p>${k === "dog" ? "Colhe plantas maduras, leva a carga até a casa e transforma a entrega em moedas. À noite, ajuda a espantar lobos próximos." : "Rega automaticamente os canteiros e volta ao poço quando precisa de água. Você continua plantando e colhendo."}</p><div class="helper-stats">${k === "dog" ? `<span>Carga: <strong>${lv ? model.dogCapacity : 4} colheitas</strong></span><span>Melhorias: <strong>mais carga e rapidez</strong></span>` : `<span>Água: <strong>${model.robotWater}/${lv ? model.robotCapacity : 18}</strong></span><span>Melhorias: <strong>rega mais rápida e ampla</strong></span>`}</div><button class="button primary" data-buy-helper="${k}" ${max || !model.canAfford(cost) ? "disabled" : ""}>${max ? "Nível máximo" : `${lv ? "Melhorar" : "Comprar"} · ${number(cost)} moedas`}</button></article>`;
    })
    .join("");
  $("#skill-tree").innerHTML = ["Campo", "Ajudantes", "Proteção"]
    .map(
      (branch) =>
        `<section class="skill-branch"><h3>${branch}</h3>${Object.entries(
          SKILLS,
        )
          .filter(([, s]) => s.branch === branch)
          .map(([k, s]) => {
            const rank = model.skills[k],
              max = rank === s.max,
              available =
                !max &&
                model.skillPoints > 0 &&
                model.experience.level >= s.level &&
                (!s.requires || model.skills[s.requires]) &&
                (!s.pet || model.petLevels[s.pet]);
            return `<button class="skill-node ${available ? "available" : ""} ${max ? "maxed" : ""}" data-learn="${k}" ${!available ? "disabled" : ""}><span class="node-top"><span>${s.icon}</span><strong>${s.name}</strong><b>${rank}/${s.max}</b></span><p>${s.description}</p><small>${max ? "Habilidade completa" : available ? "Aprender · 1 ponto" : `Nv.${s.level}${s.requires ? ` · requer ${SKILLS[s.requires].name}` : ""}${s.pet ? ` · compre ${COMPANIONS[s.pet].name}` : ""}${model.skillPoints === 0 ? " · sem pontos" : ""}`}</small></button>`;
          })
          .join("")}</section>`,
    )
    .join("");
  for (const b of document.querySelectorAll("[data-buy-seed]"))
    b.onclick = () => {
      if (model.buySeeds(b.dataset.buySeed, Number(b.dataset.packs))) {
        model.selectedAction = "plant";
        save();
        renderLife();
        toast("Sementes compradas! Selecione Plantar e cuide da nova cultura.");
      }
    };
  for (const b of document.querySelectorAll("[data-buy-helper]"))
    b.onclick = () => {
      if (model.buyCompanion(b.dataset.buyHelper)) {
        save();
        renderLife();
        playTone("upgrade");
        toast(
          `${COMPANIONS[b.dataset.buyHelper].name} está no nível ${model.petLevels[b.dataset.buyHelper]}!`,
        );
      }
    };
  for (const b of document.querySelectorAll("[data-learn]"))
    b.onclick = () => {
      if (model.learnSkill(b.dataset.learn)) {
        save();
        renderLife();
        updateUI();
        playTone("upgrade");
      }
    };
}

function openModal(dialog) {
  if (dialogs.some((item) => item.open)) return;
  save();
  view.setCovered(true);
  if (dialog === workshop) {
    renderWorkshop();
    $("#workshop-nav").classList.add("active");
    $("#garden-nav").classList.remove("active");
  }
  if (dialog === farmDialog) {
    renderFarm();
    $("#farm-nav").classList.add("active");
    $("#garden-nav").classList.remove("active");
  }
  if (dialog === codes) $("#code-feedback").textContent = "";
  if (dialog === lifeDialog) renderLife();
  dialog.showModal();
}

for (const dialog of dialogs) {
  dialog
    .querySelector("[data-close]")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    const anotherOpen = dialogs.some((item) => item.open);
    view.setCovered(anotherOpen);
    if (anotherOpen) return;
    $("#garden-nav").classList.add("active");
    $("#workshop-nav").classList.remove("active");
    $("#farm-nav").classList.remove("active");
    $("#rebirth-confirm").hidden = true;
    if (!view.paused) $("#garden").focus({ preventScroll: true });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      dialog.close();
  });
}
$("#workshop-nav").addEventListener("click", () => openModal(workshop));
$("#all-scythes").addEventListener("click", () => openModal(workshop));
$("#farm-nav").addEventListener("click", () => openModal(farmDialog));
$("#progress-button").addEventListener("click", () => openModal(farmDialog));
$("#codes-button").addEventListener("click", () => openModal(codes));
$("#help-button").addEventListener("click", () => openModal(help));
$("#guide-button").addEventListener("click", () => openModal(help));
$("#help-start").addEventListener("click", () => help.close());
$("#garden-nav").addEventListener("click", () => {
  workshop.close();
  $("#garden").focus({ preventScroll: true });
});
$("#upgrade-button").addEventListener("click", upgrade);
$("#code-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const result = model.redeemCode($("#code-input").value);
  $("#code-feedback").textContent = result.message;
  $("#code-feedback").classList.toggle("error", !result.ok);
  $("#code-input").setAttribute("aria-invalid", String(!result.ok));
  if (result.ok) {
    updateUI();
    save();
    playTone("upgrade");
    $("#code-input").value = "";
  }
});
$("#disable-test-money").addEventListener("click", () => {
  model.infiniteMoney = false;
  updateUI();
  save();
  $("#code-feedback").classList.remove("error");
  $("#code-feedback").textContent =
    "Modo de teste desativado. Seu saldo real voltou a ser usado nas compras.";
  toast("Dinheiro infinito desativado.");
});

function renderFarm() {
  const next = model.nextFarm;
  $("#farm-wallet").textContent = balanceLabel();
  $("#harvest-multiplier").textContent = `×${seconds(model.multiplier)}`;
  $("#rebirth-count").textContent = number(model.rebirths);
  $("#farm-level-badge").textContent = `NÍVEL ${model.farmLevel + 1} / 5`;
  $("#farm-roadmap").innerHTML = FARMS.map(
    (farm, index) =>
      `<div class="farm-step ${index === model.farmLevel ? "current" : index < model.farmLevel ? "done" : ""}"><span class="farm-step-number">${index < model.farmLevel ? icon("check") : String(index + 1).padStart(2, "0")}</span><span><strong>${farm.name}</strong><small>${farm.bonus ? `+${Math.round(farm.bonus * 100)}% de moedas` : "Seu primeiro pedacinho de verde"} · estrutura permanente</small></span><span class="farm-step-status">${index === model.farmLevel ? "ATUAL" : index < model.farmLevel ? "✓" : `${number(farm.cost)} <span class="pixel-coin mini"></span>`}</span></div>`,
  ).join("");
  $("#farm-upgrade-description").textContent = next
    ? next.description
    : "Sua fazenda chegou ao nível máximo. Aproveite o seu paraíso verde!";
  const canBuy = next && model.canAfford(next.cost);
  $("#farm-upgrade-button").disabled = !canBuy;
  $("#farm-upgrade-button").innerHTML =
    `${icon(next ? (canBuy ? "farm" : "lock") : "check")}${next ? `Melhorar · ${number(next.cost)} moedas` : "Fazenda no nível máximo"}`;
  $("#next-rebirth-bonus").textContent =
    `+${number((model.rebirths + 1) * 25)}%`;
  $("#rebirth-requirement").textContent = model.canRebirth
    ? "Requisitos completos. Você pode renascer!"
    : `Nv.10 + foice épica (ou melhor) grau 1 + ${number(model.rebirthCost)} moedas.`;
  $("#rebirth-button").disabled = !model.canRebirth;
  $("#rebirth-button").innerHTML =
    `${icon(model.canRebirth ? "rebirth" : "lock")}Fazer rebirth`;
  $("#rebirth-button").hidden = false;
  $("#rebirth-confirm").hidden = true;
}
$("#farm-upgrade-button").addEventListener("click", () => {
  if (!model.upgradeFarm()) return;
  view.buildTerrain();
  updateUI();
  save();
  playTone("upgrade");
  toast(
    `${model.farm.name}! +${Math.round(model.farm.bonus * 100)}% de produção e um novo visual para a fazenda.`,
  );
});
$("#rebirth-button").addEventListener("click", () => {
  if (!model.canRebirth) return;
  $("#rebirth-confirm").hidden = false;
  $("#rebirth-button").hidden = true;
  $("#confirm-rebirth").focus({ preventScroll: true });
});
$("#cancel-rebirth").addEventListener("click", () => {
  $("#rebirth-confirm").hidden = true;
  $("#rebirth-button").hidden = false;
});
$("#confirm-rebirth").addEventListener("click", () => {
  if (!model.rebirth()) return;
  view.clearInput();
  view.buildTerrain();
  updateUI();
  save();
  playTone("upgrade");
  toast(
    `Rebirth ${model.rebirths}! Bônus permanente de +${model.rebirths * 25}% e sua fazenda preservada.`,
  );
});
$("#auto-cut").addEventListener("change", (event) => {
  view.autoCut = event.target.checked;
  if (view.autoCut)
    toast(
      "Ação repetida ativada. Cuidado: plantar consome sementes e reparar consome moedas.",
    );
});

function togglePause() {
  view.paused = !view.paused;
  view.clearInput();
  $("#pause-overlay").hidden = !view.paused;
  $("#pause-button").setAttribute(
    "aria-label",
    view.paused ? "Continuar jogo" : "Pausar jogo",
  );
  $("#pause-button").setAttribute("aria-pressed", String(view.paused));
  $("#pause-button").innerHTML = icon(view.paused ? "play" : "pause");
  if (view.paused) {
    save();
    $("#resume-button").focus({ preventScroll: true });
  } else $("#garden").focus({ preventScroll: true });
}
$("#pause-button").addEventListener("click", togglePause);
$("#resume-button").addEventListener("click", togglePause);
$("#sound-button").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  $("#sound-button").setAttribute(
    "aria-label",
    soundEnabled ? "Desativar sons" : "Ativar sons",
  );
  $("#sound-button").setAttribute("aria-pressed", String(soundEnabled));
  $("#sound-button").title = soundEnabled ? "Desativar sons" : "Ativar sons";
  $("#sound-button").innerHTML = icon(soundEnabled ? "volume" : "mute");
  if (soundEnabled) playTone("coin");
});

$("#fullscreen-button").addEventListener("click", async () => {
  const panel = $(".garden-panel");
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (panel.classList.contains("expanded"))
    panel.classList.remove("expanded");
  else {
    try {
      if (!panel.requestFullscreen) throw new Error("Fullscreen unavailable");
      await panel.requestFullscreen();
    } catch {
      panel.classList.add("expanded");
    }
  }
  syncFullscreen();
});
function syncFullscreen() {
  const expanded = Boolean(
    document.fullscreenElement ||
      $(".garden-panel").classList.contains("expanded"),
  );
  $("#fullscreen-button").setAttribute(
    "aria-label",
    expanded ? "Sair da tela expandida" : "Expandir jardim",
  );
  $("#fullscreen-button").title = expanded
    ? "Sair da tela expandida"
    : "Expandir jardim";
}
document.addEventListener("fullscreenchange", syncFullscreen);
document.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    $(".garden-panel").classList.remove("expanded");
    syncFullscreen();
  }
});

setInterval(save, 2500);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) save();
});
window.addEventListener("pagehide", save);
window.addEventListener("beforeunload", save);
window.capimDesktop?.onAction((action) => {
  if (action === "save") {
    save();
    toast("Progresso salvo neste computador.");
  } else if (action === "pause" && !dialogs.some((item) => item.open))
    togglePause();
  else {
    const target = { codes, farm: farmDialog, workshop, help }[action];
    if (target) openModal(target);
  }
});
for (const b of document.querySelectorAll("[data-action]"))
  b.onclick = () => {
    model.selectedAction = b.dataset.action;
    view.clearInput();
    updateHUD();
  };
for (const b of document.querySelectorAll("[data-equip]"))
  b.onclick = () => {
    model.selectedAction = b.dataset.equip;
    view.clearInput();
    updateHUD();
  };
$("#seed-select").onchange = (e) => {
  model.selectedCrop = e.target.value;
  model.selectedAction = "plant";
  updateHUD();
};
const openLife = (tab) => {
  activeLifeTab = tab;
  openModal(lifeDialog);
};
$("#market-button").onclick = () => openLife("seeds");
$("#life-button").onclick = () => openLife("helpers");
$("#skills-button").onclick = () => openLife("skills");
for (const b of document.querySelectorAll("[data-life-tab]"))
  b.onclick = () => {
    activeLifeTab = b.dataset.lifeTab;
    renderLife();
  };
$("#refill-button").onclick = () => {
  if (model.refillWater()) {
    updateHUD();
    save();
    toast("Balde cheio! Água coletada no poço.");
  } else toast("Aproxime-se do poço, marcado em azul no mapa, e pressione R.");
};
$("#claim-order").onclick = () => {
  if (model.claimOrder()) {
    updateUI();
    save();
    playTone("upgrade");
    toast("Pedido concluído! Bônus de moedas e experiência recebidos.");
  }
};
document.addEventListener("keydown", (e) => {
  if (
    dialogs.some((d) => d.open) ||
    e.target.matches("input,select,textarea") ||
    e.repeat
  )
    return;
  const modes = {
    Digit1: "harvest",
    Digit2: "plant",
    Digit3: "water",
    Digit4: "repair",
  };
  if (modes[e.code]) {
    e.preventDefault();
    model.selectedAction = modes[e.code];
    view.clearInput();
    $("#garden").focus({ preventScroll: true });
    updateHUD();
  }
  if (e.code === "KeyR") {
    e.preventDefault();
    $("#refill-button").click();
  }
});

// Keep all help and labels consistent with the farm rules.
const statsLabels = document.querySelectorAll(".garden-stats small");
if (statsLabels[0]) statsLabels[0].textContent = "colheitas realizadas";
if (statsLabels[1]) statsLabels[1].textContent = "ouro recebido";
if (statsLabels[2]) statsLabels[2].textContent = "com crescimentos diferentes";
const cropStat = document.querySelector(
  ".garden-stats>div:nth-child(3) strong",
);
if (cropStat) cropStat.innerHTML = "8 <em>culturas</em>";
$("#workshop-nav").innerHTML =
  `${icon("scythe")}Caixas <span class="nav-count">24</span>`;
$("#farm-nav").innerHTML = `${icon("farm")}Construções`;
help.querySelector(".help-intro").textContent =
  "Uma fazenda para crescer no seu ritmo: plante de dia, proteja à noite e descubra novas culturas e parceiros.";
help.querySelector(".help-steps").innerHTML = [
  [
    "Seu inventário",
    "WASD ou setas para andar. 1: foice (colher/defender), 2: enxada (plantar), 3: balde (regar), 4: enxada (reparar). Segure Espaço ou o mouse no campo para usar.",
  ],
  [
    "Sementes e água",
    "Você recebe 24 sementes de capim. Plante e regue para começar o crescimento. Compre outras sementes com ouro no Mercado. O balde começa com 12 águas; aproxime-se do poço e aperte R para encher.",
  ],
  [
    "O dia e a noite",
    "São 4 minutos de dia e 1 minuto de noite. Lobos destroem canteiros à noite: espante com a foice, repare com ouro e replante. Menus, pausa e jogo fechado suspendem a simulação.",
  ],
  [
    "Seus parceiros",
    "Compre Bento para colher e entregar a produção em casa; ele também ajuda contra lobos. Compre Gota para regar e buscar água no poço. Depois de comprados, ambos podem ser melhorados até o nível 3.",
  ],
  [
    "Ouro e diamantes",
    "O ouro compra sementes, reparos, melhorias e ajudantes. Plantas douradas têm chance inicial de 5% e rendem 10 diamantes; lendárias têm 0,1% e rendem 500. A pesquisa de botânica aumenta essas chances.",
  ],
  [
    "Caixas e fusões",
    "Use diamantes para abrir caixas: 1 por 50 ou 11 por 500. São 6 raridades e 4 graus; combine 5 foices idênticas para subir de grau 4 → 3 → 2 → 1. As probabilidades exatas estão na loja.",
  ],
  [
    "Sua própria evolução",
    "Cada novo nível concede 1 ponto para a árvore de habilidades. Invista em corrida, colheita, rega, produção, ajudantes e proteção. Experiência, habilidades, coleções e parceiros ficam após o rebirth.",
  ],
  [
    "Um novo começo",
    "Rebirth exige nível 10, foice épica ou melhor no grau 1 e ouro. Mantém seus investimentos permanentes e concede +25% de produção por ciclo. MONEY ativa ouro e diamantes infinitos apenas para testes.",
  ],
]
  .map(
    ([title, text], i) =>
      `<div><span>${String(i + 1).padStart(2, "0")}</span><div><h3>${title}</h3><p>${text}</p></div></div>`,
  )
  .join("");
const rebirthIntro = farmDialog.querySelector(".rebirth-card>p");
if (rebirthIntro)
  rebirthIntro.textContent =
    "Evolua até o nível 10, conquiste uma foice épica (ou melhor) no grau 1 e junte ouro para um novo ciclo.";
farmDialog.querySelector(".rebirth-confirm>p").textContent =
  "O ouro será zerado, a foice comum será equipada e os canteiros e cargas recomeçarão. Você mantém diamantes, coleção, sementes, fazenda, parceiros, experiência e habilidades.";
const keeps = farmDialog.querySelectorAll(".rebirth-keeps>span");
keeps[0].innerHTML = `${icon("check")}Mantém coleção, parceiros, XP e habilidades`;
keeps[1].innerHTML = `${icon("rebirth")}Reinicia ouro, canteiros e carga`;
$(".grass-guide").innerHTML =
  `<div class="guide-intro"><span class="eyebrow">DO CAPIM À ABÓBORA</span><h2>Cada semente, uma descoberta.</h2><p>Plante, regue e colha.</p></div>${Object.values(
    CROPS,
  )
    .map(
      (c) =>
        `<div class="grass-type"><span class="crop-mini">${c.icon}</span><div><h3>${c.name}</h3><p>${c.seconds}s após regar</p><strong>${c.value} ouro · nv.${c.unlock}</strong></div></div>`,
    )
    .join("")}`;

updateUI();
save();
$("#boot-screen")?.remove();
