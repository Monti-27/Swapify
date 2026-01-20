import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Swapify Waitlist - Join the Future of Trading",
    description: "Be among the first to experience Swapify — the next-generation decentralized trading platform with automated strategies, privacy-first transactions, and zero slippage swaps.",
};

export default function WaitlistLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Standalone layout - no providers, no smooth scroll, just the page content
    return <>{children}</>;
}
