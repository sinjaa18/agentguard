export type ReliabilityScore = {
  overall: number;
  grade: string;
  taskSuccess: number;
  toolSafety: number;
  instructionFollowing: number;
  adversarialRobustness: number;
  hallucinationResistance: number;
  goalStability: number;
  security: number;
};
