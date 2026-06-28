"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { CalibrationBin } from "@/lib/calibration";

interface Props {
  curve: CalibrationBin[];
}

interface Point {
  x: number;
  y: number;
  count: number;
  label: string;
}

const ACCENT = "#4f46e5";

export default function CalibrationChart({ curve }: Props) {
  const points: Point[] = curve
    .filter((b) => b.count > 0 && b.meanPredicted !== null && b.observedFrequency !== null)
    .map((b) => ({
      x: b.meanPredicted!,
      y: b.observedFrequency!,
      count: b.count,
      label: b.label,
    }));

  if (points.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">
        No resolved predictions yet — resolve a few to see your calibration.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ececef" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 11, fill: "#9a9aa6" }}
              stroke="#e6e6ea"
              label={{
                value: "Predicted probability",
                position: "bottom",
                fontSize: 12,
                fill: "#6c6c78",
              }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 1]}
              ticks={[0, 0.2, 0.4, 0.6, 0.8, 1]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 11, fill: "#9a9aa6" }}
              stroke="#e6e6ea"
              label={{
                value: "Observed",
                angle: -90,
                position: "insideLeft",
                fontSize: 12,
                fill: "#6c6c78",
              }}
            />
            <ZAxis type="number" dataKey="count" range={[70, 460]} name="n" />
            {/* Perfect calibration: predicted == observed. */}
            <ReferenceLine
              segment={[
                { x: 0, y: 0 },
                { x: 1, y: 1 },
              ]}
              stroke="#b9b9c2"
              strokeDasharray="5 5"
              ifOverflow="extendDomain"
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3", stroke: "#cfcfd6" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0].payload as Point;
                return (
                  <div className="rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-card">
                    <div className="mb-0.5 font-semibold text-ink">
                      {p.label} bucket
                    </div>
                    <div className="text-muted">
                      Predicted avg:{" "}
                      <span className="font-mono text-ink">
                        {Math.round(p.x * 100)}%
                      </span>
                    </div>
                    <div className="text-muted">
                      Actually happened:{" "}
                      <span className="font-mono text-ink">
                        {Math.round(p.y * 100)}%
                      </span>
                    </div>
                    <div className="text-faint">n = {p.count}</div>
                  </div>
                );
              }}
            />
            <Scatter
              data={points}
              fill={ACCENT}
              fillOpacity={0.7}
              stroke={ACCENT}
              strokeWidth={1}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-xs text-faint">
        On the dashed line = perfectly calibrated · above = underconfident · below
        = overconfident · bigger dots = more predictions
      </p>
    </div>
  );
}
