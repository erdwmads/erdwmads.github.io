import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
export { mineralModels } from './mineral-guide.js';

// Seeded pseudo-random numbers keep every visit to a model identical.
function random(seed) { return () => { seed = seed+0x6d2b79f5|0; let t = Math.imul(seed^seed>>>15,1|seed); t = t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
// Periodic value noise, so the generated maps tile without seams.
function noise(next, cells) {
  const grid = Array.from({length:cells*cells},next), at = (i,j) => grid[(j%cells)*cells+i%cells], ease = t => t*t*(3-2*t);
  return (x,y) => { const i = Math.floor(x*cells), j = Math.floor(y*cells), s = ease(x*cells-i), t = ease(y*cells-j); return (at(i,j)*(1-s)+at(i+1,j)*s)*(1-t)+(at(i,j+1)*(1-s)+at(i+1,j+1)*s)*t; };
}
// Generated 128 px normal and roughness maps; no image assets. Real faces are never perfectly flat, and an
// orthographic view of a flat face shows one tone. Dolomite gets a gentle undulation with faint steps
// parallel to its cleavage edges, lizardite a soft waxy mottle, pentlandite slight tarnish.
function surface(id) {
  const size = 128, next = random(id.length*131), broad = noise(next,3), mid = noise(next,9), fine = noise(next,24);
  const steps = [0,1].map(() => { let rise = 0; const row = Float32Array.from({length:size},() => rise += next()<0.07 ? 0.5+next()*0.5 : 0); return row.map((h,i)=>h-rise*i/size); });
  const height = new Float32Array(size*size), normal = new Uint8Array(size*size*4), rough = new Uint8Array(size*size*4);
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const u = x/size, v = y/size, i = y*size+x;
    height[i] = id==='carbonate' ? 1.2*broad(u,v)+0.006*(steps[0][y]+0.5*steps[1][x]) : id==='matrix' ? 0.15*broad(u,v)+0.03*mid(u,v)+0.006*fine(u,v) : 0.3*broad(u,v)+0.004*fine(u,v);
    rough.set([0,Math.round(255*(id==='sulfide' ? 0.6+0.4*mid(u,v) : id==='matrix' ? 0.78+0.22*mid(u,v) : 0.88+0.12*fine(u,v))),0,255],i*4);
  }
  const h = (x,y) => height[(y+size)%size*size+(x+size)%size], k = size*0.06;
  for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
    const dx = (h(x-1,y)-h(x+1,y))*k, dy = (h(x,y-1)-h(x,y+1))*k, length = Math.hypot(dx,dy,1);
    normal.set([dx,dy,1].map(n=>Math.round((n/length*0.5+0.5)*255)).concat(255),(y*size+x)*4);
  }
  return [normal,rough].map(data => {
    const texture = new THREE.DataTexture(data,size,size);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true; texture.needsUpdate = true;
    return texture;
  });
}
// Planar texture coordinates for each flat triangle: along the two cleavage edges that span a dolomite
// face, otherwise along axes perpendicular to the triangle's normal.
function faceUV(geometry, scale, offset = new THREE.Vector3(), edges = null) {
  const p = geometry.attributes.position, uv = new Float32Array(p.count*2), corner = [0,1,2].map(()=>new THREE.Vector3()), normal = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3();
  for (let i=0;i<p.count;i+=3) {
    corner.forEach((v,k)=>v.fromBufferAttribute(p,i+k).add(offset));
    normal.subVectors(corner[1],corner[0]).cross(b.subVectors(corner[2],corner[0])).normalize();
    const pair = edges && [[1,2],[2,0],[0,1]].find(([m,n]) => Math.abs(normal.dot(edges[m]))<0.2 && Math.abs(normal.dot(edges[n]))<0.2);
    if (pair) { const [u,v] = pair.map(k=>edges[k]); a.crossVectors(v,normal); a.divideScalar(u.dot(a)); b.crossVectors(normal,u); b.divideScalar(v.dot(b)); }
    else { a.set(Math.abs(normal.x)>0.8?0:1,Math.abs(normal.x)>0.8?1:0,0).cross(normal).normalize(); b.crossVectors(normal,a); }
    corner.forEach((v,k)=>{ uv[(i+k)*2] = v.dot(a)*scale; uv[(i+k)*2+1] = v.dot(b)*scale; });
  }
  return geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}
