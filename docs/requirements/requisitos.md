# Requisitos e regras de negócio

Versão 0.1 - 02/10/2026. Fonte: os dois PDFs da atividade. Este documento descreve o sistema pretendido e o estágio da base inicial; não representa certificação de conformidade.

## Agentes

- **AC - Cliente:** usa o totem anonimamente para emitir uma senha e acompanha as chamadas.
- **AA - Atendente:** chama, inicia, conclui e registra ausências no seu guichê.
- **AS - Sistema:** controla numeração, filas, prioridades, estados, painel e registros.
- **Gestor:** um único AA com perfil adicional para cadastros e relatórios (fase 2).

## Requisitos funcionais

| ID | Requisito | Situação na fase 1 |
| --- | --- | --- |
| RF01 | Emitir SP, SE ou SG sem identificação do cliente | Implementado com MySQL |
| RF02 | Numerar por dia e tipo no formato YYMMDD-PPNNN | Implementado; sequência persiste no reinício |
| RF03 | Selecionar próxima senha segundo prioridades e ordem de emissão | Implementado conforme interpretação RN03 |
| RF04 | Permitir qualquer tipo de senha em qualquer guichê | Implementado, três guichês fixos |
| RF05 | Chamar e chamar novamente uma única vez | Implementado |
| RF06 | Iniciar e finalizar atendimento com ações distintas | Implementado |
| RF07 | Registrar não comparecimento após duas chamadas | Implementado, confirmação manual do AA |
| RF08 | Mostrar as cinco últimas chamadas sem antecipar a próxima | Implementado, atualização a cada 2 segundos |
| RF09 | Controlar expediente e descartar pendências no fechamento | Implementado quando DEMO_MODE=false |
| RF10 | Login para AA e permissões de um gestor | Planejado |
| RF11 | Cadastrar atendentes e guichês | Planejado |
| RF12 | Relatórios diário e mensal de emitidas/atendidas, geral e por tipo | Planejado |
| RF13 | Relatório detalhado de senha, tipo, emissão, atendimento e guichê | Planejado |
| RF14 | Calcular tempo médio real por tipo | Planejado |
| RF15 | Auditoria com AA, guichê, senha e horários das ações | Horários persistidos; relatório e AA pendentes |
| RF16 | Áudio de prioridade, sequência e guichê; repetição com “Última chamada” | Planejado |
| RF17 | Sinalizar falha de comunicação e recuperar visualização | Implementado no frontend; recuperação de dados pendente |

## Regras de negócio

| ID | Regra |
| --- | --- |
| RN01 | Tipos: SP prioritária; SE retirada de exames; SG geral. |
| RN02 | A ordem de emissão é preservada dentro de cada tipo (FIFO). |
| RN03 | Seguir SP → (SE ou SG) → SP → (SE ou SG). No turno não prioritário, escolher SE antes de SG. Se não houver a opção preferida, escolher a próxima fila disponível. |
| RN04 | Selecionar a senha somente quando o AA acionar “Chamar próxima senha”. |
| RN05 | Um guichê não pode manter dois atendimentos ativos; cada senha pertence a no máximo um guichê. |
| RN06 | Após a primeira chamada, o AA pode iniciar ou chamar novamente; após a segunda, pode iniciar ou confirmar ausência. Não há terceira chamada no fluxo. |
| RN07 | Horário de negócio: 07:00 ≤ horário < 17:00, fuso America/Sao_Paulo. Atendimentos iniciados são concluídos mesmo depois das 17h. |
| RN08 | Pendências sem início são descartadas no fechamento. DESCARTADA é uma extensão de estado para distinguir fechamento de NÃO_COMPARECEU. |
| RN09 | Numeração: YYMMDD-PPNNN, exemplo 261002-SP001; contadores independentes por tipo e por dia. A expressão PPSQ dos PDFs representa PP + sequência com três dígitos. |
| RN10 | Ao atingir 999 senhas de um tipo no dia, rejeitar novas emissões desse tipo para manter três dígitos; validar essa decisão com o professor. |
| RN11 | Painel mostra eventos das últimas cinco chamadas, incluindo repetição. A repetição é identificada como “Última chamada”. Confirmar se o professor prefere cinco senhas distintas. |
| RN12 | Relatório detalhado: sem atendimento, data/hora de atendimento e guichê de atendimento devem ficar vazios; auditoria pode manter o guichê das chamadas. |
| RN13 | Aproximadamente 5% sem atendimento é uma característica estatística para simulação; no fluxo manual, ausência depende da confirmação do AA depois das duas chamadas. |
| RN14 | Tempos para simulação futura: SP uniforme entre 10 e 20 minutos; SG uniforme entre 2 e 8; SE 1 minuto em 95% e 5 minutos em 5%. Tempo médio real será calculado dos atendimentos concluídos. |
| RN15 | Apenas um atendente terá perfil adicional de gestor. Cliente não terá login. |

