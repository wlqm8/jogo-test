import { packager } from "@electron/packager";
import { zipSync, strToU8 } from "fflate";
import { createHash } from "node:crypto";
import { readFile, writeFile, cp, mkdir, rm, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const release = join(root, "release");
const staging = join(release, "staging");
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const built = spawnSync(process.execPath, [join(root, "scripts/build.mjs")], {
  stdio: "inherit",
});
if (built.status !== 0) process.exit(built.status ?? 1);
await mkdir(release, { recursive: true });
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await cp(join(root, "desktop"), join(staging, "desktop"), { recursive: true });
await cp(join(root, "dist"), join(staging, "dist"), { recursive: true });
await writeFile(
  join(staging, "package.json"),
  JSON.stringify(
    {
      name: pkg.name,
      productName: "Capim & Cia",
      version: pkg.version,
      main: "desktop/main.mjs",
      type: "module",
      description: pkg.description,
      license: "UNLICENSED",
    },
    null,
    2,
  ),
);

console.log(
  "Preparando aplicativo Windows x64 com o runtime oficial do Electron...",
);
const [appPath] = await packager({
  dir: staging,
  out: release,
  name: "Capim & Cia",
  executableName: "Capim-e-Cia",
  platform: "win32",
  arch: "x64",
  electronVersion: pkg.devDependencies.electron,
  appVersion: pkg.version,
  appCopyright: "Capim & Cia",
  asar: true,
  overwrite: true,
  prune: false,
  icon: join(root, "desktop/icon.ico"),
  download: { cacheRoot: join(root, "node_modules/.cache/electron") },
  win32metadata: {
    CompanyName: "Capim & Cia",
    FileDescription: "Capim & Cia — Jogo de jardinagem 2D",
    ProductName: "Capim & Cia",
  },
});

const instructions = `CAPIM & CIA — WINDOWS\r\n\r\nCOMO JOGAR\r\n1. Extraia TODO o ZIP para uma pasta.\r\n2. Abra Capim-e-Cia.exe com dois cliques.\r\n3. Nao e necessario instalar Node.js, navegador ou usar internet.\r\n\r\nCONTROLES\r\nWASD / setas: andar\r\nSegure Espaco / botao esquerdo do mouse no jardim: cortar\r\nP: pausar\r\nF11: tela cheia\r\nAlt: mostrar o menu do aplicativo\r\nCtrl+S: salvar\r\nF1: ajuda\r\n\r\nRECURSOS\r\n10 foices, 5 niveis da fazenda e rebirth com bonus permanente.\r\nCodigos > MONEY: dinheiro infinito para testes; pode ser desativado.\r\n\r\nSALVAMENTO\r\nO progresso e salvo automaticamente em %APPDATA%\\Capim-e-Cia.\r\nPode mover a pasta do jogo sem perder o progresso neste computador.\r\nO progresso do navegador e separado do aplicativo.\r\n\r\nATALHO\r\nOpcional: execute Criar-atalho.bat para criar um atalho na area de trabalho.\r\nSe mover a pasta depois disso, crie o atalho novamente.\r\n\r\nCOMPATIBILIDADE\r\nWindows 10/11 de 64 bits. Este pacote portatil nao usa instalador.\r\nMantenha o executavel e os demais arquivos juntos.\r\n`;
await writeFile(join(appPath, "LEIA-ME.txt"), instructions, "utf8");
await writeFile(
  join(appPath, "Criar-atalho.bat"),
  `@echo off\r\nsetlocal\r\nset "CAPIM_APP_DIR=%~dp0"\r\npowershell.exe -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([IO.Path]::Combine([Environment]::GetFolderPath('Desktop'),'Capim e Cia.lnk'));$s.TargetPath=[IO.Path]::Combine($env:CAPIM_APP_DIR,'Capim-e-Cia.exe');$s.WorkingDirectory=$env:CAPIM_APP_DIR;$s.IconLocation=$s.TargetPath;$s.Description='Capim e Cia';$s.Save()"\r\nif errorlevel 1 (echo Nao foi possivel criar o atalho.) else (echo Atalho criado na area de trabalho.)\r\npause\r\n`,
  "utf8",
);
const entries = {};
async function collect(path, prefix) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name),
      name = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) await collect(file, name);
    else if (entry.isFile())
      entries[name] = new Uint8Array(await readFile(file));
    else throw new Error(`Arquivo não suportado no pacote: ${name}`);
  }
}
await collect(appPath, "Capim-e-Cia");
entries["COMO-ABRIR.txt"] = strToU8(instructions);
console.log("Compactando o aplicativo portátil...");
const zip = zipSync(entries, { level: 6 });
const zipPath = join(release, "Capim-e-Cia-Windows-x64.zip");
await writeFile(zipPath, zip);
await writeFile(
  zipPath + ".sha256",
  `${createHash("sha256").update(zip).digest("hex")}  Capim-e-Cia-Windows-x64.zip\n`,
);
await rm(staging, { recursive: true, force: true });
console.log(`Pronto: ${zipPath} (${Math.round(zip.length / 1024 / 1024)} MB)`);
