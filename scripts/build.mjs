import { mkdir, cp, rm, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
await rm(resolve(root, "dist"), { recursive: true, force: true });
await mkdir(resolve(root, "dist"), { recursive: true });
for (const item of ["index.html", "src", "favicon.svg"])
  await cp(resolve(root, item), resolve(root, "dist", item), {
    recursive: true,
  });

// Also provide a portable edition that works when opened directly from disk.
const [html, css, favicon, ...modules] = await Promise.all([
  readFile(resolve(root, "index.html"), "utf8"),
  readFile(resolve(root, "src/style.css"), "utf8"),
  readFile(resolve(root, "favicon.svg"), "utf8"),
  ...["model", "game", "app"].map((name) =>
    readFile(resolve(root, `src/${name}.js`), "utf8"),
  ),
]);
const script = modules
  .map((source) =>
    source.replace(/^import\s+[\s\S]*?;\s*/gm, "").replace(/^export\s+/gm, ""),
  )
  .join("\n\n");
const portable = html
  .replace(
    '<link rel="stylesheet" href="/src/style.css" />',
    () => `<style>${css}</style>`,
  )
  .replace(
    'href="/favicon.svg"',
    `href="data:image/svg+xml;base64,${Buffer.from(favicon).toString("base64")}"`,
  )
  .replace('href="/"', 'href="#"')
  .replace(
    '<script type="module" src="/src/app.js"></script>',
    () => `<script type="module">${script}</script>`,
  );
await writeFile(resolve(root, "dist/jogar.html"), portable);
console.log(
  "Build pronto em dist/ — hospedagem estática ou abra jogar.html diretamente no navegador.",
);
