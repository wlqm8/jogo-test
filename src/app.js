import { Garden, SCYTHES, FARMS, SAVE_KEY } from "./model.js";
import { GameView, drawScythe } from "./game.js";

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
const dialogs = [workshop, help, codes, farmDialog];
const balanceLabel = () => (model.infiniteMoney ? "∞" : number(model.coins));

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
  if (saved && !model.restore(saved))
    toast(
      "Não foi possível ler o progresso anterior. Um novo jardim espera por você.",
    );
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
  onHarvest(result) {
    if (result.earned) {
      updateUI();
      save();
      playTone("coin", Math.max(...result.harvested.map((t) => t.value)));
      $("#game-announcement").textContent =
        `${result.harvested.length} gramas cortadas. Mais ${result.earned} moedas.`;
      if (model.cutCount === result.harvested.length)
        toast(
          "Primeira colheita! A grama cortada ficará pronta de novo em 30 segundos.",
        );
    } else {
      playTone("cut");
      if (
        !view.autoCut &&
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
  if (!model.upgrade()) return;
  updateUI();
  save();
  playTone("upgrade");
  renderWorkshop();
  toast(
    `${model.tool.name} desbloqueada! ${model.tool.area} blocos e cortes a cada ${seconds(model.tool.cooldown)}s.`,
  );
}

function updateUI() {
  const tool = model.tool,
    next = model.nextTool;
  for (const id of [
    "balance",
    "world-coins",
    "workshop-balance",
    "farm-wallet",
  ])
    $(`#${id}`).textContent = balanceLabel();
  $("#balance").setAttribute(
    "aria-label",
    model.infiniteMoney
      ? "Dinheiro infinito, modo de teste"
      : `${number(model.coins)} moedas`,
  );
  $("#test-badge").hidden = !model.infiniteMoney;
  $("#wallet-note").textContent = model.infiniteMoney
    ? "MONEY ativo · dinheiro infinito para testes."
    : "Um corte de cada vez. Elas vão chegar.";
  $("#codes-button").classList.toggle("test-active", model.infiniteMoney);
  $("#test-mode-panel").hidden = !model.infiniteMoney;
  $("#garden-name").textContent = model.farm.name;
  $("#farm-summary").textContent =
    `Fazenda ${model.farmLevel + 1}/5 · ${model.rebirths} ${model.rebirths === 1 ? "rebirth" : "rebirths"}`;
  $(".stats-sprout").innerHTML =
    `colheita ×${seconds(model.multiplier)} ${icon("leaf")}`;
  $("#cut-count").textContent = number(model.cutCount);
  $("#total-earned").textContent = number(model.totalEarned);
  $("#level-badge").textContent =
    `NÍVEL ${String(model.level + 1).padStart(2, "0")}`;
  $("#tool-name").textContent = tool.name;
  $("#tool-description").textContent = tool.description;
  $("#tool-speed").innerHTML =
    `${seconds(tool.cooldown)}s <small>/ corte</small>`;
  $("#tool-area").innerHTML = `${tool.area} <small>blocos</small>`;
  $("#speed-meter").style.width = `${(model.level + 1) * 10}%`;
  $("#area-meter").style.width = `${Math.max(9, (tool.area / 81) * 100)}%`;
  drawScythe($("#scythe-art"), tool, true);
  const canBuy = next && model.canAfford(next.cost);
  $("#next-level").textContent = next
    ? `${String(next.level + 1).padStart(2, "0")} / 10`
    : "10 / 10";
  $("#next-name").textContent = next ? next.name : "Uma companheira lendária";
  $("#next-benefit").textContent = next
    ? `${next.area} blocos · ${seconds(next.cooldown)}s por corte`
    : "Você chegou ao último nível!";
  const progress =
    next && !model.infiniteMoney
      ? Math.min(100, (model.coins / next.cost) * 100)
      : 100;
  $("#upgrade-progress-label").textContent = next
    ? model.infiniteMoney
      ? "Dinheiro infinito · modo de teste"
      : `${number(Math.min(model.coins, next.cost))} de ${number(next.cost)} moedas`
    : "Todas as melhorias conquistadas";
  $("#upgrade-percent").textContent = `${Math.floor(progress)}%`;
  $("#upgrade-progress-bar").style.width = `${progress}%`;
  $("#upgrade-button").disabled = !canBuy;
  $("#upgrade-button").innerHTML =
    `${icon(next ? (canBuy ? "scythe" : "lock") : "check")}<span>${next ? "Melhorar foice" : "Nível máximo"}</span>${next ? `<span class="upgrade-price"><span class="pixel-coin mini"></span><span>${number(next.cost)}</span></span>` : ""}`;
  $("#upgrade-button").setAttribute(
    "aria-label",
    next
      ? `Melhorar para ${next.name} por ${next.cost} moedas${canBuy ? "" : ". Moedas insuficientes"}`
      : "Nível máximo alcançado",
  );
  if (farmDialog.open) renderFarm();
}

function renderWorkshop() {
  $("#workshop-balance").textContent = balanceLabel();
  $("#scythe-grid").innerHTML = SCYTHES.map((tool) => {
    const current = tool.level === model.level,
      unlocked = tool.level < model.level,
      next = tool.level === model.level + 1;
    const canBuy = next && model.canAfford(tool.cost);
    const state = current ? "current" : unlocked ? "unlocked" : "locked";
    return `<article class="scythe-tile ${state}"><div class="tile-top"><span>NÍVEL ${String(tool.level + 1).padStart(2, "0")}</span>${icon(current || unlocked ? "check" : "lock")}</div><canvas width="224" height="144" data-tool-art="${tool.level}" aria-hidden="true"></canvas><h3>${tool.name}</h3><div class="tile-specs"><span>${icon("bolt")}${seconds(tool.cooldown)}s</span><span>${icon("target")}${tool.area} blocos</span></div><button class="tile-button ${current ? "current" : canBuy ? "ready" : ""}" ${!canBuy ? "disabled" : ""} data-buy="${tool.level}" aria-label="${current ? `${tool.name}, equipada` : unlocked ? `${tool.name}, adquirida` : `Melhorar para ${tool.name} por ${tool.cost} moedas`}">${current ? `${icon("check")} Equipada` : unlocked ? `${icon("check")} Adquirida` : `<span class="pixel-coin mini"></span>${number(tool.cost)}${next ? " · Melhorar" : ""}`}</button></article>`;
  }).join("");
  for (const canvas of document.querySelectorAll("[data-tool-art]"))
    drawScythe(canvas, SCYTHES[Number(canvas.dataset.toolArt)]);
  for (const button of document.querySelectorAll("[data-buy]"))
    button.addEventListener("click", () => {
      if (Number(button.dataset.buy) === model.level + 1) upgrade();
    });
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
      `<div class="farm-step ${index === model.farmLevel ? "current" : index < model.farmLevel ? "done" : ""}"><span class="farm-step-number">${index < model.farmLevel ? icon("check") : String(index + 1).padStart(2, "0")}</span><span><strong>${farm.name}</strong><small>${farm.bonus ? `+${Math.round(farm.bonus * 100)}% de moedas` : "Seu primeiro pedacinho de verde"} · ${number(6 + index * 1.5)}% douradas</small></span><span class="farm-step-status">${index === model.farmLevel ? "ATUAL" : index < model.farmLevel ? "✓" : `${number(farm.cost)} <span class="pixel-coin mini"></span>`}</span></div>`,
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
    ? "Foice Lendária conquistada. Você pode renascer!"
    : `Alcance a foice 10/10 para desbloquear. Atual: ${model.level + 1}/10.`;
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
    `${model.farm.name}! +${Math.round(model.farm.bonus * 100)}% de moedas e mais gramas especiais.`,
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
    toast("Corte automático ativado. É só passear pelo jardim.");
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
updateUI();
save();
$("#boot-screen")?.remove();
