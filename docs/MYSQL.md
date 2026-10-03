# MySQL no nassauTickets

## O que foi adicionado

Persistência de senhas, histórico de chamadas, horários de atendimento, associação ao guichê e última prioridade. O backend continua com as mesmas rotas; a interface identifica “Dados salvos no MySQL” quando conectado.

O MySQL 8.0.46 roda diretamente no Windows, sem Docker ou virtualização, acessível apenas neste computador na porta **3307**. Os binários ficam em `backend/.mysql/runtime` e os dados em `backend/.mysql/data`, ambos fora do Git. Reiniciar o backend não zera senhas nem contadores. **Não apague a pasta .mysql: ela contém seu banco. Persistência não substitui backup.** Login de atendentes, relatórios e backups automáticos continuam pendentes.

## Iniciar pelo terminal do VS Code

Nesta máquina, o MySQL nativo já foi instalado e configurado. Na pasta `backend`:

```powershell
npm.cmd install
npm.cmd run db:up
npm.cmd run db:init
npm.cmd run dev
```

O `.env` local já foi gerado nesta máquina com duas senhas aleatórias diferentes. **Não sobrescreva esse arquivo se já existir.** Para uma nova cópia no Windows, execute `npm.cmd install` e `npm.cmd run db:setup`: o instalador baixa o ZIP oficial (aproximadamente 237 MB, ocupando cerca de 1 GB após extração) e cria o .env automaticamente se ele ainda não existir. Depois execute `npm.cmd run db:init`. Se preferir preparar o .env manualmente, copie .env.example e substitua as duas senhas. O `.env`, o banco e os binários não vão para o Git nem para os ZIPs.

Em outro terminal, a partir da raiz:

```powershell
cd frontend
npm.cmd run dev
```

Abra http://127.0.0.1:5173. Não execute um segundo backend se a porta 3001 já estiver ocupada; pare a instância anterior com Ctrl+C primeiro.

`db:up` inicia o processo mysqld em segundo plano, sem instalar serviço do Windows ou exigir mudança na BIOS. `db:init` cria as tabelas sem apagar as existentes. `db:setup` é usado somente para instalar a cópia local e preparar o primeiro acesso. Depois de reiniciar o computador, execute `db:up`. O instalador não redefine a senha de instalações existentes. Os registros da antiga versão em memória não foram importados.

## Conectar o Workbench

Na tela inicial do MySQL Workbench, clique no **+** ao lado de MySQL Connections e preencha:

| Campo | Valor |
| --- | --- |
| Connection Name | nassauTickets local |
| Connection Method | Standard (TCP/IP) |
| Hostname | 127.0.0.1 |
| Port | 3307 |
| Username | nassau_app |
| Default Schema | nassau_tickets |

Clique em **Test Connection**. Quando pedir senha, use o valor de **DB_PASSWORD** do arquivo `backend/.env`, aberto localmente no VS Code. Não use MYSQL_ROOT_PASSWORD nessa conexão. Não envie a senha pelo chat. Depois abra a conexão e atualize a lista **Schemas**.

## Consultas para conferir

Em uma nova aba SQL no Workbench:

```sql
USE nassau_tickets;
SHOW TABLES;

SELECT id, type, status, desk, issued_at, started_at, finished_at
FROM tickets
ORDER BY issued_at DESC, id;

SELECT c.event_id, c.ticket_id, c.desk, c.called_at, c.repeated
FROM calls c
ORDER BY c.event_id DESC;

SELECT * FROM queue_control;
```

Emita uma senha na aplicação, execute a consulta, reinicie somente o backend e consulte novamente. A senha deve continuar no banco. As datas SQL estão em UTC; a interface apresenta o horário de Brasília. O código do dia da senha usa Brasília.

## Tabelas

- **tickets:** número, tipo, sequência diária, estado, emissão, chamadas, início, fim e guichê. Há restrições para sequência única e para impedir dois serviços ativos no mesmo guichê.
- **calls:** eventos de primeira e segunda chamada, vinculados à senha; o painel consulta os últimos cinco do dia.
- **queue_control:** uma linha usada para guardar o último tipo/dia e coordenar as transações. Não edite essa tabela manualmente durante a operação.

