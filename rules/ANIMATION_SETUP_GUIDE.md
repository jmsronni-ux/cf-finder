# Complete Animation System Setup Guide (5 Levels)

## Overview
This guide explains how to create a complete 5-level animation system for your blockchain flow visualization.

## Current System Behavior

### Level System
- **User Tier (DB)**: Controls which levels user can access (1-5)
- **Animation Flags (DB)**: `lvl1anim`, `lvl2anim`, etc. (0 or 1) - tracks which animations user has watched
- **Current Level**: Determined by user's tier
- **Locked Nodes**: Show preview of next levels (gray with lock icon)

### Visibility Rules
1. **Watched Levels**: All nodes from completed animations stay visible permanently
2. **Current Level**: Nodes at user's current tier level are visible and can be animated
3. **Preview Nodes**: First children of current level nodes from higher levels show as locked/blocked
4. **Hidden Nodes**: Nodes beyond user's tier are completely hidden

## Step-by-Step Setup

### Option A: Single Master JSON (Recommended)

#### 1. Build Complete Node Tree
Start with your existing level-one.json and add ALL nodes for all 5 levels in the FlowCanvas editor:

```
Level 1: Initial fingerprint nodes (already exists)
├─ Level 2: Children of level 1 nodes (some already exist)
│  ├─ Level 3: Children of level 2 nodes
│  │  ├─ Level 4: Children of level 3 nodes
│  │  │  └─ Level 5: Children of level 4 nodes
```

#### 2. Use the Editor to Add Nodes
1. Open Dashboard (FlowCanvas)
2. Click on any fingerprint node
3. Click "Add Child Node" in the DataVisual panel
4. Edit the new node:
   - Set correct `level` field (2, 3, 4, or 5)
   - Set transaction details
   - Set pending time
   - Adjust position

#### 3. Download Complete JSON
1. Select "Level 5" from the download dropdown
2. Click download button
3. Save as `level-complete.json` or keep separate level files

#### 4. Update FlowCanvas to Load Complete Data
Replace in `FlowCanvas.tsx`:
```typescript
import levelOneData from '../data/level-one.json';
// with
import levelCompleteData from '../data/level-complete.json';
```

### Option B: Separate Level Files

Keep separate JSON files for each level and merge them dynamically:

#### 1. Create Each Level File
- `level-one.json` - Levels 1-2 (already exists)
- `level-two.json` - Add level 2 animation nodes
- `level-three.json` - Add level 3 animation nodes
- `level-four.json` - Add level 4 animation nodes
- `level-five.json` - Add level 5 animation nodes

#### 2. Merge Files in FlowCanvas
```typescript
import levelOneData from '../data/level-one.json';
import levelTwoData from '../data/level-two.json';
// ... etc

const allLevelsData = {
  nodes: [
    ...levelOneData.nodes,
    ...levelTwoData.nodes,
    // ... etc
  ],
  edges: [
    ...levelOneData.edges,
    ...levelTwoData.edges,
    // ... etc
  ]
};

const initialNodes = allLevelsData.nodes as any[];
const initialEdges = allLevelsData.edges as any[];
```

## Important Node Properties

Each node should have:
```json
{
  "id": "unique-id",
  "type": "fingerprintNode",
  "data": {
    "label": "FP-X",
    "level": 2,  // ⚠️ CRITICAL: Set correct level (1-5)
    "pending": 10, // Countdown time in seconds
    "transaction": {
      "id": "tx_xxx",
      "status": "Pending", // or "Success" or "Fail"
      "amount": 100,
      "currency": "BTC"
    }
  }
}
```

## Animation Flow Example

### User Journey:
1. **User starts at Tier 1**
   - Sees: All level 1 nodes + locked level 2 previews
   - Clicks START → Level 1 animates
   - After completion: `lvl1anim: 1` saved to DB

2. **User upgrades to Tier 2**
   - Sees: All level 1 nodes (unlocked) + level 2 nodes + locked level 3 previews
   - Clicks START → Only level 2 nodes animate (level 1 stays visible)
   - After completion: `lvl2anim: 1` saved to DB

3. **User upgrades to Tier 3**
   - Sees: Level 1 + 2 nodes (unlocked) + level 3 nodes + locked level 4 previews
   - Clicks START → Only level 3 nodes animate
   - After completion: `lvl3anim: 1` saved to DB

... and so on for levels 4 and 5

## Testing Your Setup

### Test Tier 1 User:
```javascript
// In MongoDB or through API
db.users.updateOne(
  { email: "test@example.com" },
  { 
    $set: { 
      tier: 1,
      lvl1anim: 0,
      lvl2anim: 0,
      lvl3anim: 0,
      lvl4anim: 0,
      lvl5anim: 0
    }
  }
)
```
Expected: See level 1 nodes + locked level 2 previews

### Test Tier 5 User (All Access):
```javascript
db.users.updateOne(
  { email: "test@example.com" },
  { 
    $set: { 
      tier: 5,
      lvl1anim: 1,
      lvl2anim: 1,
      lvl3anim: 1,
      lvl4anim: 1,
      lvl5anim: 0
    }
  }
)
```
Expected: See all nodes from levels 1-4, can animate level 5

## Quick Checklist

- [ ] All nodes have correct `level` field (1-5)
- [ ] All nodes have `pending` time set
- [ ] All fingerprint nodes have transaction data
- [ ] Edges connect between correct levels
- [ ] Downloaded JSON includes all levels you need
- [ ] Tested with different tier users (1-5)
- [ ] Tested animation progression through all levels

## Current File Structure
```
frontend/src/data/
├── level-one.json          // Your current file (levels 1-2)
├── level-two.json          // Create: Level 2 animation nodes
├── level-three.json        // Create: Level 3 animation nodes
├── level-four.json         // Create: Level 4 animation nodes
└── level-five.json         // Create: Level 5 animation nodes
```

## Need Help?
The system automatically handles:
- ✅ Showing/hiding nodes based on tier
- ✅ Locking future level nodes
- ✅ Keeping completed levels visible
- ✅ Animating only current level nodes
- ✅ Saving animation completion to DB

You only need to:
- Set correct `level` on each node
- Create the node tree structure
- Download the JSON files

