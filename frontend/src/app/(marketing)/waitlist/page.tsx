"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Check, Copy, Loader2, AlertCircle, Sparkles, X, ArrowLeft } from "lucide-react";
import Image from "next/image";
import SyntheticHero from "@/components/ui/synthetic-hero";
import { GradientButton } from "@/components/ui/gradient-button";
import { WaveLoader } from "@/components/ui/wave-loader";

// Types
interface WaitlistUser {
    id: string;
    email: string;
    walletAddress: string;
    referralCode: string;
    points: number;
    followedTwitter: boolean;
    joinedTelegram: boolean;
}

interface ApiResponse {
    user: WaitlistUser;
    isExisting?: boolean;
    message: string;
}

// API Configuration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.weswap.fun";

// Animated Counter Component
function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            setDisplayValue(Math.floor(progress * value));
            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return <span>{displayValue}</span>;
}

// Confetti Component
function Confetti() {
    const colors = ['#00FF94', '#00CC75', '#FFFFFF', '#00FF94', '#00E085'];
    const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
    }));

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute animate-confetti"
                    style={{
                        left: `${p.left}%`,
                        top: '-20px',
                        width: p.size,
                        height: p.size,
                        backgroundColor: p.color,
                        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
                .animate-confetti {
                    animation: confetti-fall linear forwards;
                }
            `}</style>
        </div>
    );
}

// Form Content Component
function WaitlistFormContent({ onClose }: { onClose: () => void }) {
    const searchParams = useSearchParams();
    const refCode = searchParams.get("ref");

    const [state, setState] = useState<"form" | "dashboard">("form");
    const [user, setUser] = useState<WaitlistUser | null>(null);
    const [email, setEmail] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [claimingTwitter, setClaimingTwitter] = useState(false);
    const [claimingTelegram, setClaimingTelegram] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Check if user exists on mount
    useEffect(() => {
        const savedWallet = localStorage.getItem("waitlist_wallet");
        if (savedWallet) {
            recoverUser(savedWallet);
        }
    }, []);

    const recoverUser = async (wallet: string) => {
        try {
            const res = await fetch(`${API_BASE}/waitlist/user?walletAddress=${encodeURIComponent(wallet)}`);
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setState("dashboard");
            }
        } catch {
            // Stay on form
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch(`${API_BASE}/waitlist/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    walletAddress,
                    referredByCode: refCode || undefined,
                }),
            });

            const data: ApiResponse = await res.json();

            if (!res.ok) {
                throw new Error((data as unknown as { message: string }).message || "Failed to join waitlist");
            }

            localStorage.setItem("waitlist_wallet", walletAddress);
            setUser(data.user);

            // Show confetti only for new users (not existing)
            if (!data.isExisting) {
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
            }

            setState("dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyReferralLink = () => {
        if (!user) return;
        const link = `https://swapify.fun/waitlist?ref=${user.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const verifySocial = async (platform: "twitter" | "telegram") => {
        if (!user) return;
        const setLoading = platform === "twitter" ? setClaimingTwitter : setClaimingTelegram;
        setLoading(true);

        const url = platform === "twitter"
            ? "https://x.com/SwapifySol"
            : "https://t.me/swapifysol";
        window.open(url, "_blank");

        await new Promise(resolve => setTimeout(resolve, 2000));

        try {
            const res = await fetch(`${API_BASE}/waitlist/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.id, platform }),
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch {
            // Silently fail
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {showConfetti && <Confetti />}
            <AnimatePresence mode="wait">
                {state === "form" ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, filter: "blur(10px)" }}
                        className="space-y-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <ArrowLeft className="w-5 h-5 text-white/60" />
                            </button>
                            <h2 className="text-xl font-bold text-white">Join the Waitlist</h2>
                            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <X className="w-5 h-5 text-white/60" />
                            </button>
                        </div>

                        <p className="text-white/50 text-sm text-center">
                            Be among the first to experience Swapify
                        </p>

                        {refCode && (
                            <div className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-center">
                                <span className="text-primary text-sm">🎁 You were referred! Earn bonus points.</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="Enter your email"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">Solana Wallet</label>
                                <input
                                    type="text"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    required
                                    placeholder="Your Solana wallet address"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm"
                                />
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400"
                                    >
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="text-sm">{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <GradientButton
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 text-[15px] font-bold uppercase tracking-[0.08em] disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Joining...</>
                                ) : (
                                    "Join Waitlist"
                                )}
                            </GradientButton>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, filter: "blur(10px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        className="space-y-6"
                    >
                        {/* Header */}
                        <div className="text-center space-y-1">
                            <div className="inline-flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                                <span className="text-primary/80 text-[10px] uppercase tracking-[0.15em]">Confirmed</span>
                            </div>
                            <h2 className="text-2xl font-light text-white">You&apos;re on the list</h2>
                        </div>

                        {/* Points + Referrals */}
                        <div className="flex items-center justify-center gap-8 py-4">
                            <div className="text-center">
                                <div className="text-5xl font-extralight text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                                    <AnimatedCounter value={user?.points || 0} />
                                </div>
                                <p className="text-white/30 text-[10px] uppercase tracking-[0.1em] mt-1">Points</p>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="text-center">
                                <div className="text-3xl font-extralight text-white/70" style={{ fontVariantNumeric: "tabular-nums" }}>
                                    {Math.max(0, Math.floor(((user?.points || 0) - (user?.followedTwitter ? 3 : 0) - (user?.joinedTelegram ? 3 : 0)) / 5))}
                                </div>
                                <p className="text-white/30 text-[10px] uppercase tracking-[0.1em] mt-1">Referrals</p>
                            </div>
                        </div>

                        {/* Referral */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-white/40 text-[10px] uppercase tracking-wider">Referral Link</span>
                                <span className="text-primary/50 text-[10px]">+5 per invite</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 px-3 py-2.5 bg-white/[0.02] border border-white/[0.06] rounded-lg font-mono text-xs text-white/50 truncate">
                                    swapify.fun?ref={user?.referralCode}
                                </div>
                                <motion.button
                                    onClick={copyReferralLink}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-colors"
                                >
                                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-white/40" />}
                                </motion.button>
                            </div>
                        </div>

                        {/* Social - Horizontal */}
                        <div className="space-y-2">
                            <span className="text-white/40 text-[10px] uppercase tracking-wider">Bonus Tasks</span>
                            <div className="flex gap-3">
                                <motion.button
                                    onClick={() => !user?.followedTwitter && verifySocial("twitter")}
                                    disabled={user?.followedTwitter || claimingTwitter}
                                    whileHover={!user?.followedTwitter ? { scale: 1.02 } : {}}
                                    whileTap={!user?.followedTwitter ? { scale: 0.98 } : {}}
                                    className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-lg transition-all ${user?.followedTwitter
                                        ? "bg-primary/[0.05] border border-primary/20"
                                        : "bg-white/[0.02] border border-white/[0.06] hover:border-white/10"
                                        }`}
                                >
                                    <Image src="/x logo.svg" alt="X" width={16} height={16} className="opacity-60" />
                                    <span className="text-white/70 text-sm">Follow</span>
                                    {claimingTwitter ? (
                                        <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />
                                    ) : user?.followedTwitter ? (
                                        <Check className="w-3.5 h-3.5 text-primary" />
                                    ) : (
                                        <span className="text-primary/70 text-xs">+3</span>
                                    )}
                                </motion.button>

                                <motion.button
                                    onClick={() => !user?.joinedTelegram && verifySocial("telegram")}
                                    disabled={user?.joinedTelegram || claimingTelegram}
                                    whileHover={!user?.joinedTelegram ? { scale: 1.02 } : {}}
                                    whileTap={!user?.joinedTelegram ? { scale: 0.98 } : {}}
                                    className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-lg transition-all ${user?.joinedTelegram
                                        ? "bg-primary/[0.05] border border-primary/20"
                                        : "bg-white/[0.02] border border-white/[0.06] hover:border-white/10"
                                        }`}
                                >
                                    <Image src="/Telegram Logo.svg" alt="Telegram" width={16} height={16} className="opacity-60" />
                                    <span className="text-white/70 text-sm">Join</span>
                                    {claimingTelegram ? (
                                        <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />
                                    ) : user?.joinedTelegram ? (
                                        <Check className="w-3.5 h-3.5 text-primary" />
                                    ) : (
                                        <span className="text-primary/70 text-xs">+3</span>
                                    )}
                                </motion.button>
                            </div>
                        </div>

                        {/* Close */}
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 text-white/25 hover:text-white/40 text-[10px] uppercase tracking-widest transition-colors"
                        >
                            Close
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Main Page Component
export default function WaitlistPage() {
    const [showForm, setShowForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Show loader for 2.5 seconds to allow shader background to initialize
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2500);
        return () => clearTimeout(timer);
    }, []);

    const handleJoinClick = () => {
        setShowForm(true);
    };

    return (
        <div className="w-screen h-screen flex flex-col relative bg-background overflow-hidden">
            {/* Initial Loader Overlay */}
            <AnimatePresence mode="wait">
                {isLoading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1, ease: "easeInOut" }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
                    >
                        <WaveLoader className="bg-primary" />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hero Section - Original Design */}
            <SyntheticHero
                showContent={!isLoading}
                title="Join the Future of Decentralized Trading"
                description="Be among the first to experience Swapify, the next-generation trading platform with automated strategies, privacy-first transactions, and zero slippage swaps. Built on Solana for lightning-fast execution."
                badgeText="Waitlist Open"
                badgeLabel="Coming Soon"
                ctaButtons={[
                    { text: "Join Waitlist", onClick: handleJoinClick, primary: true }
                ]}
                microDetails={[
                    "Automated trading strategies",
                    "Privacy-first transactions",
                    "Zero slippage swaps",
                    "Built on Solana",
                ]}
            />

            {/* Modal Overlay with Blur Effect */}
            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        {/* Backdrop */}
                        <motion.div
                            initial={{ backdropFilter: "blur(0px)" }}
                            animate={{ backdropFilter: "blur(12px)" }}
                            exit={{ backdropFilter: "blur(0px)" }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 bg-black/60"
                            onClick={() => setShowForm(false)}
                        />

                        {/* Form Card */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.9, filter: "blur(20px)" }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="relative w-full max-w-md bg-[#0a0a0a]/95 border border-white/10 rounded-3xl p-6 shadow-2xl"
                        >
                            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>}>
                                <WaitlistFormContent onClose={() => setShowForm(false)} />
                            </Suspense>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
