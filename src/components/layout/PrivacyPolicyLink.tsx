import Link from "next/link";

export function PrivacyPolicyLink() {
  return (
    <Link
      href="/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium text-accent underline-offset-2 hover:underline"
    >
      Política de Privacidade
    </Link>
  );
}