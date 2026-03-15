// Utility functions for node operations

export function createChildNode(parentNode: any, timestamp: number = Date.now()) {
  const parentNodeId = parentNode.id;
  const newNodeId = `${parentNodeId}-child-${timestamp}`;
  
  // Calculate position and handle directions based on parent's source position
  const parentSourcePos = parentNode.data.handles?.source?.position || 'right';
  const offsetX = parentSourcePos === 'right' ? 300 : -300;
  const offsetY = Math.random() * 100 - 50; // Random vertical offset
  
  // Child's target should be opposite of parent's source
  const childTargetPos = parentSourcePos === 'right' ? 'left' : 'right';
  const childSourcePos = parentSourcePos; // Keep same direction for further children
  
  // Determine currency based on parent node type
  let currency = 'BTC';
  if (parentNode.type === 'cryptoNode') {
    // For crypto nodes, derive currency from the label
    const label = parentNode.data.label?.toLowerCase();
    if (label === 'bitcoin') currency = 'BTC';
    else if (label === 'ethereum') currency = 'ETH';
    else if (label === 'solana') currency = 'SOL';
    else if (label === 'tether') currency = 'USDT';
    else if (label === 'trx') currency = 'TRX';
    else if (label === 'bnb') currency = 'BNB';
  } else if (parentNode.data.transaction?.currency) {
    // For fingerprint nodes, use the existing transaction currency
    currency = parentNode.data.transaction.currency;
  } else if (parentNode.data.currency) {
    // For group nodes, use the inherited currency
    currency = parentNode.data.currency;
  }
  
  // Create new fingerprint node
  const newNode = {
    id: newNodeId,
    type: 'fingerprintNode',
    data: {
      label: `FP-${timestamp.toString().slice(-4)}`,
      logo: '/assets/crypto-logos/fingerprint.svg',
      transaction: {
        id: `tx_${timestamp}`,
        date: new Date().toISOString().split('T')[0],
        transaction: '0x' + Math.random().toString(16).slice(2, 42),
        amount: 0,
        currency: currency,
        status: 'Pending'
      },
      level: parentNode.data.level || 1,
      handles: {
        target: {
          position: childTargetPos
        },
        source: {
          position: childSourcePos
        }
      },
      pending: 0
    },
    position: {
      x: parentNode.position.x + offsetX,
      y: parentNode.position.y + offsetY
    },
    sourcePosition: childSourcePos as any,
    targetPosition: childTargetPos as any,
    hidden: false,
    width: 64,
    height: 64
  };

  // Create edge from parent to new node
  const newEdge = {
    id: `${parentNodeId}-${newNodeId}`,
    source: parentNodeId,
    target: newNodeId,
    style: {
      stroke: '#6b7280',
      strokeWidth: 1.5
    },
    animated: true
  };

  return { newNode, newEdge };
}

export function createGroupNode(parentNode: any, timestamp: number = Date.now()) {
  const parentNodeId = parentNode.id;
  const newNodeId = `${parentNodeId}-group-${timestamp}`;
  
  // Inherit currency
  let currency = 'BTC';
  if (parentNode.type === 'cryptoNode') {
    const label = parentNode.data.label?.toLowerCase();
    if (label === 'bitcoin') currency = 'BTC';
    else if (label === 'ethereum') currency = 'ETH';
    else if (label === 'solana') currency = 'SOL';
    else if (label === 'tether') currency = 'USDT';
    else if (label === 'trx') currency = 'TRX';
    else if (label === 'bnb') currency = 'BNB';
  } else if (parentNode.data.transaction?.currency) {
    currency = parentNode.data.transaction.currency;
  } else if (parentNode.data.currency) {
    currency = parentNode.data.currency;
  }

  const parentSourcePos = parentNode.data.handles?.source?.position || 'right';
  const offsetX = parentSourcePos === 'right' ? 300 : -300;
  const offsetY = Math.random() * 100 - 50;
  
  const childTargetPos = parentSourcePos === 'right' ? 'left' : 'right';
  const childSourcePos = parentSourcePos;
  
  const newNode = {
    id: newNodeId,
    type: 'fingerprintGroupNode',
    data: {
      label: `GROUP-${timestamp.toString().slice(-4)}`,
      level: parentNode.data.level || 1,
      currency,
      handles: {
        target: { position: childTargetPos },
        source: { position: childSourcePos }
      },
      aggregatedAmount: 0,
      childCount: 0
    },
    position: {
      x: parentNode.position.x + offsetX,
      y: parentNode.position.y + offsetY
    },
    sourcePosition: childSourcePos as any,
    targetPosition: childTargetPos as any,
    hidden: false,
    width: 96,
    height: 96
  };

  const newEdge = {
    id: `${parentNodeId}-${newNodeId}`,
    source: parentNodeId,
    target: newNodeId,
    style: {
      stroke: '#6b7280',
      strokeWidth: 1.5
    },
    animated: true
  };

  return { newNode, newEdge };
}

