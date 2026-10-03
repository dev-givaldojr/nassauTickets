# Arquitetura e decisões da base

O armazenamento padrão é MySQL. Veja o [guia MySQL](../MYSQL.md) para configuração, tabelas e Workbench.

## Separação de responsabilidades

- `frontend/src/App.jsx`: navegação entre totem, atendente e painel; estado da interface e consultas.
- `frontend/src/components/TicketCard.jsx`: cartão reutilizável que recebe tipo, contador e callback por props.
- `frontend/src/services/api.js`: transporte HTTP/JSON, limite de espera e tratamento de erros.
- `backend/src/app.js`: rotas REST e validação básica de requisições.
- `backend/src/queue.js`: fila, numeração, expediente, priorização e transições.
- `backend/src/server.js`: inicialização do servidor local.
- `backend/src/database.js`: configuração e pool MySQL.
- `backend/src/mysql-queue.js`: persistência e transações, reutilizando as regras de queue.js.
- `backend/sql/001_initial.sql`: criação idempotente das tabelas.

## Contrato HTTP inicial

| Método | Rota | Corpo JSON | Resultado |
| --- | --- | --- | --- |
| GET | /api/health | - | Conexão MySQL e schema |
| GET | /api/state | - | Tickets do dia, serviços em andamento e últimas chamadas |
| POST | /api/tickets | `{"type":"SP"}` | Senha criada, HTTP 201 |
| POST | /api/calls | `{"desk":1}` | Próxima senha reservada |
| POST | /api/tickets/:id/recall | `{}` | Segunda chamada |
| POST | /api/tickets/:id/start | `{}` | Atendimento iniciado |
| POST | /api/tickets/:id/finish | `{}` | Atendimento concluído |
| POST | /api/tickets/:id/absent | `{}` | Ausência confirmada |

Falhas de banco retornam HTTP 503 sem expor detalhes SQL. Falhas de validação/regra retornam HTTP 400 com `{"message":"..."}`. Esta API não tem autenticação e só deve rodar localmente. A fase 2 precisará separar dados públicos do painel de dados privados do atendente/gestor.

## Concorrência e idempotência

Cada operação MySQL inicia uma transação e bloqueia a linha única de queue_control com SELECT FOR UPDATE. Só depois lê a fila e aplica as regras. A transação salva estados, prioridade e eventos de chamada antes do commit; falhas de gravação provocam rollback. As restrições SQL reforçam sequência diária única e um serviço ativo por guichê. Todas as instâncias devem usar esse mesmo protocolo e a mesma configuração de expediente.

A implementação carrega registros do dia e pendências, e salva apenas os alterados. O histórico anterior não é carregado nem apagado. A serialização facilita a correção desta aplicação acadêmica, mas testes de carga ainda são necessários. Chaves de idempotência para perdas de conexão após confirmação de uma operação continuam pendentes. O modo memory existe apenas como opção explícita e nos testes; nunca é ativado automaticamente quando o banco falha.

## Persistência e horário

Datas dos eventos são gravadas como ISO UTC. O dia da senha e o expediente são calculados no fuso America/Sao_Paulo. A API não aceita o relógio do navegador para essas regras. Mudar de dia descarta pendências do dia anterior, preservando serviços já iniciados. Com MySQL, reiniciar o backend preserva o histórico e os contadores. O fechamento é persistido na próxima operação/consulta após as 17h. Os dados da antiga sessão em memória não são importados automaticamente.

## Decisões que precisam de validação

1. Prioridade: seguir o diagrama alternado, conforme RN03, diante de prosa ambígua.
2. Rechamada é um evento que ocupa posição no histórico das cinco chamadas.
3. Limite de 999 senhas por tipo/dia; não ampliar a sequência silenciosamente.
4. Estado DESCARTADA para fechamento, distinto da ausência confirmada.
5. EMITIDA é transitório dentro da operação de criação; a resposta já está AGUARDANDO. Persistir eventos separados na fase 2 se for necessária auditoria completa.
6. Não iniciar serviços depois das 17h; uma senha chamada antes, mas ainda não iniciada, será descartada no fechamento.

## Falhas e recuperação planejada

Com backend indisponível, o frontend bloqueia ações e identifica os dados desatualizados; tenta novamente a cada 2 segundos, após o término de cada consulta. Timeout de uma requisição: 5 segundos. Não afirmar que uma operação falhou só porque a consulta de atualização falhou: se o POST tiver retornado sucesso, informar que a ação foi registrada.

Na fase 2: backup, teste de restauração, migrações versionadas, logs sem segredos, reconciliação após reconexão, procedimento de atendimento manual durante indisponibilidade. Nenhum desses mecanismos deve simular atendimento concluído sem confirmação persistida.
