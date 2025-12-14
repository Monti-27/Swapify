"use client";

import React from "react";
import { ModemAnimatedFooter } from "@/components/ui/modem-animated-footer";
import { FileText, LayoutDashboard, ArrowRightLeft, Layers } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";

export function Footer() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const socialLinks = [
    {
      // Using Image for X logo to maintain brand accuracy
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src="/x logo.svg"
            alt="X"
            fill
            className={`object-contain ${isDark ? "invert" : ""}`}
          />
        </div>
      ),
      href: "https://x.com/WeSwapfun",
      label: "X (Twitter)",
    },
    {
      // Using Image for Telegram logo
      icon: (
        <div className="relative w-full h-full flex items-center justify-center">
          <Image
            src="/Telegram Logo.svg"
            alt="Telegram"
            fill
            className="object-contain"
          />
        </div>
      ),
      href: "https://t.me/WeSwapfun",
      label: "Telegram",
    },

  ];

  const navLinks = [
    { label: "Swap", href: "/swap" },
    { label: "Strategies", href: "/strategies" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Docs", href: "/docs" },
  ];

  return (
    <ModemAnimatedFooter
      brandName="WeSwap"
      brandDescription="The future of decentralized trading on Solana. Fast, non-custodial, and fully automated."
      socialLinks={socialLinks}
      navLinks={navLinks}
      creatorName="WeSwap Protocol"
      creatorUrl="https://weswap.fun"
      brandIcon={
        <div className="relative w-full h-full">
          <Image
            src="/WeSwap-logo.png"
            alt="WeSwap"
            fill
            className="object-contain drop-shadow-lg"
          />
        </div>
      }
    />
  );
}
