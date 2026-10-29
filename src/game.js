import { COLS, ROWS, TILE, GRASS, hash } from "./model.js";

const OX = 48,
  OY = 48,
  WIDTH = 896,
  HEIGHT = 640;
const TAU = Math.PI * 2;
const reducedMotion = globalThis.matchMedia?.(
  "(prefers-reduced-motion: reduce)",
).matches;

function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function ellipse(ctx, color, x, y, rx, ry) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

export function drawScythe(canvas, tool, large = false) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;
  const scale = Math.min(canvas.width / 112, canvas.height / 72);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(scale, scale);
  ellipse(ctx, "#40592c12", 1, 30, 21, 3);
  ctx.rotate(0.48);
  rect(ctx, "#6e543d", -3, -23, 5, 54);
  rect(ctx, "#b89761", -2, -23, 2, 52);
  rect(ctx, "#d0b77c", -2, 26, 3, 3);
  rect(ctx, "#6f674f", -4, -22, 8, 5);
  ctx.fillStyle = "#536b5f";
  ctx.beginPath();
  ctx.moveTo(-2, -25);
  ctx.lineTo(10, -29);
  ctx.lineTo(25, -27);
  ctx.lineTo(35, -20);
  ctx.lineTo(40, -10);
  ctx.lineTo(41, 2);
  ctx.lineTo(36, -7);
  ctx.lineTo(29, -14);
  ctx.lineTo(18, -18);
  ctx.lineTo(5, -18);
  ctx.lineTo(-2, -19);
  ctx.fill();
  ctx.fillStyle = tool.color;
  ctx.beginPath();
  ctx.moveTo(-1, -25);
  ctx.lineTo(10, -28);
  ctx.lineTo(24, -26);
  ctx.lineTo(34, -19);
  ctx.lineTo(39, -9);
  ctx.lineTo(39, -3);
  ctx.lineTo(34, -11);
  ctx.lineTo(27, -16);
  ctx.lineTo(16, -20);
  ctx.lineTo(5, -20);
  ctx.lineTo(-1, -21);
  ctx.fill();
  rect(ctx, "#ffffff80", 6, -26, 14, 2);
  rect(ctx, "#ffffff65", 21, -24, 6, 2);
  rect(ctx, "#8b764f", -3, 6, 6, 7);
  rect(ctx, "#c7b180", -3, 7, 6, 1);
  rect(ctx, tool.level > 4 ? tool.color : "#8d855d", -3, -20, 5, 4);
  if (tool.level >= 6) {
    rect(ctx, "#f9f5ca", -1, -20, 2, 2);
  }
  ctx.restore();
}

export class GameView {
  constructor(
    canvas,
    model,
    { onHarvest = () => {}, onPause = () => {} } = {},
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.model = model;
    this.onHarvest = onHarvest;
    this.onPause = onPause;
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.cutting = false;
    this.autoCut = false;
    this.paused = false;
    this.covered = false;
    this.effects = [];
    this.swingAt = -Infinity;
    this.time = 0;
    this.frame = 0;
    this.lastFrame = null;
    this.base = document.createElement("canvas");
    this.base.width = WIDTH;
    this.base.height = HEIGHT;
    this.buildTerrain();
    this.bindInput();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.tick = this.tick.bind(this);
    this.frameId = requestAnimationFrame(this.tick);
  }

