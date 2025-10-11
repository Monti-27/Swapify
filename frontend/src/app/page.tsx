import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { HowItWorks } from '@/components/how-it-works';
import { FeaturesEnhanced } from '@/components/features-enhanced';
import { UseCases } from '@/components/use-cases';
import { TrustSection } from '@/components/trust-section';
import { CTASection } from '@/components/cta-section';
import { Footer } from '@/components/footer';
import { TextHoverEffect } from '@/components/ui/text-hover-effect';

export default function Home() {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 gradient-purple-radial pointer-events-none" />
      <div className="relative z-10">
        <Navbar />
        <main className="relative -mt-16">
          <Hero />
          <HowItWorks />
          <FeaturesEnhanced />
          <UseCases />
          <TrustSection />
          <CTASection />
        </main>
        
        {/* Layered Footer Section */}
        <div className="relative w-full">
          {/* Large WeSwap Text - Behind Footer */}
          <div className="relative w-full h-[70vh] min-h-[650px] flex items-end justify-center overflow-hidden pb-20">
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
            {/* Stronger fade from bottom gradient overlay for better masking */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
            <div className="relative w-full h-full flex items-center justify-center px-4 z-0 translate-y-16">
              <TextHoverEffect text="Weswap" duration={0.3} automatic={true} />
            </div>
          </div>
          
          {/* Footer - In Front, overlapping bottom of WeSwap text */}
          <div className="relative -mt-[45vh]">
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}
