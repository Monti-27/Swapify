"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";

interface WordData {
    text: string;
    duration: number;
    delay: number;
    blur: number;
    scale?: number;
}

interface BlurTextAnimationProps {
    text?: string;
    words?: WordData[];
    className?: string;
    fontSize?: string;
    fontFamily?: string;
    textColor?: string;
    baseDelay?: number; // Delay before animation starts
}

export default function BlurTextAnimation({
    text = "Elegant blur animation",
    words,
    className = "",
    fontSize = "text-4xl md:text-5xl lg:text-6xl",
    fontFamily = "",
    textColor = "text-white",
    baseDelay = 0, // Stagger delay for sequencing multiple text elements
}: BlurTextAnimationProps) {
    const [hasAnimated, setHasAnimated] = useState(false);

    const textWords = useMemo(() => {
        if (words) return words;

        const splitWords = text.split(" ");
        const totalWords = splitWords.length;

        // Seeded pseudo-random function for deterministic values
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed * 9999) * 10000;
            return x - Math.floor(x);
        };

        return splitWords.map((word, index) => {
            const progress = index / totalWords;

            const exponentialDelay = Math.pow(progress, 0.8) * 0.25;
            const wordDelay = index * 0.035;
            // Use seeded random instead of Math.random()
            const microVariation = (seededRandom(index + 1) - 0.5) * 0.02;

            // Fix precision to avoid hydration mismatch
            return {
                text: word,
                duration: parseFloat((0.9 + Math.cos(index * 0.3) * 0.1).toFixed(6)),
                delay: parseFloat((baseDelay + wordDelay + exponentialDelay + microVariation).toFixed(6)),
                blur: 8 + Math.floor(seededRandom(index * 2 + 7) * 4),
                scale: parseFloat((0.95 + Math.sin(index * 0.2) * 0.02).toFixed(6))
            };
        });
    }, [text, words, baseDelay]);

    useEffect(() => {
        // Small delay to ensure component is mounted, then animate IN only once
        const timeout = setTimeout(() => {
            setHasAnimated(true);
        }, 100);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <span className={`${className}`}>
            <span className={`${textColor} ${fontSize} ${fontFamily} leading-relaxed`}>
                {textWords.map((word, index) => (
                    <span
                        key={index}
                        className={`inline-block transition-all ${hasAnimated ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            transitionDuration: `${word.duration}s`,
                            transitionDelay: `${word.delay}s`,
                            transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                            filter: hasAnimated
                                ? 'blur(0px) brightness(1)'
                                : `blur(${word.blur}px) brightness(0.6)`,
                            transform: hasAnimated
                                ? 'translateY(0) scale(1) rotateX(0deg)'
                                : `translateY(20px) scale(${word.scale || 1}) rotateX(-15deg)`,
                            marginRight: '0.2em',
                            willChange: 'filter, transform, opacity',
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'hidden',
                            textShadow: hasAnimated
                                ? '0 2px 8px rgba(255,255,255,0.1)'
                                : '0 0 40px rgba(255,255,255,0.4)'
                        }}
                    >
                        {word.text}
                    </span>
                ))}
            </span>
        </span>
    );
}

// Simpler version for single-line text like badge, buttons
export function BlurTextSimple({
    text,
    className = "",
    delay = 0,
    duration = 0.7,
}: {
    text: string;
    className?: string;
    delay?: number;
    duration?: number;
}) {
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setHasAnimated(true);
        }, 100);

        return () => clearTimeout(timeout);
    }, []);

    return (
        <span
            className={`inline-block transition-all ${className} ${hasAnimated ? 'opacity-100' : 'opacity-0'}`}
            style={{
                transitionDuration: `${duration}s`,
                transitionDelay: `${delay}s`,
                transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                filter: hasAnimated
                    ? 'blur(0px) brightness(1)'
                    : 'blur(8px) brightness(0.6)',
                transform: hasAnimated
                    ? 'translateY(0) scale(1)'
                    : 'translateY(10px) scale(0.95)',
                willChange: 'filter, transform, opacity',
            }}
        >
            {text}
        </span>
    );
}
