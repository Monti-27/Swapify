'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Twitter, Github, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-border/40 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4 group cursor-default">
              <div className="relative">
                <Image 
                  src="/WeSwap-logo.png" 
                  alt="WeSwap Logo"
                  width={36}
                  height={36}
                  className="drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <span className="text-xl font-bold text-gradient-purple font-display">Weswap</span>
            </div>
            <p className="text-sm text-muted-foreground font-sans">
              The future of decentralized trading on Solana.
            </p>
            <div className="mt-4 flex space-x-4">
              <Link
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <Github className="h-5 w-5" />
              </Link>
              <Link
                href="https://discord.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                <MessageCircle className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-4 text-sm font-semibold font-display">Product</h3>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <Link
                  href="/swap"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Swap
                </Link>
              </li>
              <li>
                <Link
                  href="/pools"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Liquidity Pools
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h3 className="mb-4 text-sm font-semibold font-display">Developers</h3>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/api"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  API Reference
                </Link>
              </li>
              <li>
                <Link
                  href="https://github.com"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  GitHub
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold font-display">Company</h3>
            <ul className="space-y-3 text-sm font-sans">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/40 pt-8">
          <p className="text-center text-sm text-muted-foreground font-sans">
            © {new Date().getFullYear()} WeSwap. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

