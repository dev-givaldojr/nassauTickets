import { readFile } from "node:fs/promises";
import { createPool } from "../src/database.js";

const pool = createPool();
try {
  const sql = await readFile(
    new URL("../sql/001_initial.sql", import.meta.url),
    "utf8",
  );
  // DDL pode fazer commit implícito; os comandos são idempotentes para permitir retomada.
  for (const statement of sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)) {
    await pool.query(statement);
  }
  console.log(
    "Tabelas do nassauTickets preparadas. Dados existentes preservados.",
  );
} catch (error) {
  console.error(
    `Não foi possível preparar o banco (${error.code || "erro"}). Confira .env e o servidor MySQL.`,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
