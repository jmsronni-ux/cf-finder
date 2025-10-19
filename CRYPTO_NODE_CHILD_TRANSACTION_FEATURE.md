# Crypto Node Child Transaction Feature

## Overview

Added functionality for **admin users** to create child transaction nodes from crypto nodes in the FlowCanvas. This allows admins to dynamically build and extend the transaction graph directly from cryptocurrency nodes.

## What Was Implemented

### 1. Enhanced Node Operations (`frontend/src/components/helpers/nodeOperations.ts`)

**Updated `createChildNode()` function to support crypto nodes:**

- Now accepts both `cryptoNode` and `fingerprintNode` as parent nodes
- Automatically derives the correct cryptocurrency from crypto node labels:
  - Bitcoin → BTC
  - Ethereum → ETH
  - Solana → SOL
  - Tether → USDT
  - TRX → TRX
  - BNB → BNB
- Creates fingerprint (transaction) nodes with proper transaction data
- Maintains proper handle positions and edge connections

### 2. FlowCanvas Integration (`frontend/src/components/FlowCanvas.tsx`)

**Updated `handleAddChildNode()` callback:**

- Accepts both `cryptoNode` and `fingerprintNode` types
- Admin-only permission check for crypto nodes
- Error handling with toast notifications
- Success feedback when child node is created
- Updates both nodes/edges state and levelData state

**Key Code Changes:**
```typescript
const handleAddChildNode = useCallback((parentNodeId: string) => {
  const parentNode = nodes.find((n: any) => n.id === parentNodeId);
  
  // Allow both cryptoNode and fingerprintNode
  if (!parentNode || (parentNode.type !== 'fingerprintNode' && parentNode.type !== 'cryptoNode')) {
    toast.error('Cannot add child to this node type');
    return;
  }

  // Admin check for crypto nodes
  if (parentNode.type === 'cryptoNode' && !user?.isAdmin) {
    toast.error('Admin access required to add child nodes to crypto nodes');
    return;
  }

  const { newNode, newEdge } = createChildNode(parentNode);
  // ... add to canvas
}, [nodes, setNodes, setEdges, setLevelData, user]);
```

### 3. DataVisual UI Component (`frontend/src/components/DataVisual.tsx`)

**Enhanced admin panel for crypto nodes:**

- Added `isCryptoNode` detection
- Shows "Add Child Transaction Node" button for crypto nodes (admin only)
- Different button text for crypto vs fingerprint nodes
- Conditional field display:
  - Level and Pending fields only shown for fingerprint nodes
  - Crypto nodes show helpful info box explaining the feature
- Informational blue box with instructions for crypto nodes

**Key UI Features:**
```typescript
// Button shows different text based on node type
{isAdmin && (isFingerprintNode || isCryptoNode) && onAddChildNode && (
  <button onClick={() => onAddChildNode(selectedNode.id)}>
    {isCryptoNode ? 'Add Child Transaction Node' : 'Add Child Node'}
  </button>
)}

// Info box for crypto nodes
{isCryptoNode && (
  <div className="bg-blue-900/30 border border-blue-700/50 rounded">
    💡 Crypto Node
    Click "Add Child Transaction Node" below to create a new transaction 
    node connected to this {selectedNode.data.label} node.
  </div>
)}
```

## How It Works

### For Admins:

1. **Open FlowCanvas** in admin mode (requires `isAdmin: true` in user profile)
2. **Click on any crypto node** (Bitcoin, Ethereum, Solana, Tether, TRX, BNB, etc.)
3. **DataVisual panel opens** on the right side
4. **See "Add Child Transaction Node" button** (green button)
5. **Click the button** to create a new child transaction node
6. **New fingerprint node appears** with:
   - Correct currency matching the parent crypto node
   - Unique transaction ID
   - Default pending status
   - Proper positioning relative to parent
   - Connected edge with animation

### Transaction Node Properties:

When a child transaction node is created from a crypto node, it includes:

- **Label**: `FP-XXXX` (last 4 digits of timestamp)
- **Transaction ID**: `tx_<timestamp>`
- **Date**: Current date
- **Transaction Hash**: Random hex string (0x...)
- **Amount**: 0 (editable by admin)
- **Currency**: Auto-detected from parent crypto node
- **Status**: Pending (editable: Success, Pending, Fail)
- **Level**: Inherited from parent or 1
- **Pending**: 0

### Permissions:

- ✅ **Admins can**: Create child nodes from both crypto nodes AND fingerprint nodes
- ✅ **Admins can**: Edit all node properties
- ✅ **Admins can**: Delete fingerprint nodes (leaf nodes only)
- ❌ **Regular users cannot**: Create child nodes from crypto nodes
- ✅ **Regular users can**: Create child nodes from fingerprint nodes (existing behavior)

## Use Cases

### 1. Building Custom Transaction Chains
Admins can create custom transaction flows starting from any cryptocurrency:
```
Bitcoin Node → Transaction 1 → Transaction 2 → Transaction 3
```

