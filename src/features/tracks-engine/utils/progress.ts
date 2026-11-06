export const calculateProgress = (completed: number, total: number): number => {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }

  const safeCompleted = Math.min(Math.max(completed, 0), total);

  return Math.round((safeCompleted / total) * 100);
};

type TrackProgressInput = {
  totalNodes: number;
  completedNodes: number;
};

export type ProgressSummaryData = {
  completedNodes: number;
  totalNodes: number;
  percent: number;
  completedTracks: number;
  totalTracks: number;
};

export const summarizeProgress = (
  tracks: TrackProgressInput[],
): ProgressSummaryData => {
  const completedNodes = tracks.reduce((sum, track) => sum + track.completedNodes, 0);
  const totalNodes = tracks.reduce((sum, track) => sum + track.totalNodes, 0);
  const completedTracks = tracks.filter(
    (track) => track.totalNodes > 0 && track.completedNodes === track.totalNodes,
  ).length;

  return {
    completedNodes,
    totalNodes,
    percent: calculateProgress(completedNodes, totalNodes),
    completedTracks,
    totalTracks: tracks.length,
  };
};
