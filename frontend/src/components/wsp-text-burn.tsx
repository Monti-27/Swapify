import React, { useEffect, useRef } from 'react';

const CONFIG = {
    text: "WSP",
    font: "700 64px 'Dazzle Unicase', sans-serif",
    density: 1,
    canvasSize: 260,
    circleRadius: 110,
    idleDuration: 2000,
    fadeDuration: 1200,
    explosionSpeed: 1.8,
    drag: 0.96,
    noise: 0.3,
};

const COLORS = [
    { r: 255, g: 255, b: 255 },
    { r: 192, g: 132, b: 252 },
    { r: 100, g: 80, b: 160 },
];

type AnimState = 'IDLE' | 'EXPLODING' | 'FADING_IN';

interface Particle {
    x: number; y: number; vx: number; vy: number;
    colorIndex: number; alpha: number; life: number; maxLife: number; delay: number;
}

const WspTextBurn: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const state = useRef<AnimState>('IDLE');
    const timer = useRef<number>(0);
    const fadeProgress = useRef<number>(0);
    const particles = useRef<Particle[]>([]);
    const pixelMap = useRef<{ x: number, y: number }[]>([]);
    const frameId = useRef<number>(0);

    const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;
    const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const size = CONFIG.canvasSize;
        const center = size / 2;
        const width = size * dpr;
        const height = size * dpr;
        const radiusSq = CONFIG.circleRadius * CONFIG.circleRadius;

        canvas.width = width;
        canvas.height = height;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        // We don't use ctx.scale here because we manipulate pixels directly for particles
        // But for text rendering (Idle/Fade phases), we need scaling logic or use scaled coordinates

        // Persistent image data buffer
        const imgData = ctx.createImageData(width, height);
        // 32-bit view for faster access (ABGR or RGBA depending on endianness)
        const buf32 = new Uint32Array(imgData.data.buffer);

        const initTextMap = () => {
            const offCanvas = document.createElement('canvas');
            offCanvas.width = width;
            offCanvas.height = height;
            const offCtx = offCanvas.getContext('2d');
            if (!offCtx) return;

            // Scale text drawing for high DPI
            offCtx.scale(dpr, dpr);
            offCtx.font = CONFIG.font;
            offCtx.textAlign = 'center';
            offCtx.textBaseline = 'middle';
            offCtx.fillStyle = 'white';
            offCtx.fillText(CONFIG.text, center, center);

            const data = offCtx.getImageData(0, 0, width, height).data;
            const points = [];

            // Scan in physical pixels, convert to logical for physics
            // We scan every 'density * dpr' pixels to maintain logical density
            const step = Math.max(1, Math.floor(CONFIG.density * dpr));

            for (let y = 0; y < height; y += step) {
                for (let x = 0; x < width; x += step) {
                    const idx = (y * width + x) * 4;
                    if (data[idx + 3] > 128) {
                        points.push({ x: x / dpr, y: y / dpr });
                    }
                }
            }
            pixelMap.current = points;
        };

        // Ensure font is loaded before sampling pixels
        document.fonts.ready.then(() => {
            initTextMap();
        });

        const triggerExplosion = () => {
            particles.current = pixelMap.current.map(point => {
                const dx = point.x - center;
                const dy = point.y - center;
                const angle = Math.atan2(dy, dx);
                const dist = Math.sqrt(dx * dx + dy * dy);
                const speed = randomRange(0.2, CONFIG.explosionSpeed) + (dist * 0.015);
                const jitter = randomRange(-0.3, 0.3);

                return {
                    x: point.x,
                    y: point.y,
                    vx: Math.cos(angle + jitter) * speed,
                    vy: Math.sin(angle + jitter) * speed,
                    colorIndex: Math.random() > 0.7 ? 2 : (Math.random() > 0.4 ? 1 : 0),
                    alpha: 1,
                    life: randomRange(60, 90),
                    maxLife: 90,
                    delay: Math.random() * 15,
                };
            });
            state.current = 'EXPLODING';
        };

        const render = () => {
            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            if (state.current === 'IDLE') {
                // Use standard canvas calls for text
                ctx.save();
                ctx.scale(dpr, dpr);
                ctx.beginPath();
                ctx.arc(center, center, CONFIG.circleRadius, 0, Math.PI * 2);
                ctx.clip();

                ctx.font = CONFIG.font;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';
                ctx.shadowColor = "rgba(255, 255, 255, 0.5)";
                ctx.shadowBlur = 10;
                ctx.fillText(CONFIG.text, center, center);
                ctx.restore();

                timer.current += 16.66;
                if (timer.current > CONFIG.idleDuration) {
                    timer.current = 0;
                    triggerExplosion();
                }
            } else if (state.current === 'EXPLODING') {
                let active = 0;

                // Clear buffer
                buf32.fill(0);

                const len = particles.current.length;
                for (let i = 0; i < len; i++) {
                    const p = particles.current[i];

                    if (p.delay > 0) {
                        p.delay--;
                        // Draw static particle (waiting to explode)
                        // Map logical coordinates to physical buffer index
                        const px = (p.x * dpr) | 0;
                        const py = (p.y * dpr) | 0;

                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            // Check circular mask manually using logical coords
                            const dx = p.x - center;
                            const dy = p.y - center;
                            if (dx * dx + dy * dy <= radiusSq) {
                                // Full white: 0xFFFFFFFF (ABGR: A=255, B=255, G=255, R=255)
                                // Little-endian (typical): AABBGGRR. White is all FF.
                                const idx = py * width + px;
                                buf32[idx] = 0xFFFFFFFF;

                                // Draw a 2x2 block if dpr > 1 for visibility
                                if (dpr > 1 && px + 1 < width && py + 1 < height) {
                                    buf32[idx + 1] = 0xFFFFFFFF;
                                    buf32[idx + width] = 0xFFFFFFFF;
                                    buf32[idx + width + 1] = 0xFFFFFFFF;
                                }
                            }
                        }
                        active++;
                        continue;
                    }

                    if (p.alpha <= 0.01) continue;
                    active++;

                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= CONFIG.drag;
                    p.vy *= CONFIG.drag;
                    p.x += randomRange(-CONFIG.noise, CONFIG.noise);
                    p.y += randomRange(-CONFIG.noise, CONFIG.noise);
                    p.life--;
                    p.alpha = Math.max(0, p.life / p.maxLife);

                    const px = (p.x * dpr) | 0;
                    const py = (p.y * dpr) | 0;

                    // Manual Clipping
                    const dx = p.x - center;
                    const dy = p.y - center;
                    if (dx * dx + dy * dy > radiusSq) continue;

                    if (px >= 0 && px < width && py >= 0 && py < height) {
                        const c = COLORS[p.colorIndex];
                        // Construct 32-bit color integer. 
                        // Assuming Little Endian (x86 default): 0xAABBGGRR
                        const alphaInt = (p.alpha * 255) | 0;
                        const colorInt = (
                            (alphaInt << 24) |
                            (c.b << 16) |
                            (c.g << 8) |
                            (c.r)
                        ) >>> 0;

                        const idx = py * width + px;
                        buf32[idx] = colorInt;

                        // Draw larger particles for high DPR
                        if (dpr > 1 && px + 1 < width && py + 1 < height) {
                            buf32[idx + 1] = colorInt;
                            buf32[idx + width] = colorInt;
                            buf32[idx + width + 1] = colorInt;
                        }
                    }
                }

                ctx.putImageData(imgData, 0, 0);

                if (active === 0) {
                    state.current = 'FADING_IN';
                    fadeProgress.current = 0;
                }
            } else if (state.current === 'FADING_IN') {
                fadeProgress.current += 16.66 / CONFIG.fadeDuration;
                const eased = easeOutCubic(Math.min(1, fadeProgress.current));

                ctx.save();
                ctx.scale(dpr, dpr);
                ctx.beginPath();
                ctx.arc(center, center, CONFIG.circleRadius, 0, Math.PI * 2);
                ctx.clip();

                ctx.globalAlpha = eased;
                ctx.font = CONFIG.font;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = 'white';

                const scale = 0.9 + (eased * 0.1);
                // Center scaling
                ctx.translate(center, center);
                ctx.scale(scale, scale);
                ctx.translate(-center, -center);

                ctx.fillText(CONFIG.text, center, center);
                ctx.restore();

                if (fadeProgress.current >= 1) {
                    state.current = 'IDLE';
                    timer.current = 0;
                }
            }
            frameId.current = requestAnimationFrame(render);
        };
        render();
        return () => cancelAnimationFrame(frameId.current);
    }, []);

    return (
        <div className="relative w-[260px] h-[260px] flex items-center justify-center pointer-events-none select-none">
            <div className="absolute inset-0 rounded-full border border-white/5 opacity-50" style={{ transform: 'scale(0.85)' }}></div>
            <canvas ref={canvasRef} className="w-full h-full" />
        </div>
    );
};
export default WspTextBurn;
