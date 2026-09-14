import { PolicyConfig } from './schema';

export type Decision =
  | { type: 'ALLOW' }
  | { type: 'DENY'; reason: string }
  | { type: 'REQUIRE_APPROVAL'; reason: string };

export function evaluate(tool: string, args: Record<string, unknown>, policy: PolicyConfig): Decision {
  const rule = policy.rules.find(r => r.tool === tool);
  const defaultRule = policy.rules.find(r => r.tool === '*');
  const activeRule = rule || defaultRule;

  if (!activeRule) {
    return { type: 'DENY', reason: `No matching policy or default rule found for tool: ${tool}` };
  }

  // Check amount limit if defined
  if (activeRule.max_amount !== undefined) {
    if (args.amount === undefined || typeof args.amount !== 'number') {
      return { type: 'DENY', reason: `Policy requires amount field for tool ${tool}, but it was missing or invalid.` };
    }
    
    if (args.amount > activeRule.max_amount) {
      const action = activeRule.action_above_max || 'deny';
      if (action === 'require_approval') {
        return { type: 'REQUIRE_APPROVAL', reason: `Amount ${args.amount} exceeds max ${activeRule.max_amount}. Approval required.` };
      }
      if (action === 'deny') {
        return { type: 'DENY', reason: `Amount ${args.amount} exceeds max ${activeRule.max_amount}. Denied.` };
      }
      return { type: 'ALLOW' };
    }
  }

  // Apply base action if amount limits were not breached or not defined
  const baseAction = activeRule.action || 'allow';
  if (baseAction === 'require_approval') {
    return { type: 'REQUIRE_APPROVAL', reason: `Tool ${tool} requires approval by default.` };
  }
  if (baseAction === 'deny') {
    return { type: 'DENY', reason: `Tool ${tool} is denied by default.` };
  }

  return { type: 'ALLOW' };
}
