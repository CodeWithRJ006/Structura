"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicySchema = exports.StructuringRuleSchema = exports.RuleSchema = void 0;
const zod_1 = require("zod");
exports.RuleSchema = zod_1.z.object({
    tool: zod_1.z.string(),
    max_amount: zod_1.z.number().optional(),
    action_above_max: zod_1.z.enum(['allow', 'deny', 'require_approval']).optional(),
    action: zod_1.z.enum(['allow', 'deny', 'require_approval']).optional()
});
exports.StructuringRuleSchema = zod_1.z.object({
    tool: zod_1.z.string(),
    group_by: zod_1.z.string(),
    window_hours: zod_1.z.number(),
    threshold: zod_1.z.number()
});
exports.PolicySchema = zod_1.z.object({
    version: zod_1.z.literal(1),
    rules: zod_1.z.array(exports.RuleSchema),
    structuring: zod_1.z.array(exports.StructuringRuleSchema).optional()
});
//# sourceMappingURL=schema.js.map