### Ambiguidade da priorização (decisão provisória)

O diagrama indica alternância SP → (SE|SG), enquanto a prosa também pode sugerir um ciclo SP → SE → SG. Nesta base, prevalece o diagrama: havendo SP, SE e SG em quantidade, a sequência será SP, SE, SP, SE; SG será escolhido no turno não prioritário quando SE estiver vazia. Isso pode atrasar SG continuamente se chegarem muitas SE. **Confirmar com o professor antes da versão final.** A política está isolada em `backend/src/queue.js` e coberta por testes, para permitir alteração.

Quando apenas uma fila possuir senhas, ela será atendida sucessivamente, como exceção à alternância por indisponibilidade das outras filas. A prioridade avança na chamada, inclusive se a senha terminar como ausência.

## Requisitos não funcionais e critérios propostos

| ID | Área | Critério de aceitação proposto | Situação |
| --- | --- | --- | --- |
| RNF01 | Segurança | Autenticar AA, verificar permissão no servidor, senhas com hash adequado, segredo fora do Git, TLS na publicação | Fase 2 |
| RNF02 | Concorrência | Duas chamadas simultâneas não reservam a mesma senha; usar transação e bloqueio no MySQL | Transação e bloqueio MySQL implementados; teste de carga pendente |
| RNF03 | Disponibilidade | Informar indisponibilidade, bloquear ações e retomar consultas após reconexão | Interface implementada |
| RNF04 | Recuperação | Backup e restauração testados; manter dados e contadores após reinício | Fase 2 |
| RNF05 | Auditoria | Registrar AA, guichê, senha, ações e horários com acesso restrito; não permitir edição pela interface | Fase 2 |
| RNF06 | Desempenho | Meta inicial: resposta de emissão/chamada em até 1 s para 10 atendentes; validar por teste de carga | Meta, ainda não medida |
| RNF07 | Acessibilidade | Navegação por teclado, foco visível, controles nomeados, contraste adequado, informação além de cor/áudio | Base aplicada; revisão completa pendente |
| RNF08 | Privacidade/LGPD | Evitar dados de saúde e identificação no painel, restringir registros de AA, definir retenção e descarte antes de uso real | Diretriz; validação futura |
| RNF09 | Manutenção | Separar interface, transporte HTTP e regras; incluir README, testes e histórico Git verificável | Código e docs presentes; Git pendente |

Os critérios numéricos de desempenho são propostas da equipe para validação, não números exigidos nos PDFs. As diretrizes de privacidade e acessibilidade não equivalem a uma avaliação jurídica ou certificação técnica.

## Critérios para a entrega da fase 1

- Estrutura obrigatória com código e documentação; React executável.
- README com objetivo, tecnologias, configuração, membros e fluxo de branches.
- MIT e `.gitignore` Node.js na raiz.
- Repositório GitHub público `nassauTickets`, duas contas com acesso, `main` e `dev`, desenvolvimento em `dev` e merge real para `main`.
- URL pública entregue pelo Teams conforme o enunciado. O prazo mostrado na imagem é 04/10/2026 às 23:59; conferir no Teams antes do envio.
