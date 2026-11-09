export type IntelligenceMode = "DETERMINISTIC" | "OPENROUTER";

export type DataOrigin =
  | "CURATED"
  | "GENERATED"
  | "USER_ENTERED"
  | "EXTERNAL";

export type VerificationStatus = "VERIFIED" | "UNVERIFIED" | "SYNTHETIC";

export interface IntelligenceMetadata {
  mode: IntelligenceMode;
  label: string;
  provider: string;
  scoringModelVersion: string;
  dataOrigin: DataOrigin;
  verificationStatus: VerificationStatus;
}

export const SCORING_MODEL_VERSION = "living-score-v2";

export const DETERMINISTIC_INTELLIGENCE: IntelligenceMetadata = {
  mode: "DETERMINISTIC",
  label: "Deterministic local analysis",
  provider: "phoneindex-rules-engine",
  scoringModelVersion: SCORING_MODEL_VERSION,
  dataOrigin: "GENERATED",
  verificationStatus: "SYNTHETIC",
};
