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
  edges: any[]; // Need edges to determine parent-child relationships
  selectedNode: any;
  isNodeVisible: (id: string) => boolean;
  hasStarted: boolean;
  getEffectiveStatus: (id: string, status: string) => string;
  getTimeRemaining: (id: string) => number;
  currentLevel: number;
  user: any;
  allowedVisible: Set<string>;
  withdrawalSystem?: string;
  nodeScheduledActions?: Record<string, { executeAt: string; createdAt: string; nodeStatusOutcome: string }>;
  nodeApprovedAmounts?: Record<string, number>;
  nodeAdminComments?: Record<string, { comment: string; outcome: string }>;
  pendingRevealNodes?: Record<string, 'success' | 'fail'>;
  revealingNode?: { nodeId: string; outcome: 'success' | 'fail' } | null;
}) {
  const {
    nodes,
    edges,
    selectedNode,
    isNodeVisible,
    hasStarted,
    getEffectiveStatus,
    getTimeRemaining,
    currentLevel,
    user,
    allowedVisible,
    withdrawalSystem,
    nodeScheduledActions,
    nodeApprovedAmounts,
    nodeAdminComments,
    pendingRevealNodes,
    revealingNode,
  } = params;
  
  // Helper to find all descendant fingerprint nodes and sum their amounts
  const getGroupAggregation = (groupId: string) => {
    const visited = new Set<string>();
    const stack = [groupId];
    let totalAmount = 0;
    let childCount = 0;
    let totalChildCount = 0;
    let completedChildCount = 0;
    const childNodeIds: string[] = [];
    const nodeAmounts: Record<string, number> = {};
    // Collect success rates from child nodes for aggregation
    let successRateSum = 0;
    let successRateCount = 0;

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Find children of current node
      edges.forEach((edge: any) => {
        if (edge.source === currentId) {
          const targetNode = nodes.find(n => n.id === edge.target);
          if (targetNode) {
            if (targetNode.type === 'fingerprintNode') {
              totalChildCount++;
              // Collect success rate if present
              const rawRate = targetNode.data?.successRate;
              if (rawRate) {
                const parsed = parseInt(rawRate);
                if (!isNaN(parsed)) {
                  successRateSum += parsed;
                  successRateCount++;
                }
              }
              // Don't count as completed if the node is still pending reveal (avoid spoilers)
              const isPendingReveal = pendingRevealNodes?.[targetNode.id] != null;
              const isSuccess = !isPendingReveal && (user?.nodeProgress?.[targetNode.id] === 'success' || user?.nodeProgress?.[targetNode.id] === 'partial success');
              if (isSuccess) {
                completedChildCount++;
              } else {
                const amount = targetNode.data?.transaction?.amount || 0;
                totalAmount += amount;
                childCount++;
                childNodeIds.push(targetNode.id);
                nodeAmounts[targetNode.id] = amount;
              }
            }
            stack.push(targetNode.id);
          }
        }
      });
    }

    // Compute average success rate from children that have one
    const aggregatedSuccessRate = successRateCount > 0
      ? `${Math.round(successRateSum / successRateCount)}%`
      : null;

    return { totalAmount, childCount, totalChildCount, completedChildCount, childNodeIds, nodeAmounts, aggregatedSuccessRate };
  };

  // Build a map of parent nodes
  const parentMap = new Map<string, string>();
  edges.forEach((edge: any) => {
    parentMap.set(edge.target, edge.source);
  });

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
    // Top-level crypto nodes (parent is account/center) are always visible.
    // Child crypto nodes (parent is fingerprint/group) follow normal level rules.
    const isTopLevelCrypto = isCryptoNode && (() => {
      const parentId = parentMap.get(node.id);
      if (!parentId) return true; // No parent = top-level
      const parent = nodes.find(n => n.id === parentId);
      return !parent || parent.type === 'accountNode' || parent.id === 'center';
    })();

    const nodeVisible = isAdmin
      ? true  // Admins always see everything
      : isCenterNode
        ? true  // Account/center node always visible
        : isTopLevelCrypto
          ? true  // Top-level CryptoNodes always visible
          : shouldAutoShow
            ? isVisibleByRule
            : isCurrentLevel
              ? (hasStarted ? isNodeVisible(node.id) : false)
              : (isVisibleByRule && hasStarted && isNodeVisible(node.id));

    // Node is "unlocked" (interactive) if:
    // - Level has been watched, OR
    // - Animation has started and the node is visible in the animation
    const isUnlocked = hasWatchedNodeLevel || (hasStarted && isNodeVisible(node.id));

    // Locked state only for preview nodes (future levels user has access to but higher than current)
    const isPreviewNode = nodeLevel > currentLevel && nodeLevel <= (user?.tier || 0);

    // DAK parent-lock: only active when using the Direct Access Keys system
    let dakLocked = false;
    const isDakMode = withdrawalSystem === 'direct_access_keys';
    // We only lock fingerprint nodes enforcing the hierarchy if on a watched level
    // meaning the level is "finished" for regular animations but now waiting for key gen
    if (isDakMode && node.type === 'fingerprintNode' && hasWatchedNodeLevel) {
      const parentId = parentMap.get(node.id);
      if (parentId) {
        const parentNode = nodes.find(n => n.id === parentId);
        // If parent is a crypto node or a group node, then this node is NOT locked by parents
        if (parentNode && parentNode.type !== 'cryptoNode' && parentNode.type !== 'fingerprintGroupNode') {
          const parentProgress = user?.nodeProgress?.[parentId];
          if (parentProgress !== 'success' && parentProgress !== 'partial success') {
            dakLocked = true;
          }
        }
      }
    }

    // Inject scheduled action timing for progress bars
    const scheduledInfo = nodeScheduledActions?.[node.id];

    // For group nodes, calculate real-time aggregation from descendants
    const groupAgg = node.type === 'fingerprintGroupNode' ? getGroupAggregation(node.id) : null;

    return {
      ...node,
      hidden: !nodeVisible,
      data: {
        ...node.data,
        withdrawalSystem,
        isAdmin,
        selected: selectedNode?.id === node.id,
        isVisible: nodeVisible,
        hasStarted: hasStarted || hasWatchedNodeLevel,
        blocked: isBlocked,
        locked: isPreviewNode || dakLocked,
        dakLocked,
        nodeProgressStatus: pendingRevealNodes?.[node.id]
          ? 'pending_reveal'
          : (user?.nodeProgress?.[node.id] || null),
        revealOutcome: pendingRevealNodes?.[node.id] || null,
        isRevealing: (revealingNode && revealingNode.nodeId === node.id) ? revealingNode.outcome : null,
        parentId: parentMap.get(node.id),
        effectiveStatus,
        timeRemaining,
        scheduledExecuteAt: scheduledInfo?.executeAt || null,
        scheduledCreatedAt: scheduledInfo?.createdAt || null,
        // Group data
        aggregatedAmount: groupAgg?.totalAmount,
        childCount: groupAgg?.childCount,
        totalChildCount: groupAgg?.totalChildCount,
        completedChildCount: groupAgg?.completedChildCount,
        childNodeIds: groupAgg?.childNodeIds,
        nodeAmounts: groupAgg?.nodeAmounts,
        // Aggregated success rate from child nodes (only for group nodes)
        ...(groupAgg?.aggregatedSuccessRate ? { successRate: groupAgg.aggregatedSuccessRate } : {}),
        approvedAmount: nodeApprovedAmounts?.[node.id] ?? null,
        adminComment: nodeAdminComments?.[node.id] ?? null,
        user,
        level: nodeLevel,
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

