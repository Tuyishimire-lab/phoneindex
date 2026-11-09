import fs from "fs";
import path from "path";

export const PROJECT_ROOT = path.resolve(__dirname, "../../..");

export function fileExists(relativeWorkspacePath: string): boolean {
  const fullPath = path.resolve(PROJECT_ROOT, relativeWorkspacePath);
  return fs.existsSync(fullPath);
}

export function readFileContent(relativeWorkspacePath: string): string {
  const fullPath = path.resolve(PROJECT_ROOT, relativeWorkspacePath);
  if (!fs.existsSync(fullPath)) {
    return "";
  }
  return fs.readFileSync(fullPath, "utf-8");
}

export async function safeImport<T>(modulePath: string): Promise<T | null> {
  try {
    return (await import(modulePath)) as T;
  } catch {
    return null;
  }
}

/**
 * Normalizes slug according to Feature #19 specification:
 * Maps '+' to '-plus', strips invalid characters, removes boundary dashes.
 */
export function canonicalNormalizeSlug(brand: string, name: string): string {
  return `${brand}-${name}`
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * XML escape utility for prompt injection protection (Feature #29)
 */
export function sanitizeDebatePrompt(query: string): string {
  return query
    .slice(0, 500)
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Deterministic Battery Endurance Simulation formula (Feature #32)
 */
export const REFERENCE_NODE_EFFICIENCY: Record<string, number> = {
  "3nm": 0.85,
  "4nm": 1.00,
  "5nm": 1.20,
  "6nm": 1.30,
  "7nm": 1.45,
  "12nm+": 1.80,
};

export const DEFAULT_CHASSIS_IDLE_POWER_MW = 180;

export function calculateReferenceEnduranceHours(
  capacityMah: number,
  node: string,
  displayAreaInch2: number,
  panelCoeff: number,
  chassisIdlePower = DEFAULT_CHASSIS_IDLE_POWER_MW
): number {
  const nodeFactor = REFERENCE_NODE_EFFICIENCY[node] ?? 1.30;
  const powerTotalMw =
    chassisIdlePower + nodeFactor * 950 + displayAreaInch2 * panelCoeff;
  const energyMwh = capacityMah * 3.85;
  return Number((energyMwh / powerTotalMw).toFixed(2));
}

/**
 * Deterministic Acoustic Loudness Simulation formula (Feature #33)
 */
export function calculateReferenceAcoustics(
  widthMm: number,
  heightMm: number,
  thicknessMm: number,
  isStereo: boolean
): { lufs: number; loudnessClass: "VERY_GOOD" | "GOOD" | "POOR" } {
  const volumeCm3 = (widthMm * heightMm * thicknessMm) / 1000;
  if (isStereo) {
    if (volumeCm3 > 75) {
      return { lufs: -24.5, loudnessClass: "VERY_GOOD" };
    } else {
      return { lufs: -26.2, loudnessClass: "GOOD" };
    }
  }
  return { lufs: -29.0, loudnessClass: "POOR" };
}