O schema executável está em `backend/sql/001_initial.sql`. Este é o modelo implementado agora; o MER anterior contém também entidades de atendente/gestor previstas para uma etapa futura.

## Como o código funciona

`database.js` lê a configuração e cria um pool de conexões. `mysql-queue.js` inicia uma transação, bloqueia a linha de controle com `SELECT ... FOR UPDATE`, carrega as senhas do dia e pendências, aplica as regras de `queue.js` e salva as alterações e chamadas antes de confirmar. Requisições de outros servidores que usam o mesmo banco aguardam esse bloqueio. A aplicação deve ter a mesma configuração de expediente em todas as instâncias.

Essa serialização é intencional para simplificar a correção no projeto acadêmico. Ainda não foi validada para grande volume. O histórico de dias anteriores fica salvo; apenas o dia atual e pendências são carregados para a fila. Não remover senhas manualmente: a sequência é calculada a partir dos registros persistidos do dia.

Se a conexão falhar, a API devolve indisponibilidade e não muda silenciosamente para memória. O frontend bloqueia ações até reconectar. `GET /api/health` agora verifica o banco e as tabelas.

## Testar

```powershell
npm.cmd test
npm.cmd run test:mysql
```

O segundo comando usa o MySQL real e cria um banco temporário exclusivo `nassau_test_...`, removido no fim do teste. Ele usa a senha root local somente para criar/remover esse banco isolado. Não apaga nem usa as senhas do banco `nassau_tickets`. Testa sequências simultâneas, reconexão, guichês concorrentes, estados, fechamento e troca de dia. No teste padrão, esse caso é marcado como ignorado; execute `test:mysql` explicitamente.

## Parar e iniciar novamente

```powershell
npm.cmd run db:stop
npm.cmd run db:up
```

Esses comandos preservam os dados. Alterar DB_PASSWORD no `.env` depois da primeira inicialização não altera automaticamente a senha já cadastrada no MySQL. Não mova a pasta do projeto enquanto o MySQL estiver rodando. Para mover, pare-o com db:stop, copie a pasta completa incluindo .mysql e .env, e só então execute db:up no novo local.

## Se você já possui outro MySQL 8.0

Você pode dispensar o instalador local, criar um banco `nassau_tickets` vazio e um usuário com acesso a ele pelo seu administrador, e ajustar `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no `.env`. Depois execute `db:init`. O projeto não redefine senhas de instalações existentes.

## Diagnóstico

- **Executável ausente:** execute `npm.cmd run db:setup`. O download exige internet e pode demorar.
- **MySQL não inicia:** consulte `.mysql/mysql-error.log` localmente. Esse arquivo pode conter uma senha temporária de inicialização; não o publique. Se houver erro de biblioteca Visual C++, use o instalador oficial da Microsoft correspondente ao Windows x64.
- **Porta 3307 ocupada:** pare primeiro o MySQL deste projeto com db:stop antes de alterar sua porta. Não encerre um banco desconhecido. Ajuste DB_PORT no .env e use a mesma porta no Workbench.
- **Access denied:** confira usuário e senha locais; não apague a pasta de dados para resolver.
- **Tabela não existe:** execute `npm.cmd run db:init` no backend.
- **API informa indisponibilidade:** execute `npm.cmd run db:up`, confira a configuração `.env` e se as tabelas foram criadas.

Referências técnicas: [pool e API de promises do mysql2](https://sidorares.github.io/node-mysql2/pt-BR/docs/documentation/promise-wrapper) e [bloqueios transacionais do MySQL](https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html).


## Docker (alternativa opcional)

O compose.yaml foi preservado como opção para outra máquina com Docker funcionando. Use `db:docker:up` e `db:docker:stop`, em vez dos comandos nativos. O Docker usa um volume separado; ele não importa automaticamente o banco nativo nem pode ocupar a mesma porta ao mesmo tempo. Nesta máquina, a configuração escolhida é a nativa, sem virtualização.

Instalação nativa conforme o [guia oficial de ZIP para Windows](https://dev.mysql.com/doc/refman/8.0/en/windows-install-archive.html).
