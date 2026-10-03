import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { Queue } from "../src/queue.js";

test("falha assíncrona do banco retorna 503 sem expor credenciais e permite recuperação", async () => {
  let offline = true;
  const queue = {
    async health() {
      if (offline) throw new Error("password=segredo SQL interno");
      return { storage: "mysql" };
    },
    async snapshot() {
      if (offline) throw new Error("password=segredo SQL interno");
      return { tickets: [], calls: [], storage: "mysql", demo: true };
    },
  };
  const server = createApp(queue).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    for (const path of ["/state", "/health"]) {
      const result = await fetch(base + path);
      assert.equal(result.status, 503);
      assert.ok(!(await result.text()).includes("segredo"));
    }
    offline = false;
    assert.equal((await fetch(base + "/state")).status, 200);
    assert.equal(
      (await (await fetch(base + "/health")).json()).storage,
      "mysql",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("API integra emissão, concorrência de chamadas, erros e conclusão", async () => {
  const app = createApp(
    new Queue({ now: () => new Date("2026-10-02T13:00:00Z") }),
  );
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const post = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  try {
    for (const type of ["SP", "SE", "SG"])
      assert.equal((await post("/tickets", { type })).status, 201);
    const responses = await Promise.all([
      post("/calls", { desk: 1 }),
      post("/calls", { desk: 2 }),
    ]);
    assert.ok(responses.every((r) => r.status === 200));
    const tickets = await Promise.all(responses.map((r) => r.json()));
    assert.equal(new Set(tickets.map((t) => t.id)).size, 2);
    assert.equal((await post("/calls", { desk: 1 })).status, 400);
    assert.equal((await post("/tickets", { type: "INVALID" })).status, 400);
    assert.equal(
      (await post(`/tickets/${tickets[0].id}/start`, {})).status,
      200,
    );
    assert.equal(
      (await post(`/tickets/${tickets[0].id}/finish`, {})).status,
      200,
    );
    const state = await (await fetch(base + "/state")).json();
    assert.equal(state.calls.length, 2);
    assert.equal(
      state.tickets.filter((t) => t.status === "ATENDIDA").length,
      1,
    );
    const badJson = await fetch(base + "/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{",
    });
    assert.equal(badJson.status, 400);
    assert.equal((await fetch(base + "/health")).status, 200);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
