import { Decision } from '../policy/engine';
import { StructuringState } from './state';
import { PolicyConfig } from '../policy/schema';

export function checkStructuring(
  tool: string,
  args: Record<string, unknown>,
  state: StructuringState,
  config: PolicyConfig,
  now: number = Date.now()
): Decision {
  const rules = config.structuring || [];
  const rule = rules.find(r => r.tool === tool);
  
  // If the tool has no structuring config entry, ALLOW immediately (no-op)
  if (!rule) return { type: 'ALLOW' };

  const groupKey = args[rule.group_by];
  if (groupKey === undefined) {
    return { type: 'REQUIRE_APPROVAL', reason: `Missing grouping field ${rule.group_by} for structuring check` };
  }
  
  const amount = args.amount;
  if (typeof amount !== 'number') {
    return { type: 'REQUIRE_APPROVAL', reason: `Missing or invalid amount field for structuring check` };
  }

  const cumulative = state.getCumulative(tool, String(groupKey), rule.window_hours, now);
  
  if (cumulative + amount > rule.threshold) {
    // A legitimate multi-part refund (partial shipment, partial cancellation) is a real business case. 
    // State reasoning: structuring triggers REQUIRE_APPROVAL, not a hard DENY.
    return { 
      type: 'REQUIRE_APPROVAL', 
      reason: `Cumulative ₹${(cumulative + amount)/100} across calls to ${rule.group_by} ${groupKey} in the last ${rule.window_hours}h exceeds ₹${rule.threshold/100} threshold.` 
    };
  }
  
  return { type: 'ALLOW' };
}
