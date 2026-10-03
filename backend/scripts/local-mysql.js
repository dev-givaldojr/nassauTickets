import { mkdir, readFile, writeFile, access, unlink } from "node:fs/promises";
import { existsSync, createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFileSync, spawn } from "node:child_process";
import mysql from "mysql2/promise";
import { databaseConfig } from "../src/database.js";

const backend = fileURLToPath(new URL("../", import.meta.url));
const local = join(backend, ".mysql");
const version = "8.0.46";
const base = join(local, "runtime", `mysql-${version}-winx64`);
const executable = join(base, "bin", "mysqld.exe");
const ini = join(local, "my.ini");
const data = join(local, "data");
const bootstrap = join(local, "bootstrap.sql");
const marker = join(local, "ready");
const slash = (value) => value.replaceAll("\\", "/");

async function environment() {
  const env = join(backend, ".env");
  if (!existsSync(env)) {
    await writeFile(
      env,
      `DB_HOST=127.0.0.1\nDB_PORT=3307\nDB_NAME=nassau_tickets\nDB_USER=nassau_app\nDB_PASSWORD=${randomBytes(24).toString("hex")}\nMYSQL_ROOT_PASSWORD=${randomBytes(24).toString("hex")}\nSTORAGE=mysql\nPORT=3001\nDEMO_MODE=true\n`,
      { flag: "wx" },
    );
  }
  process.loadEnvFile(env);
  const cfg = databaseConfig();
  if (cfg.host !== "127.0.0.1")
    throw new Error("O instalador local exige DB_HOST=127.0.0.1.");
  if (!Number.isInteger(cfg.port) || cfg.port < 1024 || cfg.port > 65535)
    throw new Error("DB_PORT inválida.");
  if (!/^[a-zA-Z0-9_]+$/.test(cfg.user) || cfg.user === "root")
    throw new Error("Escolha um DB_USER simples, diferente de root.");
  if (
    !cfg.password ||
    !process.env.MYSQL_ROOT_PASSWORD ||
    cfg.password.includes("SUBSTITUA") ||
    process.env.MYSQL_ROOT_PASSWORD.includes("SUBSTITUA")
  ) {
    throw new Error("Configure duas senhas locais no .env antes de continuar.");
  }
  return cfg;
}

async function download() {
  if (existsSync(executable)) return;
  await mkdir(join(local, "runtime"), { recursive: true });
  const zip = join(local, `mysql-${version}.zip`);
  console.log(
    "Baixando MySQL oficial para Windows (aproximadamente 237 MB)...",
  );
  const response = await fetch(
    `https://cdn.mysql.com/Downloads/MySQL-8.0/mysql-${version}-winx64.zip`,
  );
  if (!response.ok) throw new Error(`Download HTTP ${response.status}.`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(zip));
  const hash = createHash("sha256")
    .update(await readFile(zip))
    .digest("hex");
  if (
    hash !== "28e9eda019d88eff4478d811ea2110b83f02a3966be157fe91cc55def3ab0d4d"
  )
    throw new Error("Checksum do arquivo não confere. Extração cancelada.");
  const quote = (value) => "'" + value.replaceAll("'", "''") + "'";
  execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath ${quote(zip)} -DestinationPath ${quote(join(local, "runtime"))} -Force`,
    ],
    { windowsHide: true, stdio: "inherit" },
  );
  await access(executable);
  await unlink(zip);
}

async function prepare(cfg) {
  await mkdir(join(local, "files"), { recursive: true });
  await writeFile(
    ini,
    `[mysqld]\nbasedir="${slash(base)}"\ndatadir="${slash(data)}"\nport=${cfg.port}\nbind-address=127.0.0.1\nmysqlx=0\nlog-error="${slash(join(local, "mysql-error.log"))}"\nsecure-file-priv="${slash(join(local, "files"))}"\ncharacter-set-server=utf8mb4\ncollation-server=utf8mb4_0900_ai_ci\n`,
  );
  if (!existsSync(marker)) {
    const account = `${mysql.escape(cfg.user)}@'localhost'`;
    await writeFile(
      bootstrap,
      [
        `ALTER USER 'root'@'localhost' IDENTIFIED BY ${mysql.escape(process.env.MYSQL_ROOT_PASSWORD)};`,
        `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4;`,
        `CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${mysql.escape(cfg.password)};`,
        `GRANT ALL PRIVILEGES ON \`${cfg.database}\`.* TO ${account};`,
      ].join("\n") + "\n",
    );
  }
}

