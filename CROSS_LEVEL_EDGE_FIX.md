# Cross-Level Edge Connection Fix

## ✅ Fixed Issue:
**Problem**: When level 2 animation starts, the first node appears without a visible connection to its level 1 parent node.

## Root Cause:
The edge visibility logic only checked if both nodes were in the **current animation's visible set**. However:
- Level 1 nodes (already watched) are NOT in the animation's `visibleNodes` Set
- Level 2 nodes (currently animating) ARE added to `visibleNodes` as they appear
- Result: Edge between level 1 parent and level 2 child was hidden

## Solution:
Updated `mapEdgesWithVisibility()` in `visibilityHelpers.ts` to handle cross-level edges:

### New Logic:
```javascript
// 1. If both nodes from watched levels → show immediately
const bothWatched = sourceWatched && targetWatched;

// 2. If source from watched level + target animating → show when target appears
const sourceWatchedTargetAnimating = sourceWatched && !targetWatched && hasStarted && isNodeVisible(edge.target);

// 3. Otherwise → check if both are visible in animation
const sourceVisible = sourceWatched || (hasStarted && isNodeVisible(edge.source));
const targetVisible = targetWatched || (hasStarted && isNodeVisible(edge.target));
```

## How It Works Now:

### Level 1 Animation (First Time):
- All nodes at level 1 animate
- Edges appear as nodes become visible
- After completion: `lvl1anim = 1`

### Level 2 Animation (After Upgrade):
**Example: `usdt-fp2` (Level 1) → `usdt-fp2-child1` (Level 2)**

1. **Before Animation**:
   - `usdt-fp2` visible (level 1 watched)
   - `usdt-fp2-child1` hidden
   - Edge hidden

2. **When Animation Reaches `usdt-fp2-child1`**:
   - `sourceWatched` = true (level 1)
   - `targetWatched` = false (level 2 not watched yet)
   - `isNodeVisible('usdt-fp2-child1')` = true (just appeared)
   - `sourceWatchedTargetAnimating` = **true**
   - **Edge shows immediately** connecting parent to child! ✅

3. **Result**:
   - Smooth transition from level 1 to level 2
   - No orphaned nodes
   - Continuous visual flow

## Test Cases:

✅ **Level 1 → Level 2**: 
- `usdt-fp2` → `usdt-fp2-child1` edge appears when child animates
- `trx` → `trx-child1` edge appears when child animates

✅ **Level 2 → Level 3**:
- Parent nodes from level 2 (watched) connect to level 3 children

✅ **Any Cross-Level Connection**:
- If parent level is watched, edge appears with child node
- If both levels watched, edge always visible
- If neither watched, edge appears when both nodes visible in animation

## Status: ✅ FIXED
Cross-level edges now properly connect parent nodes from watched levels to child nodes as they animate in new levels.

