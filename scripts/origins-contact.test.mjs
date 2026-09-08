import test from 'node:test';
import assert from 'node:assert/strict';
import {accretionState,alterationState} from '../src/scripts/origins-process.js';
import {createOriginsScene} from '../src/scripts/planetary-origins.js';
import {originVolume} from '../src/scripts/origins-volume-data.js';
import {disposeObject} from '../src/scripts/planetary-renderer.js';
import {createSurfaceFilm} from '../src/scripts/origins-aqueous.js';
import * as THREE from 'three';

test('wetting films follow the rock surface instead of floating ellipsoids',()=>{
  const surface=new THREE.Object3D();
  const project=p=>({point:new THREE.Vector3(p.x,p.y,p.x*.2),face:{normal:new THREE.Vector3(-.2,0,1).normalize()},object:surface});
  const geometry=createSurfaceFilm(new THREE.Vector3(),.15,project,2);
  const positions=geometry.getAttribute('position');
  assert.ok(positions.count>100);
  for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getZ(i)-positions.getX(i)*.2)<.004);
  assert.equal(geometry.getAttribute('wetRadius').count,positions.count);
  geometry.dispose();
});

test('contact and settling are continuous, reversible, and finish before alteration',()=>{
  for(let index=0;index<12;index++) {
    assert.equal(accretionState(0,index).settled,index===0?1:0);
    assert.equal(accretionState(1,index).settled,1);
    assert.equal(accretionState(1,index).gap,0);
    let previous=accretionState(0,index);
    for(let i=1;i<=1000;i++) {
      const value=accretionState(i/1000,index);
      assert.ok(Object.values(value).every(Number.isFinite));
      assert.ok(value.gap>=0&&value.impact>=0&&value.impact<=1);
      assert.ok(Math.abs(value.gap-previous.gap)<.03);
      previous=value;
    }
  }
});

test('ice loss precedes fluid access, reaction and substantial carbonate growth',()=>{
  const start=alterationState(0),melt=alterationState(.22),wet=alterationState(.45),end=alterationState(1);
  assert.equal(start.ice,1);assert.equal(start.liquid,0);assert.equal(start.reaction,0);assert.equal(start.carbonate,0);
  assert.ok(melt.ice<1&&melt.liquid>0);assert.equal(melt.carbonate,0);
  assert.ok(wet.wetting>melt.wetting&&wet.reaction>melt.reaction);
  assert.equal(end.ice,0);assert.equal(end.liquid,0);assert.equal(end.reaction,1);assert.equal(end.carbonate,1);
});

test('the accreting body does not grow from the centre and retains the same pieces',()=>{
  const scene=createOriginsScene('ryugu',false,originVolume);
  const body=scene.group.getObjectByName('origin-body'),pieces=scene.group.getObjectByName('origin-pieces');
  const geometries=pieces.children.map(p=>p.children[0].geometry);
  for(const progress of [.25,.32,.4,.49,.5]) {
    scene.update(progress,0);
    assert.equal(body.visible,true);assert.equal(body.scale.x,1.35);
    assert.ok(pieces.children.every(piece=>piece.scale.x===1));
  }
  scene.update(.33,0);const before=pieces.children.map(p=>p.position.toArray());
  scene.update(.49,0);assert.notDeepEqual(pieces.children.map(p=>p.position.toArray()),before);
  scene.update(.33,0);assert.deepEqual(pieces.children.map(p=>p.position.toArray()),before);
  assert.deepEqual(pieces.children.map(p=>p.children[0].geometry),geometries);
  assert.ok(scene.group.getObjectByName('origin-impact-dust'));
  for(const piece of pieces.children)if(piece.userData.assemblyRank>0) {
    const contact=.16+piece.userData.assemblyRank*.06;
    scene.update(.25+(contact+.02)/4,0);
    const parent=pieces.children[piece.userData.contactParent];
    assert.equal(accretionState(contact+.02,parent.userData.assemblyRank).gap,0);
    assert.ok(piece.position.distanceTo(piece.userData.rest)<1e-8);
    assert.ok(parent.position.distanceTo(parent.userData.rest)<1e-8);
    for(const bodyPiece of [piece,parent]) {
      const vertices=bodyPiece.children[0].geometry.attributes.position;
      let nearest=Infinity;
      for(let j=0;j<vertices.count;j++)nearest=Math.min(nearest,new THREE.Vector3().fromBufferAttribute(vertices,j).add(bodyPiece.position).distanceTo(piece.userData.contact));
      assert.ok(nearest<.0001,'Ejecta starts on a shared, settled contact vertex');
    }
  }
  scene.update(.52,1);const ice=scene.group.getObjectByName('origin-ice');assert.ok(ice?.visible);
  scene.update(.72,1);assert.equal(ice.visible,false);
  const films=[];pieces.traverse(object=>{if(object.name==='origin-altered-wall')films.push(object);});
  assert.ok(films.length>=9);
  scene.update(.74999,1);const filmPositions=films.map(film=>film.position.toArray());
  scene.update(.75,1);
  assert.ok(films.every(film=>film.visible&&film.parent.userData.rest),'Altered films remain attached at breakup');
  assert.deepEqual(films.map(film=>film.position.toArray()),filmPositions);
  disposeObject(scene.group);
});
