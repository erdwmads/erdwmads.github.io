// Kilometres and seconds. Right-handed local frame: +X east, +Y up, +Z south.
// Origin is the launch/recovery surface; Earth centre is [0, -6371, 0].
// Source anchors and all interpolation assumptions: docs/earth-physics-sources.md.
// These are explanatory trajectories, never measured telemetry or ephemerides.
export const EARTH_RADIUS_KM = 6371;
const provenance = 'Source-anchored explanatory interpolation · time compressed';
const clamp = p => Number.isFinite(p) ? Math.max(0, Math.min(1, p)) : 0;
const unit = a => { const length = Math.hypot(...a); return length ? a.map(v => v / length) : [0, 1, 0]; };
const add = (a, b, scale = 1) => a.map((v, i) => v + b[i] * scale);
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);

export const EARTH_FLIGHT_PROFILES = {
  hayabusa2: {
    rocket: { type: 'rocket', name: 'H-IIA 202', lengthKm: .053, diameterKm: .004 },
    spacecraft: { type: 'spacecraft', name: 'Hayabusa2', spanKm: .006 },
    capsule: { type: 'capsule', name: 'Hayabusa2 capsule', diameterKm: .0004 },
    releaseAltitudeKm: 220000, releaseDurationSeconds: 43107, divertSeconds: 3600, divertDurationSeconds: 3600,
    entryAltitudeKm: 120, entrySpeedKmS: 12, entryDurationSeconds: 1533,
    chuteAltitudeKm: 10, chuteSeconds: 213, touchdownSpeedKmS: .007,
    launchDurationSeconds: 6501,
    events: { boosterBurnout: 93, boosterSeparation: 107, fairingSeparation: 251,
      mainEngineCutoff: 396, stageSeparation: 404, upperIgnition: 414, upperCutoff: 680,
      upperRestart: 5966, upperFinalCutoff: 6211, spacecraftSeparation: 6441 },
    launchAnchors: [[0,0,0],[8,.04,0],[30,1,.2],[93,20,12],[150,50,80],[251,90,280],
      [414,150,850],[680,200,2400],[5966,200,42500],[6211,800,44600],[6441,2200,46500],[6501,2600,47000]],
    launchProvenance: 'JAXA postflight event times; explanatory altitude and downrange',
    note: 'Entry and parachute anchors from JAXA; intermediate motion and attitude are explanatory.',
  },
  'osiris-rex': {
    rocket: { type: 'rocket', name: 'Atlas V 411', lengthKm: .0576072, diameterKm: .004 },
    spacecraft: { type: 'spacecraft', name: 'OSIRIS-REx', lengthKm: .00315, spanKm: .0062 },
    capsule: { type: 'capsule', name: 'OSIRIS-REx capsule', diameterKm: .00081 },
    releaseAltitudeKm: 102000, releaseDurationSeconds: 14400, divertSeconds: 1200, divertDurationSeconds: 120,
    entryAltitudeKm: 133, entrySpeedKmS: 44500 / 3600, entryDurationSeconds: 600,
    chuteAltitudeKm: 2.7432, chuteSeconds: 240, touchdownSpeedKmS: .005,
    launchDurationSeconds: 3398.6,
    events: { boosterBurnout: 94, boosterSeparation: 139, fairingSeparation: 266.8,
      mainEngineCutoff: 242.8, stageSeparation: 248.8, upperIgnition: 258.8, upperCutoff: 742.5,
      upperRestart: 2028.2, upperFinalCutoff: 2438.6, spacecraftSeparation: 3338.6 },
    launchAnchors: [[0,0,0],[8,.04,0],[30,1,.2],[94,20,12],[139,45,60],[248.8,100,400],
      [266.8,110,500],[742.5,200,3000],[2028.2,200,13000],[2438.6,1100,17500],[3338.6,5500,25000],[3398.6,5850,25500]],
    launchProvenance: 'NASA nominal launch event times; explanatory altitude and downrange; booster burnout approximate',
    note: 'Actual drogue anomaly: released while packed, then deployed and detached near 9,000 ft; main parachute completed descent.',
  },
};

// Presentation timing changes playback rate only; velocities remain km per physical second.
function timeline(p, knots) {
  const i = Math.max(1, knots.findIndex(k => k[0] >= p));
  const [a, b] = [knots[i - 1], knots[i]];
  return a[1] + (b[1] - a[1]) * (p - a[0]) / (b[0] - a[0]);
}

function spherical(h, s, dh, ds) {
  const angle = s / EARTH_RADIUS_KM, r = EARTH_RADIUS_KM + h;
  const sin = Math.sin(angle), cos = Math.cos(angle);
  return vectorState([r * sin, r * cos - EARTH_RADIUS_KM, 0],
    [dh * sin + r * cos * ds / EARTH_RADIUS_KM, dh * cos - r * sin * ds / EARTH_RADIUS_KM, 0]);
}

