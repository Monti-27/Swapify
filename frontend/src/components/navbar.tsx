'use client';

import React, { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Moon, Sun, Wallet, Home, LayoutDashboard, ArrowRightLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletInit } from "@/contexts/WalletInitContext";
import { useBalance } from "@/contexts/BalanceContext";
import { cn } from "@/lib/utils";
import { useThemeToggle } from "@/components/ui/skiper-ui/skiper26";
import { TubelightNavbar } from "@/components/ui/tubelight-navbar";
import { GradientButton } from "@/components/ui/gradient-button";

// Memoize helper function outside component
const formatAddress = (addr: string) => {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
};

const AnimatedThemeToggle = ({ className }: { className?: string }) => {
  const { isDark, toggleTheme } = useThemeToggle({
    variant: "polygon",
    start: "top-left",
    blur: true,
  });

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={toggleTheme}
      className={cn(
        "p-0 text-muted-foreground bg-transparent border-0 shadow-none transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        "flex items-center justify-center",
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-5 w-5 text-neutral-600 dark:text-neutral-200" />
      ) : (
        <Moon className="h-5 w-5 text-neutral-600 dark:text-neutral-200" />
      )}
    </button>
  );
};

export const Navbar = React.memo(function Navbar() {
  const { balance } = useBalance();
  const { publicKey, connected, disconnect: solanaDisconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { isInitializing } = useWalletInit();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Memoize event handlers
  const handleWalletClick = useCallback(() => {
    if (!connected) {
      setVisible(true);
    }
  }, [connected, setVisible]);

  const handleDisconnect = useCallback(async () => {
    await solanaDisconnect();
  }, [solanaDisconnect]);

  // Memoize formatted address
  const formattedAddress = useMemo(() =>
    publicKey ? formatAddress(publicKey.toBase58()) : '',
    [publicKey]
  );

  // Action Buttons (Desktop)
  const ActionButtons = useMemo(
    () => (
      <div className="flex items-center gap-2">
        <AnimatedThemeToggle className="h-9 w-9 hidden lg:flex" />



        <Separator orientation="vertical" className="h-6 mx-1 hidden lg:block" />

        {/* Show placeholder during initialization */}
        {isInitializing ? (
          <div className="w-[140px] h-9 bg-muted/20 animate-pulse rounded-md" />
        ) : connected && publicKey ? (
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex flex-col items-end text-xs px-2">
              <span className="font-semibold text-primary">{balance} SOL</span>
              <span className="text-xs text-muted-foreground">
                {formattedAddress}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className={cn("gap-2 border-primary/30 hover:bg-primary/10 transition-all")}
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline lg:hidden">
                {formattedAddress}
              </span>
              <span className="hidden lg:inline">Disconnect</span>
            </Button>
          </div>
        ) : (
          <GradientButton
            onClick={handleWalletClick}
            className="gap-2 min-w-[auto] px-6 py-2 h-9 text-sm font-semibold"
            variant="variant"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
          </GradientButton>
        )}
      </div >
    ),
    [balance, connected, formattedAddress, handleDisconnect, handleWalletClick, isInitializing, publicKey]
  );

  const tubelightItems = [
    { name: "Home", url: "/", icon: Home },
    { name: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { name: "Swap", url: "/swap", icon: ArrowRightLeft },
    { name: "Strategies", url: "/strategies", icon: Layers },
  ];

  return (
    <header>
      <TubelightNavbar items={tubelightItems} className="fixed top-0">
        {ActionButtons}
      </TubelightNavbar>
    </header>
  );
});
