"use client";

import { ModemAnimatedFooter } from "@/components/ui/modem-animated-footer";
import Image from "next/image";

export function Footer() {
  return (
    <ModemAnimatedFooter
      brandName="Swapify"
      brandDescription="The future of decentralized trading on Solana. Fast, non-custodial, and fully automated."
      creatorName="Swapify Team"
      creatorUrl="https://swapify.fun"
      brandIcon={
        <div className="relative w-10 h-10">
          <Image
            src="/swap-logo.svg"
            alt="Swapify"
            fill
            className="object-contain"
          />
        </div>
      }
    />
  );
}
