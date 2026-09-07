import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOriginsScene} from '../src/scripts/planetary-origins.js';
import {originVolume} from '../src/scripts/origins-volume-data.js';
import {disposeObject} from '../src/scripts/planetary-renderer.js';

test('Interior preference never translates, shrinks or rotates the assembled body pieces',()=>{
  const scene=createOriginsScene('orgueil',false,originVolume),pieces=scene.group.getObjectByName('origin-pieces');
  for(const progress of [.50,.52,.61,.65,.72,.7499])for(const cut of [0,.1,.5,.85,1]) {
    scene.update(progress,cut);
    for(const piece of pieces.children) {
      assert.ok(piece.position.distanceTo(piece.userData.rest)<1e-8,'No hovering lid pieces');
      assert.deepEqual(piece.scale.toArray(),[1,1,1]);
      assert.deepEqual(piece.rotation.toArray().slice(0,3),[0,0,0]);
    }
  }
  disposeObject(scene.group);
});

test('Carbonate aggregate roots touch a real wall on the surviving fragment',()=>{
  const scene=createOriginsScene('orgueil',false,originVolume);scene.update(.72,1);
  const survivor=scene.group.getObjectByName('origin-fragment'),mesh=survivor.children[0],geometry=mesh.geometry,p=geometry.attributes.position,index=geometry.index;
  for(const aggregate of scene.group.getObjectByName('origin-carbonates').children) {
    let distance=Infinity;const closest=new THREE.Vector3();
    for(let i=0;i<index.count;i+=3) {
      const triangle=new THREE.Triangle(...[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index.getX(i+j))));
      if(triangle.getArea()<1e-10)continue;
      triangle.closestPointToPoint(aggregate.position,closest);distance=Math.min(distance,closest.distanceTo(aggregate.position));
    }
    assert.ok(distance<.006,`Root is not floating: wall distance ${distance}`);
  }
  disposeObject(scene.group);
});

test('Orgueil fragment sequence ends with one retained piece and no decorative satellite ring',()=>{
  const scene=createOriginsScene('orgueil',false,originVolume),pieces=scene.group.getObjectByName('origin-pieces');
  scene.update(.94,1);
  assert.deepEqual(pieces.children.filter(p=>p.visible).map(p=>p.name),['origin-fragment']);
  assert.equal(scene.group.getObjectByName('origin-debris').visible,false);
  scene.update(.82,1);const forward=pieces.children.map(p=>p.position.toArray());
  scene.update(.94,1);scene.update(.82,1);assert.deepEqual(pieces.children.map(p=>p.position.toArray()),forward);
  disposeObject(scene.group);
});
