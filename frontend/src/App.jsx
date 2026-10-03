import React, { useEffect, useState } from "react";
import TicketCard, { labels } from "./components/TicketCard.jsx";
import { request } from "./services/api.js";

const activeStates = ["CHAMADA", "CHAMADA_NOVAMENTE", "EM_ATENDIMENTO"];
const tabs = ["Totem", "Atendente", "Painel"];
export default function App() {
  const [tab, setTab] = useState("Totem");
  const [state, setState] = useState({ tickets: [], calls: [], demo: true });
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [desk, setDesk] = useState(1);
  useEffect(() => {
    let cancelled = false;
    let timer;
    async function poll() {
      try {
        const data = await request("/state");
        if (!cancelled) {
          setState(data);
          setConnected(true);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
      if (!cancelled) timer = setTimeout(poll, 2000);
    }
    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  async function act(path, body, issued = false) {
    setBusy(true);
    setMessage("");
    try {
      const ticket = await request(path, body);
      if (issued) setReceipt(ticket);
      try {
        setState(await request("/state"));
        setConnected(true);
      } catch {
        setConnected(false);
        setMessage(
          "Ação registrada. Aguardando reconexão para atualizar a tela.",
        );
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  const waiting = state.tickets.filter((t) => t.status === "AGUARDANDO");
  const current = state.tickets.find(
    (t) => t.desk === desk && activeStates.includes(t.status),
  );
  const disabled = busy || !connected;
  const latest = state.calls[0];
  return (
    <div className="app-shell">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("Totem");
          }}
        >
          <span className="brand-icon">n.</span>
          <span>
            nassau<strong>Tickets</strong>
            <small>CONTROLE DE ATENDIMENTO</small>
          </span>
        </a>
        <div className="nav-label">ÁREA DE TRABALHO</div>
        <nav aria-label="Áreas do sistema">
          {tabs.map((name, i) => (
            <button
              key={name}
              aria-current={tab === name ? "page" : undefined}
              className={tab === name ? "selected" : ""}
              onClick={() => setTab(name)}
            >
              <span>0{i + 1}</span>
              {name}
              <b>↗</b>
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" />
          Laboratório de análises clínicas
          <p>Um atendimento mais organizado, do início ao fim.</p>
        </div>
        <footer>
          PROJETO ACADÊMICO <span>Fase 01</span>
        </footer>
      </aside>
      <main>
        <header>
          <span>
            Laboratório <span className="slash">/</span> {tab}
          </span>
          <span className={`connection ${connected ? "" : "offline"}`}>
            {connected ? "● Sistema conectado" : "● Sem conexão"}
          </span>
        </header>
        <div className="content">
          <div className="notice">
            {state.demo
              ? "Demonstração • disponível a qualquer horário"
              : "Expediente • 07h às 17h (Brasília)"}
            <span>
              {connected
                ? state.storage === "mysql"
                  ? "Dados salvos no MySQL"
                  : "Dados temporários"
                : "Aguardando conexão"}{" "}
              · sem login
            </span>
          </div>
          {!connected && (
            <div role="alert" className="error">
              Sem comunicação com o servidor. As ações estão bloqueadas e os
              dados podem estar desatualizados. Inicie o backend para continuar.
            </div>
          )}
          {message && (
            <div role="alert" className="error">
              {message}
            </div>
          )}
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {tab === "Totem"
                  ? "BEM-VINDO AO LABORATÓRIO"
                  : tab === "Atendente"
                    ? "ESPAÇO DO ATENDENTE"
                    : "ACOMPANHE SUA CHAMADA"}
              </p>
              <h1>
                {tab === "Totem"
                  ? "Seu atendimento começa aqui."
                  : tab === "Atendente"
                    ? "Pronto para atender."
                    : "É a sua vez."}
              </h1>
              <p>
                {tab === "Totem"
                  ? "Escolha o serviço, retire sua senha e acompanhe o painel."
                  : tab === "Atendente"
                    ? "Gerencie as chamadas e cada etapa do atendimento."
                    : "Ao ouvir ou visualizar sua senha, dirija-se ao guichê indicado."}
              </p>
            </div>
            <span className="heading-symbol" aria-hidden="true">
              ✳
            </span>
          </div>
          {tab === "Totem" && (
            <>
              <div className="section-title">
                <h2>Qual atendimento você precisa?</h2>
                <span>3 tipos de serviço</span>
              </div>
              <div className="ticket-grid">
                {["SP", "SE", "SG"].map((type) => (
                  <TicketCard
                    key={type}
                    type={type}
                    count={waiting.filter((t) => t.type === type).length}
                    disabled={disabled}
                    onIssue={(type) => act("/tickets", { type }, true)}
                  />
                ))}
              </div>
              {receipt && (
                <div className="receipt" role="status">
                  <div>
                    <small>SUA SENHA</small>
                    <strong>{receipt.id}</strong>
                    <span>
                      {labels[receipt.type]} · Aguarde a chamada no painel.
                    </span>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => setReceipt(null)}
                  >
                    Concluir
                  </button>
                </div>
              )}
              <div className="guide">
                <span className="guide-number">01</span>
                <div>
                  <h3>Retire sua senha</h3>
                  <p>Selecione uma das opções acima.</p>
                </div>
                <span className="guide-number">02</span>
                <div>
                  <h3>Acompanhe o painel</h3>
                  <p>A chamada informará o seu guichê.</p>
                </div>
              </div>
            </>
          )}
          {tab === "Atendente" && (
            <section className="work-card">
              <label className="desk-label">
                Seu guichê
                <select
                  value={desk}
                  disabled={busy}
                  onChange={(e) => setDesk(Number(e.target.value))}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      Guichê {String(n).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </label>
              {current ? (
                <>
                  <p className="eyebrow">
                    {current.status.replaceAll("_", " ")}
                  </p>
                  <h2 className="current-ticket">{current.id}</h2>
                  <p>{labels[current.type]}</p>
                  <div className="actions">
                    {current.status === "CHAMADA" && (
                      <button
                        className="secondary"
                        disabled={disabled}
                        onClick={() => act(`/tickets/${current.id}/recall`, {})}
                      >
                        Chamar novamente
                      </button>
                    )}
                    {["CHAMADA", "CHAMADA_NOVAMENTE"].includes(
                      current.status,
                    ) && (
                      <button
                        disabled={disabled}
                        onClick={() => act(`/tickets/${current.id}/start`, {})}
                      >
                        Iniciar atendimento
                      </button>
                    )}
                    {current.status === "CHAMADA_NOVAMENTE" && (
                      <button
                        className="secondary"
                        disabled={disabled}
                        onClick={() => act(`/tickets/${current.id}/absent`, {})}
                      >
                        Não compareceu
                      </button>
                    )}
                    {current.status === "EM_ATENDIMENTO" && (
                      <button
                        disabled={disabled}
                        onClick={() => act(`/tickets/${current.id}/finish`, {})}
                      >
                        Finalizar atendimento
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <h2>Guichê disponível</h2>
                  <p>
                    {waiting.length} senha(s) aguardando. A prioridade será
                    definida ao chamar.
                  </p>
                  <button
                    disabled={disabled || !waiting.length}
                    onClick={() => act("/calls", { desk })}
                  >
                    Chamar próxima senha →
                  </button>
                </>
              )}
            </section>
          )}
          {tab === "Painel" && (
            <>
              <section className="panel-current">
                <p>{latest?.repeated ? "ÚLTIMA CHAMADA" : "SENHA CHAMADA"}</p>
                <h2>{latest?.id || "Aguardando chamada"}</h2>
                <span>
                  {latest
                    ? `Guichê ${String(latest.desk).padStart(2, "0")}`
                    : "As chamadas aparecerão aqui."}
                </span>
              </section>
              <h2 className="history-title">Últimas 5 chamadas</h2>
              <div className="history">
                {state.calls.length ? (
                  state.calls.map((call, i) => (
                    <div key={`${call.id}-${i}`}>
                      <strong>{call.id}</strong>
                      <span>Guichê {call.desk}</span>
                      <small>
                        {new Date(call.at).toLocaleTimeString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}
                        {call.repeated ? " · Última chamada" : ""}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>Nenhuma senha chamada hoje.</p>
                )}
              </div>
            </>
          )}
          <div className="bottom-note">
            <span>nassauTickets / versão inicial</span>
            <span>Atendimento com organização e cuidado.</span>
          </div>
        </div>
      </main>
    </div>
  );
}
