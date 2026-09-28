// Daily heliocentric JPL Horizons vectors for the planetary field guide. Writes the untouched responses to
// raw/ as provenance, timeline.json (full precision, linked for download) and timeline.packed.json (the
// compact fixed-point encoding the explorer loads; see src/scripts/planetary-timeline.js).
// `--from-raw` rebuilds both timeline files from raw/ without network access, keeping the recorded fetchedAt.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { packTimeline } from '../src/scripts/planetary-timeline.js';
const root = new URL('../public/assets/data/planetary/',import.meta.url);
const fromRaw = process.argv.includes('--from-raw');
await mkdir(new URL('raw/',root),{recursive:true});
const start = '2025-01-01', end = '2031-01-01';
const bodies = [['mercury','199'],['venus','299'],['earth','399'],['mars','499'],['jupiter','599'],['saturn','699'],['uranus','799'],['neptune','899'],['bennu','101955;'],['ryugu','162173;']];
// Raw responses do not record the UTC fetch time, so an offline rebuild keeps the published one.
async function recordedFetch() {
  for (const name of ['timeline.json','timeline.packed.json']) try { return JSON.parse(await readFile(new URL(name,root),'utf8')).fetchedAt; } catch {}
  throw Error('--from-raw needs an existing timeline file to keep its fetchedAt');
}
const fetchedAt = fromRaw ? await recordedFetch() : new Date().toISOString();
const data = {start,end,timeScale:'UTC',stepDays:1,center:'Sun',frame:'J2000 ecliptic / ICRF',units:'AU',fetchedAt,interpolation:'Linear interpolation of daily JPL vectors; visualization, not navigation or live telemetry.',bodies:[]};
for(const [id,command] of bodies){
  const params = new URLSearchParams({format:'json'});
  for(const [k,v] of Object.entries({COMMAND:command,EPHEM_TYPE:'VECTORS',CENTER:'500@10',START_TIME:start,STOP_TIME:end,STEP_SIZE:'1 d',REF_PLANE:'ECLIPTIC',REF_SYSTEM:'ICRF',OUT_UNITS:'AU-D',VEC_TABLE:'1',VEC_CORR:'NONE',TIME_TYPE:'UT',CSV_FORMAT:'YES',OBJ_DATA:'YES'})) params.set(k,`'${v}'`);
  const query = `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`;
  let result;
  if(fromRaw){
    const saved = JSON.parse(await readFile(new URL(`raw/timeline-${id}.json`,root),'utf8'));
    if(saved.query !== query) throw Error(`${id}: raw response was made with a different query`);
    result = saved.response;
  } else {
    const response = await fetch(query,{signal:AbortSignal.timeout(90000)});
    if(!response.ok) throw Error(`${id}: HTTP ${response.status}`);
    result = await response.json();
  }
  if(result.signature?.version !== '1.2' && result.signature?.version !== '1.3') throw Error('Review changed Horizons response version');
  if(result.error || !result.result?.includes('$$SOE')) throw Error(result.error || result.result);
  const rows = result.result.split('$$SOE')[1].split('$$EOE')[0].trim().split(/\r?\n/).map(line=>line.split(',').map(v=>v.trim()));
  const points = rows.map(row=>row.slice(2,5).map(Number));
  if(points.length !== (Date.parse(end)-Date.parse(start))/86400000+1 || points.some(p=>p.length!==3 || !p.every(Number.isFinite))) throw Error(`${id}: invalid positions`);
  if(!fromRaw) await writeFile(new URL(`raw/timeline-${id}.json`,root),JSON.stringify({query,response:result}));
  data.bodies.push({id,query,points});
  console.log(`${id}: ${points.length} daily UTC positions`);
}
await writeFile(new URL('timeline.json',root),JSON.stringify(data));
await writeFile(new URL('timeline.packed.json',root),JSON.stringify(packTimeline(data)));
