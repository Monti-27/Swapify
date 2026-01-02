// src/components/privacy/vault-timeline.tsx
'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

interface Step {
    id: string;
    label: string;
    status: 'completed' | 'processing' | 'pending' | 'error';
    description: string;
}

interface VaultTimelineProps {
    steps: Step[];
}

export function VaultTimeline({ steps }: VaultTimelineProps) {
    return (
        <div className="flex flex-col gap-8 relative pl-2">
            {/* Connector Line */}
            <div className="absolute left-[15px] top-3 bottom-8 w-[2px] bg-muted" />

            {steps.map((step, index) => {
                const isActive = step.status === 'processing';
                const isCompleted = step.status === 'completed';

                return (
                    <div key={step.id} className="relative z-10 flex items-start gap-4">

                        {/* Icon Status */}
                        <div className={`
              w-7 h-7 rounded-full flex items-center justify-center border-2 bg-card
              transition-colors duration-200
              ${isCompleted ? 'border-primary text-primary' : ''}
              ${isActive ? 'border-primary text-primary' : ''}
              ${step.status === 'pending' ? 'border-muted text-muted-foreground' : ''}
            `}>
                            {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                            {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
                            {step.status === 'pending' && <Circle className="w-3 h-3" />}
                        </div>

                        {/* Text Content */}
                        <div className="pt-0.5">
                            <h4 className={`text-sm font-medium leading-none ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {step.label}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
