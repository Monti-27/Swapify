'use client';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Droplets } from 'lucide-react';

const mockPools = [
  { pair: 'SOL/USDC', liquidity: '$2.5M', volume24h: '$850K', apr: '45.2%' },
  { pair: 'SOL/USDT', liquidity: '$1.8M', volume24h: '$620K', apr: '38.5%' },
  { pair: 'RAY/SOL', liquidity: '$1.2M', volume24h: '$450K', apr: '52.8%' },
  { pair: 'ORCA/USDC', liquidity: '$980K', volume24h: '$280K', apr: '28.9%' },
];

export default function PoolsPage() {
  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 gradient-purple-radial pointer-events-none" />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">
            <span className="text-gradient-purple">Liquidity Pools</span>
          </h1>
          <p className="text-muted-foreground">
            Earn rewards by providing liquidity to trading pairs
          </p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-purple-card border-primary/10 shadow-purple-card hover-glow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liquidity</CardTitle>
              <Droplets className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-purple">$8.5M</div>
              <p className="text-xs text-muted-foreground">+12.5% from last week</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-purple-card border-primary/10 shadow-purple-card hover-glow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-purple">$2.2M</div>
              <p className="text-xs text-muted-foreground">+8.2% from yesterday</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pools</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">Active trading pairs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average APR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">41.3%</div>
              <p className="text-xs text-muted-foreground">Across all pools</p>
            </CardContent>
          </Card>
        </div>

        {/* Pools List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Pools</CardTitle>
            <CardDescription>Select a pool to add or remove liquidity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockPools.map((pool) => (
                <div
                  key={pool.pair}
                  className="flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Droplets className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{pool.pair}</p>
                      <p className="text-sm text-muted-foreground">
                        Liquidity: {pool.liquidity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">24h Volume</p>
                      <p className="font-medium">{pool.volume24h}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">APR</p>
                      <p className="font-semibold text-green-500">{pool.apr}</p>
                    </div>
                    <Button>Add Liquidity</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
      </div>
    </div>
  );
}

