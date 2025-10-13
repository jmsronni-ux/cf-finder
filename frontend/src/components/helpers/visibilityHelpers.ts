// Helper functions for node and edge visibility

export function computeAllowedNodeIds(
  nodes: any[],
  edges: any[],
  currentLevel: number,
  user: any
) {
  const nodeById: Record<string, any> = Object.fromEntries(nodes.map((n: any) => [n.id, n]));
  const allowedVisible = new Set<string>();
  // Use actual user tier (don't treat tier 0 as tier 1 for access control)
  const userTier = user?.tier || 0;

  // Add only nodes from watched levels to allowedVisible
  // Current level nodes are NOT pre-added - they will be handled during animation
  // This ensures nodes stay hidden until animation starts
  for (const n of nodes) {
    const lvl = n?.data?.level ?? 1;
    const hasWatchedThisLevel = user?.[`lvl${lvl}anim` as keyof typeof user] === 1;
    
    // Allow node only if it's from a watched level
    // Current level nodes will be added to allowedVisible only during animation
    if (hasWatchedThisLevel) {
      allowedVisible.add(n.id);
    }
  }

  // Add preview nodes for ALL levels between current and user's tier (locked previews)
  // This shows what's coming in future levels the user has access to
  for (let previewLevel = currentLevel + 1; previewLevel <= userTier; previewLevel++) {
    const parentLevel = previewLevel - 1;
    for (const e of edges) {
      const s = nodeById[e.source];
      const t = nodeById[e.target];
      if (!s || !t) continue;
      const sLvl = s?.data?.level ?? 1;
      const tLvl = t?.data?.level ?? 1;
      // Show preview nodes that are children of nodes from previous level
      if (sLvl === parentLevel && tLvl === previewLevel) {
        allowedVisible.add(t.id);
      }
    }
  }

  return { allowedVisible, nodeById };
}

export function mapNodesWithState(params: {
  nodes: any[];
  selectedNode: any;
  isNodeVisible: (id: string) => boolean;
  hasStarted: boolean;
  getEffectiveStatus: (id: string, status: string) => string;
  getTimeRemaining: (id: string) => number;
  currentLevel: number;
  user: any;
  allowedVisible: Set<string>;
}) {
  const {
    nodes,
    selectedNode,
    isNodeVisible,
    hasStarted,
    getEffectiveStatus,
    getTimeRemaining,
    currentLevel,
    user,
    allowedVisible,
  } = params;

  return nodes.map((node: any) => {
    const effectiveStatus = node.type === 'fingerprintNode' && node.data.transaction
      ? getEffectiveStatus(node.id, node.data.transaction.status)
      : node.data.transaction?.status;

    const timeRemaining = node.type === 'fingerprintNode' 
      ? getTimeRemaining(node.id)
      : 0;
    const nodeLevel = node?.data?.level ?? 1;
    const isVisibleByRule = allowedVisible.has(node.id);
    const isBlocked = nodeLevel > currentLevel;

    // If user has watched any level, show all nodes from that level immediately
    const hasWatchedNodeLevel = user?.[`lvl${nodeLevel}anim` as keyof typeof user] === 1;
    const shouldAutoShow = hasWatchedNodeLevel;
    const isCurrentLevel = nodeLevel === currentLevel;
    const isCenterNode = node.id === 'center' || node.type === 'accountNode';
    const isCryptoNode = node.type === 'cryptoNode';

    // Admin users can always see all nodes (for editing purposes)
    const isAdmin = user?.isAdmin === true;
    
    // Determine visibility:
    // 1. Admins always see all nodes (for editing)
    // 2. Account/center node is always visible
    // 3. CryptoNodes are always visible
    // 4. If user has watched this level, show all nodes immediately (they're in allowedVisible)
    // 5. If it's the current level (not yet watched):
    //    a. Before animation starts: Hide ALL nodes (except center and crypto)
    //    b. After animation starts: Show nodes as they appear in animation (ignore allowedVisible check)
    // 6. Otherwise, only show nodes that are in allowedVisible AND in the animation's visible list
    const nodeVisible = isAdmin
      ? true  // Admins always see everything
      : isCenterNode
        ? true  // Account/center node always visible
        : isCryptoNode
          ? true  // CryptoNodes always visible
          : shouldAutoShow 
            ? isVisibleByRule 
            : isCurrentLevel 
              ? (hasStarted ? isNodeVisible(node.id) : false)  // Before animation: hide all; During: animated nodes (ignore allowedVisible)
              : (isVisibleByRule && hasStarted && isNodeVisible(node.id));

    // Node is "unlocked" (interactive) if:
    // - Level has been watched, OR
    // - Animation has started and the node is visible in the animation
    const isUnlocked = hasWatchedNodeLevel || (hasStarted && isNodeVisible(node.id));

    // Locked state only for preview nodes (future levels user has access to but higher than current)
    const isPreviewNode = nodeLevel > currentLevel && nodeLevel <= (user?.tier || 0);

    return {
      ...node,
      hidden: !nodeVisible,  // Hide node completely in ReactFlow if not visible
      data: {
        ...node.data,
        selected: selectedNode?.id === node.id,
        isVisible: nodeVisible,
        hasStarted: hasStarted || hasWatchedNodeLevel,
        blocked: isBlocked,
        locked: isPreviewNode,  // Only lock preview nodes from future levels
        effectiveStatus,
        timeRemaining,
      },
    };
  });
}

