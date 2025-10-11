import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SolanaWalletProvider } from "@/components/wallet-provider";
import { Toaster } from "sonner";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-kanit",
});

export const metadata: Metadata = {
  title: "WeSwap - Crypto Trading Platform",
  description: "Modern crypto swap and trading platform powered by Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${kanit.variable} font-sans antialiased`}
      >
        <ThemeProvider>
          <SolanaWalletProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </SolanaWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
