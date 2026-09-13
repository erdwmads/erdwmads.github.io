import * as T from 'three';
import {remnantPacking} from './remnant-packing.js';
import {smooth} from './timeline.mjs';
import {contactDistance,fragmentsSeparated} from './fragment-contact.js';
export const remnantCenter=new T.Vector3(-1.25,-.12,0);
export function packRemnant(parts){parts.forEach((part,i)=>{if(part.preserved)part.target=new T.Vector3().fromArray(remnantPacking[i]);});}
// Face-based contacts pack the actual angular fragments into a compact remnant.
// These are authored trajectories, not fitted fragment velocities or an N-body solution.
export function computeRemnantPacking(parts){
 const placed=[];
 for(const part of parts.filter(p=>p.preserved).sort((a,b)=>b.radius-a.radius)){
  let best=null,cost=Infinity;
  if(!placed.length)best=new T.Vector3();
  for(const other of placed)for(let i=0;i<180;i++){
   const z=1-2*(i+.5)/180,a=i*2.399963,r=Math.sqrt(1-z*z);
   const p=new T.Vector3(r*Math.cos(a),z,r*Math.sin(a)).multiplyScalar(contactDistance(part.shape,other.shape,new T.Vector3(r*Math.cos(a),z,r*Math.sin(a)))+.004).add(other.packed);
   if(placed.some(q=>!fragmentsSeparated(part.shape,p,q.shape,q.packed)))continue;
   const c=p.lengthSq()+Math.abs(p.y)*.15;if(c<cost){cost=c;best=p;}
  }
  part.packed=best;placed.push(part);
 }
 const center=placed.reduce((v,p)=>v.add(p.packed),new T.Vector3()).divideScalar(placed.length);
 placed.forEach(p=>{p.target=p.packed.clone().sub(center).add(remnantCenter);});
}
export function fragmentPosition(part,t){
 if(t<=.22)return part.start.clone();
 if(!part.preserved)return part.start.clone().addScaledVector(part.escapeDirection,(t-.22)*22);
 const out=part.start.clone().normalize();
 const far=part.start.clone().addScaledVector(out,1.85+part.delay*1.5);
 const turn=.47+part.delay,arrival=.83+part.delay;
 if(t<turn){const u=(t-.22)/(turn-.22);return part.start.clone().lerp(far,1-(1-u)**2);}
 const u=smooth((t-turn)/(arrival-turn));
 const tangent=new T.Vector3(-out.z,0,out.x).multiplyScalar(.22*Math.sin(Math.PI*u));
 return far.lerp(part.target,u).add(tangent);
}
