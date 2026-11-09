"use client";

import React from "react";

interface RadarChartProps {
  siliconScore: number;
  cameraScore: number;
  pragmatistScore: number;
  dailyDriverScore: number;
  compareScores?: {
    siliconScore: number;
    cameraScore: number;
    pragmatistScore: number;
    dailyDriverScore: number;
    name: string;
  };
  primaryName: string;
}

export function RadarChart({
  siliconScore,
  cameraScore,
  pragmatistScore,
  dailyDriverScore,
  compareScores,
  primaryName,
}: RadarChartProps) {
  const size = 240;
  const center = size / 2;
  const radius = 78;

  const getPoint = (score: number, axisIndex: number) => {
    const normalized = Math.max(0, Math.min(10, score)) / 10;
    const angle = (Math.PI / 2) * axisIndex - Math.PI / 2;
    const r = normalized * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const primaryPoints = [
    getPoint(siliconScore, 0),
    getPoint(cameraScore, 1),
    getPoint(pragmatistScore, 2),
    getPoint(dailyDriverScore, 3),
  ];

  const primaryPolygon = primaryPoints.map((p) => `${p.x},${p.y}`).join(" ");

  const comparePoints = compareScores
    ? [
        getPoint(compareScores.siliconScore, 0),
        getPoint(compareScores.cameraScore, 1),
        getPoint(compareScores.pragmatistScore, 2),
        getPoint(compareScores.dailyDriverScore, 3),
      ]
    : null;

  const comparePolygon = comparePoints
    ? comparePoints.map((p) => `${p.x},${p.y}`).join(" ")
    : "";

  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Concentric diamond rings */}
        {rings.map((ring) => {
          const pts = [0, 1, 2, 3]
            .map((idx) => {
              const p = getPoint(ring * 10, idx);
              return `${p.x},${p.y}`;
            })
            .join(" ");
          return (
            <polygon
              key={ring}
              points={pts}
              fill={ring === 1 ? "rgba(248, 250, 252, 0.6)" : "none"}
              stroke="rgba(148, 163, 184, 0.35)"
              strokeWidth="1"
              strokeDasharray={ring < 1 ? "2 2" : undefined}
            />
          );
        })}

        {/* Axis lines */}
        {[0, 1, 2, 3].map((idx) => {
          const end = getPoint(10, idx);
          return (
            <line
              key={idx}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="rgba(148, 163, 184, 0.4)"
              strokeWidth="1"
            />
          );
        })}

        {/* Optional comparison polygon */}
        {comparePoints && (
          <>
            <polygon
              points={comparePolygon}
              fill="rgba(219, 39, 119, 0.12)"
              stroke="#db2777"
              strokeWidth="2"
              strokeDasharray="4 2"
            />
            {comparePoints.map((p, i) => (
              <circle
                key={`cmp-${i}`}
                cx={p.x}
                cy={p.y}
                r="3.5"
                fill="#db2777"
              />
            ))}
          </>
        )}

        {/* Primary polygon */}
        <polygon
          points={primaryPolygon}
          fill="rgba(2, 132, 199, 0.16)"
          stroke="#0284c7"
          strokeWidth="2.2"
        />
        {primaryPoints.map((p, i) => (
          <circle
            key={`pri-${i}`}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#0284c7"
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        ))}

        {/* Axis Labels */}
        <text
          x={center}
          y={18}
          textAnchor="middle"
          className="fill-sky-700 text-[10px] font-bold tracking-wider uppercase"
        >
          Silicon ({siliconScore})
        </text>
        <text
          x={size - 6}
          y={center + 3}
          textAnchor="end"
          className="fill-pink-700 text-[10px] font-bold tracking-wider uppercase"
        >
          Camera ({cameraScore})
        </text>
        <text
          x={center}
          y={size - 10}
          textAnchor="middle"
          className="fill-emerald-700 text-[10px] font-bold tracking-wider uppercase"
        >
          Value ({pragmatistScore})
        </text>
        <text
          x={6}
          y={center + 3}
          textAnchor="start"
          className="fill-amber-700 text-[10px] font-bold tracking-wider uppercase"
        >
          Daily ({dailyDriverScore})
        </text>
      </svg>

      {compareScores && (
        <div className="mt-1 flex items-center gap-4 text-[11px] font-medium text-slate-600">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
            {primaryName}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pink-600" />
            {compareScores.name}
          </span>
        </div>
      )}
    </div>
  );
}
