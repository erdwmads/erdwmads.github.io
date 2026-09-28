// Transfer encoding for the daily JPL Horizons timeline. timeline.json keeps the full-precision vectors
// for download; the explorer loads timeline.packed.json and unpacks it to the same object shape.
export const timelineEncoding = 'fixed-point-differences/1';
// 1e7 units per AU: 1e-7 AU (about 15 km) resolution, so every decoded coordinate lies within
// 5e-8 AU (about 7.5 km) of the Horizons value. Heliocentric positions here stay far below the
// ±214 AU at which a coordinate would leave the int32 range.
export const timelineScale = 1e7;

function difference(values, order) {
  const a = values.slice();
  for (let pass=0; pass<order; pass++) for (let i=a.length-1; i>pass; i--) a[i] -= a[i-1];
  return a;
}
function integrate(values, order) {
  const a = values.slice();
  for (let pass=order-1; pass>=0; pass--) for (let i=pass+1; i<a.length; i++) a[i] += a[i-1];
  return a;
}

export function packTimeline({bodies,...meta}, scale = timelineScale) {
  const resolution = 1/scale, km = resolution*149597870.7;
  return {...meta, encoding: {name: timelineEncoding, scale,
    note: `x, y and z hold round(${meta.units ?? 'AU'} × scale) differenced \`order\` times. Decode an axis with \`order\` running-sum passes (pass p = order-1…0 adds a[i-1] to a[i] for i > p), then divide by scale. Resolution ${resolution} ${meta.units ?? 'AU'} (about ${Math.round(km)} km); each coordinate is within ${resolution/2} ${meta.units ?? 'AU'} (about ${(km/2).toFixed(1)} km) of the Horizons vector.`},
  bodies: bodies.map(({points,...body}) => {
    const axes = [0,1,2].map(axis => points.map(point => Math.round(point[axis]*scale)));
    // Smooth daily motion leaves small high-order differences; keep the order with the shortest text.
    let best;
    for (let order=1; order<=6; order++) {
      const coded = axes.map(axis => difference(axis,order)), size = JSON.stringify(coded).length;
      if (!best || size < best.size) best = {order, coded, size};
    }
    return {...body, order: best.order, x: best.coded[0], y: best.coded[1], z: best.coded[2]};
  })};
}

export function unpackTimeline({encoding,bodies,...meta}) {
  if (encoding?.name !== timelineEncoding || !(encoding.scale > 0)) throw new Error('Unsupported timeline encoding');
  return {...meta, bodies: bodies.map(({order,x,y,z,...body}) => {
    const axes = [x,y,z].map(values => Number.isInteger(order) && order >= 0 && Array.isArray(values) ? integrate(values,order) : []);
    if (!axes[0].length || axes.some(axis => axis.length !== axes[0].length || !axis.every(Number.isSafeInteger))) throw new Error(`Invalid timeline for ${body.id}`);
    return {...body, points: axes[0].map((_,i) => axes.map(axis => axis[i]/encoding.scale))};
  })};
}
