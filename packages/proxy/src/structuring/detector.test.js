"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const detector_1 = require("./detector");
const state_1 = require("./state");
const schema_1 = require("../policy/schema");
const mockConfig = {
    version: 1,
    rules: [],
    structuring: [
        {
            tool: 'create_refund',
            group_by: 'payment_id',
            window_hours: 24,
            threshold: 1500000 // 15,000 INR
        }
    ]
};
(0, node_test_1.default)('detector - True positive: 5x ₹10,000 refunds against one payment_id flags on 2nd call', () => {
    const state = new state_1.StructuringState();
    const args = { payment_id: 'pay_true', amount: 1000000 }; // 10,000 INR
    let flagged = false;
    for (let i = 0; i < 5; i++) {
        const decision = (0, detector_1.checkStructuring)('create_refund', args, state, mockConfig);
        if (decision.type === 'REQUIRE_APPROVAL') {
            flagged = true;
            node_assert_1.default.strictEqual(i, 1); // Should flag exactly on the 2nd call
            break;
        }
        else {
            // Record allowed call
            state.record('create_refund', 'pay_true', args.amount);
        }
    }
    node_assert_1.default.strictEqual(flagged, true);
});
(0, node_test_1.default)('detector - False-positive check: 5x ₹10,000 refunds against 5 different payment_ids must NOT flag', () => {
    const state = new state_1.StructuringState();
    let flagged = false;
    for (let i = 0; i < 5; i++) {
        const args = { payment_id: `pay_false_${i}`, amount: 1000000 };
        const decision = (0, detector_1.checkStructuring)('create_refund', args, state, mockConfig);
        if (decision.type === 'REQUIRE_APPROVAL') {
            flagged = true;
        }
        else {
            state.record('create_refund', args.payment_id, args.amount);
        }
    }
    node_assert_1.default.strictEqual(flagged, false);
});
(0, node_test_1.default)('detector - Cross-key evasion: Caught incidentally via payment_id grouping regardless of API key', () => {
    // Our implementation inherently aggregates by group_key (payment_id) regardless of API key.
    // Therefore, cross-key splitting is caught incidentally, since detection groups by payment_id
    // and does not partition state by the caller's identity.
    const state = new state_1.StructuringState();
    // Call 1 from API key A
    const decisionA = (0, detector_1.checkStructuring)('create_refund', { payment_id: 'pay_cross', amount: 1000000 }, state, mockConfig);
    node_assert_1.default.strictEqual(decisionA.type, 'ALLOW');
    state.record('create_refund', 'pay_cross', 1000000);
    // Call 2 from API key B (same payment_id)
    const decisionB = (0, detector_1.checkStructuring)('create_refund', { payment_id: 'pay_cross', amount: 1000000 }, state, mockConfig);
    // We DO catch it because we don't partition by API key.
    node_assert_1.default.strictEqual(decisionB.type, 'REQUIRE_APPROVAL');
});
(0, node_test_1.default)('detector - Window-boundary evasion: (Known Limitation) Calls spaced outside fixed window evade detection', () => {
    const state = new state_1.StructuringState();
    const now = Date.now();
    const past = now - (25 * 60 * 60 * 1000); // 25 hours ago
    // Call 1 at t - 25h
    const decision1 = (0, detector_1.checkStructuring)('create_refund', { payment_id: 'pay_window', amount: 1000000 }, state, mockConfig, past);
    node_assert_1.default.strictEqual(decision1.type, 'ALLOW');
    state.record('create_refund', 'pay_window', 1000000, past);
    // Call 2 at now
    const decision2 = (0, detector_1.checkStructuring)('create_refund', { payment_id: 'pay_window', amount: 1000000 }, state, mockConfig, now);
    // The first call was 25h ago, so it's evicted. Total cumulative is 0, so this 10,000 call is ALLOWED.
    node_assert_1.default.strictEqual(decision2.type, 'ALLOW');
});
//# sourceMappingURL=detector.test.js.map