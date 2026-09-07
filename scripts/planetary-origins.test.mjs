import test from 'node:test';
import assert from 'node:assert/strict';
import {originStage, originStages, originBranch} from '../src/scripts/origins-content.js';
import {createOriginsScene as createScene} from '../src/scripts/planetary-origins.js';
import {originVolume} from '../src/scripts/origins-volume-data.js';
const createOriginsScene=(id,light)=>createScene(id,light,originVolume);
import {encodeObservation,decodeObservation} from '../src/scripts/planetary-view-link.js';
import {disposeObject} from '../src/scripts/planetary-renderer.js';
import * as THREE from 'three';

test('Origins keeps four bounded stages and distinct evidence branches',()=>{
  assert.equal(originStages.length,4);
  assert.deepEqual([0,.25,.5,.75,1].map(originStage),[0,1,2,3,3]);
  for(const id of ['bennu','ryugu','orgueil']) {
    const branch=originBranch(id);
    assert.ok(branch.description.length>40);
    assert.match(branch.source,/^https:\/\//);
  }
  assert.equal(originBranch('orgueil').view,'sample');
  assert.equal(originBranch('ryugu').view,'shape');
  assert.notEqual(originBranch('ryugu').description,originBranch('bennu').description);
  assert.match(originBranch('orgueil').description,/not identified|unknown/);
});

test('Origins geometry is finite, deterministic and responds without reallocating',()=>{
  for(const id of ['bennu','ryugu','orgueil']) {
    const scene=createOriginsScene(id,false),again=createOriginsScene(id,false);
    const geometries=[];
    scene.group.traverse(node=>{if(node.geometry)geometries.push(node.geometry);});
    assert.ok(geometries.length>10);
    const snapshots=[];
    for(const progress of [0,.2,.35,.5,.65,.8,1]) {
      scene.update(progress,.55);scene.group.updateMatrixWorld(true);
      assert.equal(scene.group.userData.phase,originStage(progress));
      const positions=[];
      scene.group.traverse(node=>{
        assert.ok(node.matrixWorld.elements.every(Number.isFinite));
        if(node.geometry)assert.ok([...node.geometry.attributes.position.array].every(Number.isFinite));
        if(node.isInstancedMesh)positions.push(...node.instanceMatrix.array.slice(0,32));
      });
      snapshots.push(JSON.stringify(positions));
    }
    assert.ok(new Set(snapshots).size>3);
    scene.update(.3,.2);again.update(.3,.2);
    const matrices=s=>{const out=[];s.group.traverse(n=>{if(n.isInstancedMesh)out.push([...n.instanceMatrix.array]);});return out;};
    assert.deepEqual(matrices(scene),matrices(again));
    scene.update(.65,0);scene.update(.65,1);
    const after=[];scene.group.traverse(n=>{if(n.geometry)after.push(n.geometry);});
    assert.deepEqual(after,geometries);
  }
});

test('Origins links round-trip exact public state and reject invalid progression',()=>{
  const state={view:'origins',material:'orgueil',originProgress:.625,originCutaway:.55};
  assert.deepEqual(decodeObservation(new URL(encodeObservation(state,'https://example.org/research.html')).hash),state);
  for(const field of ['originProgress','originCutaway'])for(const value of [-.1,1.1,NaN,Infinity,'']) {
    assert.throws(()=>encodeObservation({...state,[field]:value},'https://example.org/'));
  }
  assert.equal(decodeObservation('#observe=1&view=origins&originProgress=2'),null);
});

test('Replacing an Origins scene releases instance buffers as well as geometry',()=>{
  const {group}=createOriginsScene('orgueil');
  let instances=0,disposed=0;
  group.traverse(node=>{if(node.isInstancedMesh){instances++;node.addEventListener('dispose',()=>disposed++);}});
  disposeObject(group);
  assert.ok(instances>=3);
  assert.equal(disposed,instances);
});

test('Cutaway has volumetric cavity walls and carbonate aggregates have varied orientations',()=>{
  const scene=createOriginsScene('orgueil');scene.update(.65,.85);
  const pieces=scene.group.getObjectByName('origin-pieces');
  assert.ok(pieces,'Interior belongs to the matched parent volume');
  assert.ok(originVolume.chunks.some(chunk=>chunk.kinds.includes(2)),'Cavities are actual boolean surfaces');
  for(const piece of pieces.children) {
    const box=new THREE.Box3().setFromBufferAttribute(piece.children[0].geometry.attributes.position),size=box.getSize(new THREE.Vector3());
    assert.ok(Math.min(size.x,size.y,size.z)>.1,'Each fracture piece has physical thickness');
  }
  const crystals=scene.group.getObjectByName('origin-carbonates');
  assert.ok(crystals.children.length>=3);
  for(const aggregate of crystals.children) {
    assert.ok(aggregate.children.length>=4);
    assert.ok(new Set(aggregate.children.map(n=>n.quaternion.toArray().join(','))).size>=4,'Intergrown crystals are not a repeated cube grid');
  }
  disposeObject(scene.group);
});

test('Fragmentation retains the same parent at constant scale throughout breakup',()=>{
  const scene=createOriginsScene('orgueil');
  const body=scene.group.getObjectByName('origin-body');
  assert.ok(body);
  scene.update(.7499,.85);const size=body.scale.x;
  scene.update(.75,.85);
  assert.equal(body.visible,true);
  assert.ok(Math.abs(body.scale.x-size)<.005);
  scene.update(.77,.85);assert.equal(body.scale.x,size);
  scene.update(.84,.85);assert.equal(body.visible,true);
  disposeObject(scene.group);
});

test('Interior visibility is reversible without moving or shrinking the exterior',()=>{
  const scene=createOriginsScene('orgueil'),pieces=scene.group.getObjectByName('origin-pieces');
  scene.update(.49999,.85);const original=pieces.children.map(p=>p.scale.x);
  scene.update(.5,.85);assert.deepEqual(pieces.children.map(p=>p.scale.x),original);
  for(let i=0;i<=100;i++) {
    scene.update(.65,i/100);const cover=pieces.children[10];
    assert.equal(cover.scale.x,1);assert.equal(cover.visible,i===0);
    assert.deepEqual(cover.position.toArray(),cover.userData.rest.toArray());
  }
  scene.update(.65,0);assert.deepEqual(pieces.children.map(p=>p.scale.x),original);
  disposeObject(scene.group);
});

test('Offline fracture meshes have complete material coverage and valid index ranges',()=>{
  for(const chunk of originVolume.chunks) {
    assert.equal(chunk.indices.length,chunk.kinds.length*3);
    assert.ok(chunk.indices.every(i=>i>=0&&i<chunk.vertices.length/6));
    assert.ok(chunk.kinds.every(k=>[0,1,2].includes(k)));
    assert.ok(chunk.kinds.includes(0)&&chunk.kinds.includes(1));
  }
});

test('Final fragment stays near the inspection centre and debris has varied proportions',()=>{
  const scene=createOriginsScene('orgueil');scene.update(1,.85);
  const hero=scene.group.getObjectByName('origin-fragment'),debris=scene.group.getObjectByName('origin-debris');
  assert.ok(hero&&debris);
  assert.ok(hero.position.length()<.25,'The surviving fragment must not fly towards the camera');
  const scale=new THREE.Vector3(),rotation=new THREE.Quaternion(),position=new THREE.Vector3(),matrix=new THREE.Matrix4(),ratios=new Set();
  for(let i=0;i<debris.count;i++) {
    debris.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);
    ratios.add((scale.x/scale.y).toFixed(2));
  }
  assert.ok(ratios.size>10,'Fragments must not all be identically proportioned pebbles');
  disposeObject(scene.group);
});
