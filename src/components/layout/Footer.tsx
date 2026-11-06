import Image from "next/image";
import Link from "next/link";
import cedisLogo from "@assets/cedis.svg";
import softwareParaOBemLogo from "@assets/logo_software_para_o_bem.jpeg";
import unbLogo from "@assets/unb.svg";

const partners = [
  {
    name: "Software para o Bem",
    href: "https://cedis.unb.br/pt/projects/software_bem/",
    logo: softwareParaOBemLogo,
  },
  { name: "CEDIS", href: "https://cedis.unb.br/pt/", logo: cedisLogo },
  { name: "UnB", href: "https://www.unb.br/", logo: unbLogo },
];

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent";

export default function Footer({ overHero = false }: { overHero?: boolean }) {
  const currentYear = new Date().getFullYear();

  // Na home, o lado esquerdo do footer fica sobre o azul (somente em lg+).
  const heroText = overHero ? "lg:text-hero-foreground" : "";
  const heroMuted = overHero ? "lg:text-hero-muted" : "";
  const heroDivider = overHero ? "lg:bg-hero-border" : "";

  return (
    <footer
      className={`w-full border-t border-border text-foreground ${
        overHero ? "relative z-10 bg-transparent" : "bg-surface"
      }`}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Nome do projeto e links */}
        <div className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
          <Link
            href="/"
            className={`text-2xl font-bold tracking-tight text-accent transition-opacity hover:opacity-80 ${heroText} ${focusRing}`}
            aria-label="Ir para a página inicial do AEGIS"
          >
            AEGIS
          </Link>

          <nav aria-label="Links do rodapé">
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm text-foreground-muted transition-colors hover:text-accent ${focusRing}`}
            >
              Política de Privacidade
            </Link>
          </nav>
        </div>

        {/* Apoio e créditos */}
        <div className="border-t border-border pt-6">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex flex-col items-center gap-2 md:items-start">
              <p className={`text-sm font-semibold ${heroText}`}>Apoiado por:</p>
              <ul className="flex flex-wrap items-center justify-center gap-4 md:justify-start">
                {partners.map((partner, index) => (
                  <li key={partner.name} className="flex items-center gap-4">
                    {index > 0 && (
                      <span
                        aria-hidden="true"
                        className={`h-8 w-px bg-border ${heroDivider}`}
                      />
                    )}
                    <a
                      href={partner.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`block transition-transform duration-300 hover:scale-105 ${focusRing}`}
                    >
                      <Image
                        src={partner.logo}
                        alt={`Logo ${partner.name}`}
                        className="h-10 w-auto object-contain drop-shadow-md drop-shadow-black/30"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-center md:text-right">
              <p className="text-sm text-foreground-muted">
                Desenvolvido por{" "}
                <span className="font-semibold text-foreground">
                  João Pedro Morbeck
                </span>{" "}
                e{" "}
                <span className="font-semibold text-foreground">
                  Pedro Henrique Melo
                </span>
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Desenvolvido como parte do Trabalho de Conclusão de Curso
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Orientação: Prof. Dr. George Marsicano Corrêa
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 border-t border-border pt-4 text-center">
          <p className={`text-xs text-foreground-muted ${heroMuted}`}>
            © {currentYear} AEGIS - Universidade de Brasília (UnB)
          </p>
        </div>
      </div>
    </footer>
  );
}