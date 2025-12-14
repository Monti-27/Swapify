"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Link, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TimelineItem {
    id: number;
    title: string;
    date: string;
    content: string;
    category: string;
    icon: React.ComponentType<{ size?: number }>;
    relatedIds: number[];
    status: "completed" | "in-progress" | "pending";
    energy: number;
}

interface RadialOrbitalTimelineProps {
    timelineData: TimelineItem[];
}

export default function RadialOrbitalTimeline({
    timelineData,
}: RadialOrbitalTimelineProps) {
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>(
        {}
    );
    const [viewMode, setViewMode] = useState<"orbital">("orbital");
    const [rotationAngle, setRotationAngle] = useState<number>(0);
    const [autoRotate, setAutoRotate] = useState<boolean>(true);
    const [pulseEffect, setPulseEffect] = useState<Record<number, boolean>>({});
    const [centerOffset, setCenterOffset] = useState<{ x: number; y: number }>({
        x: 0,
        y: 0,
    });
    const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const orbitRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Standard closing logic. Child components must stopPropagation if they handle the click.
        setExpandedItems({});
        setActiveNodeId(null);
        setPulseEffect({});
        setAutoRotate(true);
    };

    const toggleItem = (id: number) => {
        console.log("Toggling item:", id);
        setExpandedItems((prev) => {
            const newState = { ...prev };
            // Close others
            Object.keys(newState).forEach((key) => {
                if (parseInt(key) !== id) {
                    newState[parseInt(key)] = false;
                }
            });

            newState[id] = !prev[id];

            if (!prev[id]) {
                // Opening
                setActiveNodeId(id);
                setAutoRotate(false);

                const relatedItems = getRelatedItems(id);
                const newPulseEffect: Record<number, boolean> = {};
                relatedItems.forEach((relId) => {
                    newPulseEffect[relId] = true;
                });
                setPulseEffect(newPulseEffect);
            } else {
                // Closing
                setActiveNodeId(null);
                setAutoRotate(true);
                setPulseEffect({});
            }

            return newState;
        });
    };

    useEffect(() => {
        let rotationTimer: NodeJS.Timeout;

        if (autoRotate && viewMode === "orbital") {
            rotationTimer = setInterval(() => {
                setRotationAngle((prev) => {
                    const newAngle = (prev + 0.3) % 360;
                    return Number(newAngle.toFixed(3));
                });
            }, 50);
        }

        return () => {
            if (rotationTimer) {
                clearInterval(rotationTimer);
            }
        };
    }, [autoRotate, viewMode]);

    // Auto-close expanded items after 5 seconds
    useEffect(() => {
        if (activeNodeId !== null) {
            const autoCloseTimer = setTimeout(() => {
                setExpandedItems({});
                setActiveNodeId(null);
                setPulseEffect({});
                setAutoRotate(true);
            }, 5000);

            return () => clearTimeout(autoCloseTimer);
        }
    }, [activeNodeId]);

    const centerViewOnNode = (nodeId: number) => {
        if (viewMode !== "orbital" || !nodeRefs.current[nodeId]) return;

        const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
        // Safety check
        if (nodeIndex === -1) return;

        const totalNodes = timelineData.length;
        // Calculate angle to rotate SO THAT the item is at the bottom (270 degrees in this logic?)
        // Original code: setRotationAngle(270 - targetAngle);
        // If 0 degrees is right (0 rad), bottom is 90 deg (PI/2), left 180, top 270.
        // Let's stick to original logic.
        const targetAngle = (nodeIndex / totalNodes) * 360;
        setRotationAngle(270 - targetAngle);
    };

    const calculateNodePosition = (index: number, total: number) => {
        const angle = ((index / total) * 360 + rotationAngle) % 360;
        const radius = 250; // Increased radius slightly to ensure separation from center element
        const radian = (angle * Math.PI) / 180;

        const x = radius * Math.cos(radian) + centerOffset.x;
        const y = radius * Math.sin(radian) + centerOffset.y;

        // Z-index calculation for pseudo-3D
        const zIndex = Math.round(100 + 50 * Math.cos(radian));
        const opacity = Math.max(
            0.4,
            Math.min(1, 0.4 + 0.6 * ((1 + Math.sin(radian)) / 2))
        );

        return { x, y, angle, zIndex, opacity };
    };

    const getRelatedItems = (itemId: number): number[] => {
        const currentItem = timelineData.find((item) => item.id === itemId);
        return currentItem ? currentItem.relatedIds : [];
    };

    const isRelatedToActive = (itemId: number): boolean => {
        if (!activeNodeId) return false;
        const relatedItems = getRelatedItems(activeNodeId);
        return relatedItems.includes(itemId);
    };

    const getStatusStyles = (status: TimelineItem["status"]): string => {
        switch (status) {
            case "completed":
                return "text-primary-foreground bg-primary border-primary";
            case "in-progress":
                return "text-primary bg-primary/20 border-primary";
            case "pending":
                return "text-muted-foreground bg-muted border-border";
            default:
                return "text-muted-foreground bg-muted border-border";
        }
    };

    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center bg-transparent overflow-visible relative"
            ref={containerRef}
            onClick={handleContainerClick}
        >
            <div className="relative w-full max-w-4xl h-full flex items-center justify-center">
                {/* Orbit container - now relative so nodes position inside it */}
                <div
                    className="relative"
                    ref={orbitRef}
                    style={{
                        width: '600px',
                        height: '600px',
                    }}
                >
                    {/* Center Element */}
                    <div
                        className="absolute rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-teal-500 animate-pulse flex items-center justify-center"
                        style={{
                            width: '64px',
                            height: '64px',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 10,
                        }}
                    >
                        <div className="absolute w-20 h-20 rounded-full border border-primary/30 animate-ping opacity-70"></div>
                        <div
                            className="absolute w-24 h-24 rounded-full border border-primary/20 animate-ping opacity-50"
                            style={{ animationDelay: "0.5s" }}
                        ></div>
                        <div className="w-8 h-8 rounded-full bg-background/80 backdrop-blur-md"></div>
                    </div>

                    {/* Orbit ring */}
                    <div
                        className="absolute rounded-full border border-border pointer-events-none"
                        style={{
                            width: '500px',
                            height: '500px',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                        }}
                    ></div>

                    {timelineData.map((item, index) => {
                        const position = calculateNodePosition(index, timelineData.length);
                        const isExpanded = expandedItems[item.id];
                        const isRelated = isRelatedToActive(item.id);
                        const isPulsing = pulseEffect[item.id];
                        const Icon = item.icon;

                        const nodeStyle: React.CSSProperties = {
                            left: `calc(50% + ${position.x}px)`,
                            top: `calc(50% + ${position.y}px)`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: isExpanded ? 200 : position.zIndex,
                            opacity: isExpanded ? 1 : position.opacity,
                        };

                        return (
                            <div
                                key={item.id}
                                ref={(el) => { if (el) nodeRefs.current[item.id] = el; }}
                                className="absolute cursor-pointer"
                                style={nodeStyle}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItem(item.id);
                                }}
                            >
                                {/* Energy Field */}
                                <div
                                    className={`absolute rounded-full -inset-1 ${isPulsing ? "animate-pulse duration-1000" : ""
                                        }`}
                                    style={{
                                        background: `radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)`,
                                        width: `${item.energy * 0.5 + 40}px`,
                                        height: `${item.energy * 0.5 + 40}px`,
                                        left: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                                        top: `-${(item.energy * 0.5 + 40 - 40) / 2}px`,
                                    }}
                                ></div>

                                {/* Node Icon */}
                                <div
                                    className={`
                  w-10 h-10 rounded-full flex items-center justify-center
                  ${isExpanded
                                            ? "bg-primary text-primary-foreground"
                                            : isRelated
                                                ? "bg-primary/50 text-primary-foreground"
                                                : "bg-card text-card-foreground"
                                        }
                  border-2 
                  ${isExpanded
                                            ? "border-primary shadow-lg shadow-primary/30"
                                            : isRelated
                                                ? "border-primary animate-pulse"
                                                : "border-border"
                                        }
                  transition-all duration-300 transform
                `}
                                >
                                    <Icon size={16} />
                                </div>

                                {/* Label */}
                                <div
                                    className={`
                  absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap
                  text-xs font-semibold tracking-wider
                  transition-all duration-300
                  ${isExpanded ? "text-foreground scale-110" : "text-muted-foreground"}
                `}
                                >
                                    {item.title}
                                </div>

                                {/* Info Card with Framer Motion */}
                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                            transition={{
                                                duration: 0.3,
                                                ease: [0.4, 0, 0.2, 1]
                                            }}
                                        >
                                            <Card className="absolute top-20 left-1/2 -translate-x-1/2 w-64 bg-card backdrop-blur-lg border-border shadow-xl shadow-black/10 dark:shadow-white/5 overflow-visible text-card-foreground cursor-auto"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-px h-3 bg-border"></div>
                                                <CardHeader className="pb-2">
                                                    <div className="flex justify-between items-center">
                                                        <Badge
                                                            className={`px-2 text-xs ${getStatusStyles(
                                                                item.status
                                                            )}`}
                                                        >
                                                            {item.status === "completed"
                                                                ? "COMPLETE"
                                                                : item.status === "in-progress"
                                                                    ? "IN PROGRESS"
                                                                    : "PENDING"}
                                                        </Badge>
                                                        <span className="text-xs font-mono text-white/50">
                                                            {item.date}
                                                        </span>
                                                    </div>
                                                    <CardTitle className="text-sm mt-2 text-white">
                                                        {item.title}
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="text-xs text-muted-foreground">
                                                    <p>{item.content}</p>

                                                    {item.relatedIds.length > 0 && (
                                                        <div className="mt-4 pt-3 border-t border-border">
                                                            <div className="flex items-center mb-2">
                                                                <Link size={10} className="text-muted-foreground mr-1" />
                                                                <h4 className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                                                                    Connected Nodes
                                                                </h4>
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {item.relatedIds.map((relatedId) => {
                                                                    const relatedItem = timelineData.find(
                                                                        (i) => i.id === relatedId
                                                                    );
                                                                    return (
                                                                        <Button
                                                                            key={relatedId}
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="flex items-center h-6 px-2 py-0 text-xs rounded-sm border-border bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                toggleItem(relatedId);
                                                                            }}
                                                                        >
                                                                            {relatedItem?.title}
                                                                            <ArrowRight
                                                                                size={8}
                                                                                className="ml-1 text-muted-foreground"
                                                                            />
                                                                        </Button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
