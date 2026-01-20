'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';
import { Kanit, Instrument_Serif } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-kanit",
});

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export default function NotFound() {
  return (
    <html lang="en">
      <body className={`${kanit.variable} ${instrumentSerif.variable} font-sans antialiased bg-background text-foreground`}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6 px-4">
            <div className="space-y-2">
              <h1 className="text-6xl font-bold text-gradient-purple">404</h1>
              <h2 className="text-2xl font-semibold">Page Not Found</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Link href="/waitlist">
                <Button className="gap-2">
                  <Home className="w-4 h-4" />
                  Go to Waitlist
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

