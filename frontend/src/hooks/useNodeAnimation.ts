import { useState, useCallback, useEffect } from 'react';

export interface AnimationState {
  visibleNodes: Set<string>;
  isAnimating: boolean;
  hasStarted: boolean;
  isCompleted: boolean;
  allNodesAppeared: boolean;
}

export const useNodeAnimation = (
  nodes: any[], 
  onNodeAppear?: (nodeId: string) => void, 
  currentLevel: number = 1,
  getPendingStatus?: (nodeId: string) => boolean
) => {
  const [animationState, setAnimationState] = useState<AnimationState>({
    visibleNodes: new Set(),
    isAnimating: false,
    hasStarted: false,
    isCompleted: false,
    allNodesAppeared: false,
  });

  const startAnimation = useCallback(() => {
    console.log(`[useNodeAnimation] startAnimation called for level ${currentLevel}`);
    console.log(`[useNodeAnimation] Total nodes received:`, nodes.length);
    console.log(`[useNodeAnimation] All nodes:`, nodes.map(n => ({ id: n.id, type: n.type, level: n.data?.level })));
    if (animationState.hasStarted) {
      console.log(`[useNodeAnimation] Animation already started, returning`);
      return;
    }

    setAnimationState(prev => ({ ...prev, isAnimating: true, hasStarted: true }));

    // Get all nodes that should be included in the animation
    // For level 1: show crypto nodes + center first, then level 1 fingerprint nodes
    // For level 2+: show only new fingerprint nodes from current level (crypto nodes already visible)
    const isFirstLevel = currentLevel === 1;
    
    let initialVisibleNodes: string[] = [];
    let nodesToAnimate: any[] = [];
    
    if (isFirstLevel) {
      // Level 1: Show crypto nodes and center first
      const cryptoNodes = nodes.filter(
        (node: any) => node.type === 'cryptoNode' || node.id === 'center'
      );
      initialVisibleNodes = cryptoNodes.map((node: any) => node.id);
      
      // Then animate level 1 fingerprint nodes
      nodesToAnimate = nodes.filter((node: any) => 
        node.type === 'fingerprintNode' && (node.data?.level ?? 1) === 1
      );
    } else {
      // Level 2+: All previous level nodes should already be visible
      // We need to mark them as visible in the animation state
      const previousLevelNodes = nodes.filter((node: any) => {
        const nodeLevel = node.data?.level ?? 1;
        return nodeLevel < currentLevel || node.type === 'cryptoNode' || node.id === 'center';
      });
      initialVisibleNodes = previousLevelNodes.map((node: any) => node.id);
      
      // Only animate new fingerprint nodes from current level
      nodesToAnimate = nodes.filter((node: any) => 
        node.type === 'fingerprintNode' && (node.data?.level ?? 1) === currentLevel
      );
    }

    console.log(`[useNodeAnimation] Initial visible nodes:`, initialVisibleNodes);
    console.log(`[useNodeAnimation] Nodes to animate:`, nodesToAnimate.map(n => n.id));

    // Phase 1: Set initial visible nodes
    setAnimationState(prev => ({
      ...prev,
      visibleNodes: new Set(initialVisibleNodes),
    }));

    // Phase 2: Show nodes to animate one by one
    const baseDelay = isFirstLevel ? 1000 : 500; // Shorter delay for level 2+ since crypto nodes already visible
    const staggerDelay = 750; // Delay between each fingerprint node

    nodesToAnimate.forEach((node: any, index: number) => {
      setTimeout(() => {
        const isLastNode = index === nodesToAnimate.length - 1;
        
        setAnimationState(prev => ({
          ...prev,
          visibleNodes: new Set([...Array.from(prev.visibleNodes), node.id]),
          isAnimating: !isLastNode,
          allNodesAppeared: isLastNode,
          // Don't mark as completed yet - wait for pending timers
          isCompleted: false,
        }));
        
        // Emit event when fingerprint node appears
        if (onNodeAppear) {
          onNodeAppear(node.id);
        }
      }, baseDelay + index * staggerDelay);
    });
  }, [nodes, animationState.hasStarted, onNodeAppear, currentLevel]);

  // Effect to check when all pending timers are complete
  useEffect(() => {
    if (!animationState.allNodesAppeared || !animationState.hasStarted || animationState.isCompleted) {
      return;
    }

    // Check if we have a function to get pending status
    if (!getPendingStatus) {
      // If no pending status checker provided, complete immediately after all nodes appear
      setAnimationState(prev => ({
        ...prev,
        isCompleted: true,
        isAnimating: false,
      }));
      return;
    }

    // Get all fingerprint nodes from current level
    const currentLevelFingerprintNodes = nodes.filter((node: any) => 
      node.type === 'fingerprintNode' && (node.data?.level ?? 1) === currentLevel
    );

    // Check if all visible fingerprint nodes have completed their pending timers
    const checkPendingComplete = () => {
      console.log(`[useNodeAnimation] Checking pending completion for level ${currentLevel}`);
      console.log(`[useNodeAnimation] Current level fingerprint nodes:`, currentLevelFingerprintNodes.map(n => n.id));
      console.log(`[useNodeAnimation] Visible nodes:`, Array.from(animationState.visibleNodes));
      
      const allComplete = currentLevelFingerprintNodes.every((node: any) => {
        // If node is not visible yet, don't count it
        if (!animationState.visibleNodes.has(node.id)) {
          console.log(`[useNodeAnimation] Node ${node.id} not visible yet, skipping`);
          return true;
        }
        // Check if this node is still pending
        const isPending = getPendingStatus(node.id);
        console.log(`[useNodeAnimation] Node ${node.id} pending status: ${isPending}`);
        return !isPending;
      });

      console.log(`[useNodeAnimation] All nodes complete: ${allComplete}, isCompleted: ${animationState.isCompleted}`);

      if (allComplete && !animationState.isCompleted) {
        console.log(`[useNodeAnimation] Marking animation as completed for level ${currentLevel}`);
        setAnimationState(prev => ({
          ...prev,
          isCompleted: true,
          isAnimating: false,
        }));
      }
    };

    let intervalId: NodeJS.Timeout | null = null;

    // Add a delay before first check to allow pending status to initialize
    // This prevents race condition where we check before initializePendingStatus completes
    const initialTimeout = setTimeout(() => {
      checkPendingComplete();
      
      // Set up interval to check periodically
      intervalId = setInterval(checkPendingComplete, 500);
    }, 500);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [animationState.allNodesAppeared, animationState.hasStarted, animationState.isCompleted, animationState.visibleNodes, nodes, currentLevel, getPendingStatus]);

  const resetAnimation = useCallback(() => {
    setAnimationState({
      visibleNodes: new Set(),
      isAnimating: false,
      hasStarted: false,
      isCompleted: false,
      allNodesAppeared: false,
    });
  }, []);

  const isNodeVisible = useCallback(
    (nodeId: string) => {
      return animationState.visibleNodes.has(nodeId);
    },
    [animationState.visibleNodes]
  );

  return {
    startAnimation,
    resetAnimation,
    isNodeVisible,
    isAnimating: animationState.isAnimating,
    hasStarted: animationState.hasStarted,
    isCompleted: animationState.isCompleted,
  };
};
