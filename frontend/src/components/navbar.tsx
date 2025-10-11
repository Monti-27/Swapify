'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Moon, Sun, Wallet, Menu, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu';
import { Separator } from '@/components/ui/separator';
import { useThemeStore } from '@/store/themeStore';
import { useWalletStore } from '@/store/walletStore';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'sonner';

export function Navbar() {
  const { theme, toggleTheme } = useThemeStore();
  const { balance, connect, disconnect: storeDisconnect, updateBalance } = useWalletStore();
  const { publicKey, connected, disconnect: solanaDisconnect } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

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

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Image 
                src="/WeSwap-logo.png" 
                alt="WeSwap Logo"
                width={38}
                height={38}
                className="relative transition-all duration-300 group-hover:scale-110 drop-shadow-lg"
              />
            </div>
            <span className="text-xl font-bold text-gradient-purple transition-all duration-300 group-hover:tracking-wide font-display">
              WesWAP
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          <NavigationMenu className="hidden md:flex">
            <NavigationMenuList>
              <NavigationMenuItem>
                <Link href="/" className={navigationMenuTriggerStyle()}>
                  Home
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/dashboard" className={navigationMenuTriggerStyle()}>
                  Dashboard
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/swap" className={navigationMenuTriggerStyle()}>
                  Swap
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/strategies" className={navigationMenuTriggerStyle()}>
                  Strategies
                </Link>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <Link href="/pools" className={navigationMenuTriggerStyle()}>
                  Pools
                </Link>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Actions */}
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

            <Separator orientation="vertical" className="h-6 hidden md:block" />

            {connected && publicKey ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col items-end text-sm">
                  <span className="font-semibold text-primary">{balance} SOL</span>
                  <span className="text-xs text-muted-foreground">
                    {formatAddress(publicKey.toBase58())}
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  className="gap-2 border-primary/30 hover:bg-primary/10"
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
                variant="default"
                onClick={handleWalletClick}
                className="gap-2 shadow-purple-soft hover:shadow-purple-glow"
              >
                <Wallet className="h-4 w-4" />
                <span className="hidden sm:inline">Connect Wallet</span>
              </Button>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

