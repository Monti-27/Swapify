/**
 * VEXPROTOCOL - PRIVACY-ONLY MODE
 * 
 * The homepage now renders the Privacy component directly.
 * Original WeSwap homepage components are commented out below.
 */
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { PrivacyDashboard } from '@/components/privacy/privacy-dashboard';

// ORIGINAL HOMEPAGE IMPORTS (commented out for privacy-only mode)
// import { HeroSection } from '@/components/ui/hero-section-3';
// import { Hero } from '@/components/hero';
// import { HowItWorksTimeline } from '@/components/how-it-works-timeline';
// import { TokenBurnGrid } from '@/components/ui/token-burn-grid';
// import { FeaturesGridSection } from '@/components/features-grid-section';
// import { BentoGrid } from '@/components/ui/bento-grid';
// import { TrustSection } from '@/components/trust-section';
// import { MarqueeCTA } from '@/components/marquee-cta';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col relative bg-background">
      <div className="absolute inset-0 gradient-purple-radial pointer-events-none" />
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-32 pb-20">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Vault</h1>
              <p className="text-muted-foreground">Securely shield and transfer assets using ZK compression.</p>
            </div>
            <PrivacyDashboard />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

/* ORIGINAL HOMEPAGE (commented out for privacy-only mode)
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
*/