  resize() {
    const box = this.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(box.width * ratio));
    this.canvas.height = Math.max(1, Math.round(box.height * ratio));
    this.ctx.imageSmoothingEnabled = false;
  }

  bindInput() {
    const controls = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "Space",
    ];
    window.addEventListener("keydown", (e) => {
      const input = e.target instanceof HTMLInputElement;
      if (
        (input && !["checkbox", "radio", "button"].includes(e.target.type)) ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        e.target.isContentEditable
      )
        return;
      if (e.code === "KeyP" && !e.repeat && !this.covered) {
        this.onPause();
        return;
      }
      if (!controls.includes(e.code) || this.covered) return;
      if (
        e.code === "Space" &&
        (e.target instanceof HTMLButtonElement || input)
      )
        return;
      e.preventDefault();
      if (e.code !== "Space") this.canvas.focus({ preventScroll: true });
      this.keys.add(e.code);
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.clearInput());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.clearInput();
    });
    this.canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") return;
      this.canvas.focus({ preventScroll: true });
      this.cutting = true;
      this.canvas.setPointerCapture(e.pointerId);
    });
    const stopCut = () => {
      this.cutting = false;
    };
    this.canvas.addEventListener("pointerup", stopCut);
    this.canvas.addEventListener("pointercancel", stopCut);
    this.canvas.addEventListener("lostpointercapture", stopCut);
    const cut = document.querySelector("#touch-cut");
    cut.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      this.cutting = true;
      cut.setPointerCapture(e.pointerId);
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      cut.addEventListener(event, stopCut);
    const joystick = document.querySelector("#joystick"),
      knob = document.querySelector("#joystick-knob");
    let stickPointer = null;
    const moveStick = (e) => {
      if (stickPointer !== e.pointerId) return;
      const box = joystick.getBoundingClientRect();
      const dx = e.clientX - box.x - box.width / 2,
        dy = e.clientY - box.y - box.height / 2;
      const max = box.width * 0.3;
      const distance = Math.hypot(dx, dy);
      const factor = distance > max ? max / distance : 1;
      this.stick.x = (dx * factor) / max;
      this.stick.y = (dy * factor) / max;
      knob.style.transform = `translate(${dx * factor}px,${dy * factor}px)`;
    };
    joystick.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      stickPointer = e.pointerId;
      joystick.setPointerCapture(e.pointerId);
      moveStick(e);
    });
    joystick.addEventListener("pointermove", moveStick);
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      joystick.addEventListener(event, (e) => {
        if (stickPointer !== e.pointerId) return;
        stickPointer = null;
        this.stick = { x: 0, y: 0 };
        knob.style.transform = "";
      });
  }

  clearInput() {
    this.keys.clear();
    this.cutting = false;
    this.stick = { x: 0, y: 0 };
    document.querySelector("#joystick-knob").style.transform = "";
  }
  setCovered(covered) {
    this.covered = covered;
    this.clearInput();
  }

  tick(stamp) {
    const dt =
      this.lastFrame === null
        ? 0
        : Math.min((stamp - this.lastFrame) / 1000, 0.05);
    this.lastFrame = stamp;
    this.time = stamp / 1000;
    const now = Date.now() / 1000;
    if (!this.paused && !this.covered && !document.hidden) {
      const dx =
        Number(this.keys.has("ArrowRight") || this.keys.has("KeyD")) -
        Number(this.keys.has("ArrowLeft") || this.keys.has("KeyA")) +
        this.stick.x;
      const dy =
        Number(this.keys.has("ArrowDown") || this.keys.has("KeyS")) -
        Number(this.keys.has("ArrowUp") || this.keys.has("KeyW")) +
        this.stick.y;
      this.model.move(dx, dy, dt);
      if (this.keys.has("Space") || this.cutting || this.autoCut) {
        const result = this.model.cut(now);
        if (result) {
          this.swingAt = this.time;
          this.emitHarvest(result);
          this.onHarvest(result);
        }
      }
    } else this.model.player.walking = false;
    this.effects = this.effects.filter((p) => this.time - p.born < p.life);
    this.render(now);
    this.frameId = requestAnimationFrame(this.tick);
  }

  emitHarvest({ harvested }) {
    for (const tile of harvested) {
      const x = OX + tile.x * TILE,
        y = OY + tile.y * TILE;
      this.effects.push({
        type: "coin",
        x,
        y,
        value: tile.value,
        born: this.time,
        life: 1.1,
      });
      if (!reducedMotion)
        for (let i = 0; i < 5; i++) {
          const angle = Math.random() * TAU;
          this.effects.push({
            type: "leaf",
            x,
            y,
            vx: Math.cos(angle) * (18 + Math.random() * 30),
            vy: -15 - Math.random() * 35,
            color: tile.variant === "golden" ? "#ddc15d" : "#5e9146",
            born: this.time,
            life: 0.45 + Math.random() * 0.35,
          });
        }
    }
    if (this.effects.length > 900)
      this.effects.splice(0, this.effects.length - 900);
  }

  buildTerrain() {
    const ctx = this.base.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    rect(ctx, "#b5cc8f", 0, 0, WIDTH, HEIGHT);
    // A softly textured meadow surrounds the finite, fenced garden.
    for (let y = 0; y < HEIGHT; y += 8)
      for (let x = 0; x < WIDTH; x += 8) {
        const n = hash(x, y, 3);
        if (n > 0.72) rect(ctx, n > 0.9 ? "#c0d59b" : "#adc784", x, y, 3, 2);
      }
    rect(ctx, "#8ba964", OX - 5, OY + 4, COLS * TILE + 10, ROWS * TILE + 4);
    rect(ctx, "#a8c779", OX - 4, OY - 4, COLS * TILE + 8, ROWS * TILE + 8);
    for (const tile of this.model.tiles) {
      const { x, y, kind } = tile,
        px = OX + x * TILE,
        py = OY + y * TILE;
      const color = (x + y) % 2 === 0 ? "#a6c875" : "#a2c572";
      rect(ctx, color, px, py, TILE, TILE);
      for (let i = 0; i < 5; i++) {
        const tx = hash(x, y, i + 4),
          ty = hash(x, y, i + 9);
        rect(
          ctx,
          i % 2 ? "#b7d386" : "#96b96b",
          px + tx * 29,
          py + ty * 28,
          2,
          1,
        );
      }
      if (kind === "path") this.drawPath(ctx, px, py, x, y);
      if (kind === "hedge") this.drawFence(ctx, px, py, x, y);
    }
    this.drawPond(ctx);
    this.drawShed(ctx);
    // Garden props and flowers around the border.
    this.drawTree(ctx, 42, 87, 1.15);
    this.drawTree(ctx, 853, 85, 1.05);
    this.drawTree(ctx, 25, 526, 0.87);
    this.drawTree(ctx, 868, 542, 0.88);
    if (this.model.farmLevel > 0) {
      for (let i = 0; i < 2 + this.model.farmLevel; i++) {
        const x = 135 + i * 121;
        this.drawPot(ctx, x, 624, i % 2 ? "#e7b4bb" : "#f1d491");
        this.drawFlower(ctx, x - 6, 615, "#edb3c2", 0.65);
      }
    }
    if (this.model.farmLevel >= 3) {
      for (const [dx, dy] of [
        [8, 74],
        [110, 58],
        [57, 87],
      ])
        this.drawFlower(
          ctx,
          OX + 19 * TILE + dx,
          OY + 2 * TILE + dy,
          "#eab2c4",
          0.9,
        );
    }
    if (this.model.farmLevel === 4) {
      ctx.strokeStyle = "#8b926b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(95, 42);
      ctx.quadraticCurveTo(448, 58, 800, 42);
      ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const x = 105 + i * 40,
          y = 43 + Math.sin((i / 17) * Math.PI) * 7;
        rect(ctx, "#e1d7a3", x, y, 3, 5);
        rect(ctx, "#fff1b9", x, y + 1, 2, 3);
      }
    }
    for (let i = 0; i < 15; i++) {
      const x = 99 + i * 48;
      if (i > 5 && i < 9) continue;
      this.drawFlower(
        ctx,
        x,
        610 + hash(i, 3) * 8,
        i % 3 === 0 ? "#d99a91" : "#f5e6a2",
        1,
      );
      if (i % 2 === 0)
        this.drawFlower(ctx, x + 11, 608 + hash(i, 9) * 10, "#f1ecc7", 0.8);
    }
    // A wooden name sign tucked into the south-east border.
    rect(ctx, "#8c7551", 752, 595, 3, 20);
    rect(ctx, "#dfc696", 729, 584, 53, 19);
    rect(ctx, "#b89b69", 729, 601, 53, 3);
    rect(ctx, "#eddbb1", 731, 586, 49, 2);
    ctx.fillStyle = "#85704f";
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SOSSEGO", 756, 596);
  }

  drawPath(ctx, px, py, x, y) {
    rect(ctx, "#c4c798", px, py, TILE, TILE);
    const n = hash(x, y, 4);
    const stones = [
      [1, 2, 14, 12],
      [17, 1, 13, 13],
      [2, 17, 12, 13],
      [16, 16, 15, 13],
    ];
    for (let i = 0; i < stones.length; i++) {
      const [sx, sy, w, h] = stones[i];
      rect(ctx, "#acb48a", px + sx, py + sy + 2, w, h);
      rect(
        ctx,
        (i + x + y) % 3 === 0 ? "#dbd8af" : "#d3d2a7",
        px + sx,
        py + sy,
        w,
        h - 1,
      );
      rect(ctx, "#e3debb", px + sx + 2, py + sy + 1, w - 4, 2);
      if (n > 0.65) rect(ctx, "#a5b77c", px + sx + 1, py + sy + h - 4, 3, 2);
    }
  }

  drawFence(ctx, px, py, x, y) {
    const horizontal = y === 0 || y === ROWS - 1;
    if (horizontal) {
      rect(ctx, "#82995b40", px, py + 17, 32, 12);
      rect(ctx, "#998657", px, py + 8, 32, 4);
      rect(ctx, "#b6a06c", px, py + 6, 32, 3);
      rect(ctx, "#998657", px, py + 19, 32, 3);
      rect(ctx, "#c1ae7a", px, py + 17, 32, 3);
      for (let i = 3; i < 32; i += 13) {
        rect(ctx, "#9d895d", px + i + 2, py + 1, 6, 27);
        rect(ctx, "#d5c391", px + i, py, 6, 26);
        rect(ctx, "#e5d5a5", px + i, py, 6, 3);
      }
    } else {
      rect(ctx, "#8b9c6240", px + 11, py, 16, 32);
      rect(ctx, "#a18d61", px + 12, py, 5, 32);
      rect(ctx, "#c9b483", px + 10, py, 5, 32);
      rect(ctx, "#a18d61", px + 23, py, 4, 32);
      rect(ctx, "#c9b483", px + 21, py, 4, 32);
      if (y % 2 === 0) {
        rect(ctx, "#ad9464", px + 8, py + 8, 20, 8);
        rect(ctx, "#d9c895", px + 7, py + 5, 20, 7);
      }
    }
    if (hash(x, y, 21) > 0.58)
      this.drawFlower(ctx, px + 7 + hash(x, y) * 16, py + 31, "#f1edc7", 0.6);
  }

  drawPond(ctx) {
    const x = OX + 19 * TILE,
      y = OY + 2 * TILE;
    rect(ctx, "#8eaa71", x - 4, y + 4, 136, 97);
    rect(ctx, "#c5c19a", x - 3, y - 2, 134, 97);
    rect(ctx, "#d9d2ad", x + 2, y - 5, 124, 104);
    rect(ctx, "#829e86", x + 7, y + 4, 114, 84);
    rect(ctx, "#8db8ac", x + 9, y + 7, 110, 79);
    rect(ctx, "#99c4b7", x + 14, y + 12, 100, 65);
    rect(ctx, "#afd4bd", x + 14, y + 12, 100, 3);
    for (let i = 0; i < 8; i++)
      rect(
        ctx,
        i % 2 ? "#afd5c1" : "#89b5a6",
        x + 17 + hash(i, 3) * 83,
        y + 23 + hash(i, 2) * 47,
        10 + hash(i, 5) * 16,
        2,
      );
    for (const [lx, ly] of [
      [28, 54],
      [77, 23],
      [90, 66],
    ]) {
      ellipse(ctx, "#7fa57a", x + lx, y + ly, 9, 4);
      rect(ctx, "#9cbe83", x + lx - 5, y + ly - 2, 7, 2);
    }
    this.drawFlower(ctx, x + 29, y + 51, "#e5b0b0", 0.8);
    rect(ctx, "#7e9b64", x - 3, y + 67, 3, 17);
    rect(ctx, "#b4a06b", x - 4, y + 64, 4, 9);
    rect(ctx, "#75935f", x + 128, y + 22, 3, 18);
    rect(ctx, "#b4a06b", x + 127, y + 18, 4, 9);
    // Rounded rocks give the pond a hand-built edge.
    for (const [rx, ry] of [
      [0, 0],
      [119, 0],
      [0, 86],
      [117, 86],
    ]) {
      rect(ctx, "#a9ad90", x + rx, y + ry, 12, 9);
      rect(ctx, "#d6d1af", x + rx + 1, y + ry - 2, 10, 8);
      rect(ctx, "#e7dfbe", x + rx + 3, y + ry - 2, 5, 2);
    }
  }

  drawShed(ctx) {
    const x = OX + 2 * TILE,
      y = OY + TILE;
    rect(ctx, "#71864d35", x - 2, y + 35, 135, 40);
    rect(ctx, "#b79e6c", x + 5, y + 13, 118, 51);
    rect(ctx, "#e2d1a4", x + 5, y + 9, 118, 51);
    for (let i = 0; i < 7; i++)
      rect(ctx, "#caba8e", x + 8 + i * 17, y + 10, 1, 48);
    rect(ctx, "#7d8d63", x + 46, y + 21, 28, 41);
    rect(ctx, "#8e9b6c", x + 49, y + 23, 22, 37);
    rect(ctx, "#b5bd88", x + 50, y + 24, 2, 34);
    rect(ctx, "#e2cc87", x + 65, y + 42, 3, 3);
    rect(ctx, "#8b916f", x + 15, y + 24, 19, 18);
    rect(ctx, "#b1c8b0", x + 17, y + 26, 15, 14);
    rect(ctx, "#e6dab7", x + 23, y + 25, 2, 16);
    rect(ctx, "#e6dab7", x + 17, y + 32, 15, 2);
    rect(ctx, "#8b916f", x + 87, y + 24, 19, 18);
    rect(ctx, "#b1c8b0", x + 89, y + 26, 15, 14);
    rect(ctx, "#e6dab7", x + 95, y + 25, 2, 16);
    rect(ctx, "#e6dab7", x + 89, y + 32, 15, 2);
    rect(ctx, "#6b795b", x - 5, y + 3, 139, 10);
    rect(ctx, this.model.farm.roof, x - 1, y - 8, 131, 14);
    rect(ctx, this.model.farm.roof, x + 9, y - 16, 111, 11);
    rect(ctx, this.model.farm.roof, x + 22, y - 22, 85, 9);
    rect(ctx, "#ffffff18", x + 9, y - 16, 111, 3);
    rect(ctx, "#ffffff28", x + 22, y - 22, 85, 3);
    rect(ctx, "#c4cba2", x + 23, y - 22, 83, 2);
    for (let i = 0; i < 6; i++)
      rect(ctx, "#788d63", x + 8 + i * 21, y - 6, 1, 12);
    rect(ctx, "#b9c095", x + 40, y + 60, 42, 5);
    this.drawPot(ctx, x + 6, y + 58, "#d9a08c");
    this.drawPot(ctx, x + 117, y + 58, "#e7cc80");
    if (this.model.farmLevel > 0) {
      rect(ctx, "#9c7b5b", x + 12, y + 43, 25, 7);
      rect(ctx, "#c5a67a", x + 11, y + 42, 27, 3);
      rect(ctx, "#9c7b5b", x + 84, y + 43, 25, 7);
      rect(ctx, "#c5a67a", x + 83, y + 42, 27, 3);
      for (let i = 0; i < 3; i++) {
        this.drawFlower(
          ctx,
          x + 18 + i * 7,
          y + 42,
          i % 2 ? "#ecb9c9" : "#e7d69a",
          0.55,
        );
        this.drawFlower(
          ctx,
          x + 90 + i * 7,
          y + 42,
          i % 2 ? "#e7d69a" : "#ecb9c9",
          0.55,
        );
      }
    }
  }

  drawPot(ctx, x, y, flower) {
    rect(ctx, "#b88465", x - 5, y - 1, 11, 10);
    rect(ctx, "#cd9c77", x - 7, y - 4, 15, 5);
    rect(ctx, "#e1b18b", x - 6, y - 4, 13, 2);
    this.drawFlower(ctx, x, y - 5, flower, 1);
  }

  drawTree(ctx, x, y, scale = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ellipse(ctx, "#547c4130", 2, 14, 28, 10);
    rect(ctx, "#8d7750", -5, -15, 10, 29);
    rect(ctx, "#ac9160", -4, -15, 4, 28);
    const patches = [
      [-20, -30, 37, 22, "#668c4e"],
      [-28, -48, 52, 29, "#709b54"],
      [-19, -64, 35, 25, "#82a75e"],
      [-30, -41, 15, 15, "#789f56"],
      [11, -43, 18, 20, "#61894b"],
      [-11, -57, 23, 13, "#94b96b"],
      [-22, -36, 16, 8, "#89af62"],
      [0, -32, 19, 8, "#799f53"],
    ];
    for (const [px, py, w, h, c] of patches) {
      rect(ctx, c, px + 4, py, w - 8, h);
      rect(ctx, c, px, py + 4, w, h - 8);
    }
    rect(ctx, "#a0bd75", -12, -60, 11, 3);
    rect(ctx, "#9dba72", -23, -43, 9, 3);
    rect(ctx, "#96b66b", 4, -50, 9, 3);
    if (this.model.farmLevel >= 2)
      for (const [fx, fy] of [
        [-14, -46],
        [7, -35],
        [0, -57],
      ]) {
        rect(ctx, "#bd8f4b", fx, fy, 6, 6);
        rect(ctx, "#e4ad5e", fx, fy - 1, 5, 5);
        rect(ctx, "#f4ce7a", fx + 1, fy - 1, 2, 2);
      }
    ctx.restore();
  }

  drawFlower(ctx, x, y, color, scale = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    rect(ctx, "#718f4f", -1, -9, 2, 10);
    rect(ctx, "#8ca85d", 1, -5, 4, 2);
    rect(ctx, "#6e8d4d", -4, -7, 4, 2);
    rect(ctx, color, -2, -15, 4, 9);
    rect(ctx, color, -5, -12, 10, 4);
    rect(ctx, "#f6e4a0", -1, -11, 2, 2);
    ctx.restore();
  }

  drawGrass(ctx, tile, now) {
    const growth = this.model.growth(tile, now),
      x = OX + tile.x * TILE,
      y = OY + tile.y * TILE;
    const seed = hash(tile.x, tile.y, 5);
    const maxHeight = 17 + seed * 7;
    if (growth < 0.03) {
      rect(ctx, "#8dab6050", x + 8, y + 23, 17, 3);
      return;
    }
    const stage =
      growth < 0.3 ? 0.24 : growth < 0.65 ? 0.5 : growth < 1 ? 0.76 : 1;
    const h = Math.max(3, Math.floor(maxHeight * stage));
    const gold = tile.variant === "golden" && growth >= 1;
    const dark = gold ? "#a29a42" : "#588246",
      mid = gold ? "#c2ac4d" : "#6a984c",
      light = gold ? "#dcc66c" : "#8db361";
    const sway = reducedMotion
      ? 0
      : Math.round(Math.sin(this.time * 1.5 + seed * 10) * 0.7);
    ellipse(ctx, "#4d743526", x + 16, y + 25, 12, 4);
    for (let i = 0; i < 6; i++) {
      const bx = x + 5 + i * 4,
        bh = h * (0.65 + hash(tile.x + i, tile.y, 13) * 0.35),
        tip = bx + (i < 3 ? -2 : 2) + sway;
      rect(ctx, dark, bx, y + 25 - bh, 3, bh);
      rect(ctx, mid, bx + 1, y + 24 - bh, 3, bh - 1);
      rect(ctx, light, tip, y + 23 - bh, 2, Math.max(2, bh * 0.53));
      if (i % 2 === 0) rect(ctx, mid, bx - 2, y + 27 - bh, 3, 4);
    }
    rect(ctx, mid, x + 7, y + 24, 21, 3);
    rect(ctx, light, x + 10, y + 23, 3, 2);
    if (tile.variant === "flower" && growth >= 1) {
      const color = seed > 0.5 ? "#df9eae" : "#ece6b4";
      this.drawFlower(ctx, x + 11, y + 24, color, 0.7);
      this.drawFlower(ctx, x + 23, y + 26, "#edc4cb", 0.55);
    }
    if (gold) {
      const glint = reducedMotion
        ? 0.8
        : 0.5 + Math.sin(this.time * 2 + seed * 5) * 0.5;
      ctx.globalAlpha = 0.35 + glint * 0.65;
      rect(ctx, "#fff1b2", x + 24, y + 5, 2, 6);
      rect(ctx, "#fff1b2", x + 22, y + 7, 6, 2);
      ctx.globalAlpha = 1;
      rect(ctx, "#f0db89", x + 9, y + 11, 2, 2);
    }
  }

  drawBush(ctx, tile) {
    const x = OX + tile.x * TILE,
      y = OY + tile.y * TILE;
    if (tile.kind === "stone") {
      ellipse(ctx, "#587c3830", x + 17, y + 27, 15, 5);
      rect(ctx, "#919b7e", x + 4, y + 12, 26, 15);
      rect(ctx, "#b6b99b", x + 2, y + 11, 26, 12);
      rect(ctx, "#c9c7a7", x + 6, y + 6, 19, 15);
      rect(ctx, "#d9d3b0", x + 8, y + 6, 13, 3);
      rect(ctx, "#8c9d6d", x + 1, y + 24, 12, 4);
      return;
    }
    ellipse(ctx, "#4c743a30", x + 18, y + 28, 17, 5);
    rect(ctx, "#859364", x + 2, y + 18, 29, 10);
    rect(ctx, "#c1bf93", x + 1, y + 14, 29, 10);
    rect(ctx, "#d6cea3", x + 3, y + 13, 25, 3);
    rect(ctx, "#537b45", x + 2, y + 1, 27, 20);
    rect(ctx, "#628d4c", x, y + 3, 29, 14);
    rect(ctx, "#739b53", x + 2, y - 2, 25, 15);
    rect(ctx, "#81a65c", x + 4, y - 4, 21, 12);
    rect(ctx, "#94b46c", x + 5, y - 4, 18, 3);
    rect(ctx, "#8cab62", x + 3, y + 3, 6, 3);
    rect(ctx, "#6c934c", x + 15, y + 8, 12, 4);
    rect(ctx, "#a4bc76", x + 7, y - 2, 4, 2);
    if (hash(tile.x, tile.y, 1) > 0.6) {
      rect(ctx, "#dba49b", x + 17, y + 5, 4, 4);
      rect(ctx, "#f7d39c", x + 18, y + 6, 2, 2);
    }
  }

  drawPlayer(ctx) {
    const p = this.model.player,
      x = OX + p.x * TILE,
      y = OY + p.y * TILE;
    const step = p.walking && !reducedMotion ? Math.sin(this.time * 15) : 0;
    const bob = Math.abs(step) > 0.5 ? -1 : 0;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ellipse(ctx, "#3f643b40", 0, 3, 11, 4);
    ctx.translate(0, bob);
    const leftStep = Math.round(step * 2),
      rightStep = -leftStep;
    rect(ctx, "#4d5b49", -7, -5 + leftStep, 5, 9);
    rect(ctx, "#4d5b49", 2, -5 + rightStep, 5, 9);
    rect(ctx, "#6c5943", -8, 1 + leftStep, 6, 4);
    rect(ctx, "#6c5943", 2, 1 + rightStep, 6, 4);
    if (p.facing === "up") {
      rect(ctx, "#eeead0", -10, -21, 20, 12);
      rect(ctx, "#d4d8b6", -12, -19, 4, 10);
      rect(ctx, "#eac09a", -12, -11, 4, 5);
      rect(ctx, "#eac09a", 8, -11, 4, 5);
      rect(ctx, "#6d8760", -7, -20, 14, 17);
      rect(ctx, "#8fa476", -5, -19, 10, 10);
      rect(ctx, "#b9ad77", -4, -12, 8, 6);
      rect(ctx, "#d1c291", -3, -12, 6, 2);
      rect(ctx, "#785b3c", -7, -30, 14, 10);
    } else {
      rect(ctx, "#eee9d2", -10, -21, 20, 13);
      rect(ctx, "#d6d8b7", -12, -19, 4, 10);
      rect(ctx, "#f0c9a4", -12, -11, 4, 5);
      rect(ctx, "#f0c9a4", 8, -11, 4, 5);
      rect(ctx, "#6a8864", -7, -17, 14, 14);
      rect(ctx, "#7b9870", -6, -17, 5, 12);
      rect(ctx, "#5d7d5c", 3, -20, 3, 8);
      rect(ctx, "#5d7d5c", -6, -20, 3, 8);
      rect(ctx, "#dfc984", -5, -15, 2, 2);
      rect(ctx, "#dfc984", 4, -15, 2, 2);
      rect(ctx, "#ca956c", -6, -26, 13, 8);
      rect(ctx, "#edbc8f", -7, -31, 14, 12);
      rect(ctx, "#f3cda5", -5, -30, 10, 8);
      if (p.facing === "left") {
        rect(ctx, "#4b503e", -6, -26, 2, 2);
        rect(ctx, "#d39b76", -9, -24, 3, 3);
      } else if (p.facing === "right") {
        rect(ctx, "#4b503e", 4, -26, 2, 2);
        rect(ctx, "#d39b76", 6, -24, 3, 3);
      } else {
        rect(ctx, "#4b503e", -4, -26, 2, 2);
        rect(ctx, "#4b503e", 3, -26, 2, 2);
        rect(ctx, "#dba17c", -1, -22, 3, 1);
      }
      rect(ctx, "#826040", -7, -31, 14, 4);
      rect(ctx, "#826040", -7, -28, 2, 4);
    }
    // Broad straw hat, green ribbon and a tiny feather.
    rect(ctx, "#a78b55", -14, -34, 28, 5);
    rect(ctx, "#dbc58a", -15, -36, 29, 5);
    rect(ctx, "#ead69a", -13, -37, 25, 3);
    rect(ctx, "#c7ad72", -9, -44, 18, 9);
    rect(ctx, "#dfc78b", -8, -45, 16, 8);
    rect(ctx, "#ecd8a2", -6, -45, 11, 2);
    rect(ctx, "#6f8757", -9, -38, 18, 3);
    rect(ctx, "#96ad71", 7, -42, 2, 6);
    rect(ctx, "#c4d297", 8, -44, 3, 4);
    if (this.model.rebirths > 0) {
      rect(ctx, "#c0a0d1", -9, -38, 18, 3);
      rect(ctx, "#e7d6f0", -7, -38, 3, 2);
    }
    const swing = Math.max(0, 1 - (this.time - this.swingAt) / 0.27);
    ctx.save();
    ctx.translate(10, -12);
    ctx.rotate(-0.38 - swing * 2.8);
    rect(ctx, "#7b6244", 0, -19, 3, 30);
    rect(ctx, "#c7a76b", 0, -18, 1, 27);
    rect(ctx, "#586c5b", 0, -22, 13, 4);
    rect(ctx, this.model.tool.color, 1, -23, 11, 3);
    rect(ctx, this.model.tool.color, 10, -21, 5, 3);
    rect(ctx, "#e2e1c0", 3, -23, 6, 1);
    rect(ctx, "#60715d", 13, -18, 3, 6);
    ctx.restore();
    ctx.restore();
    if (swing > 0 && !reducedMotion) {
      ctx.save();
      ctx.globalAlpha = swing * 0.5;
      ctx.strokeStyle = "#f7f7cf";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(
        x,
        y - 5,
        Math.min(110, this.model.tool.radius * TILE),
        -0.5 + 2 * swing,
        2.6 + 2 * swing,
      );
      ctx.stroke();
      ctx.restore();
    }
    // Keep the gardener easy to find in the lush grass.
    ctx.fillStyle = "#f5f7e7e8";
    ctx.fillRect(Math.round(x - 15), Math.round(y - 62 + bob), 30, 11);
    rect(ctx, "#f5f7e7e8", x - 2, y - 51 + bob, 4, 3);
    ctx.font = "bold 6px monospace";
    ctx.textAlign = "center";
    ctx.fillStyle = "#61784c";
    ctx.fillText("VOCÊ", Math.round(x), Math.round(y - 54 + bob));
  }

  drawEffects(ctx) {
    for (const effect of this.effects) {
      const age = this.time - effect.born,
        progress = age / effect.life;
      ctx.globalAlpha = 1 - progress;
      if (effect.type === "leaf") {
        rect(
          ctx,
          effect.color,
          effect.x + effect.vx * age,
          effect.y + effect.vy * age + 35 * age * age,
          3,
          2,
        );
      } else {
        const y = effect.y - 19 - age * 24;
        rect(ctx, "#b58a35", effect.x - 4, y - 5, 8, 9);
        rect(ctx, "#efc85b", effect.x - 3, y - 6, 6, 9);
        rect(ctx, "#ffe59a", effect.x - 2, y - 5, 2, 6);
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#42653c";
        ctx.fillText("+" + effect.value, effect.x, y - 10);
      }
    }
    ctx.globalAlpha = 1;
  }

  render(now) {
    const ctx = this.ctx;
    const mobile =
      matchMedia("(pointer: coarse)").matches && this.canvas.clientWidth < 760;
    const desktop = document.documentElement.classList.contains("desktop-app");
    if (mobile || desktop) {
      // Follow the player without stretching pixels in a resizable PC window.
      const viewWidth = desktop
        ? WIDTH
        : Math.min(WIDTH, Math.max(480, this.canvas.clientWidth));
      const scale = Math.max(
        this.canvas.width / viewWidth,
        this.canvas.height / HEIGHT,
      );
      const visibleWidth = this.canvas.width / scale,
        visibleHeight = this.canvas.height / scale;
      const cameraX = Math.max(
        0,
        Math.min(
          WIDTH - visibleWidth,
          OX + this.model.player.x * TILE - visibleWidth / 2,
        ),
      );
      const cameraY = Math.max(
        0,
        Math.min(
          HEIGHT - visibleHeight,
          OY + this.model.player.y * TILE - visibleHeight / 2,
        ),
      );
      ctx.setTransform(scale, 0, 0, scale, -cameraX * scale, -cameraY * scale);
    } else
      ctx.setTransform(
        this.canvas.width / WIDTH,
        0,
        0,
        this.canvas.height / HEIGHT,
        0,
        0,
      );
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.base, 0, 0);
    const playerRow = Math.floor(this.model.player.y);
    for (let y = 1; y < ROWS - 1; y++) {
      for (let x = 1; x < COLS - 1; x++) {
        const tile = this.model.tileAt(x, y);
        if (tile.kind === "grass") this.drawGrass(ctx, tile, now);
        else if (tile.kind === "bush" || tile.kind === "stone")
          this.drawBush(ctx, tile);
      }
      if (y === playerRow) this.drawPlayer(ctx);
    }
    // Water ripples and warm sunlight stay subtle so gameplay remains readable.
    if (!reducedMotion) {
      const t = this.time;
      ctx.globalAlpha = 0.32;
      rect(
        ctx,
        "#e0ecd0",
        OX + 19 * TILE + 46 + Math.sin(t * 0.6) * 4,
        OY + 2 * TILE + 53,
        18,
        1,
      );
      ctx.globalAlpha = 1;
      for (let i = 0; i < 3; i++) {
        const x = 135 + i * 231 + Math.sin(t * 0.35 + i) * 35,
          y = 155 + Math.cos(t * 0.5 + i * 2) * 58;
        const flap = Math.sin(t * 10 + i) > 0 ? 3 : 1;
        rect(ctx, i % 2 ? "#f3e3a4" : "#f5efda", x - flap, y, flap, 2);
        rect(ctx, i % 2 ? "#ead08b" : "#e8dfbc", x + 1, y, flap, 2);
        rect(ctx, "#a59d60", x, y, 1, 3);
      }
    }
    this.drawEffects(ctx);
  }
}
