'use client';

import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RecentTransactions } from '@/components/recent-transactions';
import { useWalletStore } from '@/store/walletStore';
import { useOrderStore } from '@/store/orderStore';
import { useTransactionStore } from '@/store/transactionStore';
import { useWallet } from '@solana/wallet-adapter-react';
import { Wallet, TrendingUp, Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight, Target, Plus } from 'lucide-react';
import { redirect } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api as apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import type { Strategy } from '@/types/api';
import Link from 'next/link';
import { POPULAR_TOKENS } from '@/lib/tokens';
import { toast } from 'sonner';

export default function DashboardPage() {
  const { balance } = useWalletStore();
  const { publicKey, connected } = useWallet();
  const { isAuthenticated } = useAuth();
  const { orders, trades } = useOrderStore();
  const { transactions } = useTransactionStore();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loadingStrategies, setLoadingStrategies] = useState(true);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getTokenSymbol = (address: string) => {
    const token = POPULAR_TOKENS.find(t => t.address === address);
    return token?.symbol || address.slice(0, 6);
  };

  // Load strategies
  useEffect(() => {
    if (connected && isAuthenticated) {
      const loadStrategies = async () => {
        try {
          const data = await apiClient.getStrategies();
          setStrategies(data);
        } catch (error) {
          console.log('Failed to load strategies:', error);
          toast.error('Failed to load strategies', {
            description: 'Please try again later'
          });
        } finally {
          setLoadingStrategies(false);
        }
      };
      loadStrategies();
    } else {
      setStrategies([]);
      setLoadingStrategies(false);
    }
  }, [connected, publicKey, isAuthenticated]);

  const activeStrategies = strategies.filter(s => s.status === 'active');

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 gradient-purple-radial pointer-events-none" />
      <div className="relative z-10">
        <Navbar />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Wallet Overview */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">
            <span className="text-gradient-purple">Dashboard</span>
          </h1>
          <p className="text-muted-foreground">
            {connected && publicKey ? `Connected: ${formatAddress(publicKey.toBase58())}` : 'Connect your wallet to get started'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-purple-card border-primary/10 shadow-purple-card hover-glow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-purple">{balance} SOL</div>
              <p className="text-xs text-muted-foreground">
                {connected ? 'Devnet Balance' : 'Not connected'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-purple-card border-primary/10 shadow-purple-card hover-glow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-purple">{orders.length}</div>
              <p className="text-xs text-muted-foreground">
                {orders.filter(o => o.status === 'completed').length} completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-purple-card border-primary/10 shadow-purple-card hover-glow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Swaps</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-purple">
                {transactions.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {transactions.filter(t => t.status === 'success').length} successful
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-purple-card border-primary/10 shadow-purple-card hover-glow-purple">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gradient-purple">98.5%</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Active Strategies */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active Strategies</CardTitle>
                <CardDescription>Your automated trading rules</CardDescription>
              </div>
              <Link href="/strategies">
                <Button variant="outline" className="rounded-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  New Strategy
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {!connected ? (
              <div className="text-center py-8 text-muted-foreground">
                Connect your wallet to view strategies
              </div>
            ) : loadingStrategies ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading strategies...</p>
              </div>
            ) : activeStrategies.length === 0 ? (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-primary/50 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No active strategies yet</p>
                <Link href="/strategies">
                  <Button className="rounded-xl shadow-purple-soft hover:shadow-purple-glow">
                    Create First Strategy
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeStrategies.slice(0, 5).map((strategy) => (
                  <div
                    key={strategy.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium mb-1">{strategy.name}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {getTokenSymbol(strategy.fromToken)}
                        </Badge>
                        →
                        <Badge variant="outline" className="text-xs">
                          {getTokenSymbol(strategy.toToken)}
                        </Badge>
                        <span>•</span>
                        <span>
                          {strategy.triggerType} @ ${strategy.triggerValue}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                      Active
                    </Badge>
                  </div>
                ))}
                {activeStrategies.length > 5 && (
                  <Link href="/strategies">
                    <Button variant="ghost" className="w-full rounded-xl">
                      View All {activeStrategies.length} Strategies
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <RecentTransactions limit={10} />

        {/* Portfolio Chart Placeholder */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Portfolio Performance</CardTitle>
            <CardDescription>Your trading history over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[300px] items-center justify-center rounded-lg border-2 border-dashed">
              <div className="text-center">
                <BarChart3 className="mx-auto mb-2 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Chart coming soon</p>
                <p className="text-xs text-muted-foreground">
                  Real-time portfolio analytics will be displayed here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
      </div>
    </div>
  );
}

function BarChart3({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

