import React from 'react';
import { Navbar } from '@/components/navbar';
import { HeroSection } from '@/components/ui/hero-section-3';
import { Hero } from '@/components/hero';
import { HowItWorksTimeline } from '@/components/how-it-works-timeline';
import { TokenBurnGrid } from '@/components/ui/token-burn-grid';
import { FeaturesGridSection } from '@/components/features-grid-section';
import { BentoGrid } from '@/components/ui/bento-grid';

import { TrustSection } from '@/components/trust-section';
import { MarqueeCTA } from '@/components/marquee-cta';
import { Footer } from '@/components/footer';


export default function Home() {
  return (
    <div className="min-h-screen relative bg-background w-full overflow-x-hidden">
      <div className="absolute inset-0 gradient-purple-radial pointer-events-none" style={{ willChange: 'auto' }} />
      <div className="relative z-10" style={{ willChange: 'auto' }}>
        <Navbar />
        <main className="relative">
          <HeroSection />
          <BentoGrid />
          <FeaturesGridSection />
          {/* <Hero /> */}
          <HowItWorksTimeline />

          <TokenBurnGrid />

          <TrustSection />
          <MarqueeCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}
