import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/core/security";
import { DeletedAccountToast } from "@/components/layout/DeletedAccountToast";
import Footer from "@/components/layout/Footer";

interface HomePageProps {
  searchParams: Promise<{ deleted?: string }>;
}

export default async function Home({ searchParams }: HomePageProps) {
  const store = await cookies();
  const hasSession =
    store.has(ACCESS_TOKEN_COOKIE) || store.has(REFRESH_TOKEN_COOKIE);

  if (hasSession) redirect("/tracks");

  const { deleted } = await searchParams;

  return (
    <>
      {deleted === "true" && <DeletedAccountToast />}

      <div className="relative isolate flex flex-1 flex-col">
        {/* Camada azul do desktop: cobre conteúdo + footer, para a diagonal atravessar os dois */}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 hidden w-3/5 bg-brand-primary [clip-path:polygon(0_0,calc(100%-12rem)_0,100%_100%,0_100%)] lg:block"
        />

        <main className="relative flex flex-1 flex-col text-center lg:flex-row">
          <section className="flex flex-col bg-brand-primary px-6 pb-24 pt-12 [clip-path:polygon(0_0,100%_0,100%_calc(100%-3rem),0_100%)] lg:w-3/5 lg:shrink-0 lg:bg-transparent lg:py-16 lg:pl-16 lg:pr-56 lg:[clip-path:none]">
            <h1 className="mb-10 mt-8 text-4xl font-bold tracking-tight text-hero-foreground sm:text-5xl lg:mb-32 lg:mt-16">
              AEGIS
            </h1>

            <span className="mb-4 inline-block rounded-2xl border border-hero-border px-4 py-1.5 text-sm font-medium text-hero-foreground">
              Plataforma de apoio ao aprendizado em desenvolvimento de software seguro
            </span>

            <p className="mt-4 text-base text-hero-muted sm:text-lg">
              Aprenda como aplicar segurança no processo de desenvolvimento de
              software na prática, com trilhas guiadas, desafios reais e conteúdo
              pensado para desenvolvedores.
            </p>
          </section>

          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 lg:p-12">
            <Link
              href="/auth/login"
              className="w-full max-w-sm rounded-md bg-brand-primary px-6 py-3 font-medium text-white transition hover:opacity-90"
            >
              Entrar
            </Link>
            <Link
              href="/auth/register"
              className="w-full max-w-sm rounded-md border border-accent px-6 py-3 font-medium text-accent transition hover:bg-accent hover:text-accent-foreground"
            >
              Criar conta
            </Link>
          </div>
        </main>

        <Footer overHero />
      </div>
    </>
  );
}