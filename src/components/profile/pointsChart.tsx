"use client";

import type { FC } from "react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "../ui/chart";

export interface PointsBar {
  name: string;
  points: number;
  selected: boolean;
}

const config = {
  points: {
    label: "Points",
  },
} satisfies ChartConfig;

const barColor = (selected: boolean) =>
  selected ? "var(--primary)" : "color-mix(in oklch, var(--foreground) 16%, transparent)";

export const PointsChart: FC<{ bars: ReadonlyArray<PointsBar> }> = ({ bars }) => {
  const chartData = bars.map((bar) => ({
    ...bar,
    fill: barColor(bar.selected),
  }));

  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{
          left: 0,
          right: 16,
        }}
      >
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} />
        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="points" radius={6} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
};
