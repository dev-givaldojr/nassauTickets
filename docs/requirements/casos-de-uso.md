# Casos de uso

## UC01 - Emitir senha

**Ator:** AC. **Pré-condição:** sistema disponível, expediente aberto (ou demonstração).

1. Cliente seleciona SP, SE ou SG no totem.
2. Sistema valida o tipo, o expediente e o limite diário.
3. Sistema gera o número, registra emissão e coloca a senha em AGUARDANDO.
4. Totem apresenta o comprovante com número e orientação para aguardar.

**Alternativas:** fora do horário, limite diário ou falha de comunicação: informar o erro sem exibir um comprovante de sucesso. **Pós-condição:** senha disponível na fila.

## UC02 - Chamar próxima senha

**Ator:** AA. **Pré-condições:** guichê livre e sistema disponível; login exigido na fase 2.

1. AA aciona “Chamar próxima senha”.
2. Sistema escolhe a primeira senha elegível pela política de prioridade.
3. Sistema reserva a senha para o guichê e registra a primeira chamada.
4. Painel mostra número e guichê; áudio será incluído na fase 2.

**Alternativas:** fila vazia, guichê ocupado ou expediente encerrado: operação recusada. **Pós-condição:** senha em CHAMADA. Duas requisições no mesmo guichê não podem criar dois atendimentos ativos.

## UC03 - Repetir chamada e registrar ausência

**Ator:** AA. **Pré-condição:** senha em CHAMADA.

1. AA aciona “Chamar novamente”.
2. Sistema registra a segunda chamada e exibe “Última chamada” no painel.
3. AA aguarda o comparecimento; não existe tempo automático definido nos PDFs.
4. Se o cliente não comparecer, AA confirma “Não compareceu”.

**Alternativa:** cliente comparece, seguir UC04. **Pós-condição de ausência:** NÃO_COMPARECEU; guichê liberado. A confirmação antes da segunda chamada é proibida.

## UC04 - Realizar atendimento

**Ator:** AA. **Pré-condição:** senha em CHAMADA ou CHAMADA_NOVAMENTE.

1. Cliente chega ao guichê.
2. AA aciona “Iniciar atendimento”; sistema registra horário de início.
3. AA realiza o serviço.
4. AA aciona “Finalizar atendimento”; sistema registra horário de fim e libera guichê.

**Alternativa:** se o expediente acabar após o início, a conclusão permanece disponível. **Pós-condição:** ATENDIDA. Fase 2 calculará duração e tempo médio.

## UC05 - Consultar painel

**Ator:** AC. Sistema apresenta as últimas cinco chamadas com guichê e marca a repetição. Não há previsão da próxima senha. Em falha, exibe indisponibilidade e identifica que os dados podem estar desatualizados. Após reconexão, atualiza automaticamente.

## UC06 - Encerrar expediente

**Ator principal:** AS; AA conclui serviços em andamento. No modo real, ao chegar às 17h o sistema bloqueia emissão/chamada/início e descarta pendências sem início, preservando EM_ATENDIMENTO. No protótipo, a verificação acontece a cada consulta ou operação; a interface consulta a cada 2 segundos. Na fase 2, usar rotina persistente de fechamento.

## UC07 - Login, cadastros e relatórios (planejado)

AA informa credenciais e recebe acesso ao guichê autorizado. Um único AA gestor mantém os cadastros e escolhe dia/mês para relatórios de volume, detalhe, tempo médio e auditoria. Usuário sem permissão deve receber recusa do servidor, mesmo que tente acessar a API diretamente.
