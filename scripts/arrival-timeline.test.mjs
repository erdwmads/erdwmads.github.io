import test from 'node:test';
import assert from 'node:assert/strict';
import { arrivalProgress } from '../src/scripts/arrival/timeline.js';

test('arrival clock has exact endpoints, stays monotonic, and eases both ends', () => {
  assert.equal(arrivalProgress(0), 0);
  assert.equal(arrivalProgress(1), 1);
  let previous = 0;
  for (let i = 1; i <= 1000; i++) {
    const p = arrivalProgress(i / 1000);
    assert.ok(p >= previous && p <= 1);
    previous = p;
  }
  const speed = t => (arrivalProgress(t + .001) - arrivalProgress(t)) / .001;
  assert.ok(speed(.4) > speed(.02) * 3);
  assert.ok(speed(.4) > speed(.97) * 3);
  for (let i = 1; i < 999; i++) assert.ok(Math.abs(speed(i / 1000) - speed((i - 1) / 1000)) < .02);
});
