import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {locationFor,earthPoint,missionLocations,hasEarthContext} from './geography.js';

test('Earth coordinates match equirectangular globe orientation and mission regions',()=>{
 assert(earthPoint(0,0).distanceTo(new T.Vector3(1,0,0))<1e-10);
 assert(earthPoint(0,90).distanceTo(new T.Vector3(0,0,-1))<1e-10);
 assert(earthPoint(90,0).distanceTo(new T.Vector3(0,1,0))<1e-10);
 assert(locationFor('hayabusa2','launch').lat>30&&locationFor('hayabusa2','launch').lon>130);
 assert(locationFor('hayabusa2','landing').lat<0&&locationFor('hayabusa2','landing').lon>130);
 assert(locationFor('osiris-rex','launch').lon< -80&&locationFor('osiris-rex','launch').lat<30);
 assert(locationFor('osiris-rex','landing').lon< -110&&locationFor('osiris-rex','landing').lat>40);
});
test('Earth chapters retain launch and recovery region routing',()=>{
 for(const id of Object.keys(missionLocations)){
  assert.equal(locationFor(id,'launch'),missionLocations[id].launch);
  assert.equal(locationFor(id,'return'),missionLocations[id].landing);
  assert.equal(locationFor(id,'landing'),missionLocations[id].landing);
 }
 for(const kind of ['launch','return','landing'])assert(hasEarthContext(kind));
 for(const kind of ['sample','cruise','rendezvous'])assert(!hasEarthContext(kind));
});
