const enums = {
  view: ['orbit', 'shape', 'sample', 'minerals', 'origins'],
  material: ['bennu', 'ryugu', 'orgueil'],
  inspected: ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'bennu', 'ryugu', 'orgueil'],
  scope: ['inner', 'solar'],
  angle: ['plan', 'tilt'],
  mineral: ['carbonate', 'matrix', 'sulfide'],
};
const booleanFields = ['compare', 'wireframe', 'separated'];
const fields = [...Object.keys(enums), ...booleanFields, 'day', 'originProgress', 'originCutaway', 'camera'];
const cameraFields = ['position', 'target', 'up', 'zoom'];
const maxHashLength = 2048;

function invalid() {
  throw new TypeError('Invalid public observation');
}

function record(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
}

function number(value, min, max, precision) {
  if (typeof value === 'string') {
    if (value.trim() !== value || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) invalid();
    value = Number(value);
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) invalid();
  return Number(value.toFixed(precision)) || 0;
}

function boolean(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return invalid();
}

function sanitizeCamera(value, strict) {
  record(value);
  if (strict && Object.keys(value).some(key => !cameraFields.includes(key))) invalid();
  const camera = {};
  for (const key of cameraFields) {
    if (!Object.hasOwn(value, key)) invalid();
    if (key === 'zoom') {
      camera.zoom = number(value.zoom, 0.35, 64, 6);
    } else {
      const vector = value[key];
      if (!Array.isArray(vector) || vector.length !== 3) invalid();
      camera[key] = [0, 1, 2].map(index => {
        if (!Object.hasOwn(vector, index)) invalid();
        return number(vector[index], -2000, 2000, 6);
      });
    }
  }
  // Validate the rounded basis, since that is what the receiving renderer uses.
  const direction = camera.position.map((coordinate, index) => coordinate - camera.target[index]);
  const [x, y, z] = direction;
  const [u, v, w] = camera.up;
  const basisScale = Math.hypot(...direction) * Math.hypot(...camera.up);
  if (basisScale === 0
    || Math.hypot(y * w - z * v, z * u - x * w, x * v - y * u) <= 1e-12 * basisScale) invalid();
  return camera;
}

function sanitize(state, strict = false) {
  record(state);
  const result = {};
  for (const key of fields) {
    if (!Object.hasOwn(state, key)) continue;
    const value = state[key];
    if (Object.hasOwn(enums, key)) {
      if (!enums[key].includes(value)) invalid();
      result[key] = value;
    } else if (booleanFields.includes(key)) {
      result[key] = boolean(value);
    } else if (key === 'day') {
      result.day = number(value, 0, 50000, 8);
    } else if (key === 'originProgress' || key === 'originCutaway') {
      result[key] = number(value, 0, 1, 6);
    } else {
      result.camera = sanitizeCamera(value, strict);
    }
  }
  return result;
}

/** Encode own public fields only; invalid supplied fields/base URLs throw TypeError. */
export function encodeObservation(state, baseUrl) {
  const clean = sanitize(state);
  const url = new URL('research.html', baseUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') invalid();
  url.username = '';
  url.password = '';
  url.search = '';
  const params = new URLSearchParams({ observe: '1' });
  for (const [key, value] of Object.entries(clean)) {
    params.set(key, key === 'camera' ? JSON.stringify(value) : String(value));
  }
  url.hash = params.toString();
  return url.href;
}

/** Decode #observe=1 hashes to partial public state, or null. No defaults or live state. */
export function decodeObservation(hash) {
  if (typeof hash !== 'string' || hash.length > maxHashLength
    || !/^#observe=1(?:&|$)/.test(hash) || /[\u0000-\u0020\u007f]/.test(hash)) return null;
  try {
    const body = hash.slice(1);
    // URLSearchParams tolerates bad percent/UTF-8 escapes; reject them first.
    decodeURIComponent(body.replace(/\+/g, ' '));
    if (body.split('&').some(token => !/^[^=]+=[^=]+$/.test(token))) return null;
    const params = new URLSearchParams(body);
    const state = Object.create(null);
    const seen = new Set();
    for (const [key, value] of params) {
      if (seen.has(key)) return null;
      seen.add(key);
      if (key === 'observe') {
        if (value !== '1') return null;
      } else {
        if (!fields.includes(key)) return null;
        state[key] = key === 'camera' ? JSON.parse(value) : value;
      }
    }
    return sanitize(state, true);
  } catch {
    return null;
  }
}
