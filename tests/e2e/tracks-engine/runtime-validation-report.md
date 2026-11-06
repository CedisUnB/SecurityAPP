# Relatório de validação em tempo de execução

**Gerado em:** 2026-10-19T22:35:59-03:00

**Projeto:** `/home/phmelosilva/dev/tcc2/SecurityAPP`
**Escopo da validação:** testes E2E com Playwright da Feature 2 — Motor de Navegação de Trilhas

## Resumo

| Etapa | Status | Código de saída | Detalhes |
|---|---|---:|---|
| Aplicação pronta para testes | APROVADO | 0 | O servidor Next.js já em execução em `http://localhost:3000` respondeu com HTTP 200. |
| Novos testes E2E de trilhas | APROVADO | 0 | 13 testes em 4 arquivos passaram com 4 workers. |
| Suíte E2E completa — execução 1 | APROVADO | 0 | 24 testes passaram com 1 worker. |
| Suíte E2E completa — execução 2 | APROVADO | 0 | 24 testes passaram com 1 worker. |
| ESLint | APROVADO | 0 | O helper e os novos testes Playwright passaram pelo lint. |
| Verificação de tipos TypeScript | FALHOU | 2 | Erro de tipo preexistente em `src/features/tracks-engine/components/TrackMap/NodeStatusIcon.test.tsx`: a fixture `TrackMapNodeDTO` não contém `isNextUp` nem `isUnlocked`. Nenhum diagnóstico foi reportado nos novos arquivos E2E. |

**Resultado geral:** APROVADO para o escopo E2E solicitado; a verificação de tipos continua bloqueada por um erro preexistente e não relacionado na fixture de um teste unitário.

## Evidências do ambiente e das ferramentas

- **Node.js:** DISPONÍVEL — `v24.19.0`.
- **Playwright:** DISPONÍVEL — `1.63.0`.
- **Chromium:** DISPONÍVEL — os testes E2E com Playwright foram concluídos com sucesso. `npx playwright install --with-deps chromium` não conseguiu instalar as dependências do sistema porque o `sudo` exige um terminal e uma senha; o navegador já instalado e as dependências disponíveis foram suficientes para executar a suíte.
- **Docker:** CLI disponível, daemon INDISPONÍVEL — `docker info` retornou código de saída 1: `permission denied while trying to connect to the Docker API at unix:///var/run/docker.sock`.
- **Banco de dados:** a criação de fixtures, as consultas e a limpeza por prefixo usando Prisma/MySQL reais foram concluídas com sucesso durante os testes E2E; não foram usados mocks do Prisma.
- **Inicialização:** uma segunda execução de `npm run dev` não conseguiu obter o lock do Next.js porque a porta 3000 já estava ocupada. O servidor existente respondeu com HTTP 200 e foi reutilizado; nenhum processo existente foi interrompido.

## Matriz de cobertura E2E

| Arquivo de teste | Fluxo e critérios de aceite |
|---|---|
| `track-catalog.spec.ts` | US06/US09: abrir o card de uma trilha, conferir a descrição e navegar para o mapa; mostrar progresso apenas nas trilhas iniciadas; indicar como concluída uma trilha totalmente finalizada, incluindo o teste final. |
| `track-map.spec.ts` | US07/US08: exibir nós ordenados e rótulos de progresso; oferecer “Começar”/“Revisar” e navegar para a rota do nó; restaurar o foco em um nó solicitado em um mapa longo. |
| `final-test.spec.ts` | US09: manter o teste final desabilitado e fechado até a conclusão do conteúdo; depois habilitá-lo e abrir o diálogo nativo. |
| `track-security-layout.spec.ts` | A01 e regressões mobile: redirecionar usuários não autenticados; exibir 404 sem stack trace; isolar o progresso entre usuários; manter o cabeçalho visível e sem sobreposição dos nós durante a rolagem; centralizar o diálogo do nó; preservar o alinhamento horizontal dos nós. |

## Evidências de execução

- Novos testes: `npm run test:e2e -- tests/e2e/tracks-engine` — 13 aprovados, código de saída 0.
- Verificação final da suíte completa, em duas execuções consecutivas:

  ```bash
  npm run test:e2e -- --workers=1 && npm run test:e2e -- --workers=1
  ```

  As duas execuções terminaram com 24 aprovados, 0 reprovados e código de saída 0.
- Em uma tentativa anterior da suíte completa com paralelismo padrão, a primeira execução passou, mas a segunda teve três timeouts em testes de cadastro preexistentes. Ao executar a suíte sequencialmente, ela passou duas vezes. Os novos testes de trilhas também passaram na execução inicial com quatro workers; nenhum teste legado foi alterado.
- `npx eslint tests/helpers/auth.ts tests/e2e/tracks-engine/*.spec.ts` — código de saída 0.

## Inventário dos testes E2E existentes

| Origem | Decisão | Detalhes |
|---|---|---|
| `tests/e2e/home.spec.ts` e `tests/e2e/profile.spec.ts` existentes | Reutilizados sem alterações | Os fluxos existentes de autenticação e perfil continuam na suíte canônica `npm run test:e2e`. |

Os testes existentes não forneciam um helper compartilhado para autenticar usuários de fixture. Por isso, `tests/helpers/auth.ts` adiciona um helper de login pela interface para as novas contas de estudante criadas pelas fixtures. Nenhum teste existente foi reescrito.

## Lacunas e problemas

| # | Severidade | Descrição | Status |
|---|---|---|---|
| 1 | BAIXA | O acesso ao daemon Docker foi negado neste shell. Um servidor de aplicação já ativo e um banco de dados real acessível permitiram executar os testes E2E. | Limitação do ambiente registrada. |
| 2 | BAIXA | A instalação das dependências de sistema do Chromium com `--with-deps` foi bloqueada pelo `sudo` não interativo; o Chromium já instalado funcionou para todos os testes de navegador. | Não foi usado fallback para a camada de navegador. |
| 3 | BAIXA | Uma execução completa com paralelismo padrão teve timeouts em três fluxos de cadastro preexistentes; duas execuções completas sequenciais passaram. | Nenhum teste legado foi alterado; verificação sequencial registrada. |
| 4 | BAIXA | A verificação de tipos do projeto continua bloqueada por uma fixture com propriedades ausentes em `NodeStatusIcon.test.tsx`. | Fora do escopo E2E; nenhum código de produção foi alterado. |

Nenhuma dependência foi adicionada. Os testes E2E não cobrem as telas de conteúdo ainda não implementadas nem `completeTrackIfPassed`.
