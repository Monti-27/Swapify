"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Check, Copy, Twitter, Send, Loader2, AlertCircle, Sparkles } from "lucide-react";

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

export default function WaitlistDashboard() {
    const searchParams = useSearchParams();
    const refCode = searchParams.get("ref");

    // State
    const [state, setState] = useState<"loading" | "form" | "dashboard">("loading");
    const [user, setUser] = useState<WaitlistUser | null>(null);
    const [email, setEmail] = useState("");
    const [walletAddress, setWalletAddress] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [claimingTwitter, setClaimingTwitter] = useState(false);
    const [claimingTelegram, setClaimingTelegram] = useState(false);

    // Check if user exists on mount (via localStorage wallet)
    useEffect(() => {
        const savedWallet = localStorage.getItem("waitlist_wallet");
        if (savedWallet) {
            recoverUser(savedWallet);
        } else {
            setState("form");
        }
    }, []);

    // Recover user from wallet
    const recoverUser = async (wallet: string) => {
        try {
            const res = await fetch(`${API_BASE}/waitlist/user?walletAddress=${encodeURIComponent(wallet)}`);
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setState("dashboard");
            } else {
                setState("form");
            }
        } catch {
            setState("form");
        }
    };

    // Join waitlist
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

            // Save wallet to localStorage for recovery
            localStorage.setItem("waitlist_wallet", walletAddress);
            setUser(data.user);
            setState("dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Copy referral link
    const copyReferralLink = () => {
        if (!user) return;
        const link = `https://swapify.fun/waitlist?ref=${user.referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Verify social
    const verifySocial = async (platform: "twitter" | "telegram") => {
        if (!user) return;

        const setLoading = platform === "twitter" ? setClaimingTwitter : setClaimingTelegram;
        setLoading(true);

        // Open social link
        const url = platform === "twitter"
            ? "https://twitter.com/swapifyxyz"
            : "https://t.me/swapifyxyz";
        window.open(url, "_blank");

        // Wait a bit then claim
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

    // Loading state
    if (state === "loading") {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-md mx-auto">
            <AnimatePresence mode="wait">
                {state === "form" ? (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-6"
                    >
                        {/* Form Header */}
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white">Join the Waitlist</h2>
                            <p className="text-white/60 text-sm">
                                Be among the first to experience Swapify
                            </p>
                        </div>

                        {/* Referral Badge */}
                        {refCode && (
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="bg-primary/10 border border-primary/30 rounded-xl px-4 py-2 text-center"
                            >
                                <span className="text-primary text-sm">
                                    🎁 You were referred! Both of you earn bonus points.
                                </span>
                            </motion.div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Solana Wallet Address
                                </label>
                                <input
                                    type="text"
                                    value={walletAddress}
                                    onChange={(e) => setWalletAddress(e.target.value)}
                                    required
                                    placeholder="Your Solana wallet address"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono text-sm"
                                />
                            </div>

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400"
                                    >
                                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        <span className="text-sm">{error}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={isSubmitting}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5" />
                                        Join Waitlist
                                    </>
                                )}
                            </motion.button>
                        </form>
                    </motion.div>
                ) : (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                    >
                        {/* Access Granted Header */}
                        <motion.div
                            initial={{ y: -20 }}
                            animate={{ y: 0 }}
                            className="text-center space-y-2"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring" }}
                                className="inline-flex items-center gap-2 bg-primary/20 border border-primary/40 rounded-full px-4 py-1"
                            >
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-primary text-xs font-medium uppercase tracking-wider">Access Granted</span>
                            </motion.div>
                            <h2 className="text-3xl font-bold text-white">You&apos;re In!</h2>
                        </motion.div>

                        {/* Points Counter */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-6 text-center"
                        >
                            <p className="text-white/60 text-sm mb-1">Your Points</p>
                            <div className="text-6xl font-bold text-primary" style={{ textShadow: "0 0 30px rgba(0,255,148,0.5)" }}>
                                <AnimatedCounter value={user?.points || 0} />
                            </div>
                        </motion.div>

                        {/* Referral Link */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
                        >
                            <p className="text-white/80 text-sm font-medium">Your Referral Link</p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-black/30 rounded-lg px-3 py-2 font-mono text-sm text-white/70 truncate">
                                    swapify.fun/waitlist?ref={user?.referralCode}
                                </div>
                                <motion.button
                                    onClick={copyReferralLink}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="p-2 bg-primary/20 hover:bg-primary/30 rounded-lg transition-colors"
                                >
                                    {copied ? (
                                        <Check className="w-5 h-5 text-primary" />
                                    ) : (
                                        <Copy className="w-5 h-5 text-primary" />
                                    )}
                                </motion.button>
                            </div>
                            <p className="text-white/40 text-xs">Earn +5 points for each friend who joins!</p>
                        </motion.div>

                        {/* Social Missions */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="space-y-3"
                        >
                            <p className="text-white/80 text-sm font-medium">Earn More Points</p>

                            {/* Twitter Mission */}
                            <motion.button
                                onClick={() => !user?.followedTwitter && verifySocial("twitter")}
                                disabled={user?.followedTwitter || claimingTwitter}
                                whileHover={!user?.followedTwitter ? { scale: 1.02 } : {}}
                                whileTap={!user?.followedTwitter ? { scale: 0.98 } : {}}
                                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${user?.followedTwitter
                                        ? "bg-primary/10 border border-primary/30"
                                        : "bg-white/5 border border-white/10 hover:border-white/20"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${user?.followedTwitter ? "bg-primary/20" : "bg-white/10"}`}>
                                        <Twitter className={`w-5 h-5 ${user?.followedTwitter ? "text-primary" : "text-white"}`} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium">Follow on X</p>
                                        <p className="text-white/40 text-xs">+3 points</p>
                                    </div>
                                </div>
                                {claimingTwitter ? (
                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                ) : user?.followedTwitter ? (
                                    <Check className="w-5 h-5 text-primary" />
                                ) : (
                                    <span className="text-primary text-sm font-medium">Claim</span>
                                )}
                            </motion.button>

                            {/* Telegram Mission */}
                            <motion.button
                                onClick={() => !user?.joinedTelegram && verifySocial("telegram")}
                                disabled={user?.joinedTelegram || claimingTelegram}
                                whileHover={!user?.joinedTelegram ? { scale: 1.02 } : {}}
                                whileTap={!user?.joinedTelegram ? { scale: 0.98 } : {}}
                                className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${user?.joinedTelegram
                                        ? "bg-primary/10 border border-primary/30"
                                        : "bg-white/5 border border-white/10 hover:border-white/20"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${user?.joinedTelegram ? "bg-primary/20" : "bg-white/10"}`}>
                                        <Send className={`w-5 h-5 ${user?.joinedTelegram ? "text-primary" : "text-white"}`} />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-white font-medium">Join Telegram</p>
                                        <p className="text-white/40 text-xs">+3 points</p>
                                    </div>
                                </div>
                                {claimingTelegram ? (
                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                ) : user?.joinedTelegram ? (
                                    <Check className="w-5 h-5 text-primary" />
                                ) : (
                                    <span className="text-primary text-sm font-medium">Claim</span>
                                )}
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
