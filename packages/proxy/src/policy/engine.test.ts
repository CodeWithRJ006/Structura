import test from 'node:test';
import assert from 'node:assert';
import { evaluate } from './engine';
import { PolicyConfig } from './schema';

const mockPolicy: PolicyConfig = {
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

test('engine - exact match under threshold (ALLOW)', () => {
  const result = evaluate('create_refund', { amount: 1000000 }, mockPolicy);
  assert.deepStrictEqual(result, { type: 'ALLOW' });
});

test('engine - exact match over threshold with require_approval action', () => {
  const result = evaluate('create_refund', { amount: 2000000 }, mockPolicy);
  assert.strictEqual(result.type, 'REQUIRE_APPROVAL');
  if (result.type === 'REQUIRE_APPROVAL') {
    assert.match(result.reason, /Approval required/);
  }
});

test('engine - exact match over threshold with deny action', () => {
  const result = evaluate('capture_payment', { amount: 6000000 }, mockPolicy);
  assert.strictEqual(result.type, 'DENY');
  if (result.type === 'DENY') {
    assert.match(result.reason, /Denied/);
  }
});

test('engine - missing/malformed amount field', () => {
  const result1 = evaluate('create_refund', {}, mockPolicy);
  assert.strictEqual(result1.type, 'DENY');

  const result2 = evaluate('create_refund', { amount: "100" }, mockPolicy);
  assert.strictEqual(result2.type, 'DENY');
});

test('engine - no matching rule with a default "*" present', () => {
  const result = evaluate('some_other_tool', {}, mockPolicy);
  assert.deepStrictEqual(result, { type: 'ALLOW' });
});

test('engine - base action deny', () => {
  const result = evaluate('always_deny', {}, mockPolicy);
  assert.strictEqual(result.type, 'DENY');
});

test('engine - no matching rule and no default (fail-closed DENY)', () => {
  const strictPolicy: PolicyConfig = {
    version: 1,
    rules: [
      { tool: 'specific_tool', action: 'allow' }
    ]
  };
  const result = evaluate('unknown_tool', {}, strictPolicy);
  assert.strictEqual(result.type, 'DENY');
  if (result.type === 'DENY') {
    assert.match(result.reason, /No matching policy/);
  }
});
