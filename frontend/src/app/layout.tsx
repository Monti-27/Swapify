import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    <html lang="en" suppressHydrationWarning style={{ colorScheme: 'dark' }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme-storage');
                  var theme = stored ? JSON.parse(stored).state.theme : 'dark';
                  var html = document.documentElement;
                  html.classList.add(theme);
                  html.style.colorScheme = theme;
                  html.style.backgroundColor = theme === 'dark' ? '#0a0a0a' : '#ffffff';
                } catch (e) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                  document.documentElement.style.backgroundColor = '#0a0a0a';
                }
              })();
            `,
          }}
        />
        <meta name="color-scheme" content="dark light" />
      </head>
      <body
        className={`${kanit.variable} font-sans antialiased`}
        style={{ backgroundColor: 'transparent' }}
      >
        <Providers>
          {children}
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
