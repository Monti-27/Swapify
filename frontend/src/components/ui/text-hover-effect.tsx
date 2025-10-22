"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";

// GPU-friendly easing
const smoothEase = [0.43, 0.13, 0.23, 0.96] as const;

export const TextHoverEffect = React.memo(({
  text,
  duration,
  automatic = false,
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
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Automatic animation for mobile devices
  useEffect(() => {
    if (automatic && isMobile && svgRef.current) {
      setHovered(true);
      let animationFrame: number;
      let startTime: number | null = null;
      
      const animate = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        
        // Create a circular motion pattern
        const progress = (elapsed % 3000) / 3000; // 3 second loop
        const angle = progress * Math.PI * 2;
        const radius = 30; // percentage
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
  }, [automatic, isMobile]);

  // Use RAF for smooth cursor updates on desktop
  useEffect(() => {
    if (!isMobile && svgRef.current && cursor.x !== null && cursor.y !== null) {
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
  }, [cursor, isMobile]);
  
  // Memoize event handlers
  const handleMouseEnter = useCallback(() => {
    if (!isMobile) setHovered(true);
  }, [isMobile]);
  
  const handleMouseLeave = useCallback(() => {
    if (!isMobile) setHovered(false);
  }, [isMobile]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMobile) {
      setCursor({ x: e.clientX, y: e.clientY });
    }
  }, [isMobile]);

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
        willChange: 'auto',
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
          {hovered && (
            <>
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="25%" stopColor="#ef4444" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="75%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="revealMask"
          gradientUnits="userSpaceOnUse"
          r="20%"
          initial={{ cx: "50%", cy: "50%" }}
          animate={maskPosition}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 50,
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
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent stroke-neutral-200 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold dark:stroke-neutral-800 font-display"
        style={{ opacity: hovered ? 0.7 : 0, fontFamily: 'Dazzle Unicase, sans-serif' }}
      >
        {text}
      </text>
      <motion.text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.3"
        className="fill-transparent stroke-neutral-200 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold dark:stroke-neutral-800 font-display"
        style={{ fontFamily: 'Dazzle Unicase, sans-serif' }}
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
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="url(#textGradient)"
        strokeWidth="0.3"
        mask="url(#textMask)"
        className="fill-transparent text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-display"
        style={{ fontFamily: 'Dazzle Unicase, sans-serif' }}
      >
        {text}
      </text>
    </svg>
  );
});
