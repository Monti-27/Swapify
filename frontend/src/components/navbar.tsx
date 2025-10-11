'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Moon, Sun, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useThemeStore } from '@/store/themeStore';
import { useWalletStore } from '@/store/walletStore';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';
import {
  Navbar as AceternityNavbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
} from '@/components/ui/resizable-navbar';

const navItems = [
  { name: 'Home', link: '/' },
  { name: 'Dashboard', link: '/dashboard' },
  { name: 'Swap', link: '/swap' },
  { name: 'Strategies', link: '/strategies' },
];

export function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { balance, connect, disconnect: storeDisconnect, updateBalance } = useWalletStore();
  const { publicKey, connected, disconnect: solanaDisconnect } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sync wallet state and fetch balance
  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58();
      connect(address, address);
      
      // Fetch balance with retry logic
      const fetchBalance = async (retryCount = 0) => {
        try {
          console.log('Fetching balance for:', publicKey.toBase58());
          const balance = await connection.getBalance(publicKey);
          const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(4);
          console.log('Balance fetched successfully:', solBalance, 'SOL');
          updateBalance(solBalance);
        } catch (error: any) {
          console.log('Failed to fetch balance:', {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode,
            retryCount
          });
          
          // If rate limited (403/429) or unauthorized (401), retry with backoff
          if (retryCount < 3 && (
            error.message?.includes('403') || 
            error.message?.includes('429') ||
            error.message?.includes('401')
          )) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            console.log(`Retrying balance fetch in ${delay}ms...`);
            setTimeout(() => fetchBalance(retryCount + 1), delay);
          } else {
            // Show "..." instead of 0.00 when RPC is having issues
            console.log('Max retries reached or unrecoverable error');
            updateBalance('...');
            toast.error('Failed to fetch balance', {
              description: 'Using RPC fallback'
            });
          }
        }
      };

      // Initial fetch with small delay to avoid immediate rate limit
      setTimeout(() => fetchBalance(), 500);

      // Set up balance polling every 60 seconds (increased from 30s to reduce rate limit hits)
      const interval = setInterval(() => fetchBalance(), 60000);

      return () => clearInterval(interval);
    } else {
      storeDisconnect();
    }
  }, [connected, publicKey, connection, connect, storeDisconnect, updateBalance]);

  const handleWalletClick = () => {
    if (!connected) {
      setVisible(true);
    }
  };

  const handleDisconnect = async () => {
    await solanaDisconnect();
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const LogoSection = () => (
    <Link href="/" className="relative z-20 flex items-center gap-2.5 group px-2 py-1">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <Image 
          src="/WeSwap-logo.png" 
          alt="WeSwap Logo"
          width={36}
          height={36}
          className="relative transition-all duration-300 group-hover:scale-110 drop-shadow-lg"
        />
      </div>
      <span className="text-xl font-bold text-gradient-purple transition-all duration-300 group-hover:tracking-wide font-display">
        WeSwap
      </span>
    </Link>
  );

  const ActionButtons = () => (
    <div className="relative z-20 flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="rounded-full hover:bg-primary/10 transition-all"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        ) : (
          <Moon className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
        )}
      </Button>

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

      {connected && publicKey ? (
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex flex-col items-end text-xs px-2">
            <span className="font-semibold text-primary">{balance} SOL</span>
            <span className="text-xs text-muted-foreground">
              {formatAddress(publicKey.toBase58())}
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
              {formatAddress(publicKey.toBase58())}
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
  );

  return (
    <AceternityNavbar className="top-0">
      {/* Desktop Navigation */}
      <NavBody className="border border-border/40">
        <LogoSection />
        <NavItems items={navItems} />
        <ActionButtons />
      </NavBody>

      {/* Mobile Navigation */}
      <MobileNav className="border border-border/40">
        <MobileNavHeader>
          <LogoSection />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-full"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
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
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            />
          </div>
        </MobileNavHeader>

        <MobileNavMenu 
          isOpen={mobileMenuOpen} 
          onClose={() => setMobileMenuOpen(false)}
        >
          {navItems.map((item, idx) => (
            <Link
              key={idx}
              href={item.link}
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left text-lg font-medium text-neutral-600 hover:text-primary dark:text-neutral-300 dark:hover:text-primary transition-colors"
            >
              {item.name}
            </Link>
          ))}
          
          <Separator className="my-2" />
          
          {connected && publicKey ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-muted-foreground">Balance</span>
                <span className="font-semibold text-primary">{balance} SOL</span>
                <span className="text-xs text-muted-foreground">
                  {formatAddress(publicKey.toBase58())}
                </span>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  handleDisconnect();
                  setMobileMenuOpen(false);
                }}
                className="w-full gap-2 border-primary/30 hover:bg-primary/10"
              >
                <Wallet className="h-4 w-4" />
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                handleWalletClick();
                setMobileMenuOpen(false);
              }}
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
}
