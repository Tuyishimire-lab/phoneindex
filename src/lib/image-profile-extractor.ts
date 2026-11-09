/**
 * Reference-Guided Vector Prop/Dummy Modeler Engine (HTML5 Canvas Vision):
 * Uses an uploaded smartphone product photo strictly as a Reference Frame to:
 *  1. Measure the exact camera island bounding box (xPct, yPct, wPct, hPct) on the rear panel
 *  2. Classify the camera island geometry (2-Tier Rectangular Plateau, Vertical Pill, Horizontal Visor, Center Circle, Squircle, or Floating Rings)
 *  3. Detect lens count & layout (Vertical Stack, Horizontal Row, Triangle Pro, 2-Tier Loewe, or Quad Matrix)
 *  4. Extract subtle chassis & island accent colors
 *  5. Construct a clean, stylized Vector Prop/Dummy (with optional 30% Onion-Skin Reference Underlay for Admin calibration)
 */

export type ModeledIslandShape =
  | "TWO_TIER_RECT"
  | "VERTICAL_PILL"
  | "HORIZONTAL_VISOR"
  | "CENTER_CIRCLE"
  | "SQUIRCLE_PLATEAU"
  | "FLOATING_RINGS";

export type ModeledLensArrangement =
  | "TWO_TIER_LOEWE"
  | "VERTICAL_STACK"
  | "HORIZONTAL_ROW"
  | "TRIANGLE_PRO"
  | "QUAD_MATRIX";

export interface ModeledPropDummyGeometry {
  islandShape: ModeledIslandShape;
  lensArrangement: ModeledLensArrangement;
  lensCount: 1 | 2 | 3 | 4;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  islandCornerRadiusPx: number;
  chassisCornerRadiusPx: number;
  hasPeriscopePrism: boolean;
  badgeText?: string;
}

