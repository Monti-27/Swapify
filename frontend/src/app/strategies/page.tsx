'use client';

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StrategyBuilderModal } from '@/components/strategy-builder-modal-clean';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { useWallet } from '@solana/wallet-adapter-react';
import { Plus, TrendingUp, Edit2, Trash2, Play, Pause, Target, Clock, CheckCircle2, Shield } from 'lucide-react';
import { api as apiClient } from '@/lib/api';
import type { Strategy, CreateStrategyDto } from '@/types/api';
import { toast } from 'sonner';
import { POPULAR_TOKENS } from '@/lib/tokens';
import { wsClient, WS_EVENTS } from '@/lib/websocket';
import { useAuth } from '@/hooks/useAuth';
import { useStrategyExecutor } from '@/hooks/useStrategyExecutor';

export default function StrategiesPage() {
  const { connected, publicKey } = useWallet();
  const { isAuthenticated, isAuthenticating } = useAuth();
  
  // CRITICAL: Listen for strategy triggers and execute swaps automatically
  useStrategyExecutor();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBuilderModal, setShowBuilderModal] = useState(false);
  
  // Confirmation modal states
  const [cancelConfirmation, setCancelConfirmation] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; name: string } | null>(null);

  // Load strategies
  useEffect(() => {
    if (connected && isAuthenticated) {
      loadStrategies();
    } else {
      setStrategies([]);
      setIsLoading(false);
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

  const handleCreateStrategy = async (dto: CreateStrategyDto) => {
    try {
      const newStrategy = await apiClient.createStrategy(dto);
      setStrategies([newStrategy, ...strategies]);
      toast.success('Strategy Created!', {
        description: `"${dto.name}" is now active and monitoring the market`
      });
    } catch (error: any) {
      console.log('Failed to create strategy:', error);
      toast.error('Failed to create strategy', {
        description: error.message || 'Please try again'
      });
      throw error;
    }
  };

  const handleCancelStrategy = async (id: string, name: string) => {
    setCancelConfirmation({ id, name });
  };

  const confirmCancelStrategy = async () => {
    if (!cancelConfirmation) return;

    const { id, name } = cancelConfirmation;
    
    try {
      await apiClient.cancelStrategy(id);
      setStrategies(strategies.map(s => s.id === id ? { ...s, status: 'cancelled' } : s));
      toast.info('Strategy Cancelled', {
        description: `"${name}" has been cancelled`
      });
    } catch (error) {
      console.log('Failed to cancel strategy:', error);
      toast.error('Failed to cancel strategy', {
        description: 'Please try again'
      });
    } finally {
      setCancelConfirmation(null);
    }
  };

  const handleDeleteStrategy = async (id: string, name: string) => {
    setDeleteConfirmation({ id, name });
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
    <div className="min-h-screen flex flex-col relative">
      <div className="absolute inset-0 gradient-purple-radial pointer-events-none" />
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Trading Strategies</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Automate your trades with smart triggers
            </p>
          </div>
          <Button
            onClick={() => setShowBuilderModal(true)}
            disabled={!connected}
            size="default"
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Strategy
          </Button>
        </div>

        {!connected ? (
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
        ) : isLoading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-sm sm:text-base text-muted-foreground">Loading strategies...</p>
          </div>
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
                  <Card key={strategy.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3 sm:pb-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1 sm:mb-2">
                            <CardTitle className="text-base sm:text-lg truncate">{strategy.name}</CardTitle>
                            {getStatusBadge(strategy.status)}
                          </div>
                          {strategy.description && (
                            <CardDescription className="text-xs sm:text-sm line-clamp-2">{strategy.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex gap-2 self-start sm:self-auto">
                          {strategy.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelStrategy(strategy.id, strategy.name)}
                              className="h-8"
                            >
                              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                            onClick={() => handleDeleteStrategy(strategy.id, strategy.name)}
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4 pt-0">
                      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Pair</div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{getTokenSymbol(strategy.fromToken)}</Badge>
                            <span className="text-muted-foreground text-xs">→</span>
                            <Badge variant="outline" className="text-xs">{getTokenSymbol(strategy.toToken)}</Badge>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Trigger</div>
                          <div className="font-medium text-sm capitalize truncate" title={`${strategy.triggerType} @ $${strategy.triggerValue}`}>
                            {strategy.triggerType} @ ${strategy.triggerValue}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Amount</div>
                          <div className="font-medium text-sm">
                            {strategy.amount}{strategy.amountType === 'percentage' ? '%' : ''}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Created</div>
                          <div className="font-medium text-sm">
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

      {/* Strategy Builder Modal */}
      <StrategyBuilderModal
        open={showBuilderModal}
        onClose={() => setShowBuilderModal(false)}
        onSubmit={handleCreateStrategy}
      />

      {/* Cancel Strategy Confirmation */}
      <ConfirmationModal
        open={!!cancelConfirmation}
        onClose={() => setCancelConfirmation(null)}
        onConfirm={confirmCancelStrategy}
        title="Cancel Strategy"
        description={`Are you sure you want to cancel "${cancelConfirmation?.name}"? The strategy will stop monitoring the market.`}
        confirmText="Cancel Strategy"
        cancelText="Keep Active"
        variant="default"
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

