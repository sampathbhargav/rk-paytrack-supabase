import test from 'node:test';
import assert from 'node:assert/strict';
import { containsEventTarget } from '../src/utils/domUtils.js';

test('leaving the document with Window or null never calls Node.contains', () => {
  class Node {}
  const container = { ownerDocument: { defaultView: { Node } }, contains() { throw new Error('Invalid target'); } };
  for (const target of [null, undefined, {}, { window: {} }]) assert.equal(containsEventTarget(container, target), false);
  assert.equal(containsEventTarget(null, new Node()), false);
});
test('moving inside the container retains hover, moving to another node clears it', () => {
  class Node {}
  const inside = new Node(); const outside = new Node();
  const container = { ownerDocument: { defaultView: { Node } }, contains: target => target === inside };
  assert.equal(containsEventTarget(container, inside), true);
  assert.equal(containsEventTarget(container, outside), false);
});
