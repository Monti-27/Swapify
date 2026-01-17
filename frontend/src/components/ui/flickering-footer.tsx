"use client";

import { ChevronRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import Link from "next/link";
import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { useTheme } from "next-themes";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Helper function to convert hex color to RGB object
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
};

// Helper function to get RGBA string from hex color
export const getRGBA = (
    cssColor: React.CSSProperties["color"],
    fallback: string = "rgba(180, 180, 180, 1)",
): string => {
    if (!cssColor || typeof cssColor !== "string") return fallback;

    // Handle hex colors
    if (cssColor.startsWith("#")) {
        const rgb = hexToRgb(cssColor);
        if (rgb) {
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        }
    }

    // Return as-is for other formats
    return cssColor.toString();
};

// Helper function to add opacity to an RGB/RGBA color string
export const colorWithOpacity = (color: string, opacity: number): string => {
    // If it's already rgba, replace the alpha
    if (color.startsWith("rgba")) {
        return color.replace(/,\s*[\d.]+\)$/, `, ${opacity})`);
    }
    // If it's rgb, convert to rgba
    if (color.startsWith("rgb(")) {
        return color.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
    }
    // If hex, convert to rgba
    if (color.startsWith("#")) {
        const rgb = hexToRgb(color);
        if (rgb) {
            return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        }
    }
    return color;
};

interface FlickeringGridProps extends React.HTMLAttributes<HTMLDivElement> {
    squareSize?: number;
    gridGap?: number;
    flickerChance?: number;
    color?: string;
    width?: number;
    height?: number;
    className?: string;
    maxOpacity?: number;
    text?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: number | string;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
    squareSize = 3,
    gridGap = 3,
    flickerChance = 0.2,
    color = "#00FF94",
    width,
    height,
    className,
    maxOpacity = 0.15,
    text = "",
    fontSize = 140,
    fontWeight = 600,
    ...props
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const memoizedColor = useMemo(() => {
        return getRGBA(color);
    }, [color]);

