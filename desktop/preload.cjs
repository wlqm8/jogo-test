const { contextBridge, ipcRenderer } = require("electron");
const actions = new Set(["pause", "save", "codes", "farm", "workshop", "help"]);

contextBridge.exposeInMainWorld("capimDesktop", {
  onAction(callback) {
    if (typeof callback !== "function") return;
    ipcRenderer.on("capim:action", (_event, action) => {
      if (actions.has(action)) callback(action);
    });
  },
});