// Illustrative lustre for each class, not measured colour or reflectance: vitreous to pearly carbonate,
// waxy to greasy sheet silicate, metallic sulfide.
const finishes = {
  carbonate: {roughness:.3,clearcoat:.3,clearcoatRoughness:.18,sheen:.35,sheenColor:0xfff0e6,sheenRoughness:.45,ior:1.6,flatShading:true},
  matrix: {roughness:.5,clearcoat:.35,clearcoatRoughness:.45,sheen:.8,sheenColor:0xe2f2e6,sheenRoughness:.5},
  sulfide: {metalness:1,flatShading:true}
};
// Studio point lights [intensity, x, y, z]. In an orthographic view a flat face lit from infinitely far away shows
// one tone, so the key sits near the mirror direction of the broad upper faces and the rim behind the model.
const studios = {
  carbonate: {key:[7,-2.3,2.7,1.2], fill:[1,2.6,-0.4,2.2], rim:[11,1.8,2.2,-3], environment:.2},
  matrix: {key:[6,-2.3,2.7,1.2], fill:[1,2.6,-0.4,2.2], rim:[6.5,0.6,3.2,-2], environment:.3},
  sulfide: {key:[7,-2.3,2.7,1.2], fill:[1,2.6,-0.4,2.2], rim:[11,1.8,2.2,-3], environment:.9}
};

