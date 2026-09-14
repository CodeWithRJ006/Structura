import { z } from 'zod';
export declare const RuleSchema: z.ZodObject<{
    tool: z.ZodString;
    max_amount: z.ZodOptional<z.ZodNumber>;
    action_above_max: z.ZodOptional<z.ZodEnum<{
        allow: "allow";
        deny: "deny";
        require_approval: "require_approval";
    }>>;
    action: z.ZodOptional<z.ZodEnum<{
        allow: "allow";
        deny: "deny";
        require_approval: "require_approval";
    }>>;
}, z.core.$strip>;
export declare const StructuringRuleSchema: z.ZodObject<{
    tool: z.ZodString;
    group_by: z.ZodString;
    window_hours: z.ZodNumber;
    threshold: z.ZodNumber;
}, z.core.$strip>;
export declare const PolicySchema: z.ZodObject<{
    version: z.ZodLiteral<1>;
    rules: z.ZodArray<z.ZodObject<{
        tool: z.ZodString;
        max_amount: z.ZodOptional<z.ZodNumber>;
        action_above_max: z.ZodOptional<z.ZodEnum<{
            allow: "allow";
            deny: "deny";
            require_approval: "require_approval";
        }>>;
        action: z.ZodOptional<z.ZodEnum<{
            allow: "allow";
            deny: "deny";
            require_approval: "require_approval";
        }>>;
    }, z.core.$strip>>;
    structuring: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tool: z.ZodString;
        group_by: z.ZodString;
        window_hours: z.ZodNumber;
        threshold: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type PolicyConfig = z.infer<typeof PolicySchema>;
//# sourceMappingURL=schema.d.ts.map