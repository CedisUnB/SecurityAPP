import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrackMapAction } from "@/features/tracks-engine/actions";
import { TrackMap } from "@/features/tracks-engine/components";

interface TrackPageProps {
  params: Promise<{ trackId: string }>;
  searchParams: Promise<{ focus?: string }>;
}

export default async function TrackPage({
  params,
  searchParams,
}: TrackPageProps) {
  const [{ trackId }, { focus }] = await Promise.all([params, searchParams]);
  const track = await getTrackMapAction({ trackId, focus });

  if (!track) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="mb-4 w-full max-w-3xl">
        <Link
          href="/tracks"
          className="inline-flex min-h-10 items-center rounded-lg px-3 py-2 text-sm font-semibold text-accent transition hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-secondary"
        >
          <span aria-hidden="true" className="mr-2">
            ←
          </span>
          Voltar ao catálogo de trilhas
        </Link>
      </div>
      <TrackMap track={track} />
    </main>
  );
}