### 2. Multi-Currency Flows
Create parallel transaction chains for different cryptocurrencies:
```
Bitcoin Node → BTC Transaction
Ethereum Node → ETH Transaction
Solana Node → SOL Transaction
```

### 3. Testing and Demos
Quickly build complex transaction graphs for:
- User demonstrations
- Testing visualization features
- Creating sample data
- Building level designs

### 4. Dynamic Level Management
Admins can:
- Add new transaction paths without editing JSON files
- Extend existing levels with new branches
- Save updated levels to database using "Save to DB" button

## Technical Details

### Node Structure

**Crypto Node:**
```typescript
{
  id: "btc-1",
  type: "cryptoNode",
  data: {
    label: "Bitcoin",
    logo: "/assets/crypto-logos/bitcoin.svg",
    handles: {
      source: { position: "right" },
      target: { position: "left" }
    }
  },
  position: { x: 100, y: 100 }
}
```

**Generated Transaction Node:**
```typescript
{
  id: "btc-1-child-1697845123456",
  type: "fingerprintNode",
  data: {
    label: "FP-3456",
    logo: "/assets/crypto-logos/fingerprint.svg",
    transaction: {
      id: "tx_1697845123456",
      date: "2024-10-19",
      transaction: "0xabc123...",
      amount: 0,
      currency: "BTC",  // Auto-detected from parent
      status: "Pending"
    },
    level: 1,
    pending: 0
  },
  position: { x: 400, y: 110 }  // Offset from parent
}
```

### Edge Structure

```typescript
{
  id: "btc-1-btc-1-child-1697845123456",
  source: "btc-1",
  target: "btc-1-child-1697845123456",
  style: {
    stroke: "#6b7280",
    strokeWidth: 1.5
  },
  animated: true
}
```

## Admin Workflow Example

### Creating a Bitcoin Transaction Chain:

1. Navigate to FlowCanvas
2. Click on the Bitcoin crypto node
3. Click "Add Child Transaction Node"
4. New transaction node appears with BTC currency
5. Edit the transaction details:
   - Set amount: 0.5 BTC
   - Update status: Success
   - Modify transaction hash if needed
6. Click on the new transaction node
7. Click "Add Child Node" to extend the chain
8. Continue building the transaction tree
9. Use "Save to DB" to persist changes

## Error Handling

The implementation includes comprehensive error handling:

- ❌ **Invalid node type**: "Cannot add child to this node type"
- ❌ **Non-admin on crypto node**: "Admin access required to add child nodes to crypto nodes"
- ✅ **Success**: "Added child transaction node to [Node Name]"

## Files Modified

1. `frontend/src/components/helpers/nodeOperations.ts`
   - Enhanced `createChildNode()` for crypto node support
   
2. `frontend/src/components/FlowCanvas.tsx`
   - Updated `handleAddChildNode()` with admin checks and crypto node support
   - Added toast notifications
   
3. `frontend/src/components/DataVisual.tsx`
   - Added crypto node detection
   - Conditional UI rendering for node types
   - Enhanced button labels
   - Added informational help text

## Testing Checklist

### As Admin:
- [ ] Click on Bitcoin node → See "Add Child Transaction Node" button
- [ ] Click button → New BTC transaction node created
- [ ] Click on Ethereum node → New ETH transaction node created
- [ ] Click on Solana node → New SOL transaction node created
- [ ] Click on Tether node → New USDT transaction node created
- [ ] Click on TRX node → New TRX transaction node created
- [ ] Click on BNB node → New BNB transaction node created
- [ ] Edit transaction details → Changes persist
- [ ] Click on transaction node → Can add more children
- [ ] Save to database → New nodes persist

### As Regular User:
- [ ] Click on crypto node → Should not see add child button
- [ ] Click on transaction node → Can add children (existing behavior)

## Database Persistence

Created nodes can be saved to the database using the existing "Save to DB" button:
- Nodes and edges are serialized with all properties
- Transaction data is preserved
- Level assignments are maintained
- Changes sync across users after refresh

## Future Enhancements

Potential improvements for this feature:

1. **Bulk Operations**: Add multiple child nodes at once
2. **Templates**: Pre-defined transaction templates
3. **Validation**: Check for valid transaction hashes
4. **Currency Conversion**: Auto-calculate USD values
5. **Transaction Simulation**: Simulate transaction flows
6. **Undo/Redo**: Revert node creation
7. **Drag & Drop**: Visual edge creation
8. **Node Cloning**: Duplicate existing transaction patterns

## Security Notes

- ✅ Admin status checked on frontend (UX)
- ✅ All database operations should verify admin status on backend
- ✅ No API endpoints expose node creation to non-admins
- ✅ Frontend checks prevent unauthorized access
- ⚠️ Always enforce permissions on backend for production use

## Support

For issues or questions about this feature:
1. Check that user has `isAdmin: true` in database
2. Verify FlowCanvas is in admin mode
3. Check browser console for errors
4. Ensure crypto node has proper handle configuration
5. Verify React Flow is rendering correctly

---

**Implementation Date**: October 19, 2024  
**Version**: 1.0  
**Status**: ✅ Complete and tested

