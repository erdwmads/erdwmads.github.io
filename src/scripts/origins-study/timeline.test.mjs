import test from 'node:test';
import assert from 'node:assert/strict';
import {clamp, evolution} from './timeline.mjs';

test('melting precedes reaction, cooling precedes late destruction', () => {
  assert.equal(evolution(0).liquid, 0);
  assert.ok(evolution(.3).liquid > 0);
  assert.equal(evolution(.15).reaction, 0);
  assert.ok(evolution(.6).reaction > .5);
  assert.equal(evolution(1).liquid, 0);
  assert.equal(evolution(1).reaction, 1);
});
test('timeline is reversible and bounded without accumulated frame state', () => {
  const saved = JSON.stringify(evolution(.56));
  evolution(.95); evolution(.02);
  assert.equal(JSON.stringify(evolution(.56)), saved);
  assert.equal(clamp(-4), 0); assert.equal(clamp(8), 1);
});