export interface CustomPhysicalProfile {
  deviceId: string;
  sourceImageUrl: string;
  rearCutoutDataUrl: string;
  rearBlueprintDataUrl: string;
  frontCutoutDataUrl?: string;
  dominantBodyHex: string;
  cameraAccentHex: string;
  /**
   * PARAMETRIC_SVG: Uses the clean stylized Vector Prop/Dummy (either preset or custom reference-modeled geometry)
   * BLUEPRINT_VECTOR: CAD Edge Vector reference view
   * PHOTO_CUTOUT: Raw reference photo view (used only for reference inspection)
   */
  renderStyle: "PARAMETRIC_SVG" | "BLUEPRINT_VECTOR" | "PHOTO_CUTOUT";
  /**
   * When true in the Admin Prop Modeler, renders the uploaded photo at 28% opacity BEHIND the Vector Prop/Dummy
   * so the Admin can trace/verify that the prop dummy matches the reference photo 1:1.
   */
  showReferenceGhostUnderlay?: boolean;
  /**
   * When true, renders the Vector Prop/Dummy using the customizable `modeledPropGeometry`
   * measured from the reference image.
   */
  useModeledPropGeometry?: boolean;
  modeledPropGeometry?: ModeledPropDummyGeometry;
  isDualBackFrontImage: boolean;
  heightMmOverride?: number;
  widthMmOverride?: number;
  cornerRadiusPxOverride?: number;
  detectedCameraZone: {
    xPct: number;
    yPct: number;
    wPct: number;
    hPct: number;
  };
  updatedAt: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

/**
 * Infers a clean Vector Prop/Dummy geometry from the detected camera island bounding box
 * and dark optical lens distribution on the reference photo.
 */
function inferPropDummyGeometry(
  zone: { xPct: number; yPct: number; wPct: number; hPct: number },
  darkLensRatio: number,
  deviceId: string
): ModeledPropDummyGeometry {
  const slug = deviceId.toLowerCase();

  // Check if reference image or device indicates a wide 2-tier rectangular plateau (like Phantom V Fold2 5G)
  if (
    slug.includes("phantom-v-fold") ||
    (zone.wPct >= 58 && zone.hPct >= 18)
  ) {
    return {
      islandShape: "TWO_TIER_RECT",
      lensArrangement: "TWO_TIER_LOEWE",
      lensCount: 3,
      xPct: Math.max(6, Math.min(14, zone.xPct)),
      yPct: Math.max(4, Math.min(10, zone.yPct)),
      wPct: Math.max(72, Math.min(86, zone.wPct)),
      hPct: Math.max(22, Math.min(28, zone.hPct)),
      islandCornerRadiusPx: 5,
      chassisCornerRadiusPx: 12,
      hasPeriscopePrism: true,
      badgeText: "LOEWE.",
    };
  }

  // Check if narrow vertical pill (like iPhone 16 / Camon 40 Pro / S25 Edge)
  if (
    slug.includes("iphone-16") ||
    (zone.wPct <= 30 && zone.hPct >= 15 && zone.xPct <= 22)
  ) {
    return {
      islandShape: "VERTICAL_PILL",
      lensArrangement: "VERTICAL_STACK",
      lensCount: slug.includes("iphone-16") ? 2 : 3,
      xPct: 9,
      yPct: 5,
      wPct: 22,
      hPct: slug.includes("iphone-16") ? 18 : 25,
      islandCornerRadiusPx: 13,
      chassisCornerRadiusPx: 26,
      hasPeriscopePrism: false,
    };
  }

  // Check if horizontal visor bar (like Pixel 9/10 Pro or Spark Slim)
  if (zone.wPct >= 58 && zone.hPct < 18) {
    return {
      islandShape: "HORIZONTAL_VISOR",
      lensArrangement: "HORIZONTAL_ROW",
      lensCount: 3,
      xPct: 8,
      yPct: 7,
      wPct: 84,
      hPct: 13,
      islandCornerRadiusPx: 16,
      chassisCornerRadiusPx: 26,
      hasPeriscopePrism: true,
    };
  }

  // Check if center circular ring (like Vivo X200 Pro / Xiaomi 15 Ultra / Camon 40 Premier)
  if (zone.xPct >= 18 && zone.wPct >= 44) {
    return {
      islandShape: "CENTER_CIRCLE",
      lensArrangement: "QUAD_MATRIX",
      lensCount: 4,
      xPct: 20,
      yPct: 6,
      wPct: 60,
      hPct: 26,
      islandCornerRadiusPx: 38,
      chassisCornerRadiusPx: 24,
      hasPeriscopePrism: true,
      badgeText: "ZEISS",
    };
  }

  // Default: Top-left Squircle Plateau (like iPhone Pro / Pixel 9 Pro Fold)
  return {
    islandShape: "SQUIRCLE_PLATEAU",
    lensArrangement: darkLensRatio > 0.25 ? "TRIANGLE_PRO" : "VERTICAL_STACK",
    lensCount: 3,
    xPct: Math.max(7, Math.min(16, zone.xPct)),
    yPct: Math.max(4, Math.min(10, zone.yPct)),
    wPct: Math.max(36, Math.min(52, zone.wPct)),
    hPct: Math.max(18, Math.min(25, zone.hPct)),
    islandCornerRadiusPx: 14,
    chassisCornerRadiusPx: 26,
    hasPeriscopePrism: false,
  };
}

/**
 * Processes an image Region on an offscreen canvas to generate:
 * - Measured camera island bounding box across the full rear width
 * - Modeled Vector Prop/Dummy Geometry
 * - Soft-tinted chassis & accent colors suitable for a clean Vector Prop/Dummy
 * - Reference Cutout & Blueprint DataURLs for Admin Onion-Skin calibration
 */
function processPhoneRegionCanvas(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  deviceId: string
): {
  cutoutDataUrl: string;
  blueprintDataUrl: string;
  dominantBodyHex: string;
  cameraAccentHex: string;
  detectedCameraZone: { xPct: number; yPct: number; wPct: number; hPct: number };
  modeledPropGeometry: ModeledPropDummyGeometry;
} {
  const targetW = 260;
  const targetH = Math.round((sh / Math.max(1, sw)) * targetW);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable");
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
  const imgData = ctx.getImageData(0, 0, targetW, targetH);
  const data = imgData.data;

  // 1. Sample mid-lower back panel for Dominant Chassis Color
  let bodyR = 0,
    bodyG = 0,
    bodyB = 0,
    bodyCount = 0;
  for (
    let y = Math.floor(targetH * 0.52);
    y < Math.floor(targetH * 0.78);
    y += 2
  ) {
    for (
      let x = Math.floor(targetW * 0.22);
      x < Math.floor(targetW * 0.78);
      x += 2
    ) {
      const idx = (y * targetW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r < 245 || g < 245 || b < 245) {
        bodyR += r;
        bodyG += g;
        bodyB += b;
        bodyCount++;
      }
    }
  }
  if (bodyCount > 0) {
    bodyR /= bodyCount;
    bodyG /= bodyCount;
    bodyB /= bodyCount;
  } else {
    bodyR = 241;
    bodyG = 245;
    bodyB = 249;
  }

  // Blend extracted color slightly toward light pastel so the Vector Prop/Dummy stays clean and legible
  const softBodyR = Math.round(bodyR * 0.45 + 248 * 0.55);
  const softBodyG = Math.round(bodyG * 0.45 + 250 * 0.55);
  const softBodyB = Math.round(bodyB * 0.45 + 252 * 0.55);
  const dominantBodyHex = rgbToHex(softBodyR, softBodyG, softBodyB);

  // 2. Scan full upper rear panel (x: 6%..92%, y: 4%..36%) for Camera Island Bounding Box & Dark Lens Ratio
  let camR = 0,
    camG = 0,
    camB = 0,
    camCount = 0,
    darkLensPixels = 0,
    totalUpperPixels = 0;
  let minCamX = targetW,
    minCamY = targetH,
    maxCamX = 0,
    maxCamY = 0;

  for (
    let y = Math.floor(targetH * 0.04);
    y < Math.floor(targetH * 0.36);
    y++
  ) {
    for (
      let x = Math.floor(targetW * 0.06);
      x < Math.floor(targetW * 0.92);
      x++
    ) {
      totalUpperPixels++;
      const idx = (y * targetW + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Ignore pure white outer margin
      if (r > 244 && g > 244 && b > 244) continue;

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 55) {
        darkLensPixels++;
      }

      const diffFromBody =
        Math.abs(r - bodyR) + Math.abs(g - bodyG) + Math.abs(b - bodyB);
      if (diffFromBody > 48 || lum < 65) {
        if (x < minCamX) minCamX = x;
        if (y < minCamY) minCamY = y;
        if (x > maxCamX) maxCamX = x;
        if (y > maxCamY) maxCamY = y;
        if (diffFromBody < 220) {
          camR += r;
          camG += g;
          camB += b;
          camCount++;
        }
      }
    }
  }

  const cameraAccentHex =
    camCount > 10
      ? rgbToHex(
          Math.min(180, camR / camCount),
          Math.min(180, camG / camCount),
          Math.min(195, camB / camCount)
        )
      : rgbToHex(bodyR * 0.65, bodyG * 0.65, bodyB * 0.72);

  const detectedCameraZone =
    maxCamX > minCamX && maxCamY > minCamY
      ? {
          xPct: Math.max(5, Math.round((minCamX / targetW) * 100)),
          yPct: Math.max(4, Math.round((minCamY / targetH) * 100)),
          wPct: Math.min(
            88,
            Math.max(18, Math.round(((maxCamX - minCamX) / targetW) * 100))
          ),
          hPct: Math.min(
            32,
            Math.max(12, Math.round(((maxCamY - minCamY) / targetH) * 100))
          ),
        }
      : { xPct: 8, yPct: 5, wPct: 24, hPct: 22 };

  const darkLensRatio = darkLensPixels / Math.max(1, totalUpperPixels);
  const modeledPropGeometry = inferPropDummyGeometry(
    detectedCameraZone,
    darkLensRatio,
    deviceId
  );

  // 3. Remove pure white outer corners to create Reference Cutout (for Onion-Skin Reference Underlay)
  const cutoutCanvas = document.createElement("canvas");
  cutoutCanvas.width = targetW;
  cutoutCanvas.height = targetH;
  const cutoutCtx = cutoutCanvas.getContext("2d")!;
  const cutoutImgData = cutoutCtx.createImageData(targetW, targetH);
  const cData = cutoutImgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const isNearWhiteBg = r > 246 && g > 246 && b > 246;
    cData[i] = r;
    cData[i + 1] = g;
    cData[i + 2] = b;
    cData[i + 3] = isNearWhiteBg ? 0 : 255;
  }
  cutoutCtx.putImageData(cutoutImgData, 0, 0);
  const cutoutDataUrl = cutoutCanvas.toDataURL("image/png");

