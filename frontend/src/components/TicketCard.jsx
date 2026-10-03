import React from "react";
export const labels = {
  SP: "Atendimento prioritário",
  SE: "Retirada de exames",
  SG: "Atendimento geral",
};
export default function TicketCard({ type, count, disabled, onIssue }) {
  return (
    <button
      className={`ticket-card ${type.toLowerCase()}`}
      disabled={disabled}
      onClick={() => onIssue(type)}
    >
      <span className="type-tag">{type}</span>
      <h3>{labels[type]}</h3>
      <p>
        {type === "SP"
          ? "Para quem tem direito à prioridade."
          : type === "SE"
            ? "Receba os resultados dos seus exames."
            : "Solicite seu atendimento no laboratório."}
      </p>
      <span className="card-bottom">
        <span>{count} na fila</span>
        <strong>Emitir senha ↗</strong>
      </span>
    </button>
  );
}
