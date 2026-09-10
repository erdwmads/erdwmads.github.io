import {rng,stoneGeometry} from './materials.js';
export function poreLayout(){
  const cavities=[[-.52,.26,.53],[.62,-.48,.37],[.88,.62,.24]];
  const poreRandom=rng(538);
  while(cavities.length<16){const x=(poreRandom()-.5)*3.8,y=(poreRandom()-.5)*2.65,r=.045+Math.pow(poreRandom(),2.2)*.14;if(x*x/3.6+y*y/1.8>.83||cavities.some(([cx,cy,cr])=>Math.hypot(x-cx,y-cy)<r+cr+.035))continue;cavities.push([x,y,r]);}
  const poreGeometries=cavities.map(([, ,r],i)=>{const g=stoneGeometry(601+i,5);g.scale(r*(i%2?1.24:1.12),r*(i%2?.88:1.12),r*.86);g.rotateZ(i*1.6);return g;});
  return {cavities,poreGeometries};
}
