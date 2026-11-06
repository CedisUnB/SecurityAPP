import { redirect } from "next/navigation";
import { getSession } from "@/core/security";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session) {
    redirect("/tracks");
  }

  return <>{children}</>;
}