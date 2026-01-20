"use client";

import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface JoinWaitlistButtonProps {
    text?: string;
    href?: string;
    onClick?: () => void;
    className?: string;
}

export function JoinWaitlistButton({
    text = "Join Waitlist",
    href,
    onClick,
    className
}: JoinWaitlistButtonProps) {
    const buttonClasses = cn(
        "join-waitlist-btn group relative overflow-hidden bg-primary hover:bg-primary text-black font-semibold shadow-lg shadow-primary/20",
        className
    );

    const InnerContent = (
        <>
            {/* Inline style tag for hover animation */}
            <style>{`
                .join-waitlist-btn i {
                    width: 25%;
                    transition: width 500ms ease-in-out, transform 150ms ease-in-out;
                }
                .join-waitlist-btn:hover i {
                    width: calc(100% - 0.5rem);
                }
                .join-waitlist-btn span {
                    transition: opacity 500ms ease-in-out;
                }
                .join-waitlist-btn:hover span {
                    opacity: 0;
                }
            `}</style>
            <span className="mr-8">
                {text}
            </span>
            <i className="absolute right-1 top-1 bottom-1 rounded-lg z-10 grid place-items-center bg-black/15 text-black">
                <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
            </i>
        </>
    );

    // Prioritize onClick over href
    if (onClick) {
        return (
            <Button className={buttonClasses} size="lg" onClick={onClick}>
                {InnerContent}
            </Button>
        );
    }

    if (href) {
        return (
            <Button className={buttonClasses} size="lg" asChild>
                <a href={href}>
                    {InnerContent}
                </a>
            </Button>
        );
    }

    return (
        <Button className={buttonClasses} size="lg" onClick={onClick}>
            {InnerContent}
        </Button>
    );
}
