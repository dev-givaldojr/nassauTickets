export class RuleError extends Error {}

export const TYPES = ["SP", "SE", "SG"];
const ACTIVE = ["CHAMADA", "CHAMADA_NOVAMENTE", "EM_ATENDIMENTO"];

export function localTime(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    day: `${parts.year.slice(-2)}${parts.month}${parts.day}`,
    hour: Number(parts.hour),
  };
}

// Protótipo de processo único: as operações são síncronas, sem await entre seleção e reserva.
// Na fase 2, substituir a memória por transações MySQL antes de usar múltiplos servidores.
export class Queue {
  constructor({ demo = true, now = () => new Date() } = {}) {
    this.demo = demo;
    this.now = now;
    this.tickets = [];
    this.calls = [];
    this.lastType = null;
    this.lastDay = null;
  }

  refresh() {
    const time = localTime(this.now());
    if (time.day !== this.lastDay) {
      this.lastType = null;
      this.lastDay = time.day;
    }
    for (const ticket of this.tickets) {
      if (
        ["AGUARDANDO", "CHAMADA", "CHAMADA_NOVAMENTE"].includes(
          ticket.status,
        ) &&
        (ticket.day !== time.day || (!this.demo && time.hour >= 17))
      ) {
        ticket.status = "DESCARTADA";
      }
    }
    return time;
  }

  assertOpen() {
    const time = this.refresh();
    if (!this.demo && (time.hour < 7 || time.hour >= 17)) {
      throw new RuleError(
        "Expediente encerrado. Emissão e chamadas disponíveis das 7h às 17h.",
      );
    }
    return time;
  }

  issue(type) {
    if (!TYPES.includes(type)) throw new RuleError("Tipo de senha inválido.");
    const { day } = this.assertOpen();
    const sequence =
      this.tickets.filter((t) => t.day === day && t.type === type).length + 1;
    if (sequence > 999)
      throw new RuleError("Limite diário de 999 senhas deste tipo atingido.");
    const ticket = {
      id: `${day}-${type}${String(sequence).padStart(3, "0")}`,
      type,
      day,
      status: "AGUARDANDO",
      issuedAt: this.now().toISOString(),
      firstCalledAt: null,
      secondCalledAt: null,
      startedAt: null,
      finishedAt: null,
      desk: null,
    };
    this.tickets.push(ticket);
    return ticket;
  }

  validateDesk(desk) {
    if (![1, 2, 3].includes(desk))
      throw new RuleError("Escolha um guichê entre 1 e 3.");
  }

  callNext(desk) {
    this.validateDesk(desk);
    this.assertOpen();
    if (
      this.tickets.some((t) => t.desk === desk && ACTIVE.includes(t.status))
    ) {
      throw new RuleError(
        "Conclua o atendimento atual antes de chamar outra senha.",
      );
    }
    const waiting = this.tickets.filter((t) => t.status === "AGUARDANDO");
    // Interpretação do diagrama SP → (SE|SG) → SP; SE precede SG no turno não prioritário.
    const order =
      this.lastType === "SP" ? ["SE", "SG", "SP"] : ["SP", "SE", "SG"];
    const ticket = order
      .map((type) => waiting.find((t) => t.type === type))
      .find(Boolean);
    if (!ticket) throw new RuleError("Não há senhas aguardando.");
    ticket.status = "CHAMADA";
    ticket.desk = desk;
    ticket.firstCalledAt = this.now().toISOString();
    this.lastType = ticket.type;
    this.recordCall(ticket, false);
    return ticket;
  }

  recordCall(ticket, repeated) {
    this.calls.unshift({
      id: ticket.id,
      type: ticket.type,
      desk: ticket.desk,
      at: this.now().toISOString(),
      repeated,
    });
    this.calls = this.calls.slice(0, 5);
  }

  action(id, action) {
    this.refresh();
    const ticket = this.tickets.find((t) => t.id === id);
    if (!ticket) throw new RuleError("Senha não encontrada.");
    const transitions = {
      recall: {
        from: ["CHAMADA"],
        to: "CHAMADA_NOVAMENTE",
        field: "secondCalledAt",
      },
      start: {
        from: ["CHAMADA", "CHAMADA_NOVAMENTE"],
        to: "EM_ATENDIMENTO",
        field: "startedAt",
      },
      finish: { from: ["EM_ATENDIMENTO"], to: "ATENDIDA", field: "finishedAt" },
      absent: { from: ["CHAMADA_NOVAMENTE"], to: "NÃO_COMPARECEU" },
    };
    const transition = transitions[action];
    if (!transition || !transition.from.includes(ticket.status))
      throw new RuleError("Ação indisponível neste estado da senha.");
    if (["recall", "start"].includes(action)) this.assertOpen();
    ticket.status = transition.to;
    if (transition.field) ticket[transition.field] = this.now().toISOString();
    if (action === "recall") this.recordCall(ticket, true);
    return ticket;
  }

  snapshot() {
    const { day } = this.refresh();
    return {
      demo: this.demo,
      storage: "memory",
      tickets: this.tickets.filter(
        (t) => t.day === day || t.status === "EM_ATENDIMENTO",
      ),
      calls: this.calls.filter((c) => c.id.startsWith(day)),
    };
  }
}
