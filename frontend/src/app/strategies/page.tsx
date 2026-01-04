'use client';

import { useState, useEffect, useRef } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StrategyBuilderModal } from '@/components/strategy-builder-modal-clean';
import { StrategyBuilderFullscreen } from '@/components/strategy-builder-fullscreen';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useWallet } from '@solana/wallet-adapter-react';
import { Plus, TrendingUp, Edit2, Trash2, Play, Pause, Target, Clock, CheckCircle2, Shield, Loader2 } from 'lucide-react';
import { api as apiClient } from '@/lib/api';
import type { Strategy } from '@/types/api';
import { toast } from 'sonner';
import { POPULAR_TOKENS } from '@/lib/tokens';
import { wsClient, WS_EVENTS } from '@/lib/websocket';
import { useAuthContext } from '@/contexts/AuthContext';
import { useStrategyExecutor } from '@/hooks/useStrategyExecutor';
import { useCancelStrategy } from '@/hooks/useCancelStrategy';
import { Skeleton } from '@/components/ui/skeleton';
import { useWalletInit } from '@/contexts/WalletInitContext';

export default function StrategiesPage() {
  const { connected, publicKey, connecting } = useWallet();
  const { isAuthenticated, isAuthenticating } = useAuthContext();
  const { isInitializing } = useWalletInit();

  // CRITICAL: Listen for strategy triggers and execute swaps automatically
  useStrategyExecutor();

  // Cancel strategy hook (blockchain-first pattern)
  const { cancelStrategy, isLoading: isCancelling, cancellingId } = useCancelStrategy();

  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Confirmation modal states - store full strategy for cancel
  const [cancelConfirmation, setCancelConfirmation] = useState<Strategy | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load strategies (with cache to prevent duplicate calls)
  useEffect(() => {
    if (connected && isAuthenticated) {
      // Only load if not already loaded
      if (!hasLoadedRef.current) {
        loadStrategies();
        hasLoadedRef.current = true;
      }
    } else {
      setStrategies([]);
      setIsLoading(false);
      hasLoadedRef.current = false; // Reset on disconnect
    }
  }, [connected, isAuthenticated]);

  // WebSocket event listeners for real-time updates
  useEffect(() => {
    if (!connected || !isAuthenticated) return;

    // Connect to WebSocket with authentication token
    const token = localStorage.getItem('auth_token');
    if (token) {
      console.log('🔌 Connecting to WebSocket with auth token...');
      wsClient.connect(token);
    } else {
      console.warn('⚠️ No auth token found for WebSocket connection');
    }

    // Strategy triggered event
    const handleStrategyTriggered = (data: any) => {
      toast.info('Strategy Triggered', {
        description: `"${data.strategyName}" condition has been met!`,
        duration: 10000
      });
      setStrategies(strategies =>
        strategies.map(s => s.id === data.strategyId ? { ...s, status: 'triggered' } : s)
      );
      loadStrategies(); // Reload to get latest data
    };

    // Strategy completed event
    const handleStrategyCompleted = (data: any) => {
      toast.success('Strategy Completed', {
        description: `"${data.strategyName}" executed successfully!`,
        duration: 10000
      });
      setStrategies(strategies =>
        strategies.map(s => s.id === data.strategyId ? { ...s, status: 'completed' } : s)
      );
      loadStrategies(); // Reload to get latest data
    };

    // Trade update event
    const handleTradeUpdate = (data: any) => {
      if (data.status === 'completed') {
        toast.success('Trade Executed', {
          description: `Successfully traded ${data.fromAmount} ${data.fromToken} to ${data.toToken}`
        });
      } else if (data.status === 'failed') {
        toast.error('Trade Failed', {
          description: data.error || 'The trade could not be completed'
        });
      }
    };

    wsClient.on(WS_EVENTS.STRATEGY_TRIGGERED, handleStrategyTriggered);
    wsClient.on(WS_EVENTS.STRATEGY_COMPLETED, handleStrategyCompleted);
    wsClient.on(WS_EVENTS.TRADE_UPDATE, handleTradeUpdate);

    return () => {
      wsClient.off(WS_EVENTS.STRATEGY_TRIGGERED, handleStrategyTriggered);
      wsClient.off(WS_EVENTS.STRATEGY_COMPLETED, handleStrategyCompleted);
      wsClient.off(WS_EVENTS.TRADE_UPDATE, handleTradeUpdate);
    };
  }, [connected, isAuthenticated]);

  const loadStrategies = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getStrategies();
      setStrategies(data);
    } catch (error) {
      console.log('Failed to load strategies:', error);
      toast.error('Failed to load strategies', {
        description: 'Please try again later'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelStrategy = async (strategy: Strategy) => {
    setCancelConfirmation(strategy);
  };

  /**
   * REFACTORED: Blockchain First, Database Second
   * 
   * This ensures that:
   * 1. The blockchain transaction is confirmed BEFORE touching the database
   * 2. If user rejects wallet signature, the strategy remains active
   * 3. If transaction fails, the strategy remains active
   * 4. No "Ghost Strategies" that clog up the 10-slot limit
   */
  const confirmCancelStrategy = async () => {
    if (!cancelConfirmation) return;

    const strategy = cancelConfirmation;

    try {
      await cancelStrategy({
        strategy,
        onSuccess: () => {
          // Update local state after successful blockchain + backend sync
          setStrategies(strategies.map(s =>
            s.id === strategy.id ? { ...s, status: 'cancelled' } : s
          ));
          loadStrategies(); // Refresh to get latest data
        },
      });
    } catch (error) {
      // Error toast is handled inside the hook
      console.log('Strategy cancellation failed:', error);
    } finally {
      setCancelConfirmation(null);
    }
  };

  const handleDeleteStrategy = async (strategy: Strategy) => {
    // Block deletion of active strategies - user must cancel first
    if (strategy.status === 'active') {
      toast.error('Cannot delete active strategy', {
        description: 'Please cancel the strategy first to withdraw your escrowed funds, then you can delete it.',
        duration: 5000,
      });
      return;
    }

    setDeleteConfirmation({ id: strategy.id, name: strategy.name });
  };

  const confirmDeleteStrategy = async () => {
    if (!deleteConfirmation) return;

    const { id, name } = deleteConfirmation;

    try {
      await apiClient.deleteStrategy(id);
      setStrategies(strategies.filter(s => s.id !== id));
      toast.success('Strategy Deleted', {
        description: `"${name}" has been removed`
      });
    } catch (error) {
      console.log('Failed to delete strategy:', error);
      toast.error('Failed to delete strategy', {
        description: 'Please try again'
      });
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const getTokenSymbol = (address: string) => {
    const token = POPULAR_TOKENS.find(t => t.address === address);
    return token?.symbol || address.slice(0, 6);
  };

  const getStatusBadge = (status: Strategy['status']) => {
    const styles = {
      active: 'bg-green-500/10 text-green-500 border-green-500/20',
      triggered: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      completed: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      cancelled: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
      filled: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };

    return (
      <Badge variant="outline" className={styles[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const activeStrategies = strategies.filter(s => s.status === 'active');
  const triggeredStrategies = strategies.filter(s => s.status === 'triggered');
  const completedStrategies = strategies.filter(s => s.status === 'completed');

  return (
    <div className="min-h-screen flex flex-col relative bg-background">
      <div className="absolute inset-0 gradient-purple-radial pointer-events-none" />
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 pt-24 sm:pt-28 lg:pt-32 pb-12 sm:pb-16 max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8 mt-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 truncate">Trading Strategies</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Automate your trades with smart triggers
              </p>
            </div>
            <Button
              onClick={() => setShowBuilderModal(true)}
              disabled={!connected}
              size="default"
              className="w-full sm:w-auto shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Strategy
            </Button>
          </div>

          {/* Show loading skeleton while initializing, connecting, authenticating, or loading strategies */}
          {(isInitializing || connecting || isAuthenticating || (connected && isAuthenticated && isLoading)) ? (
            <>
              {/* Stats Grid Skeleton */}
              <div className="grid gap-3 sm:gap-6 grid-cols-3 mb-6 sm:mb-8">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-4 rounded" />
                    </CardHeader>
                    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                      <Skeleton className="h-8 w-12 mb-2" />
                      <Skeleton className="h-3 w-20 hidden sm:block" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Strategy Cards Skeleton */}
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-5 w-16" />
                          </div>
                          <Skeleton className="h-4 w-full max-w-md" />
                        </div>
                        <div className="flex gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                        {[1, 2, 3, 4].map((j) => (
                          <div key={j}>
                            <Skeleton className="h-3 w-12 mb-2" />
                            <Skeleton className="h-5 w-24" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : !connected ? (
            <Card className="text-center py-8 sm:py-12">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
                    <Target className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold mb-2">Connect Your Wallet</h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Connect your wallet to create and manage trading strategies
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid gap-3 sm:gap-6 grid-cols-3 mb-6 sm:mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl font-bold">{activeStrategies.length}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Monitoring</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Triggered</CardTitle>
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl font-bold">{triggeredStrategies.length}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Processing</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium">Done</CardTitle>
                    <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                    <div className="text-xl sm:text-2xl font-bold">{completedStrategies.length}</div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">Completed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Strategies List */}
              {strategies.length === 0 ? (
                <Card className="text-center py-8 sm:py-12">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-semibold mb-2">No Strategies Yet</h3>
                        <p className="text-sm sm:text-base text-muted-foreground mb-4">
                          Create your first strategy to automate your trading
                        </p>
                        <Button onClick={() => setShowBuilderModal(true)} className="w-full sm:w-auto">
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Strategy
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {strategies.map((strategy) => (
                    <Card key={strategy.id} className="hover:shadow-md transition-shadow overflow-hidden">
                      <CardHeader className="pb-3 sm:pb-6">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                                <CardTitle className="text-base sm:text-lg break-words">{strategy.name}</CardTitle>
                                {getStatusBadge(strategy.status)}
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {strategy.status === 'active' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancelStrategy(strategy)}
                                  disabled={cancellingId === strategy.id}
                                  className="h-8 w-8 p-0"
                                  title={cancellingId === strategy.id ? "Cancelling..." : "Pause strategy"}
                                >
                                  {cancellingId === strategy.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Pause className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                onClick={() => handleDeleteStrategy(strategy)}
                                title="Delete strategy"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                          {strategy.description && (
                            <CardDescription className="text-xs sm:text-sm line-clamp-2">{strategy.description}</CardDescription>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 sm:space-y-4 pt-0">
                        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Pair</div>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge variant="outline" className="text-[10px] sm:text-xs">{getTokenSymbol(strategy.fromToken)}</Badge>
                              <span className="text-muted-foreground text-xs">→</span>
                              <Badge variant="outline" className="text-[10px] sm:text-xs">{getTokenSymbol(strategy.toToken)}</Badge>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Trigger</div>
                            <div className="font-medium text-xs sm:text-sm capitalize truncate" title={`${strategy.triggerType} @ $${strategy.triggerValue}`}>
                              {strategy.triggerType} @ ${strategy.triggerValue}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Amount</div>
                            <div className="font-medium text-xs sm:text-sm truncate">
                              {strategy.amount}{strategy.amountType === 'percentage' ? '%' : ''}
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Created</div>
                            <div className="font-medium text-xs sm:text-sm truncate">
                              {new Date(strategy.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        {(strategy.stopLoss || strategy.takeProfit) && (
                          <div className="pt-3 border-t flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm">
                            {strategy.stopLoss && (
                              <div className="flex items-center gap-1.5">
                                <Shield className="w-3 h-3 text-red-500" />
                                <span className="text-muted-foreground">SL:</span>
                                <span className="font-medium">${strategy.stopLoss}</span>
                              </div>
                            )}
                            {strategy.takeProfit && (
                              <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3 h-3 text-green-500" />
                                <span className="text-muted-foreground">TP:</span>
                                <span className="font-medium">${strategy.takeProfit}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {strategy.triggeredAt && (
                          <div className="pt-3 border-t text-xs sm:text-sm">
                            <Clock className="w-3 h-3 inline mr-1.5 text-muted-foreground" />
                            <span className="text-muted-foreground">Triggered:</span>{' '}
                            <span className="font-medium">
                              {new Date(strategy.triggeredAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </main>
        <Footer />
      </div>

      {/* Strategy Builder - Responsive */}
      {isMobile ? (
        <StrategyBuilderModal
          open={showBuilderModal}
          onClose={() => setShowBuilderModal(false)}
          onSuccess={loadStrategies}
        />
      ) : (
        <StrategyBuilderFullscreen
          open={showBuilderModal}
          onClose={() => setShowBuilderModal(false)}
          onSuccess={loadStrategies}
        />
      )}

      {/* Cancel Strategy Confirmation */}
      <ConfirmationModal
        open={!!cancelConfirmation}
        onClose={() => setCancelConfirmation(null)}
        onConfirm={confirmCancelStrategy}
        title="Cancel Strategy"
        description={`Are you sure you want to cancel "${cancelConfirmation?.name}"? This will require signing a blockchain transaction to close the on-chain account and return your deposited funds.`}
        confirmText="Sign & Cancel"
        cancelText="Keep Active"
        variant="default"
        isLoading={isCancelling}
      />

      {/* Delete Strategy Confirmation */}
      <ConfirmationModal
        open={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        onConfirm={confirmDeleteStrategy}
        title="Delete Strategy"
        description={`Are you sure you want to delete "${deleteConfirmation?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}
