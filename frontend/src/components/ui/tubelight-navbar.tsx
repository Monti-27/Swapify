"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"

interface NavItem {
    name: string
    url: string
    icon: LucideIcon
}

interface NavBarProps {
    items: NavItem[]
    className?: string
    children?: React.ReactNode
}

export function TubelightNavbar({ items, className, children }: NavBarProps) {
    const pathname = usePathname()
    const [activeTab, setActiveTab] = useState(items[0].name)
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768)
        }

        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    useEffect(() => {
        const currentItem = items.find(item => item.url === pathname)
        if (currentItem) {
            setActiveTab(currentItem.name)
        }
    }, [pathname, items])

    return (
        <div
            className={cn(
                "fixed bottom-0 sm:bottom-auto sm:top-0 left-1/2 -translate-x-1/2 z-50 mb-6 sm:pt-6 w-full max-w-6xl",
                className,
            )}
        >
            <div className="flex items-center justify-between gap-3 bg-white/10 dark:bg-black/10 backdrop-blur-[50px] backdrop-saturate-150 p-2 rounded-2xl shadow-2xl">
                {/* VexProtocol Brand - Left Side */}
                <Link href="/" className="flex items-center gap-2 px-4">
                    <Image
                        src="/vexprotocol/vexprotocol.png"
                        alt="VexProtocol"
                        width={32}
                        height={32}
                        className="object-contain"
                    />
                    <span className="font-display font-bold text-lg tracking-tight text-foreground hidden sm:inline">VexProtocol</span>
                </Link>
                <div className="flex items-center gap-3">
                    {items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.name

                        return (
                            <Link
                                key={item.name}
                                href={item.url}
                                onClick={() => setActiveTab(item.name)}
                                target={item.url.startsWith('http') ? '_blank' : undefined}
                                rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                                className={cn(
                                    "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors",
                                    "text-foreground/80 hover:text-primary",
                                    isActive && "bg-muted text-primary",
                                )}
                            >
                                <span className="hidden md:inline">{item.name}</span>
                                <span className="md:hidden">
                                    <Icon size={18} strokeWidth={2.5} />
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="lamp"
                                        className="absolute inset-0 w-full bg-primary/5 rounded-full -z-10"
                                        initial={false}
                                        transition={{
                                            type: "spring",
                                            stiffness: 300,
                                            damping: 30,
                                        }}
                                    >
                                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-t-full">
                                            <div className="absolute w-12 h-6 bg-primary/20 rounded-full blur-md -top-2 -left-2" />
                                            <div className="absolute w-8 h-6 bg-primary/20 rounded-full blur-md -top-1" />
                                            <div className="absolute w-4 h-4 bg-primary/20 rounded-full blur-sm top-0 left-2" />
                                        </div>
                                    </motion.div>
                                )}
                            </Link>
                        )
                    })}
                </div>
                {children && <div className="pl-4 pr-1">{children}</div>}
            </div>
        </div>
    )
}
