# Guia de Testes — SecurityApp

Este documento explica como configurar o ambiente e executar os testes de integração (Jest) e end-to-end (Playwright) do projeto.

## Pré-requisitos

- Node.js 20+ (recomendado via `nvm`)
- Docker e Docker Compose (para o banco de dados MySQL)
- Arquivo `.env` na raiz do projeto com as variáveis necessárias configuradas

> O `JWT_SECRET` precisa ter no mínimo 32 caracteres — a aplicação falha ao subir se essa condição não for atendida.

## Subindo o ambiente

Antes de rodar qualquer teste, suba os containers do projeto:

```bash
docker compose up -d
```

Confirme que os dois containers estão de pé:

```bash
docker ps
```

Você deve ver algo como `tcc_app` (Next.js) e `tcc_mysql` (MySQL 8.0) com status `Up`.

### Se for a primeira vez rodando o projeto neste ambiente

Os usuários do MySQL precisam estar configurados com o plugin de autenticação `mysql_native_password`, ou o Prisma trava em timeouts de conexão (5s/10s, depois pool timeout) ao tentar autenticar — o driver `mysql2` usado pelo Prisma não lida bem com o handshake de `caching_sha2_password` (padrão do MySQL 8) sem TLS.

Isso afeta tanto o usuário `user` (usado pela aplicação, dentro do container `tcc_app`) quanto o `root` (usado pelos testes de integração, rodando do host contra `127.0.0.1:3307`). Se ainda não tiver feito esse ajuste, rode os dois:

```bash
# Usuário da aplicação
docker exec -it tcc_mysql mysql -u root -p'root_password' -e \
  "ALTER USER 'user'@'%' IDENTIFIED WITH mysql_native_password BY 'user_password'; FLUSH PRIVILEGES;"

# Usuário root, usado pelos testes de integração
docker exec -it tcc_mysql mysql -u root -p'root_password' -e \
  "ALTER USER 'root'@'%' IDENTIFIED WITH mysql_native_password BY 'root_password'; FLUSH PRIVILEGES;"
```

> Se `SELECT user, host, plugin FROM mysql.user WHERE user='root';` mostrar mais de um host cadastrado (ex: `root@localhost` além de `root@%`), repita o `ALTER USER` trocando o host em cada linha encontrada.

## Testes de integração (Jest)

Rodam contra a lógica de aplicação (services, repositories, actions) sem passar pela interface.

```bash
# Rodar todos os testes de integração
npm run test:integration

# Rodar todos os testes unitários
npm run test:unit

# Rodar com cobertura (apenas unitários)
npm run test:coverage

# Rodar em modo watch (unitários, útil durante o desenvolvimento)
npm run test:watch
```

Certifique-se de que o container do banco (`tcc_mysql`) está no ar antes de rodar os testes de integração, já que eles dependem de uma conexão real com o banco de dados.

Os testes que usam `tests/helpers/track-fixtures.ts` devem obter o prefixo por `createTestPrefix()`. O helper só permite criar e remover dados associados a prefixos emitidos no próprio processo; prefixos vazios, inventados ou de outro escopo são rejeitados antes de qualquer escrita ou exclusão.

## Testes E2E (Playwright)

Simulam a navegação real do usuário no navegador, contra a aplicação rodando de fato.

### Primeira configuração do ambiente (uma vez por máquina)

Instale o navegador do Playwright e as dependências de sistema necessárias:

```bash
npx playwright install chromium
sudo env "PATH=$PATH" npx playwright install-deps chromium
```

> O `sudo env "PATH=$PATH"` evita que o comando use um Node de sistema desatualizado em vez do Node ativo do seu `nvm`.

### Rodando os testes

O `playwright.config.ts` já sobe o servidor Next.js automaticamente (`webServer`) antes de executar os testes, reaproveitando uma instância já rodando em `localhost:3000` quando existir.

```bash
# Rodar toda a suíte E2E
npm run test:e2e

# Rodar um arquivo específico
npm run test:e2e -- tests/e2e/home.spec.ts

# Rodar por nome do teste ou describe (regex)
npm run test:e2e -- -g "deve fazer login"

# Rodar em modo headed (navegador visível)
npm run test:e2e -- --headed

# Modo UI interativo (recomendado para debugar falhas)
npm run test:e2e:ui
```

Depois de uma execução, veja o relatório HTML detalhado (screenshots e trace de falhas):

```bash
npx playwright show-report
```

## Solução de problemas comuns

| Sintoma | Causa provável | Solução |
|---|---|---|
| `chrome-headless-shell: error while loading shared libraries: libnspr4.so` | Dependências de sistema do Chromium ausentes no container/máquina | `sudo env "PATH=$PATH" npx playwright install-deps chromium` |
| Login/registro trava em "Entrando..."/"Criando conta..." e falha após ~5s ou ~10s | Usuário do MySQL usando `caching_sha2_password`, causando timeout na conexão do Prisma | Alterar o plugin do usuário para `mysql_native_password` (ver seção acima) |
| `Cannot navigate to invalid URL` ao rodar E2E | `baseURL` não resolvido (variável de ambiente ausente sem fallback) | Confirmar que `use.baseURL` no `playwright.config.ts` tem fallback para `'http://localhost:3000'` |
| Porta 3000 já em uso ao rodar E2E | Outra instância do `npm run dev` rodando | `reuseExistingServer: !process.env.CI` no config já resolve em ambiente local; em CI, adicionar um passo de limpeza da porta antes dos testes |

## Resumo rápido

```bash
docker compose up -d                 # sobe banco + app
npm run test:unit                    # testes unitários
npm run test:integration             # testes de integração
npm run test:e2e                     # testes end-to-end
npx playwright show-report           # ver relatório da última execução E2E
```
