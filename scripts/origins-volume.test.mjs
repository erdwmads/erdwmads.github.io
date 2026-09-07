import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOriginsScene as createScene} from '../src/scripts/planetary-origins.js';
import {originVolume} from '../src/scripts/origins-volume-data.js';
const createOriginsScene=(id,light)=>createScene(id,light,originVolume);
import {disposeObject} from '../src/scripts/planetary-renderer.js';

test('The same matched parent pieces survive alteration, break apart and reassemble exactly',()=>{
  const scene=createOriginsScene('orgueil');
  const pieces=scene.group.getObjectByName('origin-pieces');
  assert.ok(pieces,'Parent body must consist of matched pieces, not an unrelated debris stand-in');
  assert.ok(pieces.children.length>=10);
  const snapshot=()=>pieces.children.map(p=>[...p.position.toArray(),...p.quaternion.toArray(),...p.scale.toArray()]);
  scene.update(.7499,.85);const before=snapshot();
  scene.update(.75,.85);const boundary=snapshot();
  assert.ok(before.flat().every((v,i)=>Math.abs(v-boundary.flat()[i])<.005));
  const geometry=pieces.children.map(p=>p.children[0].geometry);
  scene.update(.85,.85);const broken=snapshot();
  assert.notDeepEqual(broken,boundary);
  scene.update(.75,.85);assert.deepEqual(snapshot(),boundary);
  assert.deepEqual(pieces.children.map(p=>p.children[0].geometry),geometry);
  scene.update(1,.85);
  const fragment=scene.group.getObjectByName('origin-fragment');
  assert.ok(pieces.children.includes(fragment),'Survivor is an original parent piece');
  scene.group.updateMatrixWorld(true);
  const center=new THREE.Box3().setFromObject(fragment.children[0]).getCenter(new THREE.Vector3());
  assert.ok(center.length()<.35,'Surviving specimen stays in the inspection centre');
  disposeObject(scene.group);
});

test('Carbonate inspection points to an embedded aggregate and cutaway geometry has volume',()=>{
  const scene=createOriginsScene('orgueil');scene.update(.65,.85);
  assert.equal(typeof scene.inspectionTarget,'function');
  const target=scene.inspectionTarget();
  assert.ok(target?.isObject3D);
  const box=new THREE.Box3().setFromObject(target),size=box.getSize(new THREE.Vector3());
  assert.ok(size.x>.08&&size.y>.08&&size.z>.04);
  assert.ok(scene.group.getObjectById(target.id));
  scene.update(.4,.85);assert.equal(scene.inspectionTarget(),null);
  disposeObject(scene.group);
});
