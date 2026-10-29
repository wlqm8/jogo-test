import { readFile } from "node:fs/promises";
import { join } from "node:path";

const assets = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/src/app.js", ["src/app.js", "text/javascript; charset=utf-8"]],
  ["/src/model.js", ["src/model.js", "text/javascript; charset=utf-8"]],
  ["/src/game.js", ["src/game.js", "text/javascript; charset=utf-8"]],
  ["/src/style.css", ["src/style.css", "text/css; charset=utf-8"]],
  ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
]);

export function resolveGameAsset(address) {
  try {
    const url = new URL(address);
    if (
      url.protocol !== "capim:" ||
      url.hostname !== "game" ||
      url.port ||
      url.username ||
      url.password
    )
      return null;
    const asset = assets.get(url.pathname);
    return asset ? { relativePath: asset[0], contentType: asset[1] } : null;
  } catch {
    return null;
  }
}

export async function serveGameAsset(root, request) {
  if (request.method !== "GET")
    return new Response("Método não permitido", { status: 405 });
  const asset = resolveGameAsset(request.url);
  if (!asset) return new Response("Arquivo não encontrado", { status: 404 });
  try {
    const body = await readFile(join(root, ...asset.relativePath.split("/")));
    return new Response(body, {
      headers: {
        "Content-Type": asset.contentType,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      },
    });
  } catch {
    return new Response("Não foi possível carregar o arquivo", { status: 500 });
  }
}
