import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createOrbitBody } from '../src/scripts/planetary-orbit-bodies.js';
import { disposeObject } from '../src/scripts/planetary-renderer.js';

test('orbit shape instances preserve the cached scientific mesh and remain pickable', () => {
  const original = new THREE.Group();
  const sourceMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial());
  original.add(sourceMesh);
  original.scale.setScalar(.5);
  const before = original.scale.clone();
  const body = createOrbitBody('ryugu', 2.05, { shape: original });
  let mesh;
  body.traverse(node => { if (node.isMesh) mesh = node; });
  assert.equal(body.userData.id, 'ryugu');
  assert.equal(mesh.userData.id, 'ryugu');
  assert.equal(mesh.geometry, sourceMesh.geometry);
  assert.notEqual(mesh.material, sourceMesh.material);
  assert.ok(original.scale.equals(before));
  body.updateMatrixWorld(true);
  const hits = new THREE.Raycaster(new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)).intersectObject(body,true);
  assert.equal(hits[0].object.userData.id,'ryugu');
  let disposed = false;
  sourceMesh.geometry.addEventListener('dispose', () => disposed = true);
  disposeObject(body);
  assert.equal(disposed, false, 'Replacing an orbit must not invalidate the Shapes view');
  disposeObject(original, true);
});

test('Earth uses independent surface and cloud layers without disposing shared maps', () => {
  const day = new THREE.Texture(), clouds = new THREE.Texture();
  day.userData.cached = clouds.userData.cached = true;
  const earth = createOrbitBody('earth', 2.05, { day, clouds });
  const meshes = [];
  earth.traverse(node => { if (node.isMesh) meshes.push(node); });
  assert.ok(meshes.some(mesh => mesh.material.map === day));
  assert.ok(meshes.some(mesh => mesh.material.alphaMap === clouds));
  let disposed = false;
  day.addEventListener('dispose', () => disposed = true);
  disposeObject(earth);
  assert.equal(disposed, false);
});

test('Sun has a self-lit surface and Saturn has actual ring geometry', () => {
  const sun = createOrbitBody('sun', 2.05);
  assert.ok(sun.children.some(node => node.material?.isShaderMaterial));
  const saturn = createOrbitBody('saturn', 34);
  let ring = false;
  saturn.traverse(node => { if (node.geometry?.type === 'RingGeometry') ring = true; });
  assert.equal(ring, true);
});