export function mapEdgesWithVisibility(params: {
  edges: any[];
  isNodeVisible: (id: string) => boolean;
  hasStarted: boolean;
  allowedVisible: Set<string>;
  nodeById: Record<string, any>;
  user: any;
}) {
  const { edges, isNodeVisible, hasStarted, allowedVisible, nodeById, user } = params;

  return edges.map((edge: any) => {
    // Admin users can always see all edges (for editing purposes)
    const isAdmin = user?.isAdmin === true;
    if (isAdmin) {
      return {
        ...edge,
        hidden: false,
      };
    }
    
    const sourceNode = nodeById[edge.source];
    const targetNode = nodeById[edge.target];
    
    // Always show connections between accountNode and cryptoNodes
    const isAccountNode = (node: any) => node?.id === 'center' || node?.type === 'accountNode';
    const isCryptoNode = (node: any) => node?.type === 'cryptoNode';
    
    const isAccountToCrypto = (isAccountNode(sourceNode) && isCryptoNode(targetNode)) || 
                              (isCryptoNode(sourceNode) && isAccountNode(targetNode));
    
    if (isAccountToCrypto) {
      return {
        ...edge,
        hidden: false,
      };
    }
    
    const sourceLevel = sourceNode?.data?.level ?? 1;
    const targetLevel = targetNode?.data?.level ?? 1;
    const sourceWatched = user?.[`lvl${sourceLevel}anim` as keyof typeof user] === 1;
    const targetWatched = user?.[`lvl${targetLevel}anim` as keyof typeof user] === 1;
    
    // Edge visibility rules:
    // 1. If both nodes are from watched levels, show edge immediately
    // 2. If source is from watched level and target is animating, show edge when target appears
    // 3. For current level nodes not yet watched, show edges only during animation when both nodes visible
    const bothWatched = sourceWatched && targetWatched;
    const sourceWatchedTargetAnimating = sourceWatched && !targetWatched && hasStarted && isNodeVisible(edge.target);
    
    let hiddenByAnimation = false;
    if (!bothWatched && !sourceWatchedTargetAnimating) {
      // Show edge when both nodes are visible (either watched or currently animating)
      const sourceVisible = sourceWatched || (hasStarted && isNodeVisible(edge.source));
      const targetVisible = targetWatched || (hasStarted && isNodeVisible(edge.target));
      hiddenByAnimation = !hasStarted || !sourceVisible || !targetVisible;
    }
    
    return {
      ...edge,
      hidden: hiddenByAnimation,
    };
  });
}

