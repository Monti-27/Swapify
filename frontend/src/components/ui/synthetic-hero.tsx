"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BlurTextAnimation from "@/components/ui/blur-text-animation";
import { JoinWaitlistButton } from "@/components/ui/join-waitlist-button";

interface ShaderPlaneProps {
    vertexShader: string;
    fragmentShader: string;
    uniforms: { [key: string]: { value: unknown } };
}

const ShaderPlane = ({
    vertexShader,
    fragmentShader,
    uniforms,
}: ShaderPlaneProps) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const { size } = useThree();

    useFrame((state) => {
        if (meshRef.current) {
            const material = meshRef.current.material as THREE.ShaderMaterial;
            material.uniforms.u_time.value = state.clock.elapsedTime * 0.5;
            material.uniforms.u_resolution.value.set(size.width, size.height, 1.0);
        }
    });

    return (
        <mesh ref={meshRef}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                vertexShader={vertexShader}
                fragmentShader={fragmentShader}
                uniforms={uniforms}
                side={THREE.FrontSide}
                depthTest={false}
                depthWrite={false}
            />
        </mesh>
    );
};

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec3 u_resolution;

  vec2 toPolar(vec2 p) {
      float r = length(p);
      float a = atan(p.y, p.x);
      return vec2(r, a);
  }

  vec2 fromPolar(vec2 polar) {
      return vec2(cos(polar.y), sin(polar.y)) * polar.x;
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
      vec2 p = 6.0 * ((fragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y);

      vec2 polar = toPolar(p);
      float r = polar.x;
      float a = polar.y;

      vec2 i = p;
      float c = 0.0;
      float rot = r + u_time + p.x * 0.100;
      for (float n = 0.0; n < 4.0; n++) {
          float rr = r + 0.15 * sin(u_time*0.7 + float(n) + r*2.0);
          p *= mat2(
              cos(rot - sin(u_time / 10.0)), sin(rot),
              -sin(cos(rot) - u_time / 10.0), cos(rot)
          ) * -0.25;

          float t = r - u_time / (n + 30.0);
          i -= p + sin(t - i.y) + rr;

          c += 2.2 / length(vec2(
              (sin(i.x + t) / 0.15),
              (cos(i.y + t) / 0.15)
          ));
      }

      c /= 8.0;

      // Swapify green color: #00FF94 = rgb(0, 255, 148) = vec3(0.0, 1.0, 0.58)
      vec3 baseColor = vec3(0.0, 0.9, 0.5);
      vec3 finalColor = baseColor * smoothstep(0.0, 1.0, c * 0.6);

      fragColor = vec4(finalColor, 1.0);
  }

  void main() {
      vec4 fragColor;
      vec2 fragCoord = vUv * u_resolution.xy;
      mainImage(fragColor, fragCoord);
      gl_FragColor = fragColor;
  }
`;

interface HeroProps {
    title: string;
    description: string;
    badgeText?: string;
    badgeLabel?: string;
    ctaButtons?: Array<{ text: string; href?: string; primary?: boolean; onClick?: () => void }>;
    microDetails?: Array<string>;
    showContent?: boolean;
}

const SyntheticHero = ({
    title = "Join the Future of Decentralized Trading",
    description = "Experience a new dimension of interaction — fluid, tactile, and alive. Designed for creators who see beauty in motion.",
    badgeText = "Waitlist Open",
    badgeLabel = "Coming Soon",
    ctaButtons = [
        { text: "Join Waitlist", href: "#waitlist", primary: true },
        { text: "Learn More", href: "#learn-more" },
    ],
    microDetails = [
        "Automated trading strategies",
        "Privacy-first transactions",
        "Zero slippage swaps",
    ],
    showContent = true,
}: HeroProps) => {
    const sectionRef = useRef<HTMLElement | null>(null);

    const shaderUniforms = useMemo(
        () => ({
            u_time: { value: 0 },
            u_resolution: { value: new THREE.Vector3(1, 1, 1) },
        }),
        [],
    );

    return (
        <section
            ref={sectionRef}
            className="relative flex items-center justify-center min-h-screen overflow-hidden"
        >
            <div className="absolute inset-0 z-0">
                <Canvas>
                    <ShaderPlane
                        vertexShader={vertexShader}
                        fragmentShader={fragmentShader}
                        uniforms={shaderUniforms}
                    />
                </Canvas>
            </div>

            {showContent && (
                <div className="relative z-10 flex flex-col items-center text-center px-6">
                    {/* Badge - no animation */}
                    <div className="mb-6">
                        <Badge className="bg-white/10 hover:bg-white/15 text-primary backdrop-blur-md border border-white/20 uppercase tracking-wider font-medium flex items-center gap-2 px-4 py-1.5">
                            <span className="text-[10px] font-light tracking-[0.18em] text-primary/80">
                                {badgeLabel}
                            </span>
                            <span className="h-1 w-1 rounded-full bg-primary/60" />
                            <span className="text-xs font-light tracking-tight text-primary">
                                {badgeText}
                            </span>
                        </Badge>
                    </div>

                    {/* Title with blur animation */}
                    <h1 className="text-5xl md:text-7xl max-w-4xl font-light tracking-tight text-white mb-4">
                        <BlurTextAnimation
                            text={title}
                            fontSize=""
                            textColor=""
                            baseDelay={0.1}
                        />
                    </h1>

                    {/* Description with blur animation */}
                    <p className="text-white/80 text-lg max-w-2xl mx-auto mb-10 font-light">
                        <BlurTextAnimation
                            text={description}
                            fontSize=""
                            textColor=""
                            baseDelay={0.4}
                        />
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {ctaButtons.map((button, index) => {
                            const isPrimary = button.primary ?? index === 0;

                            // Use animated JoinWaitlistButton for primary buttons
                            if (isPrimary) {
                                return (
                                    <JoinWaitlistButton
                                        key={index}
                                        text={button.text}
                                        href={button.href}
                                        onClick={button.onClick}
                                    />
                                );
                            }

                            // Secondary buttons use regular Button
                            const classes = "px-8 py-3 rounded-xl text-base font-medium border-white/30 text-white hover:bg-white/10 backdrop-blur-lg transition-all cursor-pointer";

                            if (button.href) {
                                return (
                                    <Button
                                        key={index}
                                        variant="outline"
                                        className={classes}
                                        asChild
                                    >
                                        <a href={button.href}>{button.text}</a>
                                    </Button>
                                );
                            }

                            return (
                                <Button
                                    key={index}
                                    variant="outline"
                                    className={classes}
                                    onClick={button.onClick}
                                >
                                    {button.text}
                                </Button>
                            );
                        })}
                    </div>

                    {/* Micro details - no animation */}
                    {microDetails.length > 0 && (
                        <ul className="mt-8 flex flex-wrap justify-center gap-6 text-xs font-light tracking-tight text-white/70">
                            {microDetails.map((detail, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <span className="h-1 w-1 rounded-full bg-primary/60" />
                                    {detail}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
};

export default SyntheticHero;
