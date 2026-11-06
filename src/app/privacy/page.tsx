import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/layout/BackButton";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Política de Privacidade | AEGIS",
};

const CONTACT_EMAIL = "aegis.contato@outlook.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-foreground-muted">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl wrap-break-word px-6 py-12 text-foreground">
      <BackButton className="text-sm font-medium text-accent hover:underline">
        ← Voltar
      </BackButton>

      <h1 className="mt-6 text-3xl font-bold tracking-tight">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Última atualização: 3 de novembro de 2026
      </p>

      <Section title="1. Quem somos">
        <p>
          O AEGIS é uma plataforma de apoio ao aprendizado sobre segurança de software,
          desenvolvida como Trabalho de Conclusão de Curso (TCC) de Engenharia de Software da
          Universidade de Brasília (UnB). A equipe do projeto é a controladora dos dados
          pessoais tratados na plataforma. A infraestrutura de hospedagem é de responsabilidade
          do CEDIS (Centro de Estudos, Desenvolvimento e Inovação em Software) da UnB.
        </p>
      </Section>

      <Section title="2. Dados que coletamos">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong className="text-foreground">Dados de cadastro:</strong> e-mail, nome de
            usuário e senha. A senha é armazenada apenas em forma de hash, nunca em texto
            legível.
          </li>
          <li>
            <strong className="text-foreground">Perfil de acesso:</strong> se a conta é de
            estudante ou de administrador.
          </li>
          <li>
            <strong className="text-foreground">Dados de uso:</strong> trilhas iniciadas e
            concluídas, progresso por etapa (conclusão, nota, número de tentativas e datas) e
            desempenho nos exercícios (tentativas, acertos e erros).
          </li>
          <li>
            <strong className="text-foreground">Datas da conta:</strong> criação e última
            atualização do cadastro.
          </li>
          <li>
            <strong className="text-foreground">Tentativas de login:</strong> para limitar
            tentativas repetidas de acesso, registramos a quantidade e o horário das
            tentativas de login, associadas a um hash do e-mail informado, e não ao e-mail em
            texto legível.
          </li>
          <li>
            <strong className="text-foreground">Registros técnicos de erro:</strong> quando
            ocorre uma falha inesperada, o servidor registra informações técnicas para
            diagnóstico. Senhas, tokens, chaves e dados de sessão são mascarados antes do
            registro.
          </li>
        </ul>
        <p>Não solicitamos dados como CPF, telefone ou endereço.</p>
      </Section>

      <Section title="3. Para que usamos os dados">
        <ul className="list-disc space-y-1 pl-6">
          <li>Criar sua conta e autenticar seu acesso.</li>
          <li>Salvar seu progresso, liberar as próximas etapas e exibir seu desempenho.</li>
          <li>Manter a plataforma funcionando e protegida.</li>
          <li>
            Bloquear temporariamente novas tentativas de login após muitas falhas seguidas,
            para dificultar a tentativa de adivinhar senhas.
          </li>
          <li>Identificar e corrigir falhas técnicas da plataforma.</li>
        </ul>
      </Section>

      <Section title="4. Cookies">
        <p>Usamos apenas cookies necessários ao funcionamento da plataforma:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <strong className="text-foreground">token:</strong> mantém sua sessão autenticada.
          </li>
          <li>
            <strong className="text-foreground">username:</strong> guarda o nome exibido na
            interface.
          </li>
          <li>
            <strong className="text-foreground">theme:</strong> lembra sua preferência de tema
            claro ou escuro, por até 1 ano.
          </li>
        </ul>
        <p>
          Os cookies <strong className="text-foreground">token</strong> e{" "}
          <strong className="text-foreground">username</strong> são removidos quando você sai
          da conta ou a exclui. Não usamos cookies de publicidade nem de rastreamento ou
          análise de terceiros.
        </p>
      </Section>

      <Section title="5. Compartilhamento">
        <p>
          Não compartilhamos dados pessoais com terceiros para fins comerciais ou de
          publicidade. Os dados ficam armazenados na infraestrutura de hospedagem mantida pelo
          CEDIS/UnB.
        </p>
        <p>
          As mensagens que você enviar ao e-mail de contato (seção 9) ficam em uma caixa de
          e-mail do serviço Outlook, da Microsoft, e são encaminhadas aos integrantes da
          equipe.
        </p>
      </Section>

      <Section title="6. Retenção e eliminação">
        <p>Mantemos seus dados enquanto sua conta estiver ativa.</p>
        <p>
          Você pode excluir sua conta pelo seu perfil. Ao fazer isso, seu e-mail e seu nome de
          usuário são substituídos por valores anonimizados, sua senha é apagada e o acesso à
          conta deixa de ser possível. O histórico de progresso e de desempenho nas trilhas
          permanece armazenado, associado apenas a um identificador interno anonimizado, sem
          seu e-mail nem seu nome. Esse histórico anonimizado não é removido automaticamente.
        </p>
        <p>
          Os registros de tentativas de login são apagados quando você entra com sucesso. Os
          registros técnicos de erro são mantidos apenas pelo tempo necessário para o
          diagnóstico das falhas.
        </p>
      </Section>

      <Section title="7. Seus direitos">
        <p>
          Conforme o art. 18 da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode
          solicitar:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>a confirmação de que tratamos seus dados;</li>
          <li>o acesso aos seus dados;</li>
          <li>a correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>a anonimização, o bloqueio ou a eliminação de dados;</li>
          <li>informações sobre o compartilhamento dos seus dados.</li>
        </ul>
        <p>
          Você pode atualizar seu nome de usuário e excluir sua conta diretamente no seu perfil.
          Para os demais pedidos, entre em contato pelo e-mail indicado abaixo.
        </p>
      </Section>

      <Section title="8. Segurança">
        <p>Adotamos medidas técnicas para proteger seus dados, entre elas:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>armazenamento de senhas em forma de hash;</li>
          <li>controle de acesso às áreas autenticadas;</li>
          <li>
            cabeçalhos de segurança HTTP e política de segurança de conteúdo (CSP), que
            restringe a execução de scripts na plataforma;
          </li>
          <li>limite de tentativas de login, com bloqueio temporário após falhas seguidas;</li>
          <li>
            indicador de força de senha no cadastro e na alteração de senha, para ajudar você
            a escolher uma senha mais segura;
          </li>
          <li>
            mensagens de erro genéricas na interface: detalhes técnicos de falhas ficam
            apenas nos registros do servidor, e a tela de erro exibe somente um código de
            referência.
          </li>
        </ul>
        <p>
          Nenhuma medida elimina todos os riscos, mas trabalhamos para reduzi-los.
        </p>
      </Section>

      <Section title="9. Contato">
        <p>
          Dúvidas e solicitações sobre seus dados pessoais:{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          Para agilizar o atendimento, envie a mensagem a partir do e-mail cadastrado na sua
          conta e informe o que você deseja solicitar. Responderemos em até 15 dias.
        </p>
      </Section>

      <Section title="10. Alterações">
        <p>
          Esta política pode ser atualizada. A data da última atualização aparece no topo
          desta página.
        </p>
      </Section>
    </main>
  );
}