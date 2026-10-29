import {
  app,
  BrowserWindow,
  Menu,
  dialog,
  protocol,
  session,
  screen,
} from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";
import { serveGameAsset } from "./assets.mjs";

const directory = dirname(fileURLToPath(import.meta.url));
const gameRoot = join(directory, "../dist");
const actions = new Set(["pause", "save", "codes", "farm", "workshop", "help"]);
let window;

app.setName("Capim & Cia");
app.setAppUserModelId("com.capimecia.game");
const profile =
  app.commandLine.getSwitchValue("user-data-dir") ||
  join(app.getPath("appData"), "Capim-e-Cia");
mkdirSync(profile, { recursive: true });
app.setPath("userData", profile);
protocol.registerSchemesAsPrivileged([
  {
    scheme: "capim",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function sendAction(action) {
  if (actions.has(action) && window && !window.isDestroyed())
    window.webContents.send("capim:action", action);
}

function createWindow() {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  window = new BrowserWindow({
    title: "Capim & Cia",
    width: Math.min(1440, workArea.width),
    height: Math.min(960, workArea.height),
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#f6f7f2",
    icon: join(
      directory,
      process.platform === "win32" ? "icon.ico" : "icon.png",
    ),
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(directory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("capim://game/")) event.preventDefault();
  });
  window.on("page-title-updated", (event) => event.preventDefault());
  window.once("ready-to-show", () => {
    window.maximize();
    window.show();
  });
  window.on("closed", () => {
    window = null;
  });
  window.webContents.on(
    "did-fail-load",
    (_event, _code, description, _url, isMainFrame) => {
      if (!isMainFrame) return;
      dialog.showErrorBox(
        "Não foi possível abrir o jardim",
        `Extraia a pasta inteira do ZIP e abra Capim-e-Cia.exe novamente.\n\nDetalhe: ${description}`,
      );
      app.quit();
    },
  );
  window.loadURL("capim://game/?desktop=1");
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
  });
  app
    .whenReady()
    .then(() => {
      protocol.handle("capim", (request) => serveGameAsset(gameRoot, request));
      session.defaultSession.setPermissionRequestHandler(
        (_contents, permission, callback) =>
          callback(permission === "fullscreen"),
      );
      session.defaultSession.webRequest.onBeforeRequest(
        { urls: ["http://*/*", "https://*/*"] },
        (_details, callback) => callback({ cancel: true }),
      );
      const actionItem = (label, action, accelerator) => ({
        label,
        accelerator,
        click: () => sendAction(action),
      });
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: "Jogo",
            submenu: [
              actionItem("Pausar / continuar (P)", "pause"),
              actionItem("Salvar progresso", "save", "CmdOrCtrl+S"),
              { type: "separator" },
              actionItem("Oficina de foices", "workshop", "CmdOrCtrl+O"),
              actionItem("Fazenda e rebirth", "farm", "CmdOrCtrl+G"),
              actionItem("Resgatar códigos", "codes", "CmdOrCtrl+Shift+C"),
              { type: "separator" },
              { role: "quit", label: "Sair" },
            ],
          },
          {
            label: "Exibir",
            submenu: [
              {
                role: "togglefullscreen",
                label: "Tela cheia",
                accelerator: "F11",
              },
              {
                role: "resetZoom",
                label: "Tamanho original",
                accelerator: "CmdOrCtrl+0",
              },
              { role: "zoomIn", label: "Aumentar interface" },
              { role: "zoomOut", label: "Diminuir interface" },
            ],
          },
          { label: "Ajuda", submenu: [actionItem("Como jogar", "help", "F1")] },
        ]),
      );
      createWindow();
      app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
      });
    })
    .catch((error) => {
      dialog.showErrorBox("Não foi possível iniciar o jogo", error.message);
      app.quit();
    });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
