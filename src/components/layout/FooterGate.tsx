"use client";

import { usePathname } from "next/navigation";

// Rotas de estudo (leitura e exercício)
const HIDDEN_ON = [
  /^\/$/, // a home renderiza o próprio footer
  /^\/tracks\/[^/]+\/nodes\/[^/]+/,
];

export function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (HIDDEN_ON.some((pattern) => pattern.test(pathname))) {
    return null;
  }

  return <>{children}</>;
}