import { SignUpForm } from "@/features/auth/components";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="flex flex-1 flex-col bg-surface px-4">
      <Link
        href="/"
        className="mt-6 text-4xl font-bold tracking-tight text-brand-primary sm:mt-10 sm:ml-6 sm:text-5xl"
      >
        AEGIS
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <h2 className="mb-6 text-center text-2xl font-semibold text-foreground sm:mt-6">
            Crie sua conta
          </h2>

          <SignUpForm />
        </div>
      </div>
    </main>
  );
}