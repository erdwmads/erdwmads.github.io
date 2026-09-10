import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSciProjectile} from './sci.js';
import {sciLayout,sciFlight} from './motion.js';
import {missionShot} from './camera.js';
import {createSamplingTerrain} from './terrain.js';
test('SCI contact marker lies on the rendered pre-impact triangle surface',()=>{
 const terrain=createSamplingTerrain('hayabusa2'),surface=terrain.group.getObjectByName('sampling-surface'),marker=terrain.markers.sciImpact;
 surface.updateMatrixWorld(true);
 const hit=new T.Raycaster(new T.Vector3(marker.x,10,marker.z),new T.Vector3(0,-1,0)).intersectObject(surface,false)[0];
 assert(Math.abs(hit.point.y-marker.y)<1e-7,'contact marker must use triangulated surface, not analytic approximation');
});
test('SCI uses a hollow deformed copper shell of the sourced 13 cm diameter',()=>{
 const projectile=createSciProjectile(),bounds=new T.Box3().setFromObject(projectile);
 assert(Math.abs(bounds.getSize(new T.Vector3()).x/sciLayout.unitsPerMeter-.13)<1e-6);
 assert.equal(projectile.material.side,T.DoubleSide);
 assert(projectile.geometry.parameters.thetaStart>0,'open trailing side reveals the hollow shell');
 assert(Math.abs(bounds.min.y+projectile.userData.contactOffset)<1e-7);
});
test('SCI initial flight stays in frame through impact in portrait and landscape',()=>{
 for(const aspect of [.7,1,1.9])for(const p of [0,.1,.2,.3,.399]){
  const shot=missionShot('impact',p,'hayabusa2',aspect),view=new T.PerspectiveCamera(shot.fov,aspect,.05,150);
  view.position.set(...shot.position);view.lookAt(...shot.target);view.updateMatrixWorld();
  const point=new T.Vector3(0,sciFlight(p).height-1,sciLayout.crater[2]).project(view);
  assert(Math.abs(point.x)<.9&&Math.abs(point.y)<.9,'projectile must remain framed');
 }
});
