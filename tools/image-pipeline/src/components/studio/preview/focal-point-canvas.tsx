"use client";

import { useState } from "react";

type FocalPointCanvasProps = {
  imageSrc?: string;
  focalPoint?: { x: number; y: number };
  previewMeta?: {
    baseW?: number;
    baseH?: number;
    cropX?: number;
    cropY?: number;
    cropW?: number;
    cropH?: number;
  };
  disabled: boolean;
  onChange: (focalPoint: { x: number; y: number }) => void;
};

export function FocalPointCanvas({
  imageSrc,
  focalPoint,
  previewMeta,
  disabled,
  onChange,
}: FocalPointCanvasProps) {
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  if (!imageSrc) {
    return (
      <div className="relative border border-slate-700 rounded-xl overflow-hidden bg-slate-950 p-8 text-slate-400 text-sm">
        Sin vista previa.
      </div>
    );
  }

  return (
    <button
      type="button"
      className="relative border border-slate-700 rounded-xl overflow-hidden bg-slate-950 w-full p-0"
      disabled={disabled}
      onClick={(event) => {
        if (disabled) return;
        const target = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - target.left) / target.width;
        const y = (event.clientY - target.top) / target.height;
        onChange({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
      }}
      onMouseMove={(event) => {
        if (disabled) return;
        const target = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - target.left) / target.width;
        const y = (event.clientY - target.top) / target.height;
        setHoverPos({ x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) });
      }}
      onMouseLeave={() => setHoverPos(null)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="Vista previa" src={imageSrc} className="w-full block" />
      {previewMeta?.baseW && previewMeta.cropW && previewMeta.cropH ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${previewMeta.baseW} ${previewMeta.baseH}`}
        >
          <defs>
            <mask id="crop-hole">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={previewMeta.cropX}
                y={previewMeta.cropY}
                width={previewMeta.cropW}
                height={previewMeta.cropH}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="black" fillOpacity={0.65} mask="url(#crop-hole)" />
          <rect
            x={previewMeta.cropX}
            y={previewMeta.cropY}
            width={previewMeta.cropW}
            height={previewMeta.cropH}
            fill="none"
            stroke="white"
            strokeWidth={Math.max(1, previewMeta.baseW / 400)}
            strokeDasharray={`${Math.max(4, previewMeta.baseW / 100)},${Math.max(4, previewMeta.baseW / 100)}`}
          />
        </svg>
      ) : null}
      {focalPoint ? (
        <span
          className="canvas-marker z-10"
          style={{ left: `${focalPoint.x * 100}%`, top: `${focalPoint.y * 100}%` }}
        />
      ) : null}
      {hoverPos ? (
        <>
          <div
            className="pointer-events-none absolute left-0 right-0 border-t border-sky-400/60 z-20"
            style={{ top: `${hoverPos.y * 100}%` }}
          />
          <div
            className="pointer-events-none absolute top-0 bottom-0 border-l border-sky-400/60 z-20"
            style={{ left: `${hoverPos.x * 100}%` }}
          />
          {previewMeta?.baseW && previewMeta?.baseH ? (
            <div
              className="pointer-events-none absolute z-30 rounded bg-slate-900/90 px-2 py-1 text-xs font-mono text-slate-200 shadow-xl whitespace-nowrap border border-slate-700"
              style={{
                left: `max(0px, min(100% - 90px, calc(${hoverPos.x * 100}% + 8px)))`,
                top: `max(0px, min(100% - 30px, calc(${hoverPos.y * 100}% + 8px)))`,
              }}
            >
              {Math.round(hoverPos.x * previewMeta.baseW)}x, {Math.round(hoverPos.y * previewMeta.baseH)}y
            </div>
          ) : null}
        </>
      ) : null}
    </button>
  );
}
