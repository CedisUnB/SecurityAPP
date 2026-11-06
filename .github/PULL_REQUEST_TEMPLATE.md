## Descrição
<!-- Descreva brevemente o que foi implementado neste PR. Qual o objetivo dessa mudança? -->
[Insira sua descrição aqui]

## Link para a História de Usuário (US) no GitHub Projects
<!-- Adicione o link ou a referência (ex: #123) da US relacionada a este PR -->
Resolves #[Número da Issue/Card]

## Definition of Done (DoD) Geral
<!-- 
Marque todos os itens que foram atendidos. Lembre-se da métrica de conformidade do projeto: 
Uma História só transita de etapa com 100% dos itens da checklist correspondente marcados como concluídos.
-->
Conforme as nossas estratégias de acompanhamento de projeto, marque todos os itens abaixo ao finalizar a implementação:

- [ ] **Código revisado:** Código implementado e submetido à revisão (Pair Programming ou Revisão de Código por outro membro).
- [ ] **Testes unitários:** Testes unitários foram escritos e estão passando.
- [ ] **Cobertura de testes:** A cobertura de testes atende ao mínimo de 80%.
- [ ] **Integração Contínua (CI):** A execução da integração contínua finalizou sem falhas (build e pipelines verdes).
- [ ] **Critérios de Aceitação:** Todos os Critérios de Aceitação definidos para a História de Usuário (no DoR) foram atendidos e testados.
- [ ] **Sem regressão:** Não há regressão em funcionalidades existentes (o que funcionava antes continua funcionando).

## Definition of Done (DoD) de Segurança
Conforme nossas Diretrizes de Desenvolvimento Seguro, os seguintes critérios devem ser cumpridos para que esta história seja considerada pronta:
- [ ] O código foi escrito prevenindo as vulnerabilidades aplicáveis do OWASP Top 10.
- [ ] Análise SAST executada e vulnerabilidades críticas/altas corrigidas.
- [ ] Dependências verificadas (SCA) sem vulnerabilidades críticas e sem necessidade de plano de mitigação.
- [ ] Os casos de teste que validam os requisitos de segurança foram executados e aprovados.

### 📋 Checklists Específicos (Expanda os aplicáveis a este PR)
*(Marque com `x` o que foi feito. Marque com `N/A` ou `~riscado~` o que não se aplica ao escopo deste PR, conforme previsto nos documentos)*

<details>
<summary><strong>Checklist de Frontend / UX (Clique para expandir)</strong></summary>

- [ ] **1.1** Entradas do usuário possuem validação no cliente, tratamento de erros sem expor detalhes, e sanitização de saída.
- [ ] **1.2** Frontend envia token anti-CSRF nas requisições de alteração de estado.
- [ ] **1.3** Tokens armazenados de forma segura e requisições incluem o token no cabeçalho `Authorization`.
- [ ] **1.3** Aplicação trata respostas 401/403 corretamente e oculta UI de ações não autorizadas.
- [ ] **1.4** Comunicação via HTTPS e nenhuma credencial ou chave sensível em "hardcoded".
- [ ] **2.1** Interface exibe feedbacks claros de segurança e indicadores de força de senha.
- [ ] **3.2** Executado `npm audit` (ou equivalente) sem apontamento de vulnerabilidades críticas.
</details>

<details>
<summary><strong>Checklist de Backend (Clique para expandir)</strong></summary>

- [ ] **1.1** Validação rigorosa de todos os dados recebidos (tipo, formato, tamanho) rejeitando dados inválidos.
- [ ] **1.2** Endpoints verificam identidade e permissões do usuário (Autorização em todos os endpoints).
- [ ] **1.3** Uso mandatório de ORM ou Prepared Statements contra SQL Injection.
- [ ] **1.4** Senhas processadas com algoritmo de hashing forte (ex: Argon2, bcrypt) e dados sensíveis criptografados.
- [ ] **2.1** Cabeçalhos HTTP de segurança configurados (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- [ ] **2.2** Cookies sensíveis configurados com `HttpOnly`, `Secure` e `SameSite`.
- [ ] **3.1** Análise do Gerenciamento de Dependências (SCA) executada e vulnerabilidades tratadas.
- [ ] **3.2** Logs de segurança implementados sem registrar dados sensíveis em texto plano.
</details>

<details>
<summary><strong>Checklist de Uso de IA (Clique para expandir)</strong></summary>

- [ ] **1.** Prompt enviado completamente livre de dados sensíveis (credenciais, PII, regras de negócio secretas).
- [ ] **2.** Código gerado inspecionado ativamente contra vulnerabilidades (OWASP Top 10).
- [ ] **2.** Lógica de negócio e autorização verificadas, bem como algoritmos e cálculos.
- [ ] **3.** Dependências sugeridas pela IA foram analisadas (popularidade, vulnerabilidades, licença).
- [ ] **4.** A mensagem de commit indica quando uma porção significativa do código foi gerada/assistida por IA.
</details>

## Evidências (Screenshots, Logs ou Vídeos) - Opcional, mas recomendado
<!-- Se a mudança tiver impacto visual na interface ou resolver um bug, inclua imagens ou logs aqui. -->

## Observações Adicionais
<!-- Precisa destacar algum detalhe técnico importante, débito técnico assumido ou dúvida para o revisor? Escreva aqui. -->