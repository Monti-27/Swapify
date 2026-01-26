import type { Metadata } from "next";
import { Kanit, Instrument_Serif } from "next/font/google";
import "../globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const kanit = Kanit({
    weight: ["300", "400", "500", "600", "700"],
    subsets: ["latin"],
    variable: "--font-kanit",
});

const instrumentSerif = Instrument_Serif({
    weight: ["400"],
    subsets: ["latin"],
    style: ["normal", "italic"],
    variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
    title: "Swapify - Join Waitlist",
    description: "Join the future of decentralized trading. Early access waitlist is open.",
    icons: {
        icon: [
            { url: "/faviconswapify/16x16favicon.png", sizes: "16x16", type: "image/png" },
            { url: "/faviconswapify/32x32favicon.png", sizes: "32x32", type: "image/png" },
        ],
    },
};

export default function MarketingLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head />
            <body className={`${kanit.variable} ${instrumentSerif.variable} font-sans antialiased overflow-x-hidden bg-background text-foreground`}>
                {children}
                <Analytics />
                <SpeedInsights debug={false} />
            </body>
        </html>
    );
}
