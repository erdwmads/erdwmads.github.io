import test from 'node:test';
import assert from 'node:assert/strict';
import {Raycaster,Vector3} from 'three';
import {accretion,alteration,inheritance} from './scenes.js';
test('the completed grain cloud includes continuous fine material across its interior',()=>{
 const s=accretion();s.update(1,false);s.group.updateMatrixWorld(true);
 const support=s.group.getObjectByName('aggregate-fine-material');assert(support);
 const ray=new Raycaster();let hits=0,total=0;
 for(let x=-.8;x<=.8;x+=.16)for(let y=-.6;y<=.6;y+=.15){ray.set(new Vector3(x,y,4),new Vector3(0,0,-1));total++;if(ray.intersectObject(support)[0])hits++;}
 assert(hits/total>.96,'Final body must read as a continuous body, not a cloud of isolated beads');
});
test('minor phases are regionally heterogeneous while the modal budget stays constrained',()=>{
 const s=alteration(),a=s.group.userData.modalAtlas,bins=Array.from({length:6},()=>({carb:0,n:0}));
 a.ids.forEach((id,i)=>{if(id>5)return;const x=i%a.width,y=Math.floor(i/a.width),b=bins[Math.min(2,Math.floor(x/a.width*3))+3*Math.min(1,Math.floor(y/a.height*2))];b.n++;if(id===3)b.carb++;});
 const ratios=bins.map(b=>b.carb/b.n);assert(Math.max(...ratios)>Math.min(...ratios)*3,'Different lithic domains must not have the same uniform sprinkling');
});
test('process view does not paint half the parent one colour and the other half another',()=>{
 const s=inheritance();s.update(.1,true);const colours=new Set(s.group.userData.fragments.map(p=>p.mesh.material.color.getHex()));assert.equal(colours.size,1);
});

test('settling surfaces fit their buffers through the entire late assembly interval',()=>{
 const s=inheritance();for(let t=.82;t<=1.001;t+=.012){s.update(Math.min(1,t),false);const m=s.group.getObjectByName('remnant-fine-material');assert(m.count<=m.geometry.attributes.position.count);}
});
