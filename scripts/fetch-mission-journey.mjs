import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';

// Official geometric ICRF vectors, sampled on shared UTC epochs. No orbit fitting.
// Run: node scripts/fetch-mission-journey.mjs. Raw requests/responses remain cached.
const root=new URL('../',import.meta.url),cache=process.env.MISSION_JOURNEY_CACHE||join(tmpdir(),'mission-journey-horizons');
const ephemeris=JSON.parse(await readFile(new URL('public/assets/data/missions/ephemeris.json',root),'utf8'));
await mkdir(cache,{recursive:true});
const api='https://ssd.jpl.nasa.gov/api/horizons_file.api';
const configurations=[
 {id:'hayabusa2',craft:'-37',target:'162173;',targetName:'Ryugu',start:'2014-12-03T06:14:00Z',launch:'2014-12-03T04:22:04Z'},
 {id:'osiris-rex',craft:'-64',target:'2101955',targetName:'Bennu',start:'2016-09-09T00:02:00Z',launch:'2016-09-08T23:05:00Z'}
];
const output={schemaVersion:1,generatedAt:new Date().toISOString(),frame:'ICRF',center:'10',positionUnits:'km',velocityUnits:'km/s',timeScale:'UTC',aberrationCorrection:'NONE',sampling:'Daily cruise; hourly near departure, flyby and arrival; existing five-minute flyby epochs included.',missions:{}};
async function query(command,times,name){
 const rows=[],sources=[];
 for(let offset=0;offset<times.length;offset+=400){
  const batch=times.slice(offset,offset+400);
  const request="!$$SOF\n"+Object.entries({COMMAND:command,CENTER:'@10',MAKE_EPHEM:'YES',OBJ_DATA:'YES',EPHEM_TYPE:'VECTORS',TLIST:batch.map(ms=>(ms/86400000+2440587.5).toFixed(9)).join('\n'),TLIST_TYPE:'JD',REF_PLANE:'FRAME',REF_SYSTEM:'ICRF',VEC_CORR:'NONE',OUT_UNITS:'KM-S',VEC_TABLE:'2',TIME_TYPE:'UT',CSV_FORMAT:'YES',TIME_DIGITS:'FRACSEC'}).map(([key,value])=>`${key}='${value}'`).join('\n')+'\n';
  const hash=createHash('sha256').update(request).digest('hex'),stem=`${name}-${hash.slice(0,16)}`;
  let text;
  try{text=await readFile(join(cache,stem+'.txt'),'utf8');}catch{
   const form=new FormData();form.set('format','text');form.set('input',new Blob([request],{type:'text/plain'}),'request.txt');
   const response=await fetch(api,{method:'POST',body:form});if(!response.ok)throw Error(`Horizons HTTP ${response.status}`);
   text=await response.text();await writeFile(join(cache,stem+'.request.txt'),request);await writeFile(join(cache,stem+'.txt'),text);
  }
  if(!text.includes('$$SOE')||!text.includes('Reference frame : ICRF')||!text.includes('Calendar Date (UT'))throw Error(`${name}: ${text.slice(-1800)}`);
  const lines=text.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
  if(lines.length!==batch.length)throw Error(`${name}: incomplete coverage ${lines.length}/${batch.length}`);
  for(let i=0;i<lines.length;i++){
   const fields=lines[i].split(',').map(v=>v.trim()),jd=Number(fields[0]),state=fields.slice(2,8).map(Number);
   if(Math.abs((jd-2440587.5)*86400000-batch[i])>2||state.length!==6||!state.every(Number.isFinite))throw Error(`${name}: malformed time/state`);
   rows.push(state.map((v,j)=>j<3?Number(v.toFixed(6)):Number(v.toPrecision(13))));
  }
  sources.push({api,command,center:'@10',requestSha256:hash,cacheFile:stem+'.txt',targetSource:text.match(/Target body name:[^\n]+/)?.[0],centerSource:text.match(/Center body name:[^\n]+/)?.[0]});
  console.log(`${name}: ${Math.min(offset+400,times.length)}/${times.length}`);
 }
 return {rows,sources};
}
for(const config of configurations){
 const existing=ephemeris[config.id],start=Date.parse(config.start),flybyStart=Date.parse(existing.earthFlyby.samples[0].time),flybyEnd=Date.parse(existing.earthFlyby.samples.at(-1).time),end=Date.parse(existing.rendezvous.samples[0].time),times=new Set([start,flybyStart,flybyEnd,end]);
 const addGrid=(a,b,step)=>{for(let t=Math.max(start,a);t<=Math.min(end,b);t+=step)times.add(t);};
 addGrid(start,end,86400000);addGrid(start,start+3*86400000,3600000);addGrid(flybyStart-3*86400000,flybyEnd+3*86400000,3600000);addGrid(end-3*86400000,end,3600000);
 const flybyEpochs=new Set(existing.earthFlyby.samples.map(s=>Date.parse(s.time)));
 for(const time of times)if(time>flybyStart&&time<flybyEnd&&!flybyEpochs.has(time))times.delete(time);
 flybyEpochs.forEach(time=>times.add(time));
 const epochs=[...times].sort((a,b)=>a-b),earth=await query('399',epochs,config.id+'-earth'),craft=await query(config.craft,epochs,config.id+'-craft'),target=await query(config.target,epochs,config.id+'-target');
 const directFlybyResiduals=[];
 // Coordinate-origin translation of the existing Earth-centered mission solution,
 // not a fitted offset: preserve its exact states at every shared flyby epoch.
 for(const relative of existing.earthFlyby.samples){
  const i=epochs.indexOf(Date.parse(relative.time)),translated=[...relative.position.map((v,j)=>v+earth.rows[i][j]),...relative.velocity.map((v,j)=>v+earth.rows[i][j+3])];
  directFlybyResiduals.push(Math.hypot(...translated.slice(0,3).map((v,j)=>v-craft.rows[i][j])));
  craft.rows[i]=translated;
 }
 output.missions[config.id]={targetName:config.targetName,launchUtc:config.launch,sourceStartUtc:config.start,cruise:{start:config.start,end:existing.earthFlyby.samples[0].time},flyby:{start:existing.earthFlyby.samples[0].time,end:existing.earthFlyby.samples.at(-1).time},outbound:{start:existing.earthFlyby.samples.at(-1).time,end:existing.rendezvous.samples[0].time},times:epochs,earth:earth.rows,craft:craft.rows,target:target.rows,sources:{earth:earth.sources,craft:craft.sources,target:target.sources},flybyTranslation:{source:'/assets/data/missions/ephemeris.json',operation:'spacecraft heliocentric state = Earth heliocentric state + spacecraft Earth-relative state',maximumDifferenceFromDirectHorizonsKm:Math.max(...directFlybyResiduals)},caveat:'Cruise starts after injection within spacecraft ephemeris coverage; no launchpad trajectory is supplied. Mission navigation solutions and target orbit solutions are not uniformly final reconstructions. Hourly/daily Hermite interpolation is a display approximation; it does not resolve every maneuver. Flyby states retain the existing Earth-relative solution by exact origin translation.'};
 console.log(`${config.id}: direct/translated flyby maximum difference ${Math.max(...directFlybyResiduals)} km; arrival range ${Math.hypot(...craft.rows.at(-1).slice(0,3).map((v,j)=>v-target.rows.at(-1)[j]))} km`);
}
await writeFile(new URL('public/assets/data/missions/journey.json',root),JSON.stringify(output)+'\n');
