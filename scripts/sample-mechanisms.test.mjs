import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSpacecraft } from '../src/scripts/sample-missions/spacecraft.js';
import * as spacecraft from '../src/scripts/sample-missions/spacecraft.js';
import { loadNasaGeometry } from './nasa-geometry-fixture.mjs';
const bounds = object => { object.updateMatrixWorld(true); return new THREE.Box3().setFromObject(object); };

test('Hayabusa2 folds the actual solar hardware and restores its deployed span', async () => {
  const craft = await createSpacecraft('hayabusa2');
  const deployed = bounds(craft.group), tip = craft.samplerTip.clone();
  craft.setSolarDeployment(0);
  const packed = bounds(craft.group);
  assert.ok(packed.getSize(new THREE.Vector3()).x < 1.6);
  assert.ok(packed.max.y < 1.1, 'outer panels must accordion-fold alongside the bus');
  craft.setSolarDeployment(1);
  assert.ok(bounds(craft.group).equals(deployed));
  assert.ok(craft.samplerTip.equals(tip));
});

test('NASA array folding preserves the mesh and stowage captures the head before closing the real SRC lid', async () => {
  const model = await loadNasaGeometry();
  const sourceMaterials = new Set();
  let sourceTriangles = 0;
  model.traverse(object => { if (object.isMesh) { sourceMaterials.add(object.material); sourceTriangles += object.geometry.index.count / 3; } });
  const craft = spacecraft.assembleOsirisRex(model);
  let assembledTriangles = 0;
  craft.group.traverse(object => { if (object.isMesh && sourceMaterials.has(object.material)) assembledTriangles += object.geometry.index.count / 3; });
  assert.equal(assembledTriangles, sourceTriangles, 'hinges must retain every NASA source triangle');
  const closedCapsule = bounds(craft.capsule).clone();
  craft.setSolarDeployment(1);
  const deployed = bounds(craft.group);
  craft.setSolarDeployment(0);
  assert.ok(bounds(craft.group).getSize(new THREE.Vector3()).x < 1.65);
  craft.setSolarDeployment(1);
  assert.ok(bounds(craft.group).equals(deployed));
  craft.setSampling(1);
  const head = craft.group.getObjectByName('tagsam-collector-head');
  const wrist = craft.group.getObjectByName('tagsam-wrist');
  const lid = craft.group.getObjectByName('src-lid-hinge');
  const samplingHead = head.getWorldPosition(new THREE.Vector3());
  const arm = craft.group.getObjectByName('illustrative-deployed-tagsam');
  const links = arm.children.filter(object => object.isMesh && object.geometry.parameters.radiusTop === .034);
  craft.setStowage(0);
  const lengths = links.map(link => link.scale.y);
  for (let step = 0; step <= 100; step++) {
    craft.setStowage(step / 100);
    links.forEach((link, index) => assert.ok(Math.abs(link.scale.y - lengths[index]) < 1e-8, 'rigid arm links must not telescope'));
  }
  craft.setStowage(.58);
  craft.group.updateMatrixWorld(true);
  const captured = head.getWorldPosition(new THREE.Vector3());
  assert.ok(Math.abs(captured.x) < .03 && Math.abs(captured.z) < .03);
  assert.ok(captured.y > .27 && captured.y < .4);
  assert.ok(Math.abs(lid.rotation.z) > 1);
  craft.setStowage(.8);
  craft.group.updateMatrixWorld(true);
  assert.ok(head.getWorldPosition(new THREE.Vector3()).distanceTo(captured) < 1e-9);
  assert.ok(wrist.getWorldPosition(new THREE.Vector3()).distanceTo(captured) > .2);
  assert.equal(head.parent, craft.capsule);
  craft.setStowage(1);
  assert.equal(lid.rotation.z, 0);
  assert.ok(bounds(craft.capsule).equals(closedCapsule));
  craft.setSampling(1);
  craft.setStowage(0);
  craft.group.updateMatrixWorld(true);
  assert.ok(head.getWorldPosition(new THREE.Vector3()).distanceTo(samplingHead) < 1e-9);
  assert.equal(lid.rotation.z, 0);
  assert.equal(head.parent, arm);
  const contact = bounds(head).min.y;
  assert.ok(Math.abs(contact - craft.samplerTip.y) < .001);
});


test('stowage camera retains the collector throughout the full arm movement', async () => {
 const {missionShot}=await import('../src/scripts/sample-missions/camera.js');
 const craft=spacecraft.assembleOsirisRex(await loadNasaGeometry());
 for(const aspect of [1,1.9])for(let i=0;i<=100;i++){
  const p=i/100;craft.setStowage(p);craft.group.rotation.y=-.2+p*.25;craft.group.updateMatrixWorld(true);
  const shot=missionShot('stow',p,'osiris-rex',aspect),camera=new THREE.PerspectiveCamera(shot.fov,aspect,.05,150);
  camera.position.set(...shot.position);camera.lookAt(new THREE.Vector3(...shot.target));camera.updateMatrixWorld();
  const head=craft.group.getObjectByName('tagsam-collector-head').getWorldPosition(new THREE.Vector3()).project(camera);
  assert(Math.abs(head.x)<.92&&Math.abs(head.y)<.92,'collector in frame at '+p+' / '+aspect);
 }
});
