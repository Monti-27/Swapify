"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";

export const TextHoverEffect = React.memo(({
  text,
  duration,
  automatic = true,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: "50%", cy: "50%" });
  const rafRef = useRef<number | null>(null);

  // Automatic animation
  useEffect(() => {
    if (automatic && !hovered && svgRef.current) {
      let animationFrame: number;
      let startTime: number | null = null;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        
        // Create a circular motion pattern
        const progress = (elapsed % 4000) / 4000; // 4 second loop
        const angle = progress * Math.PI * 2;
        const radius = 35; // percentage
        const centerX = 50;
        const centerY = 50;
        
        const cx = centerX + Math.cos(angle) * radius;
        const cy = centerY + Math.sin(angle) * radius;
        
        setMaskPosition({
          cx: `${cx}%`,
          cy: `${cy}%`,
        });
        
        animationFrame = requestAnimationFrame(animate);
      };
      
      animationFrame = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrame) {
          cancelAnimationFrame(animationFrame);
        }
      };
    }
  }, [automatic, hovered]);

  // Use RAF for smooth cursor updates
  useEffect(() => {
    if (hovered && svgRef.current) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      
      rafRef.current = requestAnimationFrame(() => {
        if (svgRef.current) {
          const svgRect = svgRef.current.getBoundingClientRect();
          const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
          const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
          setMaskPosition({
            cx: `${cxPercentage}%`,
            cy: `${cyPercentage}%`,
          });
        }
      });
    }
    
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [cursor, hovered]);
  
  const handleMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setCursor({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 300 100"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      className="select-none"
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
        maxWidth: '100%',
        height: 'auto',
      }}
    >
      <defs>
              <linearGradient
                id="textGradient"
                gradientUnits="userSpaceOnUse"
                cx="50%"
                cy="50%"
                r="25%"
              >
                <stop offset="0%" stopColor="#10b981" /> {/* Emerald 500 */}
                <stop offset="25%" stopColor="#34d399" /> {/* Emerald 400 */}
                <stop offset="50%" stopColor="#d1fae5" /> {/* Emerald 100/White-ish */}
                <stop offset="75%" stopColor="#059669" /> {/* Emerald 600 */}
                <stop offset="100%" stopColor="#10b981" /> {/* Emerald 500 */}
              </linearGradient>


        <motion.radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          r="25%" // Increased radius for better visibility
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{
            type: "spring",
            stiffness: 150,
            damping: 30,
          }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="textMask">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#revealMask)"
          />
        </mask>
      </defs>
      
      {/* Base Outline - Light/Dark Mode Compatible */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent stroke-neutral-400/30 dark:stroke-neutral-600/30 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display"
        style={{ fontFamily: "'Dazzle Unicase', sans-serif" }}
      >
        {text}
      </text>

      {/* Animated Outline Effect */}
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent stroke-neutral-500/50 dark:stroke-neutral-400/50 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display"
        style={{ fontFamily: "'Dazzle Unicase', sans-serif" }}
        initial={{ strokeDashoffset: 1000, strokeDasharray: 1000 }}
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: 4,
          ease: "easeInOut",
        }}
      >
        {text}
      </motion.text>

      {/* The Reveal Text (Colorful) */}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="url(#textGradient)"
        strokeWidth="0.5" // Slightly thicker stroke for better brightness
        mask="url(#textMask)"
        className="fill-transparent text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display"
        style={{ fontFamily: "'Dazzle Unicase', sans-serif" }}
      >
        {text}
      </text>
    </svg>
  );
});