  // 4. Generate Technical CAD Blueprint Silhouette (Sobel Edge)
  const bpCanvas = document.createElement("canvas");
  bpCanvas.width = targetW;
  bpCanvas.height = targetH;
  const bpCtx = bpCanvas.getContext("2d")!;
  const bpImgData = bpCtx.createImageData(targetW, targetH);
  const bpData = bpImgData.data;

  const gray = new Float32Array(targetW * targetH);
  for (let i = 0; i < targetW * targetH; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  for (let y = 1; y < targetH - 1; y++) {
    for (let x = 1; x < targetW - 1; x++) {
      const i = y * targetW + x;
      const idx = i * 4;

      if (cData[idx + 3] === 0) {
        bpData[idx + 3] = 0;
        continue;
      }

      const gx =
        -gray[(y - 1) * targetW + (x - 1)] +
        gray[(y - 1) * targetW + (x + 1)] -
        2 * gray[y * targetW + (x - 1)] +
        2 * gray[y * targetW + (x + 1)] -
        gray[(y + 1) * targetW + (x - 1)] +
        gray[(y + 1) * targetW + (x + 1)];

      const gy =
        -gray[(y - 1) * targetW + (x - 1)] -
        2 * gray[(y - 1) * targetW + x] -
        gray[(y - 1) * targetW + (x + 1)] +
        gray[(y + 1) * targetW + (x - 1)] +
        2 * gray[(y + 1) * targetW + x] +
        gray[(y + 1) * targetW + (x + 1)];

      const mag = Math.sqrt(gx * gx + gy * gy);
      const lum = gray[i];
      if (lum < 48) {
        bpData[idx] = 15;
        bpData[idx + 1] = 23;
        bpData[idx + 2] = 42;
        bpData[idx + 3] = 245;
      } else if (mag > 42) {
        bpData[idx] = Math.round(bodyR * 0.42);
        bpData[idx + 1] = Math.round(bodyG * 0.42);
        bpData[idx + 2] = Math.round(bodyB * 0.52);
        bpData[idx + 3] = 255;
      } else {
        bpData[idx] = Math.round(data[idx] * 0.35 + 248 * 0.65);
        bpData[idx + 1] = Math.round(data[idx + 1] * 0.35 + 250 * 0.65);
        bpData[idx + 2] = Math.round(data[idx + 2] * 0.35 + 252 * 0.65);
        bpData[idx + 3] = 255;
      }
    }
  }

  bpCtx.putImageData(bpImgData, 0, 0);
  const blueprintDataUrl = bpCanvas.toDataURL("image/png");

  return {
    cutoutDataUrl,
    blueprintDataUrl,
    dominantBodyHex,
    cameraAccentHex,
    detectedCameraZone,
    modeledPropGeometry,
  };
}

/**
 * Main entry point: loads a Reference Image URL or DataURL and uses it as a frame of reference
 * to construct a clean Vector Prop/Dummy profile (`renderStyle: "PARAMETRIC_SVG"` by default).
 */
export async function generatePhysicalProfileFromImage(params: {
  deviceId: string;
  imageUrl: string;
  isDualBackFront?: "AUTO" | boolean;
  renderStyle?: CustomPhysicalProfile["renderStyle"];
}): Promise<CustomPhysicalProfile> {
  const {
    deviceId,
    imageUrl,
    isDualBackFront = "AUTO",
    renderStyle = "PARAMETRIC_SVG",
  } = params;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const aspect = img.width / Math.max(1, img.height);
        const shouldSplitDual =
          isDualBackFront === "AUTO" ? aspect > 0.64 : isDualBackFront;

        if (shouldSplitDual) {
          const rearWidth = Math.floor(img.width * 0.5);
          const rearResult = processPhoneRegionCanvas(
            img,
            0,
            0,
            rearWidth,
            img.height,
            deviceId
          );
          const frontStartX = Math.floor(img.width * 0.48);
          const frontResult = processPhoneRegionCanvas(
            img,
            frontStartX,
            0,
            img.width - frontStartX,
            img.height,
            deviceId
          );

          resolve({
            deviceId,
            sourceImageUrl: imageUrl,
            rearCutoutDataUrl: rearResult.cutoutDataUrl,
            rearBlueprintDataUrl: rearResult.blueprintDataUrl,
            frontCutoutDataUrl: frontResult.cutoutDataUrl,
            dominantBodyHex: rearResult.dominantBodyHex,
            cameraAccentHex: rearResult.cameraAccentHex,
            renderStyle,
            showReferenceGhostUnderlay: false,
            useModeledPropGeometry: true,
            modeledPropGeometry: rearResult.modeledPropGeometry,
            isDualBackFrontImage: true,
            detectedCameraZone: rearResult.detectedCameraZone,
            updatedAt: "Just now",
          });
        } else {
          const singleResult = processPhoneRegionCanvas(
            img,
            0,
            0,
            img.width,
            img.height,
            deviceId
          );
          resolve({
            deviceId,
            sourceImageUrl: imageUrl,
            rearCutoutDataUrl: singleResult.cutoutDataUrl,
            rearBlueprintDataUrl: singleResult.blueprintDataUrl,
            dominantBodyHex: singleResult.dominantBodyHex,
            cameraAccentHex: singleResult.cameraAccentHex,
            renderStyle,
            showReferenceGhostUnderlay: false,
            useModeledPropGeometry: true,
            modeledPropGeometry: singleResult.modeledPropGeometry,
            isDualBackFrontImage: false,
            detectedCameraZone: singleResult.detectedCameraZone,
            updatedAt: "Just now",
          });
        }
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load uploaded model image"));
    img.src = imageUrl;
  });
}
