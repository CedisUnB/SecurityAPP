import { getProfileUserAction } from "@/features/auth/actions";
import { ProfileCard } from "@/features/auth/components";
import { getCatalogAction } from "@/features/tracks-engine/actions";
import { ProgressSummary } from "@/features/tracks-engine/components/ProgressSummary";
import { summarizeProgress } from "@/features/tracks-engine/utils/progress";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const result = await getProfileUserAction();

  if (!result.success) {
    if (result.statusCode === 401) {
      redirect("/auth/login?reauth=1");
    }
    if (result.statusCode === 403) {
      throw new Error("403: Acesso não autorizado");
    }
    throw new Error("401: Acesso não autorizado");
  }

  const tracks = await getCatalogAction();
  const summary = summarizeProgress(tracks);

  return (
    <main className="flex flex-col items-center justify-center px-4 py-10 bg-surface flex-1">
      <div className="mb-6 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-foreground">
          Meu Perfil
        </h1>
        <p className="text-sm text-foreground-muted">
          Visualize ou atualize os seus dados cadastrais.
        </p>
      </div>

      <ProfileCard initialUser={result.data} />

      <div className="mt-6 w-full max-w-lg">
        <ProgressSummary summary={summary} />
      </div>
    </main>
  );
}