    const drawGrid = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            width: number,
            height: number,
            cols: number,
            rows: number,
            squares: Float32Array,
            dpr: number,
        ) => {
            ctx.clearRect(0, 0, width, height);

            const maskCanvas = document.createElement("canvas");
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
            if (!maskCtx) return;

            if (text) {
                maskCtx.save();
                maskCtx.scale(dpr, dpr);
                maskCtx.fillStyle = "white";
                maskCtx.font = `${fontWeight} ${fontSize}px "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                maskCtx.textAlign = "center";
                maskCtx.textBaseline = "middle";

                // Add letter spacing by drawing each character individually
                const letterSpacing = fontSize * 0.3; // 30% of font size as spacing
                const chars = text.split('');
                const totalWidth = chars.reduce((acc, char) => acc + maskCtx.measureText(char).width, 0) + (letterSpacing * (chars.length - 1));
                let currentX = (width / (2 * dpr)) - (totalWidth / 2);
                const centerY = height / (2 * dpr);

                maskCtx.textAlign = "left";
                chars.forEach((char) => {
                    maskCtx.fillText(char, currentX, centerY);
                    currentX += maskCtx.measureText(char).width + letterSpacing;
                });

                maskCtx.restore();
            }

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * (squareSize + gridGap) * dpr;
                    const y = j * (squareSize + gridGap) * dpr;
                    const squareWidth = squareSize * dpr;
                    const squareHeight = squareSize * dpr;

                    const maskData = maskCtx.getImageData(
                        x,
                        y,
                        squareWidth,
                        squareHeight,
                    ).data;
                    const hasText = maskData.some(
                        (value, index) => index % 4 === 0 && value > 0,
                    );

                    const opacity = squares[i * rows + j];
                    const finalOpacity = hasText
                        ? Math.min(1, opacity * 3 + 0.4)
                        : opacity;

                    ctx.fillStyle = colorWithOpacity(memoizedColor, finalOpacity);
                    ctx.fillRect(x, y, squareWidth, squareHeight);
                }
            }
        },
        [memoizedColor, squareSize, gridGap, text, fontSize, fontWeight],
    );

    const setupCanvas = useCallback(
        (canvas: HTMLCanvasElement, width: number, height: number) => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            const cols = Math.ceil(width / (squareSize + gridGap));
            const rows = Math.ceil(height / (squareSize + gridGap));

            const squares = new Float32Array(cols * rows);
            for (let i = 0; i < squares.length; i++) {
                squares[i] = Math.random() * maxOpacity;
            }

            return { cols, rows, squares, dpr };
        },
        [squareSize, gridGap, maxOpacity],
    );

    const updateSquares = useCallback(
        (squares: Float32Array, deltaTime: number) => {
            for (let i = 0; i < squares.length; i++) {
                if (Math.random() < flickerChance * deltaTime) {
                    squares[i] = Math.random() * maxOpacity;
                }
            }
        },
        [flickerChance, maxOpacity],
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let gridParams: ReturnType<typeof setupCanvas>;

        const updateCanvasSize = () => {
            const newWidth = width || container.clientWidth;
            const newHeight = height || container.clientHeight;
            setCanvasSize({ width: newWidth, height: newHeight });
            gridParams = setupCanvas(canvas, newWidth, newHeight);
        };

        updateCanvasSize();

        let lastTime = 0;
        const animate = (time: number) => {
            if (!isInView) return;

            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;

            updateSquares(gridParams.squares, deltaTime);
            drawGrid(
                ctx,
                canvas.width,
                canvas.height,
                gridParams.cols,
                gridParams.rows,
                gridParams.squares,
                gridParams.dpr,
            );
            animationFrameId = requestAnimationFrame(animate);
        };

        const resizeObserver = new ResizeObserver(() => {
            updateCanvasSize();
        });

        resizeObserver.observe(container);

        const intersectionObserver = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting);
            },
            { threshold: 0 },
        );

        intersectionObserver.observe(canvas);

        if (isInView) {
            animationFrameId = requestAnimationFrame(animate);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
        };
    }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

    return (
        <div
            ref={containerRef}
            className={cn(`h-full w-full ${className}`)}
            {...props}
        >
            <canvas
                ref={canvasRef}
                className="pointer-events-none"
                style={{
                    width: canvasSize.width,
                    height: canvasSize.height,
                }}
            />
        </div>
    );
};

export function useMediaQuery(query: string) {
    const [value, setValue] = useState(false);

    useEffect(() => {
        function checkQuery() {
            const result = window.matchMedia(query);
            setValue(result.matches);
        }

        checkQuery();
        window.addEventListener("resize", checkQuery);
        const mediaQuery = window.matchMedia(query);
        mediaQuery.addEventListener("change", checkQuery);

        return () => {
            window.removeEventListener("resize", checkQuery);
            mediaQuery.removeEventListener("change", checkQuery);
        };
    }, [query]);

    return value;
}

// Swapify Footer Configuration
const swapifyConfig = {
    brand: {
        name: "Swapify",
        description: "The complete DeFi toolkit on Solana. Automated strategies, ZK-powered privacy, and wallet transparency analysis.",
    },
    footerLinks: [
        {
            title: "Product",
            links: [
                { id: 1, title: "Strategies", url: "/strategies" },
                { id: 2, title: "Privacy Vault", url: "/privacy" },
                { id: 3, title: "Anti-Privacy", url: "/transparency" },
                { id: 4, title: "Swap", url: "/swap" },
                { id: 5, title: "Dashboard", url: "/dashboard" },
            ],
        },
        {
            title: "Resources",
            links: [
                // { id: 6, title: "Documentation", url: "https://docs.swapify.fun/" },
                { id: 7, title: "About", url: "/about" },
                { id: 8, title: "Terms", url: "/terms" },
                { id: 9, title: "Privacy Policy", url: "/privacy-policy" },
            ],
        },
        {
            title: "Community",
            links: [
                // { id: 10, title: "Twitter / X", url: "https://x.com/SwapifyProtocol" },
                // { id: 11, title: "Telegram", url: "https://t.me/SwapifyProtocol" },
                // { id: 12, title: "GitHub", url: "https://github.com/swapify" },
            ],
        },
    ],
};

export const SwapifyFooter = () => {
    const tablet = useMediaQuery("(max-width: 1024px)");
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted ? resolvedTheme === "dark" : true;

    return (
        <footer id="footer" className="w-full pb-0 bg-background">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between p-10 max-w-7xl mx-auto">
                {/* Brand Section */}
                <div className="flex flex-col items-start justify-start gap-y-5 max-w-xs mx-0">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl font-display font-bold text-primary">Swapify</span>
                    </Link>
                    <p className="tracking-tight text-muted-foreground font-medium text-sm">
                        {swapifyConfig.brand.description}
                    </p>
                    {/* Social Icons - Coming Soon
                    <div className="flex items-center gap-4 mt-2">
                        <Link href="https://x.com/SwapifyProtocol" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                            <div className="relative w-5 h-5">
                                <Image
                                    src="/x logo.svg"
                                    alt="X"
                                    fill
                                    className={`object-contain ${isDark ? "invert" : ""}`}
                                />
                            </div>
                        </Link>
                        <Link href="https://t.me/SwapifyProtocol" target="_blank" className="text-muted-foreground hover:text-primary transition-colors">
                            <div className="relative w-5 h-5">
                                <Image
                                    src="/Telegram Logo.svg"
                                    alt="Telegram"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                        </Link>
                    </div>
                    */}
                </div>

                {/* Links Section */}
                <div className="pt-8 md:pt-0 md:w-2/3">
                    <div className="flex flex-col items-start justify-start md:flex-row md:items-start md:justify-end gap-y-8 gap-x-16">
                        {swapifyConfig.footerLinks.map((column, columnIndex) => (
                            <ul key={columnIndex} className="flex flex-col gap-y-3">
                                <li className="mb-2 text-sm font-semibold text-foreground">
                                    {column.title}
                                </li>
                                {column.links.map((link) => (
                                    <li
                                        key={link.id}
                                        className="group inline-flex cursor-pointer items-center justify-start gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Link href={link.url} target={link.url.startsWith("http") ? "_blank" : undefined}>
                                            {link.title}
                                        </Link>
                                        <div className="flex size-4 items-center justify-center border border-border rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                                            <ChevronRight className="h-3 w-3" />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </div>
                </div>
            </div>

            {/* Flickering Grid Section */}
            <div className="w-full h-40 md:h-56 relative mt-8 z-0">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-background z-10 from-40%" />
                <div className="absolute inset-0 mx-6">
                    <FlickeringGrid
                        text="SWAPIFY"
                        fontSize={140}
                        fontWeight={700}
                        className="h-full w-full"
                        squareSize={2}
                        gridGap={2}
                        color={isDark ? "#00FF94" : "#10B981"}
                        maxOpacity={0.15}
                        flickerChance={0.01}
                    />
                </div>
            </div>
        </footer>
    );
};

export default SwapifyFooter;
