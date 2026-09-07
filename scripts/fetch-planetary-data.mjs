import { mkdir, writeFile } from 'node:fs/promises';

const root = new URL('../public/assets/data/planetary/', import.meta.url);
await mkdir(new URL('raw/', root), { recursive: true });
const epoch = '2026-09-07';
const bodies = [
  ['mercury', '199', 88], ['venus', '299', 225], ['earth', '399', 366],
  ['mars', '499', 687], ['jupiter', '599', 4333], ['saturn', '699', 10759],
  ['uranus', '799', 30687], ['neptune', '899', 60190],
  ['bennu', '101955;', 437], ['ryugu', '162173;', 475]
];
const result = { epoch, timeScale: 'TDB', center: 'Sun', frame: 'J2000 ecliptic / ICRF', units: 'AU', fetchedAt: new Date().toISOString(), bodies: [] };
async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}
for (const [id, command, days] of bodies) {
  const stop = new Date(Date.parse(epoch) + days * 86400000).toISOString().slice(0, 10);
  const params = new URLSearchParams({ format: 'json' });
  const settings = { COMMAND: command, EPHEM_TYPE: 'VECTORS', CENTER: '500@10', START_TIME: epoch, STOP_TIME: stop, STEP_SIZE: '180', REF_PLANE: 'ECLIPTIC', REF_SYSTEM: 'ICRF', OUT_UNITS: 'AU-D', VEC_TABLE: '1', VEC_CORR: 'NONE', TIME_TYPE: 'TDB', CSV_FORMAT: 'YES', OBJ_DATA: 'YES' };
  for (const [key, value] of Object.entries(settings)) params.set(key, `'${value}'`);
  const query = `https://ssd.jpl.nasa.gov/api/horizons.api?${params}`;
  const response = await (await download(query)).json();
  if (response.error || !response.result?.includes('$$SOE')) throw new Error(`${id}: ${response.error || response.result}`);
  await writeFile(new URL(`raw/${id}.json`, root), JSON.stringify({ query, response }, null, 2));
  // Horizons VEC_TABLE=1 CSV columns: JD, calendar date, X, Y, Z (trailing comma).
  const rows = response.result.split('$$SOE')[1].split('$$EOE')[0].trim().split(/\r?\n/).map(line => line.split(',').map(value => value.trim()));
  const points = rows.map(row => row.slice(2, 5).map(Number));
  if (points.length !== 181 || points.some(p => p.length !== 3 || !p.every(Number.isFinite))) throw new Error(`Invalid trajectory: ${id}`);
  result.bodies.push({ id, command, query, firstJD: Number(rows[0][0]), end: stop, points });
  console.log(`${id}: ${points.length} positions, ${epoch} to ${stop}`);
}
await writeFile(new URL('orbits.json', root), JSON.stringify(result));
const assets = {
  bennu: { file: 'bennu.glb', url: 'https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/b/Bennu_1_1.glb', source: 'https://science.nasa.gov/resource/bennu-3d-model/', credit: 'NASA Visualization Technology Applications and Development (VTAD)', diameterM: 492 },
  ryugu: { file: 'ryugu.obj', url: 'https://data.darts.isas.jaxa.jp/pub/hayabusa2/paper/Watanabe_2019/SHAPE_SFM_49k_v20180804.obj', source: 'https://data.darts.isas.jaxa.jp/pub/hayabusa2/paper/Watanabe_2019/', credit: 'ISAS/JAXA; Watanabe et al. (2019), shape-model team', diameterM: 900 }
};
for (const [id, asset] of Object.entries(assets)) {
  await writeFile(new URL(asset.file, root), Buffer.from(await (await download(asset.url)).arrayBuffer()));
  asset.asset = `/assets/data/planetary/${asset.file}`;
  console.log(`Downloaded ${id}`);
}
assets.orgueil = { model: null, source: 'https://naturalhistory.si.edu/object/nmnhmineralsciences_1017941', credit: 'Chip Clark / Smithsonian; specimen USNM 388, CC0', note: 'Photograph only. No 3D scan of this specimen is supplied.' };
await writeFile(new URL('models.json', root), JSON.stringify(assets, null, 2));
