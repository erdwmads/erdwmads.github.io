import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft, createCapsule } from '../src/scripts/sample-missions/spacecraft.js';

test('Hayabusa2 sampler contact stays below every spacecraft component', async () => {
  const craft = await createSpacecraft('hayabusa2');
  craft.setSampling(true);
  craft.group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(craft.group);
  assert.ok(Math.abs(bounds.min.y - craft.samplerTip.y) < 0.01);
  assert.ok(bounds.max.x - bounds.min.x > 3.5);
  assert.ok(craft.capsule.parent);
  assert.equal(craft.group.getObjectByName('ion-engine-cluster').children.length, 5);
  const tip = craft.samplerTip.clone();
  craft.setSampling(false);
  craft.setSampling(true);
  assert.ok(craft.samplerTip.equals(tip));
});

test('return capsules have standalone owned geometry and a 0.35 diameter', () => {
  for (const id of ['hayabusa2', 'osiris-rex']) {
    const capsule = createCapsule(id);
    const bounds = new THREE.Box3().setFromObject(capsule);
    assert.ok(Math.abs(bounds.max.x - bounds.min.x - 0.35) < 0.002);
    assert.equal(capsule.parent, null);
  }
});

test('capsule height-to-diameter ratios match JAXA and NASA specifications', () => {
  for (const [id, ratio] of [['hayabusa2', .2 / .4], ['osiris-rex', .5 / .81]]) {
    const bounds = new THREE.Box3().setFromObject(createCapsule(id));
    const size = bounds.getSize(new THREE.Vector3());
    assert.ok(Math.abs(size.y / size.x - ratio) < .002, id);
    assert.ok(Math.abs(size.z - size.x) < .002, 'axial height correction preserves a circular capsule rim');
    assert.ok(Math.abs(bounds.min.y + .08) < .0001, 'landing contact anchor is retained');
  }
});

test('attached Hayabusa2 capsule is 0.4 m relative to the 6 m deployed span', async () => {
  const craft = await createSpacecraft('hayabusa2');
  const span = new THREE.Box3().setFromObject(craft.group).getSize(new THREE.Vector3()).x;
  const diameter = new THREE.Box3().setFromObject(craft.capsule).getSize(new THREE.Vector3()).x;
  assert.ok(Math.abs(diameter / span * 6 - .4) < .001);
});

test('Hayabusa2 recovery sheds both outer heatshields and exposes the instrument module reversibly', () => {
  const capsule = createCapsule('hayabusa2');
  const module = capsule.getObjectByName('recovered-instrument-module');
  assert.ok(module);
  assert.equal(module.visible, false);
  capsule.userData.setRecovery(1);
  assert.equal(module.visible, true);
  assert.ok(capsule.children.filter(part => part !== module).every(part => !part.visible));
  const bounds = new THREE.Box3().setFromObject(module);
  assert.ok(Math.abs(bounds.min.y + .08) < .0001);
  capsule.userData.setRecovery(0);
  assert.equal(module.visible, false);
  assert.ok(capsule.children.filter(part => part !== module).every(part => part.visible));
});

test('unsupported spacecraft identifiers fail explicitly', async () => {
  await assert.rejects(createSpacecraft('unknown'), /Unknown spacecraft/);
});

test('NASA source has separable capsule primitives and local decoding assets', async () => {
  const { readFile, access } = await import('node:fs/promises');
  const bytes = await readFile(new URL('../public/assets/data/missions/osiris-rex-nasa.glb', import.meta.url));
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)));
  assert.ok(gltf.extensionsRequired.includes('KHR_draco_mesh_compression'));
  const capsuleMaterials = gltf.materials.filter(material => material.name.startsWith('SRC-'));
  assert.equal(capsuleMaterials.length, 3);
  for (const name of ['draco_wasm_wrapper.js', 'draco_decoder.wasm', 'LICENSE.txt']) {
    await access(new URL(`../public/assets/data/missions/draco/${name}`, import.meta.url));
  }
});
