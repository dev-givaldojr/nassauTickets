import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { databaseConfig } from "../src/database.js";
import { MysqlQueue } from "../src/mysql-queue.js";

test(
  "MySQL real: persistência, concorrência, estados, rollback e mudança de dia",
  { skip: process.env.RUN_MYSQL_TESTS !== "1" },
  async () => {
    const database = `nassau_test_${Date.now()}`;
    const config = {
      ...databaseConfig(),
      user: "root",
      password: process.env.MYSQL_ROOT_PASSWORD,
      database: undefined,
    };
    assert.ok(
      config.password,
      "Configure MYSQL_ROOT_PASSWORD para testes em banco isolado.",
    );
    const admin = await mysql.createConnection(config);
    let pool, otherPool;
    try {
      await admin.query(
        `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4`,
      );
      pool = mysql.createPool({ ...config, database });
      const sql = await readFile(
        new URL("../sql/001_initial.sql", import.meta.url),
        "utf8",
      );
      for (let i = 0; i < 2; i++) {
        for (const statement of sql
          .split(";")
          .map((s) => s.trim())
          .filter(Boolean))
          await pool.query(statement);
      }
      let date = new Date("2026-10-02T13:00:00.000Z");
      const options = { now: () => date, demo: false };
      let q = new MysqlQueue(pool, options);
      const issued = await Promise.all(
        Array.from({ length: 12 }, () => q.issue("SP")),
      );
      assert.equal(
        new Set(issued.map((t) => t.id)).size,
        12,
        "emissões paralelas não duplicam sequência",
      );
      await q.issue("SE");
      await q.issue("SG");
      await pool.end(); // Conexão realmente fechada; novo pool não tem estado em memória.
      pool = mysql.createPool({ ...config, database });
      q = new MysqlQueue(pool, options);
      assert.equal((await q.snapshot()).tickets.length, 14);
      assert.equal((await q.issue("SP")).id, "261002-SP013");
      otherPool = mysql.createPool({ ...config, database });
      const other = new MysqlQueue(otherPool, options);
      const calls = await Promise.all([q.callNext(1), other.callNext(2)]);
      assert.equal(new Set(calls.map((t) => t.id)).size, 2);
      assert.deepEqual(
        new Set(calls.map((t) => t.type)),
        new Set(["SP", "SE"]),
      );
      await assert.rejects(q.callNext(1), /Conclua/);
      await assert.rejects(q.action(calls[0].id, "finish"), /indisponível/);
      assert.equal(
        (await q.snapshot()).calls.length,
        2,
        "operação recusada não grava chamada",
      );
      await q.action(calls[0].id, "recall");
      await q.action(calls[0].id, "absent");
      const oneDesk = await Promise.allSettled([
        q.callNext(1),
        other.callNext(1),
      ]);
      assert.equal(oneDesk.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(oneDesk.filter((r) => r.status === "rejected").length, 1);
      const started = await q.action(calls[1].id, "start");
      date = new Date("2026-10-02T20:00:00.000Z");
      await assert.rejects(q.issue("SG"), /Expediente encerrado/);
      const [[pending]] = await pool.query(
        "SELECT COUNT(*) AS count FROM tickets WHERE status IN ('AGUARDANDO','CHAMADA','CHAMADA_NOVAMENTE')",
      );
      assert.equal(
        pending.count,
        0,
        "fechamento persiste mesmo quando a emissão é recusada",
      );
      await q.action(started.id, "finish");
      date = new Date("2026-10-03T10:00:00.000Z");
      assert.equal((await q.issue("SP")).id, "261003-SP001");
      assert.equal((await q.snapshot()).calls.length, 0);
      const [[history]] = await pool.query(
        "SELECT COUNT(*) AS count FROM tickets WHERE day='261002'",
      );
      assert.equal(history.count, 15, "histórico anterior continua salvo");
      assert.equal((await q.health()).storage, "mysql");
    } finally {
      if (pool) await pool.end();
      if (otherPool) await otherPool.end();
      // Somente o banco temporário criado neste teste é removido.
      if (!/^nassau_test_\d+$/.test(database))
        throw new Error("Nome de banco de teste inválido.");
      await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
      await admin.end();
    }
  },
);
