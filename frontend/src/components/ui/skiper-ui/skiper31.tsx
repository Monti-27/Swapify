"use client";

import { motion, useScroll, useTransform } from "framer-motion";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

type CharacterProps = {
  char: string; //image url to be here
  index: number;
  centerIndex: number;
  scrollYProgress: any;
};

// CharacterV3 Logic
const PartnerLogo = ({
  char,
  index,
  centerIndex,
  scrollYProgress,
}: CharacterProps) => {
  const isSpace = char === " ";
  const distanceFromCenter = index - centerIndex;

  // Adjusted multipliers for wider spread/more distinct rotation
  const x = useTransform(
    scrollYProgress,
    [0, 0.5], // Trigger range
    [distanceFromCenter * 150, 0] // Spread distance
  );

  const rotate = useTransform(
    scrollYProgress,
    [0, 0.5],
    [distanceFromCenter * 45, 0] // Rotation
  );

  const y = useTransform(
    scrollYProgress,
    [0, 0.5],
    [-Math.abs(distanceFromCenter) * 30, 0] // Arc effect
  );

  const scale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);

  return (
    <motion.div
      className={cn("inline-flex items-center justify-center relative mx-3 sm:mx-6", isSpace && "w-4")} // Added Mx for spacing when converged
      style={{
        x,
        rotate,
        y,
        scale,
        opacity,
        transformOrigin: "center",
      }}
    >
      {/* Removed Card Wrapper - Just the Icon */}
      <img
        src={char}
        alt="Partner"
        className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-lg filter hover:brightness-110 transition-all duration-300"
      />
    </motion.div>
  );
};

const Bracket = ({ className }: { className: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 27 78"
      className={className}
    >
      <path
        fill="currentColor"
        d="M26.52 77.21h-5.75c-6.83 0-12.38-5.56-12.38-12.38V48.38C8.39 43.76 4.63 40 .01 40v-4c4.62 0 8.38-3.76 8.38-8.38V12.4C8.38 5.56 13.94 0 20.77 0h5.75v4h-5.75c-4.62 0-8.38 3.76-8.38 8.38V27.6c0 4.34-2.25 8.17-5.64 10.38 3.39 2.21 5.64 6.04 5.64 10.38v16.45c0 4.62 3.76 8.38 8.38 8.38h5.75v4.02Z"
      ></path>
    </svg>
  );
};

const Skiper31 = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"], // Triggers as it enters view
  });

  const partners = [
    "/partners/jupiter-ag-jup-logo.svg",
    "/partners/raydium-ray-logo.svg",
    "/partners/orca-orca-logo.svg",
    "/partners/Phantom_SVG_Icon.svg",
    "/partners/solana-sol-logo.svg",
  ];

  const centerIndex = Math.floor(partners.length / 2);

  return (
    <section className="bg-background relative py-20 overflow-hidden">

      {/* Background Elements */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div
        ref={containerRef}
        className="relative flex min-h-[50vh] flex-col items-center justify-center gap-12"
      >
        {/* Header Copy */}
        <div className="text-center z-10">

          <p className="flex items-center justify-center gap-4 text-3xl md:text-5xl font-bold tracking-tight text-foreground font-display">
            <Bracket className="h-12 md:h-16 text-foreground/20" />
            <span>
              Trusted by the <span className="text-gradient-purple">Best on Solana</span>
            </span>
            <Bracket className="h-12 md:h-16 scale-x-[-1] text-foreground/20" />
          </p>

          <p className="mt-4 text-lg text-muted-foreground/80 max-w-2xl mx-auto font-sans">
            Deep liquidity, zero-latency execution, and non-custodial security.
            <br className="hidden sm:block" /> Powered by the industry giants.
          </p>
        </div>

        {/* Animated Logos - The "Demo 3" Effect */}
        <div
          className="flex items-center justify-center w-full max-w-7xl mx-auto perspective-1000 py-10"
          style={{ perspective: "1000px" }}
        >
          {partners.map((logo, index) => (
            <PartnerLogo
              key={index}
              char={logo}
              index={index}
              centerIndex={centerIndex}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export { Skiper31 };
