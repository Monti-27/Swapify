"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const data = [
  { time: "1:00 AM", value: 1182.1 },
  { time: "2:00 AM", value: 1188.4 },
  { time: "3:00 AM", value: 1185.2 },
  { time: "4:00 AM", value: 1192.6 },
  { time: "5:00 AM", value: 1178.4 },
  { time: "6:00 AM", value: 1180.2 },
  { time: "7:00 AM", value: 1175.1 },
  { time: "8:00 AM", value: 1178.9 },
  { time: "9:00 AM", value: 1182.4 },
  { time: "10:00 AM", value: 1180.1 },
  { time: "11:00 PM", value: 1186.4 },
  { time: "12:00 PM", value: 1195.2 },
  { time: "1:00 PM", value: 1188.6 },
  { time: "2:00 PM", value: 1194.2 },
  { time: "3:00 PM", value: 1184.1 },
  { time: "4:00 PM", value: 1190.2 },
  { time: "5:00 PM", value: 1188.4 },
  { time: "6:00 PM", value: 1196.8 },
  { time: "7:00 PM", value: 1194.1 },
  { time: "8:00 PM", value: 1205.4 },
  { time: "9:00 PM", value: 1198.2 },
  { time: "10:00 PM", value: 1210.1 },
  { time: "11:00 PM", value: 1195.4 },
  { time: "12:00 AM", value: 1208.6 },
  { time: "1:00 AM", value: 1212.4 },
  { time: "2:00 PM", value: 1218.4 },
  { time: "3:00 PM", value: 1222.1 },
];

const filters = ["1H", "1D", "1W", "1M", "1Y"];

export default function MainChart() {
  const [activeFilter, setActiveFilter] = React.useState("1H");
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const chartColors = {
    grid: isDark ? '#3F3F46' : '#E4E4E7',
    tick: isDark ? '#A1A1AA' : '#71717A',
    tooltipBg: isDark ? '#27272A' : '#FFFFFF',
    tooltipBorder: isDark ? '#3F3F46' : '#E4E4E7',
    line: isDark ? '#818CF8' : '#5850EC',
  };

  return (
    <div className="bg-swap-card rounded-[1rem] p-6 shadow-card border border-swap-border/50 transition-all flex flex-col h-full min-h-[460px]">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-[2.25rem] font-bold tracking-tight text-swap-foreground leading-tight">
            $1,327,349.19
          </h2>
          <div className="flex items-center gap-1.5 mt-1">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-swap-success mb-0.5"
            >
              <polyline points="7 17 17 7 17 17" />
              <polyline points="7 7 17 7" />
            </svg>
            <span className="text-swap-success text-[0.875rem] font-semibold">
              $2,849.27 (+4%)
            </span>
          </div>
        </div>

        <div className="flex bg-swap-muted/50 p-1 rounded-md gap-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-2.5 py-1 text-[0.75rem] font-medium rounded transition-colors",
                activeFilter === filter
                  ? "bg-swap-card text-swap-foreground shadow-sm"
                  : "text-swap-muted-foreground hover:text-swap-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 w-full min-h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.line} stopOpacity={0.1} />
                <stop offset="95%" stopColor={chartColors.line} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={chartColors.grid}
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartColors.tick, fontSize: 11 }}
              minTickGap={40}
              interval="preserveStartEnd"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis
              hide={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: chartColors.tick, fontSize: 11 }}
              domain={["dataMin - 5", "dataMax + 5"]}
              tickFormatter={(value) => `$${value}k`}
              orientation="left"
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: chartColors.tooltipBg,
                borderRadius: "12px",
                border: `1px solid ${chartColors.tooltipBorder}`,
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                fontSize: "12px",
                padding: "8px 12px",
              }}
              labelStyle={{ color: chartColors.tick, marginBottom: "4px" }}
              itemStyle={{ color: chartColors.line, fontWeight: 600 }}
              formatter={(value: number) => [`$${value.toFixed(2)}k`, "Value"]}
              cursor={{ stroke: chartColors.line, strokeWidth: 1, strokeDasharray: "4 4" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColors.line}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: chartColors.line, strokeWidth: 0 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between mt-2 px-10 text-[10px] text-swap-muted-foreground/60">
        <span>1:00 AM</span>
        <span>11:00 PM</span>
        <span>10:00 PM</span>
        <span>9:00 PM</span>
        <span>8:00 PM</span>
        <span>6:00 PM</span>
        <span>4:00 PM</span>
        <span>2:00 PM</span>
        <span>3:00 PM</span>
      </div>
    </div>
  );
}
