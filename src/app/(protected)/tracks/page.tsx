import { TracksCatalog } from "@/features/tracks-engine/components";
import { getCatalogAction } from "@/features/tracks-engine/actions";

export default async function TracksPage() {
  const tracks = await getCatalogAction();

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Trilhas disponíveis</h1>
      <TracksCatalog tracks={tracks} />
    </main>
  );
}