function vectorState(positionKm, velocityKmS) {
  const radius = add(positionKm, [0, EARTH_RADIUS_KM, 0]);
  return { positionKm, velocityKmS, altitudeKm: Math.hypot(...radius) - EARTH_RADIUS_KM,
    up: unit(radius), forward: unit(velocityKmS) };
}

// Monotone cubic interpolation, preserving radial clearance and continuous velocity.
function interpolate(t, knots, column) {
  const i = Math.max(1, knots.findIndex(k => k[0] >= t));
  const slopes = knots.slice(1).map((k, j) => (k[column] - knots[j][column]) / (k[0] - knots[j][0]));
  const tangent = j => {
    if (j === 0) return 0;
    if (j === knots.length - 1) return slopes[j - 1];
    const a = slopes[j - 1], b = slopes[j];
    return a * b <= 0 ? 0 : 2 * a * b / (a + b);
  };
  const a = knots[i - 1], b = knots[i], dt = b[0] - a[0], u = (t - a[0]) / dt;
  const m0 = tangent(i - 1), m1 = tangent(i), u2 = u * u, u3 = u2 * u;
  return [(2*u3-3*u2+1)*a[column]+(u3-2*u2+u)*dt*m0+(-2*u3+3*u2)*b[column]+(u3-u2)*dt*m1,
    ((6*u2-6*u)*a[column]+(3*u2-4*u+1)*dt*m0+(-6*u2+6*u)*b[column]+(3*u2-2*u)*dt*m1)/dt];
}

function launch(profile, p) {
  const e = profile.events;
  const elapsedSeconds = timeline(p, [[0,0],[.06,8],[.18,30],[.35,e.boosterSeparation],
    [.56,e.upperIgnition],[.68,e.upperCutoff],[.76,e.upperRestart],[.83,e.upperFinalCutoff],
    [.92,e.spacecraftSeparation],[1,profile.launchDurationSeconds]]);
  const [h, dh] = interpolate(elapsedSeconds, profile.launchAnchors, 1);
  const [s, ds] = interpolate(elapsedSeconds, profile.launchAnchors, 2);
  const spacecraftReleased = elapsedSeconds >= e.spacecraftSeparation;
  const engineOn = { core: elapsedSeconds < e.mainEngineCutoff,
    boosters: elapsedSeconds < e.boosterBurnout,
    upper: (elapsedSeconds >= e.upperIgnition && elapsedSeconds < e.upperCutoff) ||
      (elapsedSeconds >= e.upperRestart && elapsedSeconds < e.upperFinalCutoff) };
  const phase = spacecraftReleased ? 'Spacecraft separation' : elapsedSeconds >= e.upperFinalCutoff ? 'Earth-escape coast' :
    elapsedSeconds >= e.upperRestart ? 'Upper-stage restart' : elapsedSeconds >= e.upperCutoff ? 'Parking-orbit coast' :
    elapsedSeconds >= e.stageSeparation ? 'Upper-stage ascent' : elapsedSeconds >= e.fairingSeparation ? 'Fairing separated' :
    elapsedSeconds >= e.boosterSeparation ? 'Boosters separated' : elapsedSeconds > 8 ? 'Pitch-over and ascent' : 'Vertical liftoff';
  return { ...spherical(h, s, dh, ds), elapsedSeconds, durationSeconds: profile.launchDurationSeconds,
    vehicle: { ...(spacecraftReleased ? profile.spacecraft : profile.rocket) }, events: { ...e },
    engineOn, spacecraftReleased, phase, label: phase, note: profile.launchProvenance };
}

function entryAt(profile, t) {
  const { chuteSeconds: tc, chuteAltitudeKm: hc, entryDurationSeconds: duration } = profile;
  const chuteDuration = duration - tc, vf = profile.touchdownSpeedKmS;
  const quadratic = (hc - vf * chuteDuration) / (chuteDuration * chuteDuration);
  const chuteInitialSpeed = vf + 2 * quadratic * chuteDuration;
  let state;
  if (t >= tc) {
    const remaining = duration - t;
    state = spherical(vf * remaining + quadratic * remaining * remaining, 0,
      t === duration ? 0 : -vf - 2 * quadratic * remaining, 0);
  } else {
    // 12-degree entry angle and deceleration shape are explanatory, not reconstructed attitude/drag.
    const radial = profile.entrySpeedKmS * Math.sin(Math.PI / 15);
    const tangential = profile.entrySpeedKmS * Math.cos(Math.PI / 15);
    const height = profile.entryAltitudeKm - hc, b = chuteInitialSpeed;
    let low = .000001, high = 1;
    for (let n = 0; n < 48; n++) {
      const k = (low + high) / 2;
      const end = Math.exp(-k * tc);
      if ((radial-b)*((1-end)/k-end*tc)/(1-end)+b*tc > height) low = k;
      else high = k;
    }
    const k = (low + high) / 2, exp = Math.exp(-k*t), end = Math.exp(-k*tc);
    const h = hc + (radial-b)*((exp-end)/k-end*(tc-t))/(1-end) + b*(tc-t);
    const dh = -(radial-b)*(exp-end)/(1-end)-b;
    const horizontal = tangential * EARTH_RADIUS_KM / (EARTH_RADIUS_KM + profile.entryAltitudeKm);
    const s = -horizontal * ((exp-end)/k - end*(tc-t)) / (1-end);
    const ds = horizontal * (exp-end)/(1-end);
    state = spherical(h, s, dh, ds);
  }
  const parachute = clamp((t - tc) / 8);
  return { ...state, vehicle: { ...profile.capsule }, elapsedSeconds: t, durationSeconds: duration,
    heatShieldDirection: [...state.forward], parachute, drogueDeployed: false, landed: t === duration,
    heat: t < tc && state.altitudeKm < 100 ? Math.exp(-(((state.altitudeKm-60)/23)**2)) : 0,
    phase: t === duration ? 'Capsule on Earth' : t >= tc ? 'Main parachute descent' : 'Heat-shield-first atmospheric entry',
    label: t === duration ? 'Landed · recovery follows' : t >= tc ? 'Parachute descent' : 'Atmospheric entry',
    note: profile.note };
}

