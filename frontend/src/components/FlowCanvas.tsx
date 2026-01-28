import React, { useCallback, useState, useEffect, useMemo } from 'react';
// @ts-ignore - reactflow hooks are available despite linter warning
import ReactFlow, {
  Controls,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
// import './FlowCanvas.css';
import Levels from './Levels';
import AccountSettings from './AccountSettings';
import CryptoNode from './nodes/CryptoNode';
import AccountNode from './nodes/AccountNode';
import FingerprintNode from './nodes/FingerprintNode';
import DataVisual from './DataVisual';
import NodeDetailsPanel from './NodeDetailsPanel';
import EnhancedWithdrawPopup from './EnhancedWithdrawPopup';
import { apiFetch } from '../utils/api';
import { useLevelData } from '../hooks/useLevelData';
import { useNetworkRewards } from '../hooks/useNetworkRewards';
import { PulsatingButton } from './ui/pulsating-button';
import { toast } from 'sonner';
import { useNodeAnimation } from '../hooks/useNodeAnimation';
import { usePendingStatus } from '../hooks/usePendingStatus';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createChildNode, canDeleteNode, validateNodeDeletion } from './helpers/nodeOperations';
import { computeAllowedNodeIds, mapNodesWithState, mapEdgesWithVisibility } from './helpers/visibilityHelpers';
import { CheckCircle } from 'lucide-react';


interface FlowCanvasProps {
  onNodeAppear?: (nodeId: string) => void;
  externalSelectedNodeId?: string | null;
  editingTemplate?: string;
  onCanvasUpdate?: (nodes: any[], edges: any[]) => void;
}

// Helper function to get level data based on level number
const getLevelData = (level: number, levels: any[]): any => {
  const levelData = levels.find(l => l.level === level);
  return levelData || { nodes: [], edges: [] };
};

const nodeTypes = {
  cryptoNode: CryptoNode,
  accountNode: AccountNode,
  fingerprintNode: FingerprintNode,
};

