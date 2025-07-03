# Graph Test Fix - Node Name Conflict Resolution

## Issue
The `buildIdeaForgeGraph` tests were failing with the error:
```
researchSynthesis is already being used as a state attribute (a.k.a. a channel), 
cannot also be used as a node name.
```

## Root Cause
LangGraph doesn't allow node names to conflict with state attribute names. In our `ProjectState` interface, we have a field `researchSynthesis: string`, and we were trying to use the same name for a graph node.

## Solution
Renamed the node from `researchSynthesis` to `researchSynthesisNode` throughout the graph implementation.

### Changes Made
1. **src/agents/graph.ts**:
   - Changed node registration: `graph.addNode('researchSynthesisNode', ...)`
   - Updated all conditional edge returns from `'researchSynthesis'` to `'researchSynthesisNode'`
   - Updated edge mapping objects to use `researchSynthesisNode`
   - Updated edge connections to use the new node name

2. **src/services/agent-runner.ts**:
   - Added `researchSynthesisNode` to the `getNodeDisplayName` mapping

## Result
All 480 tests now pass, including the 4 graph tests that were previously failing.

## Lesson Learned
When using LangGraph, ensure that node names don't conflict with state property names. Consider using a naming convention like appending "Node" to avoid such conflicts. 