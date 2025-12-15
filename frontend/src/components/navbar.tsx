'use client';

import React, { useCallback, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Moon, Sun, Wallet, Home, LayoutDashboard, ArrowRightLeft, Layers, Menu, X } from "lucide-react";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-2">
          {/* <Image src="/logo.png" alt="WeSwap" width={32} height={32} className="w-8 h-8" /> */}
          <span className="font-display font-bold text-xl tracking-tight pl-2">Weswap</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background pt-24 px-6 animate-in slide-in-from-top-5 duration-200 flex flex-col h-screen overflow-y-auto">
          <nav className="flex flex-col space-y-6">
            {tubelightItems.map((item) => (
              <Link
                key={item.name}
                href={item.url}
                className="flex items-center gap-4 text-2xl font-semibold text-foreground/80 hover:text-primary transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="h-6 w-6" />
                {item.name}
              </Link>
            ))}
          </nav>
          <Separator className="my-6" />
          <div className="flex flex-col gap-6 pb-10">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">Appearance</span>
              <AnimatedThemeToggle className="h-10 w-10" />
            </div>

            {/* Wallet Integration */}
            {!connected ? (
              <GradientButton
                onClick={() => {
                  handleWalletClick();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full justify-center py-6 text-lg"
              >
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </GradientButton>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-sm text-muted-foreground mb-1">Connected Wallet</p>
                  <p className="font-mono font-medium">{formattedAddress}</p>
                  <p className="text-sm text-primary mt-1">{balance} SOL</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleDisconnect();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-6 text-lg border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                >
                  Disconnect
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Navbar */}
      <div className="hidden md:block">
        <TubelightNavbar items={tubelightItems} className="fixed top-0">
          {ActionButtons}
        </TubelightNavbar>
      </div>
    </header>
  );
});
