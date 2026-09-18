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
  selected: {
    label: "Points",
    color: "var(--primary)",
  },
  others: {
    label: "Points",
    color: "color-mix(in oklch, var(--foreground) 16%, transparent)",
  },
} satisfies ChartConfig;

export const PointsChart: FC<{ bars: ReadonlyArray<PointsBar> }> = ({ bars }) => (
  <ChartContainer config={config} className="aspect-auto h-64 w-full">
    <BarChart
      data={bars.map(({ name, points, selected }) => ({
        name,
        selected: selected ? points : 0,
        others: selected ? 0 : points,
      }))}
      layout="vertical"
      margin={{
        left: 0,
        right: 16,
      }}
    >
      <XAxis type="number" hide />
      <YAxis type="category" dataKey="name" width={96} tickLine={false} axisLine={false} />
      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
      <Bar
        dataKey="selected"
        stackId="points"
        fill="var(--color-selected)"
        radius={6}
        maxBarSize={28}
      />
      <Bar
        dataKey="others"
        stackId="points"
        fill="var(--color-others)"
        radius={6}
        maxBarSize={28}
      />
    </BarChart>
  </ChartContainer>
);
