import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { cookies } from "next/headers";
import Footer from "@/components/layout/Footer";
import "./globals.css";
import { FooterGate } from "@/components/layout/FooterGate";

const montserrat = Montserrat({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AEGIS",
  description: "Plataforma de apoio ao aprendizado sobre segurança de software",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const stored = (await cookies()).get("theme")?.value;
  // allowlist: qualquer valor diferente de light/dark é ignorado
  const theme = stored === "light" || stored === "dark" ? stored : undefined;

  return (
    <html lang="pt-BR" data-theme={theme} className={montserrat.variable}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <FooterGate>
          <div className="mt-auto shrink-0 pt-10">
            <Footer />
          </div>
        </FooterGate>
      </body>
    </html>
  );
}