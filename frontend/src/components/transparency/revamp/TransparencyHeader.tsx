'use client';

import { motion } from 'framer-motion';

export function TransparencyHeader() {
    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-center"
        >
            <div className="inline-flex items-center justify-center gap-2 mb-6 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-widest uppercase">
                Risk Analysis Engine
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
                Transparency Center
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light">
                Advanced on-chain analysis to detect bots, snipers, and sybil networks.
                Verify wallet integrity with institutional-grade risk metrics.
            </p>
        </motion.section>
    );
}
