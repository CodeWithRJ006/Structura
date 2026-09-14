import { z } from 'zod';

export const RuleSchema = z.object({
  tool: z.string(),
  max_amount: z.number().optional(),
  action_above_max: z.enum(['allow', 'deny', 'require_approval']).optional(),
  action: z.enum(['allow', 'deny', 'require_approval']).optional()
});

export const PolicySchema = z.object({
  version: z.literal(1),
  rules: z.array(RuleSchema)
});

export type PolicyConfig = z.infer<typeof PolicySchema>;
