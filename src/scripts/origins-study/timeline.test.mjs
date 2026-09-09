import test from 'node:test';
import assert from 'node:assert/strict';
import {clamp, collision, evolution, bodyVolume, IMPACTS} from './timeline.mjs';

test('every incoming body reaches physical contact before incorporation', () => {
  for (const event of IMPACTS) {
    const before = collision(event.time - .001, event);
    const contact = collision(event.time, event);
    assert.ok(before.distance > event.contact);
    assert.equal(contact.distance, event.contact);
    assert.equal(contact.retained, 0);
    assert.ok(collision(event.time + .12, event).retained > .99);
  }
});
test('retained volume does not grow before first collision or shrink', () => {
  assert.equal(bodyVolume(0), bodyVolume(IMPACTS[0].time));
  let last = bodyVolume(0);
  for (let i = 1; i <= 100; i++) {
    const next = bodyVolume(i/100);
    assert.ok(next >= last);
    last = next;
  }
});
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
