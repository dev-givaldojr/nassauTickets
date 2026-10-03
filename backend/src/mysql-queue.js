import { Queue, RuleError, localTime } from "./queue.js";

const dateToSQL = (value) =>
  value ? value.replace("T", " ").replace("Z", "") : null;
const dateToISO = (value) => (value ? value.replace(" ", "T") + "Z" : null);
const fields = ["firstCalledAt", "secondCalledAt", "startedAt", "finishedAt"];

function fromRow(row) {
  return {
    id: row.id,
    day: row.day,
    type: row.type,
    status: row.status,
    desk: row.desk,
    issuedAt: dateToISO(row.issued_at),
    firstCalledAt: dateToISO(row.first_called_at),
    secondCalledAt: dateToISO(row.second_called_at),
    startedAt: dateToISO(row.started_at),
    finishedAt: dateToISO(row.finished_at),
  };
}

// Reutiliza as regras testadas em Queue. O banco controla a concorrência:
// todo acesso à fila bloqueia a mesma linha até commit/rollback.
export class MysqlQueue {
  constructor(pool, { demo = true, now = () => new Date() } = {}) {
    this.pool = pool;
    this.demo = demo;
    this.now = now;
  }

  async health() {
    // Confere conexão e instalação do schema, não apenas o processo HTTP.
    const [rows] = await this.pool.execute(
      "SELECT id FROM queue_control WHERE id = 1",
    );
    if (rows.length !== 1) throw new Error("Schema não inicializado.");
    await this.pool.execute("SELECT id FROM tickets LIMIT 0");
    await this.pool.execute("SELECT event_id FROM calls LIMIT 0");
    return { storage: "mysql" };
  }

  issue(type) {
    return this.run("issue", type);
  }
  callNext(desk) {
    return this.run("callNext", desk);
  }
  action(id, action) {
    return this.run("action", id, action);
  }
  snapshot() {
    return this.run("snapshot");
  }

  async run(method, ...args) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[control]] = await connection.execute(
        "SELECT * FROM queue_control WHERE id = 1 FOR UPDATE",
      );
      if (!control)
        throw new Error("Execute npm run db:init antes de iniciar.");
      const now = this.now();
      const { day } = localTime(now);
      const [rows] = await connection.execute(
        `SELECT * FROM tickets WHERE day = ?
         OR status IN ('AGUARDANDO','CHAMADA','CHAMADA_NOVAMENTE','EM_ATENDIMENTO')
         ORDER BY issued_at, sequence_number, id`,
        [day],
      );
      const [calls] = await connection.execute(
        `SELECT c.*, t.type FROM calls c JOIN tickets t ON t.id = c.ticket_id
         WHERE t.day = ? ORDER BY c.event_id DESC LIMIT 5`,
        [day],
      );
      const queue = new Queue({ demo: this.demo, now: () => now });
      queue.lastDay = control.last_day;
      queue.lastType = control.last_type;
      queue.tickets = rows.map(fromRow);
      queue.calls = calls.map((c) => ({
        id: c.ticket_id,
        type: c.type,
        desk: c.desk,
        at: dateToISO(c.called_at),
        repeated: Boolean(c.repeated),
      }));
      const previous = new Map(
        queue.tickets.map((t) => [t.id, JSON.stringify(t)]),
      );
      // Persistir o descarte de fechamento mesmo se uma nova emissão for recusada.
      queue.refresh();
      const refreshed = structuredClone(queue.tickets);
      const refreshedDay = queue.lastDay;
      const refreshedType = queue.lastType;
      let result, ruleError;
      try {
        result = queue[method](...args);
      } catch (error) {
        if (!(error instanceof RuleError)) throw error;
        ruleError = error;
        queue.tickets = refreshed;
        queue.lastDay = refreshedDay;
        queue.lastType = refreshedType;
      }
      // Atualizações primeiro: libera guichês descartados antes de novas reservas.
      for (const ticket of queue.tickets.filter((t) => previous.has(t.id))) {
        if (previous.get(ticket.id) === JSON.stringify(ticket)) continue;
        await connection.execute(
          `UPDATE tickets SET status=?, desk=?, first_called_at=?, second_called_at=?, started_at=?, finished_at=? WHERE id=?`,
          [
            ticket.status,
            ticket.desk,
            ...fields.map((f) => dateToSQL(ticket[f])),
            ticket.id,
          ],
        );
      }
      for (const ticket of queue.tickets.filter((t) => !previous.has(t.id))) {
        await connection.execute(
          `INSERT INTO tickets (id,day,type,sequence_number,status,issued_at) VALUES (?,?,?,?,?,?)`,
          [
            ticket.id,
            ticket.day,
            ticket.type,
            Number(ticket.id.slice(-3)),
            ticket.status,
            dateToSQL(ticket.issuedAt),
          ],
        );
      }
      if (
        !ruleError &&
        (method === "callNext" || (method === "action" && args[1] === "recall"))
      ) {
        const call = queue.calls[0];
        await connection.execute(
          "INSERT INTO calls (ticket_id,desk,called_at,repeated) VALUES (?,?,?,?)",
          [call.id, call.desk, dateToSQL(call.at), call.repeated],
        );
      }
      if (
        queue.lastDay !== control.last_day ||
        queue.lastType !== control.last_type
      ) {
        await connection.execute(
          "UPDATE queue_control SET last_day=?, last_type=? WHERE id=1",
          [queue.lastDay, queue.lastType],
        );
      }
      await connection.commit();
      if (ruleError) throw ruleError;
      return method === "snapshot" ? { ...result, storage: "mysql" } : result;
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    } finally {
      connection.release();
    }
  }
}