export function createMineralGroup(id, separated, lightTheme = false) {
  const group = new THREE.Group(), model = new THREE.Group(), parts = [], maps = surface(id);
  const material = (color, roughness) => new THREE.MeshPhysicalMaterial({...finishes[id],color,normalMap:maps[0],roughnessMap:maps[1],...(roughness && {roughness})});
  group.add(model);
  function part(geometry, material, together, apart) {
    const mesh = new THREE.Mesh(geometry,material);
    mesh.userData.together = together; mesh.userData.apart = apart;
    model.add(mesh); parts.push(mesh);
  }
  if (id === 'carbonate') {
    // Dolomite's three {10-14} cleavage planes meet at about 74° and 106°. Equal edges 102.6° apart give that
    // rhombohedron around a vertical threefold axis; block size and count are illustrative, not a unit cell.
    const cosine = -0.2186, rise = Math.sqrt((1+2*cosine)/3), reach = Math.sqrt(1-rise*rise);
    const edge = [0,1,2].map(k=>new THREE.Vector3(reach*Math.cos(k*2*Math.PI/3+Math.PI/6),rise,reach*Math.sin(k*2*Math.PI/3+Math.PI/6)));
    const size = 0.62, points = [], finish = material(0xcdb8ae);
    // Pulling each corner slightly inward along two edges bevels the block, so the seams read as cleavage traces.
    for (const a of [-0.5,0.5]) for (const b of [-0.5,0.5]) for (const c of [-0.5,0.5]) for (let keep=0; keep<3; keep++) {
      const v = [a,b,c].map((n,i)=>n*(i===keep?1:.955)*size);
      points.push(edge[0].clone().multiplyScalar(v[0]).addScaledVector(edge[1],v[1]).addScaledVector(edge[2],v[2]));
    }
    const block = new ConvexGeometry(points);
    for (let x=0;x<2;x++) for (let y=0;y<2;y++) for (let z=0;z<2;z++) {
      const at = spacing => edge[0].clone().multiplyScalar(x-0.5).addScaledVector(edge[1],y-0.5).addScaledVector(edge[2],z-0.5).multiplyScalar(size*spacing);
      // Coordinates follow the assembled crystal, so face steps continue across neighbouring blocks.
      part(faceUV(block.clone(),0.8,at(1),edge),finish,at(1),at(1.32));
    }
    block.dispose();
    // A slight tilt shows the upper faces meeting at the obtuse apex, which reads as a rhombohedron, not a cube.
    model.rotation.set(0.24,0.36,0.04);
  } else if (id === 'matrix') {
    // A book of thin hexagonal flakes stacked along one direction (vertical before the display tilt).
    const next = random(7), sheets = 9, thickness = 0.05, bevel = 0.012;
    for (const texture of maps) texture.repeat.set(0.9,0.9);
    for (let i=0;i<sheets;i++) {
      const shape = new THREE.Shape(), radius = 0.84-Math.abs(i-4)*0.012;
      for (let k=0;k<6;k++) { const angle = k*Math.PI/3, r = radius*(0.97+next()*0.05); shape[k?'lineTo':'moveTo'](r*Math.cos(angle),r*Math.sin(angle)); }
      const geometry = new THREE.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2}).translate(0,0,-thickness/2).rotateX(-Math.PI/2).rotateY((next()-0.5)*0.12);
      const tone = new THREE.Color(0x9cc0a6).lerp(new THREE.Color(0x719b83),(i%3)/2*0.8+next()*0.2), lateral = [(next()-0.5)*0.04,(next()-0.5)*0.04];
      const at = spacing => new THREE.Vector3(lateral[0],(i-(sheets-1)/2)*spacing,lateral[1]);
      part(geometry,material(tone),at(thickness+2*bevel+0.004),at(thickness+2*bevel+0.07));
    }
    model.rotation.set(0.48,0.22,0.06);
  } else {
    // Irregular grains with a few octahedral facets: an aggregate habit, not measured grain boundaries.
    const next = random(11), centres = [], grains = 11;
    for (let i=0;i<grains;i++) {
      const y = 1-2*(i+0.5)/grains, ring = Math.sqrt(1-y*y), turn = i*2.39996;
      centres.push(i===0 ? new THREE.Vector3() : new THREE.Vector3(ring*Math.cos(turn),y,ring*Math.sin(turn)).multiplyScalar(0.42+next()*0.12));
    }
    const mean = centres.reduce((sum,c)=>sum.add(c),new THREE.Vector3()).divideScalar(grains);
    for (const centre of centres) {
      const points = [], size = 0.27+next()*0.12;
      for (const axis of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) points.push(new THREE.Vector3(...axis).multiplyScalar(size*(0.95+next()*0.25)));
      for (const x of [-1,1]) for (const y of [-1,1]) for (const z of [-1,1]) points.push(new THREE.Vector3(x,y,z).multiplyScalar(size*(0.48+next()*0.14)));
      for (let k=0;k<4;k++) points.push(new THREE.Vector3(next()-0.5,next()-0.5,next()-0.5).setLength(size*(0.9+next()*0.2)));
      const geometry = new ConvexGeometry(points).scale(0.85+next()*0.3,0.85+next()*0.3,0.85+next()*0.3).rotateX(next()*6.28).rotateY(next()*6.28);
      const tone = new THREE.Color(0xb09a6c).offsetHSL((next()-0.5)*0.02,(next()-0.5)*0.08,(next()-0.5)*0.06);
      const at = spread => centre.clone().sub(mean).multiplyScalar(spread);
      part(faceUV(geometry,1.6),material(tone,0.34+next()*0.16),at(1),at(1.5));
    }
    model.rotation.set(0.2,-0.3,0.08);
  }
  // Frame the separated layout, so the detail toggle moves the parts without rescaling the view.
  for (const p of parts) p.position.copy(p.userData.apart);
  group.updateMatrixWorld(true);
  model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
  group.updateMatrixWorld(true);
  const point = new THREE.Vector3();
  let turn = 0, width = 0, height = 0;
  for (const mesh of parts) {
    const position = mesh.geometry.attributes.position;
    for (let i=0;i<position.count;i++) {
      point.fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld);
      turn = Math.max(turn,Math.hypot(point.x,point.z)); width = Math.max(width,Math.abs(point.x)); height = Math.max(height,Math.abs(point.y));
    }
  }
  // Half-extents for the camera: a 14% margin around the first view, and a half-width that also keeps
  // any turn about the vertical axis in frame.
  group.userData.frame = {radius:Math.max(width*1.14,turn),radiusY:height*1.14};
  if (!separated) for (const p of parts) p.position.copy(p.userData.together);
  // Key, fill and rim reveal form on the dark specimen stage; the rim's faint tint follows the theme.
  const studio = studios[id];
  for (const [color,[intensity,x,y,z]] of [[0xfff2e4,studio.key],[0xd2e4f5,studio.fill],[lightTheme?0xffebd0:0xcfeaf6,studio.rim]]) {
    const lamp = new THREE.PointLight(color,intensity,0,1); lamp.position.set(x,y,z); group.add(lamp);
  }
  group.add(new THREE.HemisphereLight(0xe6eef5,0x2a2522,0.1));
  group.userData.environmentIntensity = studio.environment;
  return group;
}
