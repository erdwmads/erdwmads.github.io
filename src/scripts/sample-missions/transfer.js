// Authored Sun-centered schematic, not an ephemeris: distances, azimuths and
// elapsed time are compressed. Both missions share this explanatory geometry.
export const earthOrbitRadius=3;
export const transferTiming={approach:.55,flyby:.62,departure:.69};
const polar=(radius,angle)=>[radius*Math.cos(angle),0,radius*Math.sin(angle)];
export function transferState(p,id){
 p=Number.isFinite(p)?Math.max(0,Math.min(1,p)):0;
 const q=p/transferTiming.flyby,earthAngle=Math.PI+2*Math.PI*q;
 let radius,angle;
 if(q<=1){
  // One solar circuit; the spacecraft separates from Earth, then meets it again.
  radius=earthOrbitRadius+.45+.8*Math.sin(Math.PI*q)**2;
  angle=earthAngle+.35*Math.sin(Math.PI*q);
 }else{
  const t=(p-transferTiming.flyby)/(1-transferTiming.flyby);
  const startSlope=1.65*Math.PI*(1-transferTiming.flyby)/transferTiming.flyby;
  // Match the incoming tangent at the open pass; then transfer outward.
  radius=earthOrbitRadius+.45+.75*t*t*(3-2*t);
  angle=3*Math.PI+Math.PI*t+(startSlope-Math.PI)*t*(1-t)**2;
 }
 const phase=p<transferTiming.approach?'solar-cruise':p<=transferTiming.departure?'earth-assist':'outbound';
 const date=id==='hayabusa2'?'3 Dec 2015':'22 Sep 2017',target=id==='hayabusa2'?'Ryugu':'Bennu';
 const phaseLabel=phase==='solar-cruise'?'~1 year orbiting the Sun':phase==='earth-assist'?'Earth gravity assist · '+date:'Onward transfer to '+target;
 return {craft:polar(radius,angle),earth:polar(earthOrbitRadius,earthAngle),asteroid:polar(4.7,4*Math.PI+1.9*(p-1)),phase,phaseLabel};
}
