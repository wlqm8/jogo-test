export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectPage(endpoint) {
  const pages = await (await fetch(`${endpoint}/json/list`)).json();
  const page = pages.find((item) => item.type === "page");
  if (!page) throw new Error("A janela do jogo ainda não foi criada.");
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const pending = new Map(),
    errors = [];
  socket.onclose = () => {
    for (const entry of pending.values())
      entry.reject(new Error("A janela do aplicativo foi fechada."));
    pending.clear();
  };
  socket.onmessage = (event) => {
    const result = JSON.parse(event.data);
    if (result.id) {
      const entry = pending.get(result.id);
      pending.delete(result.id);
      if (result.error) entry?.reject(new Error(JSON.stringify(result.error)));
      else entry?.resolve(result.result);
    } else if (result.method === "Runtime.exceptionThrown")
      errors.push(result.params.exceptionDetails);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const next = ++id;
      pending.set(next, { resolve, reject });
      socket.send(JSON.stringify({ id: next, method, params }));
    });
  await send("Runtime.enable");
  await send("Page.enable");
  return {
    send,
    errors,
    close: () => socket.close(),
    async evaluate(expression) {
      const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails)
        throw new Error(JSON.stringify(result.exceptionDetails));
      return result.result.value;
    },
    async key(code, type = "keyDown") {
      await send("Input.dispatchKeyEvent", {
        type,
        code,
        key: code === "Space" ? " " : code.slice(-1).toLowerCase(),
        windowsVirtualKeyCode:
          code === "Space"
            ? 32
            : code.startsWith("Digit")
              ? code.charCodeAt(5)
              : code.charCodeAt(3),
      });
    },
  };
}
