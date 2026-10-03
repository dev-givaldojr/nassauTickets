import test from "node:test";
import assert from "node:assert/strict";
import { Queue, localTime } from "../src/queue.js";

const morning = () => new Date("2026-10-02T10:00:00Z");
function queue(options = {}) {
  return new Queue({ now: morning, ...options });
}
function complete(q, desk = 1) {
  const ticket = q.callNext(desk);
  q.action(ticket.id, "start");
  q.action(ticket.id, "finish");
  return ticket;
}

test("sequências independentes por tipo e dia, conforme horário de Brasília", () => {
  let date = morning();
  const q = queue({ now: () => date });
  assert.equal(q.issue("SP").id, "261002-SP001");
  assert.equal(q.issue("SP").id, "261002-SP002");
  assert.equal(q.issue("SG").id, "261002-SG001");
  date = new Date("2026-10-03T02:59:00Z");
  assert.equal(q.issue("SP").id, "261002-SP003");
  date = new Date("2026-10-03T03:00:00Z");
  assert.equal(q.issue("SP").id, "261003-SP001");
  assert.equal(q.tickets[0].status, "DESCARTADA");
});

test("aplica alternância SP, SE, SP, SG e FIFO por tipo", () => {
  const q = queue();
  const sg = q.issue("SG");
  const sp1 = q.issue("SP");
  const sp2 = q.issue("SP");
  const se = q.issue("SE");
  assert.deepEqual(
    [complete(q).id, complete(q).id, complete(q).id, complete(q).id],
    [sp1.id, se.id, sp2.id, sg.id],
  );
});

test("permite atendimento consecutivo quando só existe uma fila", () => {
  const q = queue();
  q.issue("SG");
  q.issue("SG");
  assert.equal(complete(q).type, "SG");
  assert.equal(complete(q).type, "SG");
  assert.throws(() => q.callNext(1), /Não há senhas/);
});

test("nova SP emitida antes da chamada muda a escolha", () => {
  const q = queue();
  q.issue("SG");
  q.issue("SP");
  assert.equal(q.callNext(1).type, "SP");
});

test("reserva senhas distintas em guichês diferentes e bloqueia guichê ocupado", () => {
  const q = queue();
  q.issue("SP");
  q.issue("SE");
  const a = q.callNext(1);
  assert.throws(() => q.callNext(1), /Conclua o atendimento/);
  const b = q.callNext(2);
  assert.notEqual(a.id, b.id);
  assert.equal(a.desk, 1);
  assert.equal(b.desk, 2);
});

test("ausência exige duas chamadas; não há terceira chamada", () => {
  const q = queue();
  q.issue("SP");
  const t = q.callNext(1);
  assert.throws(() => q.action(t.id, "absent"), /indisponível/);
  q.action(t.id, "recall");
  assert.equal(t.secondCalledAt, morning().toISOString());
  assert.throws(() => q.action(t.id, "recall"), /indisponível/);
  q.action(t.id, "absent");
  assert.equal(t.status, "NÃO_COMPARECEU");
  assert.equal(t.startedAt, null);
  q.issue("SG");
  assert.equal(q.callNext(1).type, "SG");
});

test("não permite finalizar antes de iniciar nem repetir finalização", () => {
  const q = queue();
  q.issue("SP");
  const t = q.callNext(1);
  assert.throws(() => q.action(t.id, "finish"), /indisponível/);
  q.action(t.id, "start");
  q.action(t.id, "finish");
  assert.equal(t.status, "ATENDIDA");
  assert.ok(t.startedAt && t.finishedAt);
  assert.throws(() => q.action(t.id, "finish"), /indisponível/);
});

test("cliente pode ser atendido após a segunda chamada", () => {
  const q = queue();
  q.issue("SE");
  const t = q.callNext(2);
  q.action(t.id, "recall");
  q.action(t.id, "start");
  q.action(t.id, "finish");
  assert.equal(t.status, "ATENDIDA");
});

test("painel guarda somente cinco eventos chamados, incluindo repetição", () => {
  const q = queue();
  for (let i = 0; i < 6; i++) {
    q.issue("SG");
    complete(q);
  }
  q.issue("SP");
  assert.equal(q.snapshot().calls.length, 5);
  assert.equal(q.snapshot().calls[0].id, "261002-SG006");
  assert.ok(!q.snapshot().calls.some((c) => c.type === "SP"));
  const t = q.callNext(1);
  q.action(t.id, "recall");
  assert.equal(q.snapshot().calls[0].repeated, true);
});

test("expediente bloqueia antes das 7h e permite exatamente às 7h", () => {
  let date = new Date("2026-10-02T09:59:59Z");
  const q = queue({ demo: false, now: () => date });
  assert.throws(() => q.issue("SP"), /Expediente encerrado/);
  date = morning();
  assert.equal(q.issue("SP").status, "AGUARDANDO");
  assert.equal(localTime(date).hour, 7);
});

test("17h descarta pendências e conserva atendimento iniciado para finalização", () => {
  let date = new Date("2026-10-02T19:59:00Z");
  const q = queue({ demo: false, now: () => date });
  q.issue("SP");
  q.issue("SE");
  q.issue("SG");
  const started = q.callNext(1);
  q.action(started.id, "start");
  const called = q.callNext(2);
  date = new Date("2026-10-02T20:00:00Z");
  assert.throws(() => q.issue("SP"), /Expediente encerrado/);
  assert.throws(() => q.callNext(3), /Expediente encerrado/);
  assert.equal(called.status, "DESCARTADA");
  assert.equal(q.tickets.find((t) => t.type === "SG").status, "DESCARTADA");
  q.action(started.id, "finish");
  assert.equal(started.status, "ATENDIDA");
});

test("demonstração funciona fora do expediente e não descarta aleatoriamente", () => {
  const q = queue({ now: () => new Date("2026-10-03T01:00:00Z") });
  for (let i = 0; i < 100; i++) q.issue("SG");
  assert.equal(
    q.snapshot().tickets.filter((t) => t.status === "AGUARDANDO").length,
    100,
  );
  assert.equal(complete(q).status, "ATENDIDA");
});

test("valida tipos, guichês, IDs, ações e limite de três dígitos", () => {
  const q = queue();
  assert.throws(() => q.issue("XX"), /inválido/);
  assert.throws(() => q.callNext("1"), /guichê/);
  assert.throws(() => q.callNext(4), /guichê/);
  assert.throws(() => q.action("inexistente", "start"), /não encontrada/);
  const t = q.issue("SG");
  assert.throws(() => q.action(t.id, "invalid"), /indisponível/);
  for (let i = 1; i < 999; i++) q.issue("SG");
  assert.equal(q.tickets.at(-1).id, "261002-SG999");
  assert.throws(() => q.issue("SG"), /Limite diário/);
});
