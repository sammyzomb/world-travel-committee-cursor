export type LeaderboardEntry = {
  id: number;
  playerName: string;
  score: number;
  stageReached: string;
  completed: boolean;
};

export type SubmitState = "idle" | "saving" | "saved" | "not-qualified" | "error";
