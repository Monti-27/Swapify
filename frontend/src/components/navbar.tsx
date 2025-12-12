'use client';

import React, { useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Moon, Sun, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { useWalletInit } from "@/contexts/WalletInitContext";
import { useBalance } from "@/contexts/BalanceContext";
import { cn } from "@/lib/utils";
import {
  Navbar as AceternityNavbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
} from "@/components/ui/resizable-navbar";
import { useThemeToggle } from "@/components/ui/skiper-ui/skiper26";

const navItems = [
  { name: "Home", link: "/" },
  { name: "Dashboard", link: "/dashboard" },
  { name: "Swap", link: "/swap" },
  { name: "Strategies", link: "/strategies" },
];

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
  const { balance } = useBalance(); // READ-ONLY: No fetching in navbar
  const { publicKey, connected, disconnect: solanaDisconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { isInitializing } = useWalletInit();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Memoize event handlers
  const handleWalletClick = useCallback(() => {
    if (!connected) {
      setVisible(true);
    }
  }, [connected, setVisible]);

  const handleDisconnect = useCallback(async () => {
    await solanaDisconnect();
  }, [solanaDisconnect]);

  const handleCloseMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const handleToggleMobileMenu = useCallback(() => setMobileMenuOpen(!mobileMenuOpen), [mobileMenuOpen]);

  // Handlers for mobile menu actions
  const handleDisconnectAndClose = useCallback(() => {
    handleDisconnect();
    handleCloseMobileMenu();
  }, [handleDisconnect, handleCloseMobileMenu]);

  const handleWalletClickAndClose = useCallback(() => {
    handleWalletClick();
    handleCloseMobileMenu();
  }, [handleWalletClick, handleCloseMobileMenu]);

  // Memoize formatted address
  const formattedAddress = useMemo(() =>
    publicKey ? formatAddress(publicKey.toBase58()) : '',
    [publicKey]
  );

  // Memoize sub-components for better performance
  const LogoSection = useMemo(() => (
    <Link href="/" className="relative z-20 flex items-center gap-2.5 group px-2 py-1">
      <span className="text-xl font-bold text-gradient-purple transition-all duration-300 group-hover:tracking-wide font-display">
        WeSwap
      </span>
    </Link>
  ), []);


  const ActionButtons = useMemo(
    () => (
      <div className="relative z-20 flex items-center gap-2">
        <AnimatedThemeToggle className="h-11 w-11" />

        <Button
          variant="ghost"
          size="icon"
          asChild
          aria-label="Join Telegram Group"
          className="rounded-full hover:bg-primary/10 transition-all"
        >
          <a href="https://t.me/WeSwapfun" target="_blank" rel="noopener noreferrer">
            <Image
              src="/Telegram Logo.svg"
              alt="Telegram"
              width={20}
              height={20}
              className="transition-transform hover:scale-110"
            />
          </a>
        </Button>

        <Separator orientation="vertical" className="h-6 mx-1 hidden md:block" />

        {/* Show placeholder during initialization to prevent flash */}
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
              className="gap-2 border-primary/30 hover:bg-primary/10 transition-all"
            >
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline lg:hidden">
                {formattedAddress}
              </span>
              <span className="hidden lg:inline">Disconnect</span>
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            onClick={handleWalletClick}
            className="gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
          </Button>
        )}
      </div>
    ),
    [balance, connected, formattedAddress, handleDisconnect, handleWalletClick, isInitializing, publicKey]
  );

  return (
    <AceternityNavbar className="top-0">
      {/* Desktop Navigation */}
      <NavBody className="border border-border/40">
        {LogoSection}
        <NavItems items={navItems} />
        {ActionButtons}
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav className="border border-border/40">
        <MobileNavHeader>
          {LogoSection}
          <div className="flex items-center gap-2">
            <AnimatedThemeToggle className="h-10 w-10" />
            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="Join Telegram Group"
              className="rounded-full"
            >
              <a href="https://t.me/WeSwapfun" target="_blank" rel="noopener noreferrer">
                <Image
                  src="/Telegram Logo.svg"
                  alt="Telegram"
                  width={20}
                  height={20}
                  className="transition-transform hover:scale-110"
                />
              </a>
            </Button>
            <MobileNavToggle
              isOpen={mobileMenuOpen}
              onClick={handleToggleMobileMenu}
            />
          </div>
        </MobileNavHeader>

        <MobileNavMenu
          isOpen={mobileMenuOpen}
          onClose={handleCloseMobileMenu}
        >
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.link}
              onClick={handleCloseMobileMenu}
              className="block w-full text-left text-lg font-medium text-neutral-600 hover:text-primary dark:text-neutral-300 dark:hover:text-primary transition-colors"
            >
              {item.name}
            </Link>
          ))}

          <Separator className="my-2" />

          {/* Show placeholder during initialization to prevent flash */}
          {isInitializing ? (
            <div className="w-full h-10 bg-muted/20 animate-pulse rounded-md" />
          ) : connected && publicKey ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-semibold text-primary">{balance} SOL</span>
                <span className="text-xs text-muted-foreground">
                  {formattedAddress}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={handleDisconnectAndClose}
                className="w-full gap-2 border-primary/30 hover:bg-primary/10"
              >
                <Wallet className="h-4 w-4" />
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleWalletClickAndClose}
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white"
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
          )}
        </MobileNavMenu>
      </MobileNav>
    </AceternityNavbar>
  );
});
