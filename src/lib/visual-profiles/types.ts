export type VisualFidelityStatus =
  | "VERIFIED_ASSET"
  | "VERIFIED_VECTOR"
  | "APPROXIMATE"
  | "GENERIC_FALLBACK";

export type VisualRendererKind =
  | "OEM_ASSET"
  | "CALIBRATED_VECTOR"
  | "LEGACY_HEURISTIC";

export interface NormalizedRect {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
}

export interface DeviceVisualDimensions {
  heightMm: number;
  widthMm: number;
  thicknessMm: number;
  cameraBumpMm?: number;
  cornerRadiusMm?: number;
  folded?: {
    heightMm: number;
    widthMm: number;
    thicknessMm: number;
  };
  unfolded?: {
    heightMm: number;
    widthMm: number;
    thicknessMm: number;
  };
}

export interface DeviceVisualAssets {
  front?: string;
  rear?: string;
  leftSide?: string;
  rightSide?: string;
  folded?: string;
  unfolded?: string;
  referenceComposite?: string;
}

export interface CameraVisualElement {
  id: string;
  kind: "LENS" | "FLASH" | "LIDAR" | "LASER_AF" | "SENSOR";
  xPct: number;
  yPct: number;
  diameterPct: number;
  shape: "CIRCLE" | "RECTANGLE" | "PILL";
}

export interface DeviceVisualProfile {
  deviceId: string;
  variantId: string;
  status: Exclude<VisualFidelityStatus, "GENERIC_FALLBACK">;
  renderer: Exclude<VisualRendererKind, "LEGACY_HEURISTIC"> | "LEGACY_HEURISTIC";
  dimensions: DeviceVisualDimensions;
  assets?: DeviceVisualAssets;
  calibration?: {
    bodyBounds: NormalizedRect;
    displayBounds?: NormalizedRect;
    cameraBounds?: NormalizedRect;
  };
  cameraElements?: CameraVisualElement[];
  provenance: {
    sourceType:
      | "OEM_PRESS_ASSET"
      | "OEM_CAD"
      | "MANUAL_TRACE"
      | "LOCAL_REFERENCE"
      | "CATALOG_SPEC";
    sourceUrl: string;
    retrievedAt: string;
    license?: string;
  };
  review: {
    version: number;
    reviewedAt?: string;
    reviewer?: string;
    notes?: string;
  };
}

export interface ResolvedDeviceVisual {
  deviceId: string;
  status: VisualFidelityStatus;
  renderer: VisualRendererKind;
  label: string;
  description: string;
  profile?: DeviceVisualProfile;
  source: "MANIFEST" | "USER_PROFILE" | "HEURISTIC_FALLBACK";
}

export interface VisualCoverageAudit {
  totalDevices: number;
  explicitProfiles: number;
  verifiedAssets: number;
  verifiedVectors: number;
  approximate: number;
  genericFallbacks: number;
  coveragePct: number;
  verifiedPct: number;
  missingDeviceIds: string[];
  invalidProfiles: Array<{ deviceId: string; issues: string[] }>;
}
