'use client';

import { motion } from 'framer-motion';
import { Shield, CheckCircle, Lock, Award } from 'lucide-react';
import Image from 'next/image';

const partners = [
  { name: 'Jupiter', logo: '/partners/jupiter-ag-jup-logo.svg' },
  { name: 'Raydium', logo: '/partners/raydium-ray-logo.svg' },
  { name: 'Orca', logo: '/partners/orca-orca-logo.svg' },
  { name: 'Phantom', logo: '/partners/Phantom_SVG_Icon.svg' },
  { name: 'Solana', logo: '/partners/solana-sol-logo.svg' },
];

const trustIndicators = [
  {
    icon: Shield,
    title: 'Audited Smart Contracts',
    description: 'Built with security-first approach',
  },
  {
    icon: Lock,
    title: 'Non-Custodial',
    description: 'You always control your funds',
  },
  {
    icon: Award,
    title: 'Multi-DEX Integration',
    description: 'Connected to leading exchanges',
  },
  {
    icon: CheckCircle,
    title: 'Open Source',
    description: 'Transparent and verifiable code',
  },
];

export function TrustSection() {
  return (
    <section className="py-24 sm:py-32 relative bg-background">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/[0.02] to-background" />
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-gradient-purple-subtle mb-6">
              <Award className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Trusted by Thousands</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Security & <span className="text-gradient-purple">Trust First</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Your security is our top priority. We work with industry leaders to ensure
              your funds are always safe.
            </p>
          </motion.div>
        </div>

        {/* Partner Logos - Bundled to Horizontal Spread Animation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mb-16 relative"
        >
          {/* Section label with fade-in */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            viewport={{ once: true }}
          >
            <p className="text-sm text-muted-foreground font-medium">Integrated with leading DEXs</p>
          </motion.div>
          
          {/* 
            BUNDLED POSITIONING LOGIC:
            - Parent container is relative with flex layout
            - Each logo calculates its final position distance from center
            - Initially, all logos have x: 0 (center), appearing stacked/bundled
            - On scroll trigger, each animates to its calculated final x position
          */}
          <div className="flex items-center justify-center relative min-h-[140px] sm:min-h-[160px]">
            <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-10">
              {partners.map((partner, index) => {
                // Calculate horizontal distance from center for each logo
                const centerIndex = (partners.length - 1) / 2;
                const distanceFromCenter = index - centerIndex;
                
                // Final position offset (in pixels) for horizontal spread
                const baseSpacing = 90; // Base spacing between logos
                
                return (
                  <motion.div
                    key={partner.name}
                    // INITIAL STATE: All logos stacked at center (x: 0 means no horizontal offset)
                    initial={{ 
                      opacity: 0,
                      x: -distanceFromCenter * baseSpacing, // Pull all logos to center by reversing their offset
                      y: 0,
                      scale: 0.3, // Start small to emphasize "bundled" feeling
                      rotate: 0,
                    }}
                    // ANIMATED STATE: Spread out horizontally to final positions (x: 0 = natural flex position)
                    whileInView={{ 
                      opacity: 1,
                      x: 0, // Animate to natural position (flexbox handles final placement)
                      y: 0,
                      scale: 1, // Grow to full size
                      rotate: 0,
                    }}
                    // TRANSITION: Ultra-smooth easing for gentle, flowing spread animation
                    transition={{ 
                      duration: 2.2, // Longer duration for ultra-smooth, luxurious feel
                      delay: 0.3 + index * 0.25, // Increased stagger delays for more gradual wave effect
                      ease: [0.25, 0.1, 0.25, 1], // Smoother cubic-bezier (easeInOutCubic)
                      opacity: { 
                        duration: 1.2, 
                        delay: 0.2 + index * 0.25,
                        ease: "easeInOut" 
                      },
                      scale: {
                        duration: 2.0,
                        ease: [0.16, 1, 0.3, 1], // Ultra-smooth easeOutExpo
                      },
                      x: {
                        duration: 2.2,
                        ease: [0.22, 1, 0.36, 1], // Custom smooth easing with gentle acceleration
                      }
                    }}
                    // SCROLL TRIGGER: Animation starts when section enters viewport, plays only once
                    viewport={{ once: true, margin: "-80px" }}
                    // Hover effects for interactivity
                    whileHover={{ 
                      scale: 1.08,
                      y: -8,
                      transition: { duration: 0.3, ease: "easeOut" }
                    }}
                    className="group cursor-pointer flex-shrink-0"
                  >
                    {/* Logo container with glassmorphism effect */}
                    <motion.div 
                      className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl border border-primary/20 bg-gradient-purple-card backdrop-blur-sm p-3 relative overflow-hidden shadow-lg"
                      whileHover={{ 
                        borderColor: 'rgba(168, 85, 247, 0.5)',
                        boxShadow: '0 8px 40px rgba(168, 85, 247, 0.25)',
                        transition: { duration: 0.3 }
                      }}
                    >
                      {/* Animated gradient background on hover */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-0"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ 
                          opacity: 1, 
                          scale: 1.2,
                          transition: { duration: 0.4 }
                        }}
                      />
                      
                      {/* Logo image with subtle hover animation */}
                      <motion.div
                        whileHover={{ 
                          scale: 1.12,
                          rotate: [0, -3, 3, 0],
                          transition: { duration: 0.5 }
                        }}
                        className="relative z-10"
                      >
                        <Image 
                          src={partner.logo} 
                          alt={`${partner.name} logo`}
                          width={48}
                          height={48}
                          className="object-contain filter brightness-90 group-hover:brightness-110 transition-all duration-300"
                        />
                      </motion.div>
                    </motion.div>
                    
                    {/* Partner name with delayed fade-in */}
                    <motion.p 
                      className="text-xs sm:text-sm font-medium text-muted-foreground text-center mt-3 group-hover:text-primary transition-colors duration-300"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: 0.8 + index * 0.25, 
                        duration: 0.8,
                        ease: "easeInOut"
                      }}
                      viewport={{ once: true }}
                    >
                      {partner.name}
                    </motion.p>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* Decorative glow effect that fades in after logos settle */}
          <motion.div
            className="absolute inset-0 pointer-events-none -z-10 overflow-hidden"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: 2.5, duration: 2, ease: "easeInOut" }}
            viewport={{ once: true }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          </motion.div>
        </motion.div>

        {/* Trust Indicators Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 max-w-7xl mx-auto">
          {trustIndicators.map((indicator, index) => {
            const Icon = indicator.icon;
            
            return (
              <motion.div
                key={indicator.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex p-4 rounded-xl bg-gradient-purple-subtle border border-primary/20 mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{indicator.title}</h3>
                <p className="text-sm text-muted-foreground">{indicator.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Security Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-gradient-purple-subtle">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Security First</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-gradient-purple-subtle">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Community Driven</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-gradient-purple-subtle">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Open Source</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

