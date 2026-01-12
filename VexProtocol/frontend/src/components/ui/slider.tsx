"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        className={cn(
            "relative flex w-full touch-none select-none items-center py-4",
            className
        )}
        {...props}
    >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-zinc-950/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] box-border border border-zinc-800/50">
            <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-sky-500 to-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-6 w-3 rounded-[2px] border border-cyan-400/50 bg-white shadow-[0_0_10px_rgba(34,211,238,0.4)] ring-0 transition-transform hover:scale-110 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing active:scale-95" />
    </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
