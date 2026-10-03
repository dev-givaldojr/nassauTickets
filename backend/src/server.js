import { createApp } from "./app.js";
import { Queue } from "./queue.js";
import { MysqlQueue } from "./mysql-queue.js";
import { createPool } from "./database.js";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Também funciona ao iniciar diretamente pelo VS Code ou por um watcher antigo.
const envFile = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envFile)) process.loadEnvFile(envFile);

const demo = process.env.DEMO_MODE !== "false";
const storage = process.env.STORAGE || "mysql";
if (!["mysql", "memory"].includes(storage))
  throw new Error("STORAGE deve ser mysql ou memory.");
const pool = storage === "mysql" ? createPool() : null;
const queue = pool ? new MysqlQueue(pool, { demo }) : new Queue({ demo });
const port = Number(process.env.PORT || 3001);
const server = createApp(queue).listen(port, "127.0.0.1", () => {
  console.log(
    `nassauTickets: http://127.0.0.1:${port} | armazenamento: ${storage} | demonstração: ${demo}`,
  );
  console.log("Uso local. Login ainda não implementado.");
});

function stop() {
  server.close(async () => {
    if (pool) await pool.end();
  });
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
