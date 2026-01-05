'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function TransparencySkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Wallet Info Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-40 rounded-lg" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
            </div>

            {/* Main Score & Info Skeleton */}
            <div className="grid lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 h-[400px] rounded-[2rem] bg-muted/10 border border-border/40 flex flex-col items-center justify-center p-10">
                    <Skeleton className="h-48 w-48 rounded-full" />
                    <Skeleton className="h-4 w-32 mt-10" />
                </div>
                <div className="lg:col-span-7 p-8 rounded-[2rem] bg-muted/5 border border-border/40 space-y-8 flex flex-col">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-1 w-8 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Skeleton className="h-8 w-24 rounded-full" />
                        <Skeleton className="h-8 w-32 rounded-full" />
                    </div>
                    <div className="mt-auto p-6 rounded-2xl bg-background/50 border border-border/40 space-y-3">
                        <Skeleton className="h-2 w-24 mb-4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-5/6" />
                        <Skeleton className="h-3 w-4/6" />
                    </div>
                </div>
            </div>

            {/* Metrics Skeleton */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                    <Skeleton className="h-1 w-6 rounded-full" />
                    <Skeleton className="h-3 w-40" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-6 rounded-2xl border border-border/40 bg-background space-y-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-2 w-12" />
                                <Skeleton className="h-2 w-8" />
                            </div>
                            <Skeleton className="h-10 w-20" />
                            <Skeleton className="h-1 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function CabalSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-2">
                        <Skeleton className="h-8 w-12" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ))}
            </div>
            <div className="rounded-xl border border-border/40 overflow-hidden">
                <div className="h-10 bg-muted/20" />
                <div className="divide-y divide-border/40">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 flex justify-between gap-4">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-12" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
