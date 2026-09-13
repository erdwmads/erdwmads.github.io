import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { assembleOsirisRex } from '../src/scripts/sample-missions/spacecraft.js';
import { loadNasaGeometry } from './nasa-geometry-fixture.mjs';

const bounds = object => {
  object.updateWorldMatrix(true, true);
  return new THREE.Box3().setFromObject(object, true);
};
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} != ${expected}`);

test('TAGSAM collector diameter matches the 30.5 cm specification at the 6.2 m NASA span', async () => {
  // https://asteroidmission.org/objectives/spacecraft/
  const craft = assembleOsirisRex(await loadNasaGeometry());
  craft.setSampling(1);
  const span = bounds(craft.group).getSize(new THREE.Vector3()).x;
  const size = bounds(craft.samplingHead).getSize(new THREE.Vector3());
  near(size.x / span * 6.2, .305, 'collector diameter in metres');
  near(size.z, size.x, 'circular horizontal envelope');
  near(bounds(craft.samplingHead).min.y, craft.samplerTip.y, 'touchdown anchor');
  near(size.y, .1125, 'unchanged vertical envelope');
});

test('capture fittings follow the collector width while retaining their vertical seat', async () => {
  const craft = assembleOsirisRex(await loadNasaGeometry());
  craft.setStowage(.7);
  const headSize = bounds(craft.samplingHead).getSize(new THREE.Vector3());
  const ring = craft.group.getObjectByName('src-capture-ring');
  const ringBounds = bounds(ring);
  near(ringBounds.getSize(new THREE.Vector3()).x / headSize.x, .292 / .27, 'capture ring clearance ratio');
  near(ringBounds.min.y, .29 - .009 * Math.sqrt(3) / 2, 'capture ring lower seat');
  near(ringBounds.max.y, .29 + .009 * Math.sqrt(3) / 2, 'capture ring upper seat');
  const latches = craft.capsule.children.filter(part => part.name === 'src-capture-latch');
  assert.equal(latches.length, 3);
  for (const latch of latches) {
    const size = bounds(latch).getSize(new THREE.Vector3());
    near(Math.hypot(latch.position.x, latch.position.z) / headSize.x, .143 / .27, 'latch radial alignment');
    near(size.x / headSize.x, .025 / .27, 'latch width ratio');
    near(size.z, size.x, 'latch horizontal aspect');
    near(size.y, .03, 'latch height');
    near(latch.position.y, .304, 'latch seat');
  }
  near(bounds(craft.samplingHead).min.y, .28, 'stowed head lower seat');
  craft.setSampling(1);
  near(bounds(craft.samplingHead).min.y, craft.samplerTip.y, 'touchdown restored after stowage');
});
