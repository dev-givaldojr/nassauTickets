# Registro de verificação da base inicial

Data: 02/10/2026. Verificação executada pelo Codex no ambiente local com Node.js 24.14.0. A equipe deve repetir os passos na sua instalação, preferencialmente com Node.js 22.12+ da linha 22, indicada na atividade.

## Resultados

- 14 testes automatizados passaram: 13 da fila e 1 de integração HTTP, incluindo requisições concorrentes a guichês distintos.
- Build Vite concluído com sucesso.
- Navegador: emissão de SP001, chamada no guichê 1, segunda chamada, início, finalização, liberação do guichê e histórico no painel conferidos visualmente.
- Tela de emissão capturada em `docs/mockups/totem.png`.

## Particularidades do ambiente de execução

O sandbox bloqueou a criação de subprocessos. Para os testes, foi usado `node --test --test-isolation=none`. No build, um adaptador temporário fora do projeto tratou como erro a consulta opcional do Vite aos discos de rede do Windows (`net use`), sem executar novamente a operação bloqueada nem alterar o aplicativo ou as dependências. O build então concluiu. Os scripts padrão `npm test` e `npm run build` permanecem para execução normal no terminal do usuário.

## Ainda não verificado

Instalação limpa com Node.js 22, testes de carga, auditoria completa de acessibilidade, matriz de navegadores/dispositivos, autenticação e publicação. Autenticação e publicação continuam pendentes. Não foi realizada publicação no GitHub nem submissão no Teams.


## Atualização da integração MySQL

MySQL 8.0.46 nativo foi inicializado no Windows, sem Docker, em 127.0.0.1:3307. Schema e usuário foram criados. Os 15 testes sem banco passaram e o teste de integração contra MySQL real passou, verificando persistência após fechar e reabrir o pool, sequências simultâneas, reserva em dois guichês, concorrência no mesmo guichê, transições, fechamento e reinício diário. O banco temporário de testes foi removido. Build Vite também concluído. Credenciais locais, binários e dados são excluídos do Git e ZIP.


A copia de trabalho em Downloads/nassauTickets foi atualizada e validada: 15 testes sem banco e 1 teste MySQL real passaram. A API na porta 3001 retornou storage=mysql e a interface exibiu Dados salvos no MySQL. A instalacao e os dados foram copiados com o servidor parado para backend/.mysql na pasta Downloads.
