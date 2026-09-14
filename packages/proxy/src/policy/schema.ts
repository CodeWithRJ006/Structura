import { z } from 'zod';

export const RuleSchema = z.object({
  tool: z.string(),
  max_amount: z.number().optional(),
  action_above_max: z.enum(['allow', 'deny', 'require_approval']).optional(),
  action: z.enum(['allow', 'deny', 'require_approval']).optional()
});

export const StructuringRuleSchema = z.object({
  tool: z.string(),
  group_by: z.string(),
  window_hours: z.number(),
  threshold: z.number()
});

export const PolicySchema = z.object({
  version: z.literal(1),
  rules: z.array(RuleSchema),
  structuring: z.array(StructuringRuleSchema).optional()
});

export type PolicyConfig = z.infer<typeof PolicySchema>;
