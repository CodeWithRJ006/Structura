import test from 'node:test';
import assert from 'node:assert';
import { checkStructuring } from './detector';
import { StructuringState } from './state';
import { PolicyConfig } from '../policy/schema';

const mockConfig: PolicyConfig = {
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

test('detector - True positive: 5x ₹10,000 refunds against one payment_id flags on 2nd call', () => {
  const state = new StructuringState();
  const args = { payment_id: 'pay_true', amount: 1000000 }; // 10,000 INR
  let flagged = false;

  for (let i = 0; i < 5; i++) {
    const decision = checkStructuring('create_refund', args, state, mockConfig);
    if (decision.type === 'REQUIRE_APPROVAL') {
      flagged = true;
      assert.strictEqual(i, 1); // Should flag exactly on the 2nd call
      break;
    } else {
      // Record allowed call
      state.record('create_refund', 'pay_true', args.amount);
    }
  }

  assert.strictEqual(flagged, true);
});

test('detector - False-positive check: 5x ₹10,000 refunds against 5 different payment_ids must NOT flag', () => {
  const state = new StructuringState();
  let flagged = false;

  for (let i = 0; i < 5; i++) {
    const args = { payment_id: `pay_false_${i}`, amount: 1000000 };
    const decision = checkStructuring('create_refund', args, state, mockConfig);
    if (decision.type === 'REQUIRE_APPROVAL') {
      flagged = true;
    } else {
      state.record('create_refund', args.payment_id, args.amount);
    }
  }

  assert.strictEqual(flagged, false);
});

test('detector - Cross-key evasion: (Known Limitation) API keys are currently NOT tracked', () => {
  // Our implementation inherently aggregates by group_key (payment_id) regardless of API key.
  // Therefore, cross-key evasion fails (we DO detect it) if they use the same payment_id.
  // If the prompt meant "if the same payment is hit from two different API keys, v1 does not need to catch that"
  // it implies the keys might be tracked. Since we don't pass API key down, it aggregates everything.
  // We document this limitation/feature here:
  const state = new StructuringState();
  
  // Call 1 from API key A
  const decisionA = checkStructuring('create_refund', { payment_id: 'pay_cross', amount: 1000000 }, state, mockConfig);
  assert.strictEqual(decisionA.type, 'ALLOW');
  state.record('create_refund', 'pay_cross', 1000000);

  // Call 2 from API key B (same payment_id)
  const decisionB = checkStructuring('create_refund', { payment_id: 'pay_cross', amount: 1000000 }, state, mockConfig);
  // We DO catch it because we don't partition by API key.
  assert.strictEqual(decisionB.type, 'REQUIRE_APPROVAL');
});

test('detector - Window-boundary evasion: (Known Limitation) Calls spaced outside fixed window evade detection', () => {
  const state = new StructuringState();
  const now = Date.now();
  const past = now - (25 * 60 * 60 * 1000); // 25 hours ago

  // Call 1 at t - 25h
  const decision1 = checkStructuring('create_refund', { payment_id: 'pay_window', amount: 1000000 }, state, mockConfig, past);
  assert.strictEqual(decision1.type, 'ALLOW');
  state.record('create_refund', 'pay_window', 1000000, past);

  // Call 2 at now
  const decision2 = checkStructuring('create_refund', { payment_id: 'pay_window', amount: 1000000 }, state, mockConfig, now);
  // The first call was 25h ago, so it's evicted. Total cumulative is 0, so this 10,000 call is ALLOWED.
  assert.strictEqual(decision2.type, 'ALLOW');
});
