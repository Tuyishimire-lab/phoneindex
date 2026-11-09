import { SmartphoneDevice } from "@/lib/seed-data";
import { DEVICE_VISUAL_PROFILES } from "./manifest";
import {
  DeviceVisualProfile,
  ResolvedDeviceVisual,
  VisualCoverageAudit,
  VisualFidelityStatus,
} from "./types";

const FIDELITY_PRESENTATION: Record<
  VisualFidelityStatus,
  { label: string; description: string }
> = {
  VERIFIED_ASSET: {
    label: "Verified visual",
    description: "Calibrated from a reviewed product asset with recorded provenance.",
  },
  VERIFIED_VECTOR: {
    label: "Verified vector",
    description: "Manually reviewed vector geometry matched against authoritative references.",
  },
  APPROXIMATE: {
    label: "Approximate visual",
    description: "Explicit dimensions are available, but appearance still requires asset review.",
  },
  GENERIC_FALLBACK: {
    label: "Generic silhouette",
    description: "Generated from shared model-family heuristics and not visually verified.",
  },
};

export function getVisualFidelityPresentation(status: VisualFidelityStatus) {
  return FIDELITY_PRESENTATION[status];
}

export function getManifestVisualProfile(
  deviceId: string
): DeviceVisualProfile | undefined {
  return DEVICE_VISUAL_PROFILES[deviceId];
}

export function resolveDeviceVisualProfile(
  device: SmartphoneDevice
): ResolvedDeviceVisual {
  const manifestProfile = DEVICE_VISUAL_PROFILES[device.id];

  if (
    manifestProfile?.status === "VERIFIED_ASSET" ||
    manifestProfile?.status === "VERIFIED_VECTOR"
  ) {
    const presentation = FIDELITY_PRESENTATION[manifestProfile.status];
    return {
      deviceId: device.id,
      status: manifestProfile.status,
      renderer: manifestProfile.renderer,
      profile: manifestProfile,
      source: "MANIFEST",
      ...presentation,
    };
  }

  if (device.customProfile) {
    return {
      deviceId: device.id,
      status: "APPROXIMATE",
      renderer: "CALIBRATED_VECTOR",
      source: "USER_PROFILE",
      ...FIDELITY_PRESENTATION.APPROXIMATE,
    };
  }

  if (manifestProfile) {
    return {
      deviceId: device.id,
      status: manifestProfile.status,
      renderer: manifestProfile.renderer,
      profile: manifestProfile,
      source: "MANIFEST",
      ...FIDELITY_PRESENTATION[manifestProfile.status],
    };
  }

  return {
    deviceId: device.id,
    status: "GENERIC_FALLBACK",
    renderer: "LEGACY_HEURISTIC",
    source: "HEURISTIC_FALLBACK",
    ...FIDELITY_PRESENTATION.GENERIC_FALLBACK,
  };
}

export function validateDeviceVisualProfile(profile: DeviceVisualProfile): string[] {
  const issues: string[] = [];
  const { dimensions } = profile;

  if (profile.deviceId.trim() === "") issues.push("Missing device ID.");
  if (profile.review.version < 1) issues.push("Review version must be at least 1.");
  if (!profile.provenance.sourceUrl) issues.push("Missing provenance source URL.");

  if (dimensions.heightMm < 60 || dimensions.heightMm > 250) {
    issues.push(`Implausible height: ${dimensions.heightMm}mm.`);
  }
  if (dimensions.widthMm < 40 || dimensions.widthMm > 300) {
    issues.push(`Implausible width: ${dimensions.widthMm}mm.`);
  }
  if (dimensions.thicknessMm < 3 || dimensions.thicknessMm > 35) {
    issues.push(`Implausible thickness: ${dimensions.thicknessMm}mm.`);
  }

  if (profile.status === "VERIFIED_ASSET") {
    if (!profile.assets?.front || !profile.assets.rear) {
      issues.push("Verified assets require both front and rear views.");
    }
    if (!profile.calibration?.bodyBounds) {
      issues.push("Verified assets require calibrated body bounds.");
    }
    if (!profile.review.reviewedAt || !profile.review.reviewer) {
      issues.push("Verified assets require reviewer and review date.");
    }
  }

  return issues;
}

export function auditVisualCoverage(
  devices: SmartphoneDevice[]
): VisualCoverageAudit {
  const audit: VisualCoverageAudit = {
    totalDevices: devices.length,
    explicitProfiles: 0,
    verifiedAssets: 0,
    verifiedVectors: 0,
    approximate: 0,
    genericFallbacks: 0,
    coveragePct: 0,
    verifiedPct: 0,
    missingDeviceIds: [],
    invalidProfiles: [],
  };

  for (const device of devices) {
    const resolved = resolveDeviceVisualProfile(device);
    if (resolved.profile) {
      audit.explicitProfiles += 1;
      const issues = validateDeviceVisualProfile(resolved.profile);
      if (issues.length) {
        audit.invalidProfiles.push({ deviceId: device.id, issues });
      }
    }

    if (resolved.status === "VERIFIED_ASSET") audit.verifiedAssets += 1;
    if (resolved.status === "VERIFIED_VECTOR") audit.verifiedVectors += 1;
    if (resolved.status === "APPROXIMATE") audit.approximate += 1;
    if (resolved.status === "GENERIC_FALLBACK") {
      audit.genericFallbacks += 1;
      audit.missingDeviceIds.push(device.id);
    }
  }

  audit.coveragePct = Number(
    ((audit.explicitProfiles / Math.max(1, audit.totalDevices)) * 100).toFixed(1)
  );
  audit.verifiedPct = Number(
    (
      ((audit.verifiedAssets + audit.verifiedVectors) /
        Math.max(1, audit.totalDevices)) *
      100
    ).toFixed(1)
  );

  return audit;
}
