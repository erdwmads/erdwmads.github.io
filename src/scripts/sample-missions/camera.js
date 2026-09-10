import {smooth,mix,clampProgress,samplingClearance} from './motion.js';
const blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],smooth(t)));
// Exponential response preserves the established 60 fps feel at any frame rate.
export const cameraDamping=seconds=>1-Math.pow(.88,Math.max(0,seconds)*60);
export function missionShot(kind,p,id,aspect=1.8){
 p=clampProgress(p);let position,target,fov=36;
 if(kind==='cruise'||kind==='outbound'){position=blend([5.4,6.3,8.2],[4,5.5,8.6],p);target=[0,0,0];fov=38;}
 else if(kind==='sample'){
  const h=samplingClearance(p),approach=smooth(p/.46),retreat=smooth((p-.57)/.43);
  const angle=mix(.72,.5,approach)-.08*retreat,distance=6.3+h*1.15;
  position=[Math.sin(angle)*distance,2.65+h*.75,Math.cos(angle)*distance];target=[0,.95+h*.58,0];fov=38;
 }else if(kind==='impact'){position=blend([5.6,4.4,7.3],[3.6,3.0,5.6],p);target=[0,p<.4?mix(2.7,.2,smooth(p/.4)):.2,0];}
 else if(kind==='stow'){const close=smooth((p-.08)/.4);position=blend([3.4,1.5,4.8],[2.4,2.9,3.9],close);target=blend([0,-.4,0],[0,.15,0],close);fov=mix(38,34,close);}
 else throw new RangeError(`${kind} requires its dedicated camera`);
 // Preserve horizontal clearance for the solar arrays on a portrait display.
 const framing=Math.max(1,Math.min(['cruise','outbound'].includes(kind)?1.9:1.55,1.25/aspect));
 position=position.map((v,i)=>target[i]+(v-target[i])*framing);
 return {position,target,fov};
}
