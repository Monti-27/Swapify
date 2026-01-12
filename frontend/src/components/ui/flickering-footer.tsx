"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
    fontSize?: number;
    fontWeight?: number | string;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
    squareSize = 3,
    gridGap = 3,
    flickerChance = 0.2,
    color = "147, 51, 234", // RGB values for purple
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
                maskCtx.fillText(text, width / (2 * dpr), height / (2 * dpr));
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

                    ctx.fillStyle = `rgba(${color}, ${finalOpacity})`;
                    ctx.fillRect(x, y, squareWidth, squareHeight);
                }
            }
        },
        [color, squareSize, gridGap, text, fontSize, fontWeight],
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
            className={cn("h-full w-full", className)}
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

function useMediaQuery(query: string) {
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

const siteConfig = {
    description:
        "Advanced ZK-powered privacy shielding for Solana. Secure, non-custodial asset protection.",
    footerLinks: [
        {
            title: "Company",
            links: [
                { id: 1, title: "About Us", url: "/about-us" },
                { id: 2, title: "Privacy Policy", url: "/privacy-policy" },
                { id: 3, title: "Terms of Service", url: "/terms" },
            ],
        },
        {
            title: "Product",
            links: [
                { id: 5, title: "Privacy", url: "/" },
            ],
        },
        {
            title: "Socials",
            links: [
                { id: 9, title: "X (Twitter)", url: "https://x.com/vexprotocolsol" },
                { id: 10, title: "Telegram", url: "https://t.me/VexProtocol" },
            ],
        },
    ],
};

export const FlickeringFooter = () => {
    const tablet = useMediaQuery("(max-width: 1024px)");

    return (
        <footer id="footer" className="w-full pb-0 border-t border-border/40 bg-background/50 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between p-10 max-w-7xl mx-auto">
                <div className="flex flex-col items-start justify-start gap-y-5 max-w-xs mx-0">
                    <Link href="/" className="flex items-center gap-3">
                        <Image
                            src="/vexprotocol/vexprotocol.png"
                            alt="VexProtocol"
                            width={40}
                            height={40}
                            className="object-contain"
                        />
                        <p className="text-xl font-semibold text-foreground">VexProtocol</p>
                    </Link>
                    <p className="tracking-tight text-muted-foreground font-medium">
                        {siteConfig.description}
                    </p>
                </div>
                <div className="pt-10 md:pt-0 md:w-1/2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-4 lg:pl-10">
                        {siteConfig.footerLinks.map((column, columnIndex) => (
                            <ul key={columnIndex} className="flex flex-col gap-y-2">
                                <li className="mb-2 text-sm font-semibold text-primary">
                                    {column.title}
                                </li>
                                {column.links.map((link) => (
                                    <li
                                        key={link.id}
                                        className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <Link
                                            href={link.url}
                                            target={link.url.startsWith('http') ? "_blank" : undefined}
                                            rel={link.url.startsWith('http') ? "noopener noreferrer" : undefined}
                                        >
                                            {link.title}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ))}
                    </div>
                </div>
            </div>
            <div className="w-full h-48 md:h-64 relative mt-12 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-background/20 to-background z-10 from-0%" />
                <div className="absolute inset-x-0 bottom-0 h-full mx-0">
                    <FlickeringGrid
                        text={tablet ? "VEX" : "VEXPROTOCOL"}
                        fontSize={tablet ? 100 : 150}
                        className="h-full w-full"
                        squareSize={3}
                        gridGap={4}
                        color="0, 255, 148"
                        maxOpacity={0.2}
                        flickerChance={0.3}
                    />
                </div>
            </div>
        </footer>
    );
};
