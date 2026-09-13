import {rng,noise} from './materials.js';
// Independent lithic fragments in a continuous fine matrix. Neither the domains
// nor their visible area fraction constitute an observed mineral phase map.
export function sectionRadius(a){return 1+.065*Math.sin(a*3+.6)+.04*Math.cos(a*5-.3)+.025*Math.sin(a*9);}
export function insideSection(x,y){const a=Math.atan2(y/1.40,x/2.17);return Math.hypot(x/2.17,y/1.40)<sectionRadius(a);}
const random=rng(9417),bins=new Map(),binSize=.45;
export const lithicDomains=[];
for(const [count,min,max] of [[8,.23,.39],[22,.09,.18],[65,.025,.07]]){
 for(let i=0;i<count;i++){
  const radius=min+(max-min)*random();let x,y;
  for(let attempt=0;attempt<300;attempt++){
   x=(random()-.5)*4.1;y=(random()-.5)*2.6;
   if(!insideSection(x/.95,y/.95))continue;
   const density=.45+.4*noise.noise(x*1.4+18,y*1.4,6);
   if(random()>density||lithicDomains.some(d=>Math.hypot(x-d.x,y-d.y)<(radius+d.radius)*.88))continue;
   break;
  }
  const angle=random()*Math.PI,aspect=.50+random()*.50,points=[],corners=7+Math.floor(random()*4);
  for(let j=0;j<corners;j++){
   const a=j/corners*Math.PI*2+(random()-.5)*.23,r=radius*(.67+random()*.40),u=Math.cos(a)*r,v=Math.sin(a)*r*aspect;
   points.push([x+u*Math.cos(angle)-v*Math.sin(angle),y+u*Math.sin(angle)+v*Math.cos(angle)]);
  }
  const d={id:lithicDomains.length,x,y,radius,points,angle,tone:(random()-.5)*.22,porosity:.22+random()*.60,richness:.2+random()**2*2.5};lithicDomains.push(d);
  const pad=radius*1.15+.04;
  for(let by=Math.floor((y-pad)/binSize);by<=Math.floor((y+pad)/binSize);by++)for(let bx=Math.floor((x-pad)/binSize);bx<=Math.floor((x+pad)/binSize);bx++){
   const key=bx+','+by;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(d);
  }
 }
}
function signedDistance(x,y,points){
 let inside=false,distance=Infinity;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[j],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)));
  distance=Math.min(distance,Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t));
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside?distance:-distance;
}
export function fabricAt(x,y){
 const cloud=.5+.5*noise.noise(x*1.7+48,y*1.7,3),mottling=noise.noise(x*7+7,y*7,3);
 const wx=x+.008*noise.noise(x*27+81,y*27,4),wy=y+.007*noise.noise(x*25,y*25+21,7);
 let closest=-Infinity,domain;
 for(const d of bins.get(Math.floor(wx/binSize)+','+Math.floor(wy/binSize))||[]){const distance=signedDistance(wx,wy,d.points);if(distance>closest){closest=distance;domain=d;}}
 // Some margins are crisp, others disappear into the matrix. No continuous seam network.
 const edgeWidth=.010+.021*(.5+.5*noise.noise(x*11+9,y*11,2));
 const clast=domain?Math.max(0,Math.min(1,(closest+edgeWidth*.25)/edgeWidth)):0;
 const baseTone=.48+(cloud-.5)*.19+mottling*.055;
 return {id:domain?.id??-1,clast,tone:baseTone+(domain?.tone??0)*clast,
  porosity:(.27+cloud*.40)*(1-clast)+(domain?.porosity??.45)*clast,
  angle:(.5+noise.noise(x*2.2,y*2.2,10)*.45)*Math.PI*(1-clast)+(domain?.angle??0)*clast,
  richness:(.18+cloud**3*3.2)*(1-clast)+(domain?.richness??.5)*clast,
  boundary:Number.isFinite(closest)?Math.exp(-Math.abs(closest)/edgeWidth):0};
}
// Surface relief follows fine fabric, not raised polygon islands.
export function sectionHeight(x,y){return -.026+noise.noise(x*5+2,y*5,3)*.004+noise.noise(x*29,y*29,14)*.0014;}
