import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

// Regenerate with Python + spiceypy installed; PYTHON selects the executable.
// Downloads only the compact ephemeris/frame kernels, never shape/attitude kernels.
const root = fileURLToPath(new URL('../', import.meta.url));
const cache = process.env.MISSION_EPHEMERIS_CACHE || join(tmpdir(), 'mission-ephemeris-kernels');
const base = 'https://naif.jpl.nasa.gov/pub/naif/pds/pds4/hyb2/hyb2_spice/spice_kernels/';
const kernelFiles = [
  ['spk/2162173_ryugu_approach_od_v01.bsp', '669294effc310958eb5e8414ee8006dc'],
  ['spk/hyb2_approach_od_v20180811114238.bsp', 'dc16ffbef7f046b5f61239a32c2f534e'],
  ['spk/2162173_ryugu_hpk_proximity_v01.bsp', '6835edc030b003a1eb7c96ed26c2f0a1'],
  ['spk/hyb2_hpk_20180627_20191119_v01.bsp', '3f4b9c281f79b4eeb92f8841d30de349'],
  ['spk/hyb2_de430.bsp'], ['fk/hyb2_hp_v01.tf'],
];
await mkdir(cache, { recursive: true });
async function cached(url, filename, md5) {
  const path = join(cache, filename);
  let buffer;
  try { buffer = await readFile(path); } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(path, buffer);
  }
  if (md5 && createHash('md5').update(buffer).digest('hex') !== md5) throw new Error(`PDS checksum mismatch: ${filename}`);
  return path;
}
for (const [path, hash] of kernelFiles) await cached(base + path, path.split('/').at(-1), hash);
await cached('https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls', 'naif0012.tls');
const python = String.raw`
import json, sys, os, datetime
import spiceypy as s
p=sys.argv[1]
result={}
for key,start,end,pair in [
 ('rendezvous','2018-06-26T00:00:00','2018-06-28T00:00:00',['2162173_ryugu_approach_od_v01.bsp','hyb2_approach_od_v20180811114238.bsp']),
 ('depart','2019-11-13T00:00:00','2019-11-14T00:00:00',['2162173_ryugu_hpk_proximity_v01.bsp','hyb2_hpk_20180627_20191119_v01.bsp'])]:
 s.kclear()
 for f in ['naif0012.tls','hyb2_de430.bsp','hyb2_hp_v01.tf']+pair: s.furnsh(os.path.join(p,f))
 t=datetime.datetime.fromisoformat(start)
 stop=datetime.datetime.fromisoformat(end)
 samples=[]
 while t<=stop:
  utc=t.isoformat(timespec='seconds')
  state,_=s.spkezr('-37',s.str2et(utc),'J2000','NONE','2162173')
  samples.append({'time':utc+'Z','position':state[:3].tolist(),'velocity':state[3:].tolist()})
  t+=datetime.timedelta(minutes=5)
 result[key]=samples
print(json.dumps(result))
`;
const run = spawnSync(process.env.PYTHON || 'python', ['-c', python, cache], { encoding: 'utf8', maxBuffer: 8e6 });
if (run.status !== 0) throw new Error(run.stderr || run.error?.message || 'SPICE extraction failed');
const hyb = JSON.parse(run.stdout);
const archive = 'https://naif.jpl.nasa.gov/pub/naif/pds/pds4/hyb2/hyb2_spice/document/spiceds_v001.html';
function track(samples, source, dataKind, sourceLabel, sourceFiles, frame = 'J2000', center = '2162173') {
  return { frame, center, units: 'km', velocityUnits: 'km/s', timeScale: 'UTC', aberrationCorrection: 'NONE', stepSeconds: 300,
    source, sourceLabel, dataKind, sourceFiles, samples };
}
const output = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  'hayabusa2': {
    rendezvous: track(hyb.rendezvous, archive, 'reconstructed', 'JAXA / NAIF SPICE · final approach orbit determination', kernelFiles.slice(0,2).map(([f]) => base+f)),
    depart: track(hyb.depart, archive, 'mission-prediction', 'JAXA / NAIF SPICE · HPNAV mission prediction', kernelFiles.slice(2,4).map(([f]) => base+f)),
  },
  'osiris-rex': {},
};
// HPNAV changes prediction solutions here: do not animate across this position jump.
const departureJoin = output.hayabusa2.depart.samples.find(s => s.time === '2019-11-13T01:00:00Z');
departureJoin.breakBefore = true;
output.hayabusa2.depart.recommendedStart = departureJoin.time;
output.hayabusa2.depart.playbackStartIndex = output.hayabusa2.depart.samples.indexOf(departureJoin);
output.hayabusa2.depart.caveat = 'HPNAV prediction has a discontinuous solution join at 2019-11-13 01:00 UTC. Use the continuous interval beginning at recommendedStart; never interpolate across breakBefore.';
output.hayabusa2.rendezvous.caveat = 'Final after-the-fact JAXA approach orbit determination. Sampled geometry only; spacecraft attitude and thruster firing are not supplied.';
const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
async function horizons(command, center, start, stop, filename) {
  const parameters = {format:'text',COMMAND:command,CENTER:center,MAKE_EPHEM:'YES',OBJ_DATA:'YES',EPHEM_TYPE:'VECTORS',START_TIME:start,STOP_TIME:stop,STEP_SIZE:'5m',REF_PLANE:'FRAME',REF_SYSTEM:'ICRF',OUT_UNITS:'KM-S',VEC_TABLE:'2',VEC_CORR:'NONE',TIME_TYPE:'UT',CSV_FORMAT:'YES'};
  const url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + new URLSearchParams(Object.fromEntries(Object.entries(parameters).map(([k,v]) => [k,k==='format'?v:`'${v}'`])));
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Horizons HTTP ${response.status}`);
  const text = await response.text();
  await writeFile(join(cache, filename + '.txt'), text);
  if (!text.includes('$$SOE') || !text.includes('$$EOE') || !text.includes('Reference frame : ICRF')) throw new Error(`Invalid Horizons response: ${text.slice(-2000)}`);
  const rows = text.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
  const samples = rows.map(line => {
    const columns = line.split(',').map(x => x.trim());
    const date = /A.D. (\d{4})-(\w{3})-(\d{2}) (\d{2}:\d{2}:\d{2})/.exec(columns[1]);
    if (!date) throw new Error(`Invalid date: ${columns[1]}`);
    const time = `${date[1]}-${String(months.indexOf(date[2])+1).padStart(2,'0')}-${date[3]}T${date[4]}Z`;
    const state = columns.slice(2,8).map(Number);
    if (state.length !== 6 || !state.every(Number.isFinite)) throw new Error('Invalid vector');
    return {time,position:state.slice(0,3),velocity:state.slice(3)};
  });
  return {samples,url};
}
for (const [phase,start,stop,dataKind,label,files] of [
  ['rendezvous','2018-12-02 00:00','2018-12-04 00:00','mission-navigation','NASA / JPL Horizons · mission navigation solution',['orx_180801_190302_181218_od077-N-M1A-L-M0D_v1','orx_181203_190302_190104_od085-N-M0D-P_v1']],
  ['depart','2021-05-10 18:00','2021-05-11 00:00','mission-prediction','NASA / JPL Horizons · mission prediction',['64_pred_20210424_20231001_od317_v0.1']],
]) {
  const {samples,url}=await horizons('-64','@2101955',start,stop,`osiris-rex-${phase}`);
  output['osiris-rex'][phase]=track(samples,url,dataKind,label,files,'ICRF','2101955');
  output['osiris-rex'][phase].caveat = phase === 'depart' ? 'Horizons supplies a mission prediction for this historical interval; this is not a reconstructed flown trajectory.' : 'Horizons mission navigation solution; Bennu center uses the final reconstructed mission solution (2101955). Spacecraft data are not claimed as a uniformly final reconstruction.';
}
for (const [mission,command,start,stop] of [
  ['hayabusa2','-37','2015-12-03 04:08','2015-12-03 16:08'],
  ['osiris-rex','-64','2017-09-22 10:52','2017-09-22 22:52'],
]) {
  const {samples,url}=await horizons(command,'@399',start,stop,`${mission}-earth-flyby`);
  output[mission].earthFlyby=track(samples,url,'mission-navigation','NASA / JPL Horizons · mission navigation solution',[],'ICRF','399');
}
for (const [mission,phases] of Object.entries(output)) {
  if (typeof phases !== 'object') continue;
  for (const [phase,data] of Object.entries(phases)) {
    const times = data.samples.map(x => Date.parse(x.time));
    if (times.some((t,i) => i && t-times[i-1] !== 300000)) throw new Error(`Sampling gap: ${mission}/${phase}`);
    const distances = data.samples.map(x => Math.hypot(...x.position));
    console.log(`${mission}/${phase}: ${data.samples.length} samples; range ${Math.min(...distances).toFixed(6)} .. ${Math.max(...distances).toFixed(6)} km; ${data.dataKind}`);
  }
}
const destination=join(root,'public/assets/data/missions/ephemeris.json');
await mkdir(dirname(destination),{recursive:true});
await writeFile(destination,JSON.stringify(output)+'\n');
console.log(destination);
