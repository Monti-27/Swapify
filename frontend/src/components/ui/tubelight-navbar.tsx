"use client"

import React, { useEffect, useState } from "react"
import { motion } from "motion/react"
import Link from "next/link"
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
    const [hoverTab, setHoverTab] = useState<string | null>(null)
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
                <nav className="flex items-center justify-center">
                    {items.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.name
                        const isHover = hoverTab === item.name

                        return (
                            <Link
                                key={item.name}
                                href={item.url}
                                onClick={() => setActiveTab(item.name)}
                                onMouseEnter={() => setHoverTab(item.name)}
                                onMouseLeave={() => setHoverTab(null)}
                                target={item.url.startsWith('http') ? '_blank' : undefined}
                                rel={item.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                                className={cn(
                                    "py-2 relative duration-300 transition-colors hover:!text-primary",
                                    isActive ? "text-primary" : "text-muted-foreground",
                                )}
                            >
                                <div className="px-5 py-2 relative">
                                    <span className="hidden md:inline text-sm font-semibold">{item.name}</span>
                                    <span className="md:hidden">
                                        <Icon size={18} strokeWidth={2.5} />
                                    </span>
                                    {isHover && (
                                        <motion.div
                                            layoutId="hover-bg"
                                            className="absolute bottom-0 left-0 right-0 w-full h-full bg-primary/10"
                                            style={{
                                                borderRadius: 6,
                                            }}
                                        />
                                    )}
                                </div>
                                {isActive && (
                                    <motion.div
                                        layoutId="active"
                                        className="absolute bottom-0 left-0 right-0 w-full h-0.5 bg-primary"
                                    />
                                )}
                                {isHover && (
                                    <motion.div
                                        layoutId="hover"
                                        className="absolute bottom-0 left-0 right-0 w-full h-0.5 bg-primary"
                                    />
                                )}
                            </Link>
                        )
                    })}
                </nav>
                {children && <div className="pl-4 pr-1">{children}</div>}
            </div>
        </div>
    )
}
