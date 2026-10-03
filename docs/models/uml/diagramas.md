# Diagramas iniciais

Os blocos Mermaid podem ser visualizados no GitHub. Para a fase 2, atualizar os diagramas junto das alterações do código.

## Máquina de estados

```mermaid
stateDiagram-v2
    [*] --> EMITIDA: emissão válida
    EMITIDA --> AGUARDANDO: inserir na fila
    AGUARDANDO --> CHAMADA: AA chama próxima
    CHAMADA --> CHAMADA_NOVAMENTE: segunda chamada
    CHAMADA --> EM_ATENDIMENTO: cliente comparece
    CHAMADA_NOVAMENTE --> EM_ATENDIMENTO: cliente comparece
    CHAMADA_NOVAMENTE --> NAO_COMPARECEU: AA confirma ausência
    EM_ATENDIMENTO --> ATENDIDA: AA finaliza
    AGUARDANDO --> DESCARTADA: fim do expediente
    CHAMADA --> DESCARTADA: fim do expediente sem início
    CHAMADA_NOVAMENTE --> DESCARTADA: fim do expediente sem início
    ATENDIDA --> [*]
    NAO_COMPARECEU --> [*]
    DESCARTADA --> [*]
```

NAO_COMPARECEU corresponde ao valor `NÃO_COMPARECEU` da implementação. EMITIDA é um estado conceitual transitório; a criação já retorna AGUARDANDO. A segunda chamada é opcional quando o cliente chega na primeira.

## Sequência de chamada

```mermaid
sequenceDiagram
    actor AA as Atendente
    participant UI as React
    participant API as Express
    participant F as Serviço de fila
    participant P as Painel
    AA->>UI: Chamar próxima senha
    UI->>API: POST /api/calls (guichê)
    API->>F: validar horário e guichê
    F->>F: selecionar por prioridade e reservar
    F-->>API: senha com estado CHAMADA
    API-->>UI: HTTP 200 + senha
    loop A cada 2 segundos
        P->>API: GET /api/state
        API-->>P: últimas 5 chamadas
    end
    AA->>UI: Iniciar atendimento
    UI->>API: POST /api/tickets/:id/start
    API->>F: registrar início
    AA->>UI: Finalizar atendimento
    UI->>API: POST /api/tickets/:id/finish
    API->>F: registrar fim e liberar guichê
```

Na versão persistente, a reserva e o registro devem ocorrer em uma transação do banco. Login e autorização serão adicionados antes das operações do AA.
