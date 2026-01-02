"use client";

import React from 'react';
import { useTheme } from 'next-themes';

const Sidebar = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const navItems = [
    {
      name: 'ArkFi',
      iconLight: 'https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp4/coin-01-light_mfrp33.svg',
      iconDark: 'https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp4/coin-01-dark_k0xthz.svg',
      isActive: true,
    },
    {
      name: 'Solaris',
      iconLight: 'https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp4/coin-02-light_wbsrxl.svg',
      iconDark: 'https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp4/coin-02-dark_l7j3yv.svg',
      isActive: false,
    },
    {
      name: 'Nexus',
      iconLight: 'https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp4/coin-03-light_dvkbrk.svg',
      iconDark: 'https://raw.githubusercontent.com/origin-space/origin-images/refs/heads/main/exp4/coin-03-dark_htjbyp.svg',
      isActive: false,
    },
  ];

  return (
    <div 
      data-slot="sidebar" 
      className="bg-white dark:bg-zinc-900 text-swap-muted-foreground flex h-full flex-col w-16 sm:w-20 border-r border-swap-border transition-all duration-300 ease-in-out"
    >
      <div 
        data-slot="sidebar-content" 
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-visible"
      >
      </div>
    </div>
  );
};

export default Sidebar;
