import {smooth,mix,clampProgress,samplingClearance,sciLayout} from './motion.js';
const blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],smooth(t)));
// Exponential response preserves the established 60 fps feel at any frame rate.
export const cameraDamping=seconds=>1-Math.pow(.88,Math.max(0,seconds)*60);
export function missionShot(kind,p,id,aspect=1.8,stageId=''){
 p=clampProgress(p);let position,target,fov=36;
 const sitePosition=[12,19,27],siteTarget=[0,3,sciLayout.crater[2]/2];
 if(kind==='cruise'||kind==='outbound'){position=[5.4,7.8,9.6];target=[0,0,0];fov=38;}
 else if(kind==='sample'){
  const h=samplingClearance(p),approach=smooth(p/.46),retreat=smooth((p-.57)/.43);
  const angle=mix(.72,.5,approach)-.08*retreat,distance=6.3+h*1.15;
  position=[Math.sin(angle)*distance,2.65+h*.75,Math.cos(angle)*distance];target=[0,.95+h*.58,0];fov=38;
  if(stageId==='touchdown-2'){
   const close=smooth((p-.1)/.3);position=blend(sitePosition,position,close);target=blend(siteTarget,target,close);fov=mix(42,38,close);
  }
 }else if(kind==='impact'){
  const overview=clampProgress((p-.6)/.4),z=sciLayout.crater[2];
  position=blend([10,14,z+20],sitePosition,overview);target=blend([0,4.5,z],siteTarget,overview);fov=mix(38,42,smooth(overview));
 }
 else if(kind==='stow'){const close=smooth((p-.08)/.4);position=blend([3.4,1.5,4.8],[2.4,2.9,3.9],close);target=blend([0,-.4,0],[0,.15,0],close);fov=mix(38,34,close);}
 else throw new RangeError(`${kind} requires its dedicated camera`);
 // Preserve horizontal clearance for the solar arrays on a portrait display.
 const framing=Math.max(1,Math.min(['cruise','outbound'].includes(kind)?1.9:1.55,1.25/aspect));
 position=position.map((v,i)=>target[i]+(v-target[i])*framing);
 return {position,target,fov,...(kind==='impact'||stageId==='touchdown-2'?{maxDistance:64}:{})};
}
