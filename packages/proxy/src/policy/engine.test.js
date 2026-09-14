"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const engine_1 = require("./engine");
const schema_1 = require("./schema");
const mockPolicy = {
    version: 1,
    rules: [
        {
            tool: 'create_refund',
            max_amount: 1500000,
            action_above_max: 'require_approval'
        },
        {
            tool: 'capture_payment',
            max_amount: 5000000,
            action_above_max: 'deny'
        },
        {
            tool: 'always_deny',
            action: 'deny'
        },
        {
            tool: '*',
            action: 'allow'
        }
    ]
};
(0, node_test_1.default)('engine - exact match under threshold (ALLOW)', () => {
    const result = (0, engine_1.evaluate)('create_refund', { amount: 1000000 }, mockPolicy);
    node_assert_1.default.deepStrictEqual(result, { type: 'ALLOW' });
});
(0, node_test_1.default)('engine - exact match over threshold with require_approval action', () => {
    const result = (0, engine_1.evaluate)('create_refund', { amount: 2000000 }, mockPolicy);
    node_assert_1.default.strictEqual(result.type, 'REQUIRE_APPROVAL');
    if (result.type === 'REQUIRE_APPROVAL') {
        node_assert_1.default.match(result.reason, /Approval required/);
    }
});
(0, node_test_1.default)('engine - exact match over threshold with deny action', () => {
    const result = (0, engine_1.evaluate)('capture_payment', { amount: 6000000 }, mockPolicy);
    node_assert_1.default.strictEqual(result.type, 'DENY');
    if (result.type === 'DENY') {
        node_assert_1.default.match(result.reason, /Denied/);
    }
});
(0, node_test_1.default)('engine - missing/malformed amount field', () => {
    const result1 = (0, engine_1.evaluate)('create_refund', {}, mockPolicy);
    node_assert_1.default.strictEqual(result1.type, 'DENY');
    const result2 = (0, engine_1.evaluate)('create_refund', { amount: "100" }, mockPolicy);
    node_assert_1.default.strictEqual(result2.type, 'DENY');
});
(0, node_test_1.default)('engine - no matching rule with a default "*" present', () => {
    const result = (0, engine_1.evaluate)('some_other_tool', {}, mockPolicy);
    node_assert_1.default.deepStrictEqual(result, { type: 'ALLOW' });
});
(0, node_test_1.default)('engine - base action deny', () => {
    const result = (0, engine_1.evaluate)('always_deny', {}, mockPolicy);
    node_assert_1.default.strictEqual(result.type, 'DENY');
});
(0, node_test_1.default)('engine - no matching rule and no default (fail-closed DENY)', () => {
    const strictPolicy = {
        version: 1,
        rules: [
            { tool: 'specific_tool', action: 'allow' }
        ]
    };
    const result = (0, engine_1.evaluate)('unknown_tool', {}, strictPolicy);
    node_assert_1.default.strictEqual(result.type, 'DENY');
    if (result.type === 'DENY') {
        node_assert_1.default.match(result.reason, /No matching policy/);
    }
});
//# sourceMappingURL=engine.test.js.map