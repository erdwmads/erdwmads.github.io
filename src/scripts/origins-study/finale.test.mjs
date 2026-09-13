import test from 'node:test';
import assert from 'node:assert/strict';
import {inheritance} from './scenes.js';
import {fragmentsSeparated,contactDistance} from './fragment-contact.js';
import {fragmentPosition,remnantCenter} from './inheritance-dynamics.js';
test('bound fragments expand then return; unbound fragments escape without fading',()=>{
 const s=inheritance(),parts=s.group.userData.fragments;
 for(const p of parts){
  if(p.preserved){const far=fragmentPosition(p,.47+p.delay);assert(far.length()>p.start.length(),'Expansion is relative to the disrupted parent, not the future remnant');assert(far.distanceTo(remnantCenter)>fragmentPosition(p,1).distanceTo(remnantCenter));}
  else{let d=0;for(let t=.22;t<=1;t+=.025){const next=fragmentPosition(p,t).distanceTo(remnantCenter);assert(next>=d);d=next;}}
 }
 s.update(1,false);assert(parts.every(p=>p.mesh.visible&&p.mesh.material.opacity===1));
 const kept=parts.filter(p=>p.preserved);assert(kept.length>5);
 for(let i=0;i<kept.length;i++)for(let j=i+1;j<kept.length;j++)assert(fragmentsSeparated(kept[i].shape,kept[i].target,kept[j].shape,kept[j].target),'Final fragment supports do not overlap');
 const linked=new Set([0]);let changed=true;while(changed){changed=false;for(let i=0;i<kept.length;i++)if(linked.has(i))for(let j=0;j<kept.length;j++)if(!linked.has(j)){const d=kept[j].target.clone().sub(kept[i].target),gap=d.length()-contactDistance(kept[j].shape,kept[i].shape,d.clone().normalize());if(gap<.012){linked.add(j);changed=true;}}}
 assert.equal(linked.size,kept.length,'Every retained fragment belongs to one contact-connected pile');
});
