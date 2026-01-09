"use client";

import { LabelList, Pie, PieChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, TrendingUp } from "lucide-react";
import type { RiskLevel } from "@/types/api";

interface RoundedRiskChartProps {
    score: number;
    riskLevel: RiskLevel;
    metrics: {
        avgTps: number;
        burstCount: number;
        failedTxCount: number;
        txCount: number;
        circularCount: number;
    };
}

export function RoundedRiskChart({ score, riskLevel, metrics }: RoundedRiskChartProps) {
    // Generate segments based on metrics to give it that "institutional" breakdown look
    const totalWeight = metrics.avgTps + metrics.burstCount + metrics.circularCount + (metrics.failedTxCount / 10) + 1;
    
    const chartData = [
        { 
            category: "execution", 
            value: Math.max(10, (metrics.avgTps * 10)), 
            fill: "var(--color-execution)",
            label: "Execution"
        },
        { 
            category: "automation", 
            value: Math.max(10, metrics.burstCount * 5), 
            fill: "var(--color-automation)",
            label: "Automation"
        },
        { 
            category: "integrity", 
            value: Math.max(10, (metrics.failedTxCount * 2)), 
            fill: "var(--color-integrity)",
            label: "Integrity"
        },
        { 
            category: "lineage", 
            value: Math.max(10, metrics.circularCount * 20), 
            fill: "var(--color-lineage)",
            label: "Lineage"
        },
        { 
            category: "network", 
            value: 15, 
            fill: "var(--color-network)",
            label: "Network"
        },
    ];

    const chartConfig = {
        value: {
            label: "Risk Weight",
        },
        execution: {
            label: "Execution",
            color: "hsl(217 91% 60%)", // Vibrant Blue
        },
        automation: {
            label: "Automation",
            color: "hsl(271 91% 65%)", // Vibrant Purple
        },
        integrity: {
            label: "Integrity",
            color: "hsl(142 71% 45%)", // Vibrant Green
        },
        lineage: {
            label: "Lineage",
            color: "hsl(31 97% 55%)", // Vibrant Orange
        },
        network: {
            label: "Network",
            color: "hsl(346 84% 61%)", // Vibrant Pink/Red
        },
    } satisfies ChartConfig;

    const riskColor = 
        riskLevel === 'CRITICAL' ? 'text-red-500' :
        riskLevel === 'HIGH' ? 'text-orange-500' :
        riskLevel === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500';

    const riskBg = 
        riskLevel === 'CRITICAL' ? 'bg-red-500/10' :
        riskLevel === 'HIGH' ? 'bg-orange-500/10' :
        riskLevel === 'MEDIUM' ? 'bg-amber-500/10' : 'bg-emerald-500/10';

    return (
        <Card className="flex flex-col bg-transparent border-none shadow-none w-full max-w-[400px]">
            <CardHeader className="items-start pb-0 space-y-2">
                <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl font-bold tracking-tight">Risk Analysis</CardTitle>
                    <Badge
                        variant="secondary"
                        className={`${riskColor} ${riskBg} border-none px-2 py-0.5 flex items-center gap-1`}
                    >
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs font-bold">{riskLevel}</span>
                    </Badge>
                </div>
                <CardDescription className="text-sm font-medium text-muted-foreground">
                    Real-time Threat Assessment Breakdown
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[300px] w-full"
                >
                    <PieChart>
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="category"
                            innerRadius={50}
                            outerRadius={110}
                            strokeWidth={5}
                            paddingAngle={4}
                            cornerRadius={8}
                        >
                            <LabelList
                                dataKey="value"
                                className="fill-white text-[12px] font-black"
                                stroke="none"
                                position="inside"
                                formatter={(value: number) => Math.round(value)}
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
