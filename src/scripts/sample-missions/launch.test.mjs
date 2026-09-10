import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createLaunchVehicle} from './launch.js';

for(const id of ['hayabusa2','osiris-rex']){
 test(`${id}: staging is reversible and payload release is continuous`,()=>{
  const vehicle=createLaunchVehicle(id);
  const snapshot=()=>{const result=[];vehicle.group.traverse(o=>result.push([o.name,o.visible,...o.position.toArray(),...o.quaternion.toArray()]));return result;};
  vehicle.update(.3);const before=snapshot();
  vehicle.update(.9);vehicle.update(.3);assert.deepEqual(snapshot(),before);
  const boosters=vehicle.group.children.filter(o=>o.name.startsWith('solid-booster'));
  assert.equal(boosters.length,id==='hayabusa2'?2:1);
  const halves=vehicle.group.children.filter(o=>o.name.startsWith('fairing-half'));
  assert.equal(halves.length,2);
  vehicle.update(.9);assert.ok(halves[0].position.x*halves[1].position.x<0);
  for(const p of [.32,.55,.6,.68,.8]){
   const a=vehicle.payloadPosition(p-1e-6),b=vehicle.payloadPosition(p+1e-6);
   assert.ok(a.distanceTo(b)<.001);
  }
  for(const p of [0,.3,.7,.9,1]){vehicle.update(p);vehicle.group.traverse(o=>assert.ok([...o.position.toArray(),...o.scale.toArray()].every(Number.isFinite)));}
 });
}

test('published H-IIA fairing separation can precede core staging and coast has no thrust',()=>{
 const vehicle=createLaunchVehicle('hayabusa2');
 const events={boosterSeparation:107,fairingSeparation:251,stageSeparation:404,spacecraftSeparation:6441};
 const state=(elapsedSeconds,engineOn)=>({elapsedSeconds,events,engineOn});
 vehicle.update(.5,state(300,{core:true,boosters:false,upper:false}));
 assert.ok(vehicle.group.getObjectByName('fairing-half-1').position.x>1);
 assert.ok(Math.abs(vehicle.group.getObjectByName('first-stage').position.y)<1e-12);
 vehicle.update(.8,state(2000,{core:false,boosters:false,upper:false}));
 const exhaust=[];vehicle.group.traverse(o=>{if(o.material?.uniforms?.power)exhaust.push(o.material.uniforms.power.value);});
 assert.ok(exhaust.length>0);
 assert.ok(exhaust.every(power=>power===0));
 assert.equal(vehicle.payloadPosition(.95,state(6400,{})).y,2.03);
 assert.ok(vehicle.payloadPosition(.95,state(6501,{})).y>2.9);
});

test('launcher core diameter has the published ratio to the complete airframe height',()=>{
 for(const [id,heightM,diameterM] of [['hayabusa2',53,4],['osiris-rex',189*.3048,12.5*.3048]]){
  const vehicle=createLaunchVehicle(id),bounds=new T.Box3();
  vehicle.group.updateMatrixWorld(true);
  vehicle.group.traverse(o=>{if(o.isMesh&&!o.material?.uniforms?.power)bounds.union(new T.Box3().setFromObject(o));});
  const tank=vehicle.group.getObjectByName('first-stage').children[0];
  const diameter=new T.Box3().setFromObject(tank).getSize(new T.Vector3()).x;
  const modeled=diameter/bounds.getSize(new T.Vector3()).y*heightM;
  assert.ok(Math.abs(modeled-diameterM)<.01,`${id}: modeled ${modeled} m diameter`);
 }
});

test('detached hardware recedes and leaves the spacecraft view before the parking coast',()=>{
 const vehicle=createLaunchVehicle('hayabusa2');
 const events={boosterSeparation:107,fairingSeparation:251,stageSeparation:404,spacecraftSeparation:6441};
 const state=elapsedSeconds=>({elapsedSeconds,events,engineOn:{core:false,boosters:false,upper:false}});
 vehicle.update(.4,state(127));
 const booster=vehicle.group.getObjectByName('solid-booster-1'),near=booster.position.length();
 vehicle.update(.5,state(147));
 assert.ok(booster.position.length()>near*1.5,'spent booster keeps receding after the initial separation');
 vehicle.update(.8,state(2000));
 for(const name of ['solid-booster-1','solid-booster--1','fairing-half-1','fairing-half--1','first-stage']){
  assert.equal(vehicle.group.getObjectByName(name).visible,false,`${name} must leave the coast view`);
 }
 vehicle.update(0,state(0));
 assert.equal(booster.visible,true);
 assert.equal(vehicle.group.getObjectByName('first-stage').visible,true);
});
