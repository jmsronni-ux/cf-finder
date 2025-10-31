import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable"
import FlowCanvas from "@/components/FlowCanvas";
import { Progress } from "@/components/ui/progress";
import { CryptoTransactionTable } from "@/components/CryptoTransactionTable";
import AddWalletPopup from "@/components/AddWalletPopup";
import InsufficientBalancePopup from "@/components/InsufficientBalancePopup";
import AnimatedCounter from "@/components/AnimatedCounter";
import { useNetworkRewards } from "@/hooks/useNetworkRewards";
import { useAuth } from "@/contexts/AuthContext";
import { useLevelData } from "@/hooks/useLevelData";
import type { CryptoTransaction } from "@/components/CryptoTransactionTable";
import { apiFetch } from "@/utils/api";

interface TransactionWithPending extends CryptoTransaction {
  nodeId: string;
  actualStatus: string;
  pendingSeconds: number;
}

// Helper function to get level data based on level number
const getLevelData = (level: number, levels: any[]): any => {
  const levelData = levels.find(l => l.level === level);
  return levelData || { nodes: [], edges: [] };
};

const Dashboard = () => {
  const { user, token } = useAuth();
  const { levels, loading: levelsLoading, error: levelsError } = useLevelData();
  const { getTotalRewardForLevel } = useNetworkRewards();
  const [progress, setProgress] = useState<number>(0);
  const [showWalletPopup, setShowWalletPopup] = useState<boolean>(false);
  const [showInsufficientBalancePopup, setShowInsufficientBalancePopup] = useState<boolean>(false);
  const [wallets, setWallets] = useState<any>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingTierRequest, setPendingTierRequest] = useState<{ tier: number; name: string } | null>(null);
  
  // Get the current level from user's tier (treat tier 0 as tier 1)
  const currentLevel = user?.tier === 0 ? 1 : (user?.tier || 1);
  
  // Get current level data from MongoDB
  const currentLevelData = useMemo(() => getLevelData(currentLevel, levels), [currentLevel, levels]);
  
  // Get fingerprint nodes that have transaction data AND match the current level
  // This needs to be calculated with useMemo so it updates when currentLevel changes
  const totalTransactions = useMemo(() => {
    return currentLevelData.nodes.filter(
      (node: any) => 
        node.type === 'fingerprintNode' && 
        node.data && 
        node.data.transaction &&
        (node.data?.level ?? 1) === currentLevel
    ).length;
  }, [currentLevel, currentLevelData]);
  
  // Initialize transactions as empty, they will be added as nodes appear
  const [transactions, setTransactions] = useState<TransactionWithPending[]>([]);
  const [completedPendingNodes, setCompletedPendingNodes] = useState<Set<string>>(new Set());
  
  // All nodes from current level (for levelTotal calculation)
  // Only include Success transactions since those are the ones that get distributed USD amounts
  const allLevelNodes = useMemo(() => {
    if (!levels.length) {
      console.log('[Dashboard] No levels loaded yet');
      return [];
    }
    const currentData = getLevelData(currentLevel, levels);
    console.log(`[Dashboard] Getting level ${currentLevel} nodes. Total nodes in level:`, currentData.nodes.length);
    
    const filtered = currentData.nodes.filter((node: any) => 
      node.type === 'fingerprintNode' && 
      node.data && 
      node.data.transaction &&
      (node.data?.level ?? 1) === currentLevel &&
      node.data.transaction.status === 'Success' // Only Success transactions have USD amounts
    );
    
    console.log(`[Dashboard] Filtered ${filtered.length} Success transactions for level ${currentLevel}`);
    if (filtered.length > 0) {
      console.log('[Dashboard] Sample Success transaction:', {
        id: filtered[0].id,
        level: filtered[0].data?.level,
        status: filtered[0].data?.transaction?.status,
        amount: filtered[0].data?.transaction?.amount
      });
    }
    
    return filtered;
  }, [levels, currentLevel]);
  
  // Convert all level nodes to transaction format for levelTotal calculation
  const allLevelTransactions = useMemo(() => {
    return allLevelNodes.map((node: any) => ({
      id: node.data.transaction.id,
      date: node.data.transaction.date,
      transaction: node.data.transaction.transaction,
      amount: node.data.transaction.amount,
      currency: 'USDT', // All amounts are in USD/USDT after distribution
      status: node.data.transaction.status,
      level: node.data.level ?? 1,
      nodeId: node.id,
      actualStatus: node.data.transaction.status,
      pendingSeconds: 0,
    }));
  }, [allLevelNodes]);

  // Fetch pending tier requests
  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!token) return;
      try {
        const res = await apiFetch('/tier-request/my-requests', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (res.ok && json?.success) {
          const pending = json.data.requests?.find((req: any) => req.status === 'pending');
          if (pending) {
            // Get tier name from tier config
            const tierNames: { [key: number]: string } = {
              1: 'Basic',
              2: 'Standard',
              3: 'Professional',
              4: 'Enterprise',
              5: 'Premium'
            };
            setPendingTierRequest({
              tier: pending.requestedTier,
              name: tierNames[pending.requestedTier] || `Tier ${pending.requestedTier}`
            });
          } else {
            setPendingTierRequest(null);
          }
        }
      } catch (e) {
        console.error('Failed to fetch pending requests', e);
      }
    };
    fetchPendingRequests();
  }, [token, user?.tier]);

  // Pre-populate transactions for watched levels on page load
  useEffect(() => {
    if (!user || levelsLoading || !levels.length) return;
    
    // Check if user has watched the current level
    const hasWatchedCurrentLevel = user?.[`lvl${currentLevel}anim` as keyof typeof user] === 1;
    
    if (hasWatchedCurrentLevel) {
      // Load all transactions for the current level from current level data
      const levelTransactions: TransactionWithPending[] = [];
      const currentData = getLevelData(currentLevel, levels);
      
      currentData.nodes.forEach((node: any) => {
        if (
          node.type === 'fingerprintNode' && 
          node.data && 
          node.data.transaction &&
          (node.data?.level ?? 1) === currentLevel
        ) {
          const transactionData = node.data.transaction;
          
          levelTransactions.push({
            ...transactionData as CryptoTransaction,
            level: node.data.level ?? 1,
            nodeId: node.id,
            actualStatus: transactionData.status,
            pendingSeconds: 0, // Already watched, no pending
            status: transactionData.status as "Success" | "Fail" | "Pending"
          });
        }
      });
      
      // Set all transactions at once and update progress to 100%
      if (levelTransactions.length > 0) {
        setTransactions(levelTransactions);
        setProgress(100);
        // Mark all nodes as completed
        setCompletedPendingNodes(new Set(levelTransactions.map(tx => tx.nodeId)));
      }
    } else {
      // If level hasn't been watched, clear transactions and reset progress
      setTransactions([]);
      setProgress(0);
      setCompletedPendingNodes(new Set());
    }
  }, [user, currentLevel, levels, levelsLoading]);

  // Check if user has any wallets and show popup if not
  useEffect(() => {
    const fetchWallets = async () => {
      if (!token) return;
      
      try {
        const res = await apiFetch('/user/me/wallets', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        
        if (res.ok && json?.success !== false) {
          const fetchedWallets = json?.data || {};
          setWallets(fetchedWallets);
          
          // Check if user has any wallet set
          const hasWallet = fetchedWallets.btc || 
                           fetchedWallets.eth || 
                           fetchedWallets.tron || 
                           fetchedWallets.usdtErc20 ||
                           (fetchedWallets.custom && fetchedWallets.custom.length > 0);
          
          // Show popup if no wallet (mandatory)
          if (!hasWallet) {
            setShowWalletPopup(true);
          }
        }
      } catch (e) {
        console.error('Failed to fetch wallets', e);
      }
    };
    
    fetchWallets();
  }, [token]);
  
  // Handle when a node appears - add its corresponding transaction to the table
  const handleNodeAppear = useCallback((nodeId: string) => {
    // Find the node in current level data
    const currentData = getLevelData(currentLevel, levels);
    const node = currentData.nodes.find((n: any) => n.id === nodeId);
    
    if (node && node.data && node.data.transaction) {
      const transactionData = node.data.transaction;
      const pendingSeconds = node.data.pending || 0;
      
      // Add the transaction to the list
      setTransactions(prev => {
        // Check if transaction already exists
        if (prev.find(tx => tx.id === transactionData.id)) {
          return prev;
        }
        
        const newTransaction: TransactionWithPending = {
          ...transactionData as CryptoTransaction,
          level: node.data.level ?? 1,
          nodeId: nodeId,
          actualStatus: transactionData.status,
          pendingSeconds: pendingSeconds,
          // Force display as USDT to match nodes and counters
          currency: 'USDT',
          status: (pendingSeconds > 0 ? 'Pending' : transactionData.status) as "Success" | "Fail" | "Pending"
        };
        
        return [...prev, newTransaction];
      });

      // If there's no pending time, mark as completed immediately
      if (pendingSeconds === 0) {
        setCompletedPendingNodes(prev => {
          const newCompleted = new Set(prev);
          newCompleted.add(nodeId);
          // Update progress based on completed nodes
          const completedCount = newCompleted.size;
          setProgress((completedCount / totalTransactions) * 100);
          return newCompleted;
        });
      } else {
        // If there's a pending time, set a timeout to update the status and mark as completed
        setTimeout(() => {
          setTransactions(prev => 
            prev.map(tx => 
              tx.id === transactionData.id 
                ? { ...tx, status: tx.actualStatus as "Success" | "Fail" | "Pending" }
                : tx
            )
          );
          
          // Mark node as completed and update progress
          setCompletedPendingNodes(prev => {
            const newCompleted = new Set(prev);
            newCompleted.add(nodeId);
            // Update progress based on completed nodes
            const completedCount = newCompleted.size;
            setProgress((completedCount / totalTransactions) * 100);
            return newCompleted;
          });
        }, pendingSeconds * 1000);
      }
    }
  }, [totalTransactions, currentLevel, levels]);

  const handleWalletSuccess = () => {
    // Refetch wallets after adding one
    if (token) {
      fetch('/user/me/wallets', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(json => {
        if (json?.success !== false) {
          setWallets(json?.data || {});
        }
      })
      .catch(e => console.error('Failed to refetch wallets', e));
    }
  };

  // Handle transaction row click
  const handleTransactionClick = useCallback((transaction: CryptoTransaction) => {
    // Find the corresponding node ID from the transactions list
    const transactionWithNode = transactions.find(tx => tx.id === transaction.id) as TransactionWithPending | undefined;
    if (transactionWithNode?.nodeId) {
      setSelectedNodeId(transactionWithNode.nodeId);
    }
  }, [transactions]);

  return (
    <div className="fixed inset-0 z-[1] flex text-white">
         <ResizablePanelGroup direction="vertical" className="flex-1">
             <ResizablePanel>
                 <FlowCanvas 
                   onNodeAppear={handleNodeAppear} 
                   externalSelectedNodeId={selectedNodeId}
                 />
             </ResizablePanel>

            <ResizableHandle withHandle className="bg-gradient-to-r from-gray-500/20 via-primary/10 h-[0.5px] to-gray-500/20" />

            <ResizablePanel minSize={6} defaultSize={40} maxSize={50} className="relative">
                <div className="flex flex-col h-full">
                    {/* top bar */}
                    <div className="p-4 border-b border-gray-500/20 w-full flex flex-row justify-between items-center">
                        <div className="flex items-center w-full gap-4">
                          <Progress value={Number(progress.toFixed(0))} />
                          
                          {/* Pending Tier Request Indicator */}
                          {pendingTierRequest && (
                            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5 whitespace-nowrap">
                              <div className="w-1 h-1 bg-yellow-500 rounded-full animate-ping"></div>
                              <span className="text-xs font-semibold text-yellow-400">
                                Upgrade Pending
                              </span>
                            </div>
                          )}
                        </div>
                    </div>

                    <div className="h-full w-full flex flex-row">
                         {/* left side */}
                         <div className="flex flex-col overflow-y-auto h-full w-2/3 border-r border-gray-500/20">
                             <CryptoTransactionTable 
                               data={transactions}
                               onRowClick={handleTransactionClick}
                             />
                         </div>

                        {/* right side */}
                        <div className="w-1/3 h-[380px] flex flex-col items-center justify-center p-6 gap-4">
                           <div className="w-full flex flex-row gap-4 h-1/2">
                              <AnimatedCounter 
                                type="levelReward"
                                progress={progress}
                                level={currentLevel}
                                user={user}
                                currency="USDT"
                                shouldAnimate={progress > 0 && progress < 100}
                              />

                              <AnimatedCounter
                                type="levelTotal"
                                progress={progress}
                                level={currentLevel}
                                user={user}
                                transactions={allLevelTransactions}
                                currency="USDT"
                                shouldAnimate={progress > 0 && progress < 100}
                              />
                           </div>

                           {currentLevel < 5 && (
                              <>
                                <AnimatedCounter 
                                  className="h-1/2"
                                  type="nextLevelReward"
                                  progress={progress}
                                  level={currentLevel}
                                  user={user}
                                  currency="USDT"
                                  shouldAnimate={progress > 0 && progress < 100}
                                />
                              </>
                            )}
                        </div>
                    </div>

                </div>
            </ResizablePanel>
        </ResizablePanelGroup>

        {/* Add Wallet Popup */}
        <AddWalletPopup 
          isOpen={showWalletPopup}
          onClose={() => setShowWalletPopup(false)}
          onSuccess={handleWalletSuccess}
        />
    </div>
  )
}

export default Dashboard