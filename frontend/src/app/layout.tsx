import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SmoothScroll } from "@/components/smooth-scroll";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-kanit",
});

// VEXPROTOCOL BRANDING (original WeSwap metadata commented below)
export const metadata: Metadata = {
  title: "VexProtocol | Zero-Knowledge Privacy Shield",
  description: "Advanced ZK-powered privacy shielding for Solana. Secure, non-custodial asset protection.",
  icons: {
    icon: "/vexprotocol/vexprotocol.png",
  },
};

/* ORIGINAL WESWAP METADATA
export const metadata: Metadata = {
  title: "WeSwap - Crypto Trading Platform",
  description: "Modern crypto swap and trading platform powered by Solana",
  icons: {
    icon: "/favicon/new-favicon.ico",
  },
};
*/

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${kanit.variable} font-sans antialiased overflow-x-hidden bg-gradient-to-br from-[#050E09] via-[#022c1b] to-[#000000] min-h-screen`}>
        <Providers>
          <SmoothScroll>
            {children}
          </SmoothScroll>
        </Providers>
        <Analytics />
        <SpeedInsights debug={false} />
      </body>
    </html>
  );
}
