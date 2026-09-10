import {sampleTrack} from './proximity.js';
// Fixed ICRF -> J2000 ecliptic display rotation. Scene +Y is ecliptic north.
export const AU_KM=149597870.7;
export const earthOrbitRadius=3;
// Retained only for old callers' chapter identifiers; no authored orbit uses these fractions.
export const transferTiming={approach:.55,flyby:.62,departure:.69};
const eps=23.439291111*Math.PI/180,c=Math.cos(eps),s=Math.sin(eps);
const clamp=p=>Number.isFinite(p)?Math.max(0,Math.min(1,p)):0;
const length=v=>Math.hypot(...v),add=(a,b)=>a.map((v,i)=>v+b[i]),subtract=(a,b)=>a.map((v,i)=>v-b[i]);
export function toSolarScene(v){return [v[0],-s*v[1]+c*v[2],-c*v[1]-s*v[2]].map(x=>x*3/AU_KM);}

// First sample strictly after time. Source epochs are nonuniform near encounters.
function upperBound(times,time){let lo=0,hi=times.length;while(lo<hi){const mid=(lo+hi)>>>1;if(times[mid]<=time)lo=mid+1;else hi=mid;}return lo;}
export function sampleJourneyBody(mission,body,time){
 const times=mission.times,ms=Math.max(times[0],Math.min(times.at(-1),typeof time==='number'?time:Date.parse(time))),i=Math.max(0,Math.min(times.length-2,upperBound(times,ms)-1)),a=mission[body][i],b=mission[body][i+1],dt=(times[i+1]-times[i])/1000,u=(ms-times[i])/(dt*1000),u2=u*u,u3=u2*u;
 const position=a.slice(0,3).map((v,j)=>(2*u3-3*u2+1)*v+(u3-2*u2+u)*dt*a[j+3]+(-2*u3+3*u2)*b[j]+(u3-u2)*dt*b[j+3]);
 const velocity=a.slice(0,3).map((v,j)=>((6*u2-6*u)*v+(3*u2-4*u+1)*dt*a[j+3]+(-6*u2+6*u)*b[j]+(3*u2-2*u)*dt*b[j+3])/dt);
 return {position,velocity,time:new Date(ms).toISOString()};
}
export function transferState(p,id,journey,kind='cruise'){
 const mission=journey.missions[id],phase=mission[kind],start=Date.parse(phase.start),end=Date.parse(phase.end),time=start+(end-start)*clamp(p);
 const craft=sampleJourneyBody(mission,'craft',time),earth=sampleJourneyBody(mission,'earth',time),target=sampleJourneyBody(mission,'target',time);
 return {time:craft.time,kind,phase:kind==='cruise'?'solar-cruise':kind==='flyby'?'earth-assist':'outbound',phaseLabel:kind==='cruise'?'Heliocentric cruise':kind==='flyby'?'Earth gravity assist':'Onward transfer to '+mission.targetName,
  craft:toSolarScene(craft.position),earth:toSolarScene(earth.position),asteroid:toSolarScene(target.position),
  craftPositionKm:craft.position,earthPositionKm:earth.position,targetPositionKm:target.position,craftVelocityKmS:craft.velocity,earthVelocityKmS:earth.velocity,targetVelocityKmS:target.velocity,
  speedSunKmS:length(craft.velocity),rangeToEarthKm:length(subtract(craft.position,earth.position)),rangeToTargetKm:length(subtract(craft.position,target.position)),
  travelledCount:upperBound(mission.times,time)-Math.max(0,upperBound(mission.times,start)-1),source:'https://ssd.jpl.nasa.gov/horizons/',sourceLabel:'NASA / JPL Horizons · heliocentric navigation vectors',frame:'Sun-centered ICRF; fixed ecliptic display',targetName:mission.targetName};
}
// Build once per chapter/body. Draw the trail through transferState.travelledCount;
// progress*pointCount would be wrong because sampling is denser near encounters.
export function transferPath(id,kind,journey,body='craft'){
 const mission=journey.missions[id],start=Date.parse(mission[kind].start),end=Date.parse(mission[kind].end);
 return mission.times.flatMap((time,i)=>time>=start&&time<=end?[toSolarScene(mission[body][i].slice(0,3))]:[]);
}
export function flybyFrameState(id,p,ephemeris,journey){
 const track=ephemeris[id].earthFlyby,relative=sampleTrack(track,clamp(p)),mission=journey.missions[id],earth=sampleJourneyBody(mission,'earth',relative.time);
 const heliocentricPositionKm=add(relative.position,earth.position),heliocentricVelocityKmS=add(relative.velocity,earth.velocity);
 // One fixed translated origin keeps Sun-frame coordinates manageable while Earth moves.
 const midpoint=(Date.parse(mission.flyby.start)+Date.parse(mission.flyby.end))/2,origin=sampleJourneyBody(mission,'earth',midpoint).position;
 return {time:relative.time,relativePositionKm:relative.position,relativeVelocityKmS:relative.velocity,earthPositionKm:earth.position,earthVelocityKmS:earth.velocity,heliocentricPositionKm,heliocentricVelocityKmS,
  heliocentricOffsetKm:subtract(heliocentricPositionKm,origin),earthOffsetKm:subtract(earth.position,origin),sunFrameOriginKm:origin,
  speedEarthKmS:length(relative.velocity),speedSunKmS:length(heliocentricVelocityKmS),rangeKm:length(relative.position),source:track.source,earthSource:'https://ssd.jpl.nasa.gov/horizons/',formula:'v spacecraft/Sun = v spacecraft/Earth + v Earth/Sun'};
}
