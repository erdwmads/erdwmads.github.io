import {rng} from './materials.js';
import {smooth} from './timeline.mjs';
const mix=(a,b,t)=>a+(b-a)*t;
export function growthPopulation(){
 const random=rng(3204),groups=[],packing=[],bins=new Map();
 for(let i=0;i<32;i++){
  const a=i*2.399963,r=.55+.42*random(),z=(random()-.5)*1.4;
  groups.push({target:[Math.cos(a)*r,z,Math.sin(a)*r],start:[Math.cos(a)*(2.8+random()),z*1.7,Math.sin(a)*(2.5+random())],delay:random()*.09});
 }
 // Seeded exclusion packing gives an irregular aggregate, without crystal-lattice rows.
 const radii=Array.from({length:2048},()=>.034+random()*.024).sort((a,b)=>b-a),cell=.17;
 for(const radius of radii){
  let candidate;
  for(let attempt=0;attempt<30000;attempt++){
   const x=(random()-.5)*2.9,y=(random()-.5)*2.4,z=(random()-.5)*2.65;
   const edge=1+.08*Math.sin(x*4+z*3)*Math.cos(y*4);
   if((x/1.45)**2+(y/1.2)**2+(z/1.325)**2>edge)continue;
   const bx=Math.floor(x/cell),by=Math.floor(y/cell),bz=Math.floor(z/cell);let clear=true;
   for(let dx=-1;dx<=1&&clear;dx++)for(let dy=-1;dy<=1&&clear;dy++)for(let dz=-1;dz<=1&&clear;dz++){
    for(const other of bins.get(`${bx+dx},${by+dy},${bz+dz}`)||[])if(Math.hypot(x-other.target[0],y-other.target[1],z-other.target[2])<(radius+other.radius)*1.32){clear=false;break;}
   }
   if(clear){candidate={target:[x,y,z],radius};const key=`${bx},${by},${bz}`;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(candidate);break;}
  }
  if(!candidate)throw new Error('The grain packing could not retain all constituent grains');
  packing.push(candidate);
 }
 const grains=packing.map((p,i)=>{
  let closest=0,d=Infinity;groups.forEach((g,j)=>{const q=g.target.reduce((s,v,k)=>s+(v-p.target[k])**2,0);if(q<d){d=q;closest=j;}});
  const g=groups[closest],offset=p.target.map((v,k)=>v-g.target[k]);
  return {group:closest,target:p.target,offset,start:offset.map(v=>v*2.5+(random()-.5)*.32),radius:i%23===0?p.radius*.35:p.radius,turn:random()*6.28,ice:random()<.13,escape:i%23===0};
 });
 return{groups,grains};
}
export function grainPosition(grain,population,t){
 const g=population.groups[grain.group],coagulate=smooth((t-.025-g.delay)/.32),concentrate=smooth((t-.40-g.delay)/.48);
 const center=g.start.map((v,k)=>mix(v,g.target[k],concentrate));
 const local=grain.start.map((v,k)=>mix(v,grain.offset[k],coagulate));
 const p=center.map((v,k)=>v+local[k]);
 if(grain.escape){const age=Math.max(0,t-.3),length=Math.hypot(...g.start);for(let k=0;k<3;k++)p[k]+=g.start[k]/length*age*8;}
 return p;
}
