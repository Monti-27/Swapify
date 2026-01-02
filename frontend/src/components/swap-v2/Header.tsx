"use client";

import React from 'react';
import Image from 'next/image';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';

const Header = () => {
  const { setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-sm sticky top-0 z-50 -mx-2 px-2 transition-colors">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-swap-border py-4 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="text-swap-muted-foreground hover:text-swap-foreground relative inline-flex size-8 cursor-pointer items-center justify-center transition-colors outline-none rounded-md hover:bg-swap-muted"
            aria-label="Toggle theme"
          >
            <Sun size={20} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon size={20} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </button>

          <button 
            type="button"
            className="inline-flex items-center justify-center outline-none transition-[color,box-shadow] hover:opacity-80 rounded-full"
            aria-label="User profile"
          >
            <span className="relative flex size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-swap-border">
              <Image 
                src="https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp4/user_i02xph.png" 
                alt="Profile image"
                width={32}
                height={32}
                className="aspect-square object-cover"
                priority
              />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