async function waitReady(cfg) {
  for (let attempt = 0; attempt < 45; attempt++) {
    let connection;
    try {
      connection = await mysql.createConnection(cfg);
      await connection.query("SELECT 1");
      await writeFile(
        marker,
        "Banco local configurado. Não apague a pasta data.\n",
      );
      if (existsSync(bootstrap)) await unlink(bootstrap);
      console.log(
        `MySQL pronto em 127.0.0.1:${cfg.port}. Dados persistidos em backend/.mysql/data.`,
      );
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      if (connection) await connection.end();
    }
  }
  throw new Error(
    "MySQL não respondeu. Confira o arquivo local .mysql/mysql-error.log; ele pode conter uma senha temporária, não o publique.",
  );
}

try {
  if (process.platform !== "win32")
    throw new Error(
      "Este instalador local é para Windows. Em outros sistemas, use um MySQL 8.0 existente ou Docker.",
    );
  const action = process.argv[2] || "start";
  const cfg = await environment();
  if (action === "setup") await download();
  if (["setup", "prepare", "start"].includes(action)) await prepare(cfg);
  if (action === "prepare")
    console.log("Arquivos locais preparados; senhas não exibidas.");
  else if (action === "stop") {
    const connection = await mysql.createConnection({
      ...cfg,
      user: "root",
      password: process.env.MYSQL_ROOT_PASSWORD,
      database: undefined,
    });
    try {
      const [[row]] = await connection.query("SELECT @@datadir AS directory");
      if (resolve(row.directory).toLowerCase() !== resolve(data).toLowerCase())
        throw new Error(
          "O servidor nessa porta não pertence a esta pasta. Parada cancelada.",
        );
      await connection.query("SHUTDOWN");
      console.log("MySQL local encerrado. Dados preservados.");
    } finally {
      await connection.end();
    }
  } else if (action === "check") await waitReady(cfg);
  else if (["setup", "start"].includes(action)) {
    await access(executable).catch(() => {
      throw new Error("Execute npm run db:setup para baixar o MySQL primeiro.");
    });
    // Inicialização segura: MySQL cria uma senha temporária no log; o init-file
    // define as credenciais locais no primeiro início, sem abrir root sem senha.
    if (!existsSync(join(data, "mysql")))
      execFileSync(executable, [`--defaults-file=${ini}`, "--initialize"], {
        windowsHide: true,
        stdio: "ignore",
      });
    let existing;
    try {
      existing = await mysql.createConnection(cfg);
    } catch {}
    if (existing) {
      await existing.end();
      console.log("MySQL já está acessível.");
    } else {
      const args = [`--defaults-file=${ini}`];
      if (existsSync(bootstrap)) args.push(`--init-file=${bootstrap}`);
      const process = spawn(executable, args, {
        detached: true,
        windowsHide: true,
        stdio: "ignore",
      });
      process.on("error", () => {
        console.error("Não foi possível iniciar o executável MySQL.");
      });
      process.unref();
      await waitReady(cfg);
    }
  } else if (action !== "prepare") throw new Error("Ação local inválida.");
} catch (error) {
  console.error(
    error.code
      ? `Operação MySQL local falhou (${error.code}). Confira configuração e logs locais.`
      : error.message,
  );
  process.exitCode = 1;
}