function separation(profile, p) {
  const duration = profile.releaseDurationSeconds, delay = profile.divertSeconds;
  const elapsedSeconds = timeline(p, [[0,0],[.18,60],[.4,delay],[.52,delay+profile.divertDurationSeconds],
    [.9,duration-3600],[1,duration]]);
  const entry = entryAt(profile, 0), direction = entry.forward;
  const endRadius = add(entry.positionKm, [0, EARTH_RADIUS_KM, 0]);
  const r = EARTH_RADIUS_KM + profile.releaseAltitudeKm, projection = dot(endRadius, direction);
  const length = projection + Math.sqrt(projection*projection + r*r - dot(endRadius,endRadius));
  const tau = duration * .05, decay = Math.exp(-duration/tau), finalSpeed = profile.entrySpeedKmS;
  const initialSpeed = (length-finalSpeed*tau*(1-decay))/(duration-tau*(1-decay));
  const remaining = duration-elapsedSeconds, exponential = Math.exp(-remaining/tau);
  const distance = initialSpeed*remaining+(finalSpeed-initialSpeed)*tau*(1-exponential);
  const speed = initialSpeed+(finalSpeed-initialSpeed)*exponential;
  const capsule = { ...vectorState(add(entry.positionKm,direction,-distance),direction.map(v=>v*speed)),
    vehicle: { ...profile.capsule } };
  // A constant spring drift sends the capsule ahead along the inbound path.
  // The explanatory avoidance burn has smooth acceleration only within its
  // stated burn window; after cutoff the branch coasts at constant relative velocity.
  const drift = .002 + .0001 * elapsedSeconds, burn = profile.divertDurationSeconds;
  const age = Math.max(0, elapsedSeconds - delay), q = clamp(age / burn);
  const deltaV = 1000 / (duration - delay - burn / 2);
  const diversion = deltaV * (age < burn ? burn * (q*q*q - .5*q*q*q*q) : age - burn / 2);
  const diversionSpeed = deltaV * q*q*(3-2*q);
  const spacecraft = { ...vectorState(add(add(capsule.positionKm,direction,-drift),entry.up,diversion),
    add(add(capsule.velocityKmS,direction,-.0001),entry.up,diversionSpeed)), vehicle: { ...profile.spacecraft } };
  return { ...capsule, capsule, spacecraft, approachDirection: [...direction], elapsedSeconds, durationSeconds: duration,
    separated: true, diverting: elapsedSeconds >= delay,
    engineOn: { spacecraft: elapsedSeconds >= delay && elapsedSeconds < delay+profile.divertDurationSeconds },
    phase: elapsedSeconds < delay ? 'Capsule released' : 'Spacecraft Earth-avoidance maneuver',
    label: elapsedSeconds < delay ? 'Capsule separates · Earth approach continues' : 'Capsule approaches Earth · spacecraft diverts',
    note: 'Release altitude/time are source anchors; intervening path and branch displacement are explanatory.' };
}

/** p is presentation progress, not a physical-time fraction. Dimensions never scale with p. */
export function earthFlightState(id, kind, p) {
  const profile = EARTH_FLIGHT_PROFILES[id];
  if (!profile) throw new RangeError(`Unknown sample-return mission: ${id}`);
  p = clamp(p);
  if (kind === 'return') kind = 'separation';
  if (kind === 'landing') kind = 'entry';
  let state;
  if (kind === 'launch') state = launch(profile, p);
  else if (kind === 'separation') state = separation(profile, p);
  else if (kind === 'entry') state = entryAt(profile, timeline(p,
    [[0,0],[.12,15],[.48,90],[.64,profile.chuteSeconds],[1,profile.entryDurationSeconds]]));
  else throw new RangeError(`Unknown Earth-flight phase: ${kind}`);
  if (kind === 'entry') state.approachDirection = entryAt(profile, 0).forward;
  return { ...state, provenance, frame: 'local east/up/south', units: { distance: 'km', velocity: 'km/s', time: 's' } };
}
