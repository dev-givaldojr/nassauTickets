# nassauTickets

Sistema de Controle de Atendimento para um Laboratório de Análises Clínicas.
Projeto acadêmico da UNINASSAU, com frontend React e API Node.js/Express.

## Objetivo

Organizar a emissão, a fila, as chamadas e o atendimento de senhas prioritárias (SP), gerais (SG) e de retirada de exames (SE).

## Membros

| Nome | Matrícula | Papel |
| --- | --- | --- |
| Givaldo da Silva Junior | 01791655 | Desenvolvedor; Scrum Master |
| Alana Campos Machado | 01803993 | Desenvolvedora; Documentadora |


## Tecnologias e arquitetura

- React 19 e Vite no frontend.
- Node.js 22.12 ou superior e Express 5 no backend. Recomenda-se usar a linha 22 indicada na atividade; versões posteriores compatíveis também executam o projeto.
- MySQL 8.0 nativo no Windows, com persistência, transações e mysql2. Não exige Docker ou virtualização.
- Testes com `node:test`, incluído no Node.js.

Escolhemos Node.js/Express por estar entre as opções previstas e permitir JavaScript nas duas partes da aplicação, facilitando o aprendizado e a manutenção pela equipe.

```text
Navegador (React, porta 5173)
  -> /api (proxy do Vite)
  -> Express (porta 3001)
  -> Serviço de fila -> MySQL 8.0 (porta local 3307)
```

O frontend consulta o estado a cada 2 segundos. Em falhas, conserva a última visualização, sinaliza que os dados podem estar desatualizados e bloqueia ações. A escolha da próxima senha acontece exclusivamente no servidor.

## Estrutura

```text
nassauTickets/
├── backend/
│   ├── src/
│   └── test/
├── docs/
│   ├── branding/
│   ├── mer/
│   ├── mockups/
│   ├── models/
│   │   └── uml/
│   └── requirements/
├── frontend/
│   └── src/
│       ├── components/
│       └── services/
├── .gitignore
├── LICENSE
└── README.md
```

Todas as pastas obrigatórias possuem artefatos. Portanto, não precisam de `.gitkeep`. Esse arquivo só será necessário se uma pasta ficar vazia.

## Instalação e execução no VS Code

1. Abra **Arquivo > Abrir Pasta** e selecione a pasta `nassauTickets` que contém este README.
2. Abra **Terminal > Novo Terminal**. No terminal do backend:

```powershell
cd backend
npm.cmd install
npm.cmd run db:up
npm.cmd run db:init
npm.cmd run dev
```

3. Abra um segundo terminal na raiz do projeto, mantendo o primeiro funcionando:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

4. Abra **http://127.0.0.1:5173** no navegador.

### Configuração

O backend usa `PORT=3001`, `DEMO_MODE=true` e `STORAGE=mysql`. As credenciais ficam no arquivo local `backend/.env`, que não deve ser publicado. Nesta cópia em Downloads, o MySQL e os dados ficam em `backend/.mysql/`. Veja o [guia MySQL e Workbench](docs/MYSQL.md). Para respeitar o expediente real, pare o backend com `Ctrl+C` e execute no terminal dele:

```powershell
$env:DEMO_MODE = 'false'
npm.cmd run dev
```

Para voltar à demonstração, pare e defina `$env:DEMO_MODE = 'true'` antes de iniciar. O horário de negócio é `America/Sao_Paulo`, independentemente do fuso do computador. Em modo real, emissão e novas chamadas ocorrem entre 07:00 inclusive e 17:00 exclusive; atendimentos já iniciados podem ser finalizados depois das 17:00. Pendências são descartadas na próxima consulta/operação após o fechamento; com a interface aberta isso ocorre em até aproximadamente 2 segundos. O contador reinicia a cada dia e permanece salvo ao reiniciar o backend.

As duas aplicações escutam apenas no computador local. Se alterar `PORT`, ajuste também o destino do proxy em `frontend/vite.config.js`. A porta 5173 deve estar livre.

### Como experimentar

1. No Totem, emita senhas SP, SE e SG.
2. Em Atendente, escolha um guichê e clique em **Chamar próxima senha**.
3. Acesse Painel para conferir a senha e o guichê. É possível abrir outra aba do navegador para deixar o painel visível.
4. Volte a Atendente. Clique em **Iniciar atendimento** e **Finalizar atendimento**.
5. Para testar ausência, chame outra senha, use **Chamar novamente** e, se o cliente não aparecer, **Não compareceu**.

## Verificação

No terminal do backend:

```powershell
npm.cmd test
```

No terminal do frontend:

```powershell
npm.cmd run build
```

O build gera `frontend/dist/`, ignorado pelo Git. Este projeto usa o proxy de desenvolvimento para acessar a API; servir somente a pasta `dist` não configura a API de produção.

## Documentação

- [MySQL: configuração, Workbench e consultas](docs/MYSQL.md)

- [Requisitos e regras de negócio](docs/requirements/requisitos.md)
- [Casos de uso](docs/requirements/casos-de-uso.md)
- [Arquitetura, API e decisões](docs/requirements/arquitetura.md)
- [Modelo de dados proposto](docs/mer/modelo.md)
- [Diagramas de estados e sequência](docs/models/uml/diagramas.md)
- [Telas e roteiro de validação](docs/mockups/telas.md)
- [Identidade visual](docs/branding/identidade.md)
- [Guia de Git/GitHub e entrega](docs/ENTREGA.md)

## Branches

O fluxo exigido é `dev` para desenvolvimento e `main` para versões integradas. O código deve ser commitado primeiro em `dev` e depois integrado com merge em `main`. O [guia de entrega](docs/ENTREGA.md) mostra como criar o histórico inicial de forma explícita e publicar as duas branches.

Esta base não inventa commits ou participação dos integrantes. A configuração de autoria, a criação do repositório público, os commits, o merge e os convites no GitHub devem ser feitos pela equipe seguindo o guia.

## Pendências para a fase 2

- Evoluir as migrações MySQL e implementar backup com restauração testada.
- Login do atendente, autorização por perfil e exatamente um gestor.
- Cadastro de guichês/atendentes e associação do usuário autenticado ao guichê.
- Relatórios diários/mensais, tempo médio e auditoria com identificação do atendente.
- Áudio nas chamadas e repetição precedida de “Última chamada”.
- Simulação dos tempos e dos aproximadamente 5% de não atendimento em cenário de testes; não descartar clientes reais aleatoriamente.
- Proteção contra duplicidade por requisições repetidas, concorrência distribuída, acessibilidade validada e recuperação de falhas.
- Confirmar com o professor a interpretação da alternância de prioridades.

## Referências e licença

Baseado nos arquivos fornecidos na atividade: **Sistema para controle de atendimento.pdf** (versão 06, 18/08/2026) e **Atividade - Sistema para controle de atendimento.pdf**, além do enunciado da fase 1. A documentação traduz os requisitos desses arquivos e distingue o que já foi implementado do que está planejado.

Licença [MIT](LICENSE). Base inicial elaborada com auxílio do Codex; a equipe deve revisar, compreender e evoluir o código e a documentação.


## MySQL nesta máquina

Use esta pasta em Downloads como cópia de trabalho. Depois de reiniciar o computador, inicie o banco com `npm.cmd run db:up` no terminal do backend. Não apague `backend/.mysql`, pois essa pasta contém os dados. O `.gitignore` exclui o banco, os binários e as senhas do Git. Para uma instalação nova a partir de outro ZIP, execute `npm.cmd run db:setup` antes de `db:init`.
