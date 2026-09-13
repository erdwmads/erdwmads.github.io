import * as T from 'three';
import {ConvexHull} from 'three/addons/math/ConvexHull.js';
import {writeFileSync,readFileSync} from 'node:fs';
import {inheritance} from '../src/scripts/origins-study/scenes.js';
import {rng} from '../src/scripts/origins-study/materials.js';
// Offline only: sample the spaces around the authored coarse supports.
// This seed stream preserves the original 64-fragment scene's sampled positions.
const parts=inheritance().group.userData.fragments,random=rng(65);
for(let i=0;i<64*7;i++)random();
const kept=parts.filter(p=>p.preserved),vertices=kept.flatMap(p=>p.shape.vertices.map(v=>v.clone().add(p.target)));
const hull=new ConvexHull().setFromPoints(vertices),bounds=new T.Box3().setFromPoints(vertices);
const coarse=kept.map(p=>new ConvexHull().setFromPoints(p.shape.vertices.map(v=>v.clone().add(p.target))));
const meshes=kept.map(p=>{const m=new T.Mesh(p.mesh.geometry,p.mesh.material);m.position.copy(p.target);m.morphTargetInfluences[0]=1;m.updateMatrixWorld(true);return m;});
const ray=new T.Raycaster(),targets=[];
for(let i=0;i<3000;i++){
 const size=.010+random()**2*.045;for(let j=0;j<6;j++)random();
 const direction=new T.Vector3(random()-.5,random()-.5,random()-.5).normalize();
 ray.set(direction.clone().multiplyScalar(6).add(new T.Vector3(-1.25,-.12,0)),direction.clone().negate());
 const hit=ray.intersectObjects(meshes,false)[0],target=hit?hit.point.clone().addScaledVector(hit.face.normal,-size*.2):kept[0].target.clone();
 if(i<2400&&i%5!==0)for(let attempt=0;attempt<180;attempt++){
  const p=new T.Vector3(bounds.min.x+random()*(bounds.max.x-bounds.min.x),bounds.min.y+random()*(bounds.max.y-bounds.min.y),bounds.min.z+random()*(bounds.max.z-bounds.min.z));
  if(hull.containsPoint(p)&&!coarse.some(h=>h.containsPoint(p))){target.copy(p);break;}
 }
 targets.push(target.toArray().map(v=>Number(v.toFixed(6))));random();random();
}
const text='// Authored interstitial positions, baked from the coarse fragment geometry.\nexport const fineSettlingTargets='+JSON.stringify(targets)+';\n';
const file=new URL('../src/scripts/origins-study/fine-settling-targets.js',import.meta.url);
if(process.argv.includes('--check')){if(readFileSync(file,'utf8')!==text)throw new Error('Fine settling targets need regeneration');console.log('Fine settling targets match the sampler');}
else{writeFileSync(file,text);console.log('Wrote '+targets.length+' fine-fragment targets');}
