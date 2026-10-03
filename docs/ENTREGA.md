# Guia de VS Code, GitHub e entrega da fase 1

## 1. Execute e compreenda

Abra a pasta nassauTickets no VS Code e siga os dois terminais descritos no README. Revise especialmente a emissão, a escolha de prioridade e as transições em `backend/src/queue.js`. A documentação lista as partes ainda pendentes da fase 2.

## 2. Configure sua identidade de Git

Na raiz nassauTickets, abra um terminal. Confira `git --version`. Os comandos abaixo se destinam a esta pasta nova, sem repositório Git próprio.

```powershell
git init -b main
git config user.name "Givaldo da Silva Junior"
git config user.email "SEU_EMAIL_DO_GITHUB"
```

Troque o email antes de executar. Pode usar o endereço privado `noreply` disponibilizado pela sua conta GitHub. A configuração é local ao repositório; não muda outros projetos. Alana deve configurar sua própria identidade na cópia dela.

## 3. Registre a base e desenvolva em dev

Faça um commit inicial somente dos metadados na main. Depois registre documentação e código em dev. Esses commits representam a importação desta base gerada com auxílio do Codex, não um histórico fictício de trabalho anterior da equipe.

```powershell
git add .gitignore LICENSE
git commit -m "chore: inicia repositorio e licenca MIT"
git switch -c dev
git add README.md docs
git commit -m "docs: adiciona equipe e documentacao inicial"
git add backend frontend
git commit -m "feat: adiciona prototipo de atendimento da fase 1"
```

Confira que `node_modules` e `dist` não foram adicionados: `git status` e `git ls-files`. Os arquivos `package-lock.json` devem ser versionados.

Execute testes e build conforme o README, então integre:

```powershell
git switch main
git merge --no-ff dev -m "merge: integra base da fase 1"
git log --oneline --graph --all
git switch dev
```

Nas próximas alterações, trabalhe em dev e faça commits pequenos que correspondam a mudanças reais. Depois de revisar e testar, repita o merge. Não crie commits em nome da outra integrante para simular participação.

## 4. Crie e publique no GitHub

O Scrum Master cria um repositório **público** com o nome exato **nassauTickets**. Deixe desmarcadas as opções de adicionar README, licença e gitignore, pois esses arquivos já estão aqui. Copie a URL HTTPS fornecida pelo GitHub e substitua o endereço de exemplo:

```powershell
git remote add origin https://github.com/SEU_USUARIO/nassauTickets.git
git push -u origin main
git push -u origin dev
```

Autentique com sua própria conta quando solicitado. No repositório, adicione a conta de Alana como colaboradora, e ela deve aceitar o convite. O README já contém os dois nomes, matrículas e papéis informados. A presença do nome na tabela não substitui a permissão no GitHub.

Alana pode clonar o repositório, acessar dev, configurar sua identidade e realizar uma revisão real da documentação. Ambos devem sincronizar antes de trabalhar e integrar as mudanças sem sobrescrever o trabalho um do outro.

## 5. Checklist antes de entregar

- [ ] Conferir nomes, matrículas e papéis da equipe.
- [ ] Repositório público chamado nassauTickets.
- [ ] Alana adicionada e convite aceito; participação real das duas contas.
- [ ] LICENSE MIT, .gitignore, README e todas as pastas exigidas visíveis no GitHub.
- [ ] Branches main e dev publicadas, com commits na dev e merge verificável para main.
- [ ] Frontend React inicia a partir de frontend/; backend inicia separadamente.
- [ ] Testes e build passam em uma instalação limpa.
- [ ] Equipe revisou documentos, código e as interpretações pendentes.
- [ ] Enviar no Teams a URL pública do repositório, conforme solicitado, por todos os integrantes.

Prazo visível na imagem enviada: **4 de outubro de 2026, às 23:59**. O enunciado informa um envio permitido e que todos do grupo devem responder; confiram a atividade no Teams antes de enviar. Este guia não publica o repositório nem realiza a entrega automaticamente.