// Crypto label → logo path mapping
const cryptoLogoMap: Record<string, { label: string; logo: string }> = {
  BTC:  { label: 'Bitcoin',  logo: '/assets/crypto-logos/bitcoin-btc-logo.svg' },
  ETH:  { label: 'Ethereum', logo: '/assets/crypto-logos/ethereum-eth-logo.svg' },
  SOL:  { label: 'Solana',   logo: '/assets/crypto-logos/solana-sol-logo.svg' },
  USDT: { label: 'Tether',   logo: '/assets/crypto-logos/tether-usdt-logo.svg' },
  TRX:  { label: 'TRX',      logo: '/assets/crypto-logos/tron-trx-logo.svg' },
  BNB:  { label: 'BNB',      logo: '/assets/crypto-logos/bnb-bnb-logo.svg' },
};

/**
 * Creates a CryptoNode as a visual child of a FingerprintNode or FingerprintGroupNode.
 * These are purely decorative — they do nothing, just serve as visual clues.
 */
export function createCryptoChildNode(parentNode: any, cryptoCurrency: string, timestamp: number = Date.now()) {
  const parentNodeId = parentNode.id;
  const newNodeId = `${parentNodeId}-crypto-${cryptoCurrency.toLowerCase()}-${timestamp}`;

  const crypto = cryptoLogoMap[cryptoCurrency] || cryptoLogoMap.BTC;

  const parentSourcePos = parentNode.data.handles?.source?.position || 'right';
  const offsetX = parentSourcePos === 'right' ? 200 : -200;
  const offsetY = Math.random() * 80 - 40;

  const childTargetPos = parentSourcePos === 'right' ? 'left' : 'right';
  const childSourcePos = parentSourcePos;

  const newNode = {
    id: newNodeId,
    type: 'cryptoNode',
    data: {
      label: crypto.label,
      logo: crypto.logo,
      level: parentNode.data.level || 1,
      handles: {
        target: { position: childTargetPos },
        source: { position: childSourcePos }
      }
    },
    position: {
      x: parentNode.position.x + offsetX,
      y: parentNode.position.y + offsetY
    },
    sourcePosition: childSourcePos as any,
    targetPosition: childTargetPos as any,
    hidden: false,
    width: 64,
    height: 64
  };

  const newEdge = {
    id: `${parentNodeId}-${newNodeId}`,
    source: parentNodeId,
    target: newNodeId,
    style: {
      stroke: '#6b7280',
      strokeWidth: 1.5
    },
    animated: true
  };

  return { newNode, newEdge };
}

export function canDeleteNode(nodeId: string, edges: any[]): boolean {
  // Node can be deleted if it has no children (is a leaf)
  return !edges.some((e: any) => e.source === nodeId);
}

export function validateNodeDeletion(node: any, edges: any[]): { canDelete: boolean; message?: string } {
  if (!node || (node.type !== 'fingerprintNode' && node.type !== 'fingerprintGroupNode' && node.type !== 'cryptoNode')) {
    return { canDelete: false, message: 'Only fingerprint, group, or crypto nodes can be deleted' };
  }

  const hasChildren = edges.some((e: any) => e.source === node.id);
  if (hasChildren) {
    return { canDelete: false, message: 'Cannot delete this node - it has children. Delete children first.' };
  }

  return { canDelete: true };
}

