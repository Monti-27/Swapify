'use client';

interface RiskLabelsProps {
    labels: string[];
}

const LABEL_STYLES: Record<string, string> = {
    BOT: 'bg-red-500/15 text-red-400 border-red-500/30',
    SNIPER: 'bg-red-600/15 text-red-300 border-red-600/30',
    SYBIL: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    HIGH_TPS: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    HIGH_FAILURES: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    DEFAULT: 'bg-muted text-muted-foreground border-border',
};

export function RiskLabels({ labels }: RiskLabelsProps) {
    if (labels.length === 0) {
        return (
            <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 rounded-full text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    CLEAN
                </span>
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {labels.map((label) => {
                const style = LABEL_STYLES[label] || LABEL_STYLES.DEFAULT;
                return (
                    <span
                        key={label}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:scale-105 ${style}`}
                    >
                        {label.replace('_', ' ')}
                    </span>
                );
            })}
        </div>
    );
}

export default RiskLabels;