const FlowCanvas: React.FC<FlowCanvasProps> = ({ onNodeAppear, externalSelectedNodeId, editingTemplate = 'A', onCanvasUpdate }) => {
  const { levels, loading: levelsLoading } = useLevelData(editingTemplate);

  // Debug levels data changes
  useEffect(() => {
    console.log('[FlowCanvas] Levels data changed:', { levels: levels.length, loading: levelsLoading });
  }, [levels, levelsLoading]);
  const { getTotalRewardForLevel, getUserLevelRewards } = useNetworkRewards();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [currentLevel, setCurrentLevel] = useState(1);

  // Emit nodes/edges changes to parent component (for admin save functionality)
  useEffect(() => {
    if (onCanvasUpdate) {
      onCanvasUpdate(nodes, edges);
    }
  }, [nodes, edges, onCanvasUpdate]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [levelData, setLevelData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  const [nextTierInfo, setNextTierInfo] = useState<{ tier: number; name: string } | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [animationStartedForLevel, setAnimationStartedForLevel] = useState<number | null>(null);
  const [showTierRequestSuccess, setShowTierRequestSuccess] = useState(false);
  const [submittedTierRequest, setSubmittedTierRequest] = useState<{ tier: number; name: string } | null>(null);
  const [pendingTierRequest, setPendingTierRequest] = useState<boolean>(false);
  const [completionNetworkRewards, setCompletionNetworkRewards] = useState<{ [network: string]: number }>({});
  const [completionTotalRewardUSDT, setCompletionTotalRewardUSDT] = useState<number>(0);
  const [isProcessingCompletion, setIsProcessingCompletion] = useState<boolean>(false);
  const [completionPopupShown, setCompletionPopupShown] = useState<boolean>(false);
  const [hasPendingVerification, setHasPendingVerification] = useState<boolean>(false);
  const navigate = useNavigate();



  // Pending status hook
  const {
    initializePendingStatus,
    getEffectiveStatus,
    getTimeRemaining,
    isNodePending,
    resetPendingStatus
  } = usePendingStatus(nodes);

  // Sync current level from DB (user tier)
  const { user, markAnimationWatched, refreshUser, token } = useAuth();
  // Keep rewards if needed elsewhere, but withdrawn marking uses history only
  const [userLevelRewards, setUserLevelRewards] = useState<{ [network: string]: number }>({});
  const [withdrawnNetworksFromHistory, setWithdrawnNetworksFromHistory] = useState<Map<number, Set<string>>>(new Map());

  useEffect(() => {
    (async () => {
      if (!user?._id) return;
      try {
        const rewards = await getUserLevelRewards(user._id, currentLevel);
        setUserLevelRewards(rewards || {});

        // Fetch withdrawal history (single source of truth for withdrawn networks)
        const response = await apiFetch('/withdraw-request/my-requests', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const approvedWithdrawals = data.data?.filter((req: any) => req.status === 'approved') || [];
          const withdrawnByLevel = new Map<number, Set<string>>();

          // Collect networks with approved withdrawals for ALL levels
          approvedWithdrawals.forEach((req: any) => {
            if (req.networks && req.networks.length > 0 && req.level) {
              const level = req.level;
              if (!withdrawnByLevel.has(level)) {
                withdrawnByLevel.set(level, new Set());
              }
              req.networks.forEach((network: string) => {
                withdrawnByLevel.get(level)!.add(network.toUpperCase());
              });
            }
          });

          setWithdrawnNetworksFromHistory(withdrawnByLevel);
        }
      } catch (e) {
        // ignore
      }
    })();
  }, [user?._id, currentLevel, token]);

  // Sync completed levels from DB animation flags
  useEffect(() => {
    if (user) {
      const completed = new Set<number>();
      if (user.lvl1anim === 1) completed.add(1);
      if (user.lvl2anim === 1) completed.add(2);
      if (user.lvl3anim === 1) completed.add(3);
      if (user.lvl4anim === 1) completed.add(4);
      if (user.lvl5anim === 1) completed.add(5);
      setCompletedLevels(completed);
    }
  }, [user]);
  useEffect(() => {
    // Treat tier 0 as tier 1 (minimum tier)
    if (user?.tier !== undefined) {
      setCurrentLevel(user.tier === 0 ? 1 : user.tier);
    }
  }, [user]);

  // Check if current level animation has been watched
  const hasWatchedCurrentLevel = user?.[`lvl${currentLevel}anim` as keyof typeof user] === 1;

  // Check if user has paid for current level (tier 0 hasn't paid for tier 1 yet)
  const hasPaidForCurrentLevel = user?.tier !== undefined && user.tier >= currentLevel;

  // Custom onNodeAppear that initializes pending status
  const handleNodeAppear = useCallback((nodeId: string) => {
    initializePendingStatus(nodeId);
    if (onNodeAppear) {
      onNodeAppear(nodeId);
    }
  }, [initializePendingStatus, onNodeAppear]);

  // Animation hook - use current level's nodes
  const currentLevelNodes = useMemo(() => getLevelData(currentLevel, levels).nodes as any[], [currentLevel, levels]);
  const { startAnimation, isNodeVisible, hasStarted, isCompleted, resetAnimation } = useNodeAnimation(
    currentLevelNodes,
    handleNodeAppear,
    currentLevel,
    isNodePending
  );

  // Debug logging - AFTER all hooks are initialized
  useEffect(() => {
    console.log('=== BUTTON DEBUG ===');
    console.log('user?.walletVerified:', user?.walletVerified);
    console.log('user?.isAdmin:', user?.isAdmin);
    console.log('hasWatchedCurrentLevel:', hasWatchedCurrentLevel);
    console.log('hasPendingVerification:', hasPendingVerification);
    console.log('pendingTierRequest:', pendingTierRequest);
    console.log('hasStarted:', hasStarted);
    console.log('===================');
  }, [user?.walletVerified, user?.isAdmin, hasWatchedCurrentLevel, hasPendingVerification, pendingTierRequest, hasStarted]);

  // Load level data when currentLevel changes
  useEffect(() => {
    const newLevelData = getLevelData(currentLevel, levels);
    setLevelData(newLevelData);
    setNodes(newLevelData.nodes as any[]);
    setEdges(newLevelData.edges as any[]);
    resetAnimation(); // Reset animation when level changes
    resetPendingStatus(); // Reset pending timers when level changes
    setAnimationStartedForLevel(null); // Reset animation tracking for new level
    setCompletionPopupShown(false); // Reset completion popup flag for new level
  }, [currentLevel, levels, setNodes, setEdges, resetAnimation, resetPendingStatus]);

  // Show completion popup when animation finishes and save to DB
  useEffect(() => {

    // Always show popup and add rewards when animation is completed
    // Allow completion even if animationStartedForLevel is null (for already completed levels)
    const shouldTriggerCompletion = isCompleted && (animationStartedForLevel === currentLevel || animationStartedForLevel === null);

    if (shouldTriggerCompletion && !isProcessingCompletion && !completionPopupShown) {
      setIsProcessingCompletion(true); // Prevent multiple calls
      setCompletionPopupShown(true); // Mark popup as shown
      setShowCompletionPopup(true);

      // Mark animation as watched in DB and add reward to balance
      (async () => {
        const result = await markAnimationWatched(currentLevel);
        if (result.success && user?._id) {
          // Use the network rewards and total USDT from the backend response
          if (result.networkRewards) {
            setCompletionNetworkRewards(result.networkRewards);
          }
          if (result.totalRewardUSDT) {
            setCompletionTotalRewardUSDT(result.totalRewardUSDT);
          }

          if (result.totalRewardUSDT && result.totalRewardUSDT > 0) {
            toast.success(`🎉 Level ${currentLevel} completed! Network rewards totaling $${result.totalRewardUSDT.toLocaleString()} USDT added to your balance!`, {
              duration: 5000
            });
          } else {
            toast.success(`🎉 Level ${currentLevel} completed!`, {
              duration: 3000
            });
          }
        }
        // Refresh user data to show updated balance
        await refreshUser();

        // Reset processing flag after completion
        setIsProcessingCompletion(false);
      })();

      const newCompleted = new Set(completedLevels);
      newCompleted.add(currentLevel);
      setCompletedLevels(newCompleted);
      setAnimationStartedForLevel(null);
    }
  }, [isCompleted, currentLevel, completedLevels, markAnimationWatched, animationStartedForLevel, user, refreshUser, isProcessingCompletion, completionPopupShown]);

  // Handle external node selection from transaction table click
  useEffect(() => {
    if (externalSelectedNodeId) {
      const node = nodes.find((n: any) => n.id === externalSelectedNodeId);
      if (node) {
        setSelectedNode(node);
      }
    }
  }, [externalSelectedNodeId, nodes]);

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
          setPendingTierRequest(!!pending);
        }
      } catch (e) {
        console.error('Failed to fetch pending requests', e);
      }
    };
    fetchPendingRequests();
  }, [token, user?.tier]);

  // Fetch pending wallet verification requests
  useEffect(() => {
    const fetchVerificationStatus = async () => {
      if (!token || user?.walletVerified) {
        setHasPendingVerification(false);
        return;
      }
      try {
        const res = await apiFetch('/wallet-verification/my-requests', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (res.ok && json?.success) {
          // Check if there's a pending verification request for BTC wallet
          const pending = json.data.requests?.find((req: any) =>
            req.status === 'pending' && req.walletType === 'btc'
          );
          setHasPendingVerification(!!pending);
        }
      } catch (e) {
        console.error('Failed to fetch verification status', e);
      }
    };
    fetchVerificationStatus();
  }, [token, user?.walletVerified]);

  // Fetch next tier upgrade options
  useEffect(() => {
    const fetchNextTierInfo = async () => {
      if (!token || !user) return;

      try {
        const res = await apiFetch('/tier/my-tier', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await res.json();
        if (res.ok && json?.success && json.data.upgradeOptions?.length > 0) {
          const nextTier = json.data.upgradeOptions[0];
          setNextTierInfo({
            tier: nextTier.tier,
            name: nextTier.name
          });
        }
      } catch (e) {
        console.error('Failed to fetch tier info', e);
      }
    };

    fetchNextTierInfo();
  }, [token, user?.tier]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds: any) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    // Get the latest node data from the current nodes state
    const latestNode = nodes.find((n: any) => n.id === node.id) || node;
    setSelectedNode(latestNode);
  }, [nodes]);

  // Handle upgrade button click - now creates a tier request instead of direct upgrade
  const handleUpgradeClick = async () => {
    if (!nextTierInfo || !user || !token) {
      // If no next tier available (max tier), navigate to profile
      if (user?.tier === 5) {
        navigate('/profile');
      }
      return;
    }

    // Submit tier upgrade request
    setIsUpgrading(true);
    try {
      const res = await apiFetch('/tier-request/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestedTier: nextTierInfo.tier })
      });
      const json = await res.json();
      if (res.ok && json?.success) {
        // Show success popup
        setSubmittedTierRequest({
          tier: nextTierInfo.tier,
          name: nextTierInfo.name
        });
        setShowTierRequestSuccess(true);
      } else {
        toast.error(json?.message || 'Failed to submit tier upgrade request');
      }
    } catch (e) {
      console.error('Tier upgrade request error:', e);
      toast.error('Failed to submit tier upgrade request');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Compute allowed visibility and map nodes/edges with state
  const { allowedVisible, nodeById } = computeAllowedNodeIds(nodes, edges, currentLevel, user);

  const nodesWithSelectionBase = mapNodesWithState({
    nodes,
    selectedNode,
    isNodeVisible,
    hasStarted,
    getEffectiveStatus,
    getTimeRemaining,
    currentLevel,
    user,
    allowedVisible,
  });

  // Determine withdrawn networks for current level only
  const withdrawnNetworks = useMemo(() => {
    const result = new Set<string>();
    const currentLevelWithdrawn = withdrawnNetworksFromHistory.get(currentLevel);
    if (currentLevelWithdrawn) {
      currentLevelWithdrawn.forEach(network => result.add(network));
    }
    return result;
  }, [withdrawnNetworksFromHistory, currentLevel]);

  // Map node id -> network code
  const nodeIdToNetwork = useMemo(() => {
    const map: Record<string, string> = {};
    // Crypto node ids to network codes
    const cryptoMap: Record<string, string> = {
      btc: 'BTC', eth: 'ETH', sol: 'SOL', usdt: 'USDT', bnb: 'BNB', trx: 'TRON'
    };
    nodes.forEach((n: any) => {
      const code = cryptoMap[n.id as keyof typeof cryptoMap];
      if (code) map[n.id] = code;
    });
    // Fingerprint nodes inherit from their source crypto
    edges.forEach((e: any) => {
      const srcCode = map[e.source];
      if (srcCode) {
        map[e.target] = srcCode;
      }
    });
    return map;
  }, [nodes, edges]);

  // Apply withdrawn flag to nodes (check withdrawal history for each node's specific level)
  const nodesWithSelection = useMemo(() => {
    return nodesWithSelectionBase.map((n: any) => {
      const network = nodeIdToNetwork[n.id];
      const nodeLevel = n.data?.level ?? 1;

      // Check if this specific network was withdrawn from this specific level
      let withdrawn = false;
      if (network) {
        const levelWithdrawn = withdrawnNetworksFromHistory.get(nodeLevel);
        withdrawn = levelWithdrawn ? levelWithdrawn.has(network) : false;
      }

      return {
        ...n,
        data: { ...n.data, withdrawn },
      };
    });
  }, [nodesWithSelectionBase, nodeIdToNetwork, withdrawnNetworksFromHistory]);

  const edgesWithVisibilityBase = mapEdgesWithVisibility({
    edges,
    isNodeVisible,
    hasStarted,
    allowedVisible,
    nodeById,
    user,
  });

  // Dim edges that belong to withdrawn networks
  const edgesWithVisibility = useMemo(() => {
    const withdrawnNodeIds = new Set(
      nodesWithSelection.filter((n: any) => n.data?.withdrawn).map((n: any) => n.id)
    );
    return edgesWithVisibilityBase.map((e: any) => {
      const dim = withdrawnNodeIds.has(e.source) || withdrawnNodeIds.has(e.target);
      return dim ? { ...e, style: { ...(e.style || {}), opacity: 0.35 } } : e;
    });
  }, [edgesWithVisibilityBase, nodesWithSelection]);

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    // Update the nodes state
    setNodes((nds: any[]) =>
      nds.map((node: any) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    );

    // Update the level data state
    setLevelData((prevData) => ({
      ...prevData,
      nodes: prevData.nodes.map((node: any) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...newData } }
          : node
      )
    }));

    // Update the selected node state if it's the same node
    if (selectedNode && selectedNode.id === nodeId) {
      const updatedSelectedNode = {
        ...selectedNode,
        data: { ...selectedNode.data, ...newData }
      };
      setSelectedNode(updatedSelectedNode);
    }

  }, [setNodes, selectedNode]);

  const handleAddChildNode = useCallback((parentNodeId: string) => {
    const parentNode = nodes.find((n: any) => n.id === parentNodeId);
    // Allow admins to create child nodes from both cryptoNode and fingerprintNode
    if (!parentNode || (parentNode.type !== 'fingerprintNode' && parentNode.type !== 'cryptoNode')) {
      toast.error('Cannot add child to this node type');
      return;
    }

    // Only admins can create children from crypto nodes
    if (parentNode.type === 'cryptoNode' && !user?.isAdmin) {
      toast.error('Admin access required to add child nodes to crypto nodes');
      return;
    }

    const { newNode, newEdge } = createChildNode(parentNode);

    // Update nodes and edges
    setNodes((nds: any[]) => [...nds, newNode]);
    setEdges((eds: any[]) => [...eds, newEdge]);

    // Update level data
    setLevelData((prevData: any) => ({
      ...prevData,
      nodes: [...prevData.nodes, newNode],
      edges: [...(prevData.edges || []), newEdge]
    }));

    toast.success(`Added child transaction node to ${parentNode.data.label}`);
  }, [nodes, setNodes, setEdges, setLevelData, user]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = nodes.find((n: any) => n.id === nodeId);
    const validation = validateNodeDeletion(nodeToDelete, edges);

    if (!validation.canDelete) {
      if (validation.message) alert(validation.message);
      return;
    }

    // Remove node and its edges
    setNodes((nds: any[]) => nds.filter((n: any) => n.id !== nodeId));
    setEdges((eds: any[]) => eds.filter((e: any) => e.target !== nodeId && e.source !== nodeId));

    // Update level data
    setLevelData((prevData: any) => ({
      ...prevData,
      nodes: prevData.nodes.filter((n: any) => n.id !== nodeId),
      edges: (prevData.edges || []).filter((e: any) => e.target !== nodeId && e.source !== nodeId)
    }));

    // Close panel if deleted node was selected
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    }
  }, [nodes, edges, setNodes, setEdges, setLevelData, selectedNode]);

  // Check if selected node can be deleted (is a leaf)
  const canDeleteSelectedNode = selectedNode ? canDeleteNode(selectedNode.id, edges) : false;

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodesWithSelection}
        edges={edgesWithVisibility}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultViewport={{ x: 0, y: 60, zoom: 0.7 }}
        minZoom={0.05}
        maxZoom={2}
        onInit={(instance: any) => {
          const centerNode = nodes.find((n: any) => n.id === 'center');
          if (centerNode) {
            instance.setCenter(centerNode.position.x + 40, centerNode.position.y, { zoom: 1, duration: 0 });
          }
        }}
        style={{
          background: '#0f0f0f',
        }}
      >
        <Levels currentLevel={currentLevel} maxLevel={5} />
        <AccountSettings />
        <PulsatingButton
          pulseColor="#764FCB"
          duration="1.5s"
          variant={
            pendingTierRequest ? "upgradePending" :
              hasWatchedCurrentLevel ? "withdraw" :
                (!user?.isAdmin && hasPendingVerification) ? "verificationPending" :
                  (!user?.isAdmin && !user?.walletVerified) ? "verifyWallet" :
                    hasStarted ? "loading" :
                      "start"
          }
          isLoading={isUpgrading}
          className="absolute top-6 right-24 w-fit min-w-[10rem]"
          onClick={
            pendingTierRequest
              ? undefined
              : hasWatchedCurrentLevel
                ? () => {
                  setShowCompletionPopup(!showCompletionPopup);
                }
                : (!user?.isAdmin && hasPendingVerification)
                  ? undefined
                  : (!user?.isAdmin && !user?.walletVerified)
                    ? () => {
                      navigate('/profile');
                    }
                    : hasStarted
                      ? undefined
                      : () => {
                        resetPendingStatus(); // Reset pending timers before starting animation
                        setAnimationStartedForLevel(currentLevel); // Track which level animation is starting for
                        startAnimation();
                      }
          }
          disabled={pendingTierRequest || (!user?.isAdmin && hasPendingVerification) || (hasStarted && !hasWatchedCurrentLevel) || isUpgrading}
        >
          {pendingTierRequest
            ? 'Upgrade Pending'
            : isUpgrading
              ? 'Upgrading...'
              : hasWatchedCurrentLevel
                ? 'Withdraw'
                : (!user?.isAdmin && hasPendingVerification)
                  ? 'Verification Pending'
                  : (!user?.isAdmin && !user?.walletVerified)
                    ? 'Verify Wallet'
                    : hasStarted
                      ? 'Running...'
                      : 'Start Allocation'}
        </PulsatingButton>


        {/* Data Visual Component - Admin users see edit panel, regular users see details panel */}
        {user?.isAdmin ? (
          <DataVisual
            selectedNode={selectedNode}
            onUpdateNodeData={updateNodeData}
            onClose={() => setSelectedNode(null)}
            onAddChildNode={handleAddChildNode}
            onDeleteNode={handleDeleteNode}
            canDelete={canDeleteSelectedNode}
            isAdmin={true}
          />
        ) : (
          <NodeDetailsPanel
            selectedNode={selectedNode}
            onClose={() => setSelectedNode(null)}
            hasStarted={hasStarted}
            hasWatchedCurrentLevel={hasWatchedCurrentLevel || !hasPaidForCurrentLevel}
            onStartAnimation={() => {
              if (!hasPaidForCurrentLevel) {
                handleUpgradeClick();
              } else {
                resetPendingStatus(); // Reset pending timers before starting animation
                setAnimationStartedForLevel(currentLevel); // Track which level animation is starting for
                startAnimation();
              }
            }}
            onWithdrawClick={() => {
              setShowCompletionPopup(!showCompletionPopup);
            }}
          />
        )}

        {/* <Controls /> */}
        <Background
          gap={20}
          size={1}
          style={{ opacity: 0.3 }}
        />
      </ReactFlow>

      {/* Animation Completion Popup - Now showing Withdraw Popup */}
      <EnhancedWithdrawPopup
        isOpen={showCompletionPopup}
        onClose={() => setShowCompletionPopup(false)}
        currentBalance={user?.balance || 0}
        userData={user}
        onSuccess={async () => {
          // Refresh user data after successful withdrawal
          await refreshUser();
          // Refetch per-level rewards to re-evaluate withdrawn networks visual state
          try {
            if (user?._id) {
              const rewards = await getUserLevelRewards(user._id, currentLevel);
              setUserLevelRewards(rewards || {});
            }
          } catch { }
          toast.success('Withdrawal request submitted successfully!');
        }}
      />


    </div>
  );
};

export default FlowCanvas;
