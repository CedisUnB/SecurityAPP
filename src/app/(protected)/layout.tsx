// src/app/(protected)/layout.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/core/security";
import { AppHeader } from "@/components/layout/AppHeader";
import { cookies } from "next/headers";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/auth/login");
  }

  const cookieStore = await cookies();
  const username = cookieStore.get("username")?.value ?? null;
  const role = session.role as string;
  return (
    <>
      <AppHeader user={username} role={role}/>
      {children}
    </>
  );
}