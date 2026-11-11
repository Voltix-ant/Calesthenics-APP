// Le format "aplati" utilisé pendant toute la séance : une entrée par série à faire.
export type SessionStep = {
  exerciseId: number;
  exerciseName: string;
  exerciseType: "reps" | "time";
  setNumber: number;
  totalSets: number;
  targetValue: number; // dernière perf sur cette série, ou objectif programmé si première fois
  previousValue: number | null; // dernière perf sur cette série (null = première fois)
  record: number | null;
  restAfterSeconds: number;
};
