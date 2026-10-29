import { mkdir, cp, rm, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { zipSync, strToU8 } from "fflate";
import { createHash } from "node:crypto";
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
  ...["farming", "loot", "model", "game", "app"].map((name) =>
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
const webZip = zipSync(
  {
    "Capim-e-Cia.html": strToU8(portable),
    "LEIA-ME.txt": strToU8(
      "CAPIM & CIA - EDICAO LEVE DE NAVEGADOR\n\nExtraia o ZIP e abra Capim-e-Cia.html no Chrome ou Edge do computador. A previa da conversa nao executa o jogo.\n\nWASD/setas: mover. 1: colher/defender. 2: plantar. 3: regar. 4: reparar. Segure Espaco para usar a acao. R perto do poco: pegar agua. P: pausar.\n\nOuro compra sementes e melhorias; diamantes compram caixas. MONEY ativa recursos infinitos para testes.\n\nO progresso fica neste navegador quando o armazenamento esta disponivel.\n",
    ),
  },
  { level: 6 },
);
await writeFile(resolve(root, "dist/Capim-e-Cia-Navegador.zip"), webZip);
await writeFile(
  resolve(root, "dist/Capim-e-Cia-Navegador.zip.sha256"),
  `${createHash("sha256").update(webZip).digest("hex")}  Capim-e-Cia-Navegador.zip\n`,
);
console.log(
  "Build pronto em dist/ — hospedagem estática ou abra jogar.html diretamente no navegador.",
);
