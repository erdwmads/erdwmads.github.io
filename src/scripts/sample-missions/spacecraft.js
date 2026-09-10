import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeStaticDetails } from './static-geometry.js';
import { hingeNasaArrays, partitionMesh } from './spacecraft-mechanics.js';

// Display models, not engineering reconstructions. Sources and modifications:
// /assets/data/missions/SPACECRAFT-CREDITS.md
// Every call owns its resources. Materials may be shared within a returned group;
// dispose each unique geometry/material once when the parent scene is destroyed.
const UP = new THREE.Vector3(0, 1, 0);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function materials() {
  return {
    gold: new THREE.MeshStandardMaterial({ color: 0xc49a3c, metalness: 0.72, roughness: 0.38 }),
    foil: new THREE.MeshStandardMaterial({ color: 0xd6ac55, metalness: 0.65, roughness: 0.42, vertexColors: true }),
    silver: new THREE.MeshStandardMaterial({ color: 0xbfc9d1, metalness: 0.7, roughness: 0.3 }),
    white: new THREE.MeshStandardMaterial({ color: 0xe7e5dc, metalness: 0.12, roughness: 0.62 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x171c24, metalness: 0.25, roughness: 0.48 }),
    lens: new THREE.MeshPhysicalMaterial({ color: 0x173b52, metalness: 0.45, roughness: 0.1, clearcoat: 1 }),
  };
}

function mesh(parent, geometry, material, position = [0, 0, 0], name = '') {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.name = name;
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(parent, size, material, position, name) {
  return mesh(parent, new THREE.BoxGeometry(...size), material, position, name);
}

function cylinder(parent, top, bottom, length, material, position, name) {
  return mesh(parent, new THREE.CylinderGeometry(top, bottom, length, 40), material, position, name);
}

function rod(parent, start, end, radius, material) {
  const a = V(...start), b = V(...end);
  const object = cylinder(parent, radius, radius, a.distanceTo(b), material);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(UP, b.sub(a).normalize());
  return object;
}

function ring(parent, radius, thickness, material, position) {
  const object = mesh(parent, new THREE.TorusGeometry(radius, thickness, 6, 48), material, position);
  object.rotation.x = Math.PI / 2;
  return object;
}

// Broad, non-periodic creases shape the blanket; a separate fine normal layer
// catches glancing light. The blanket overlaps are illustrative, not CAD panels.
function foilHeight(x, y, z) {
  const a=Math.sin(x*18.1+y*11.7+z*13.3+Math.sin(y*7.2-z*12.8));
  const b=Math.sin(x*31.7-y*24.3+z*17.9+Math.sin(x*9.1+y*13.4));
  return .0042*a+.0024*b;
}
function foilBox(parent, dimensions, material, position) {
  const geometry=new THREE.BoxGeometry(...dimensions,32,24,28);
  const p=geometry.attributes.position,n=geometry.attributes.normal,colors=[];
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),d=foilHeight(x,y,z);
    p.setXYZ(i,x+n.getX(i)*d,y+n.getY(i)*d,z+n.getZ(i)*d);
    const shade=.96+.025*Math.sin(x*8.1+y*13.7+z*7.3);
    colors.push(shade,shade,shade);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  return mesh(parent,geometry,material,position);
}
function hayabusaBlanketFinish(material) {
  material.roughness=.4;material.metalness=.69;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 blanketPoint; varying vec3 blanketFace;').replace('#include <begin_vertex>','#include <begin_vertex>\nblanketPoint=position;blanketFace=normal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',
      '#include <common>\nvarying vec3 blanketPoint; varying vec3 blanketFace;\nfloat blanketHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat blanketNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(blanketHash(i),blanketHash(i+vec2(1,0)),f.x),mix(blanketHash(i+vec2(0,1)),blanketHash(i+vec2(1,1)),f.x),f.y);}\n');
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nvec3 bf=abs(normalize(blanketFace));vec2 bp=bf.x>.7?blanketPoint.zy:bf.y>.7?blanketPoint.xz:blanketPoint.xy;vec2 bw=bp+vec2(blanketNoise(bp*8.),blanketNoise(bp*9.+3.))*.072;float bc=blanketNoise(bw*12.);float br=abs(blanketNoise(bw*31.)-.5);float blanketRelief=bc*.009+br*.0025;diffuseColor.rgb*=.96+bc*.065;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',
      '#include <normal_fragment_maps>\nvec3 bx=dFdx(-vViewPosition),by=dFdy(-vViewPosition);vec3 b1=cross(by,normal),b2=cross(normal,bx);float bd=dot(bx,b1);vec3 bg=sign(bd)*(dFdx(blanketRelief)*b1+dFdy(blanketRelief)*b2);normal=normalize(abs(bd)*normal-bg*.33);');
  };
  material.customProgramCacheKey=()=> 'hayabusa-mli-v2';
}
function blanketPatch(parent,outline,z,m,tape) {
  const positions=[],colors=[],indices=[],segments=16;
  for(let row=0;row<=segments;row++)for(let col=0;col<=segments;col++){
    const u=col/segments,v=row/segments;
    const x=THREE.MathUtils.lerp(THREE.MathUtils.lerp(outline[0][0],outline[1][0],u),THREE.MathUtils.lerp(outline[3][0],outline[2][0],u),v);
    const y=THREE.MathUtils.lerp(THREE.MathUtils.lerp(outline[0][1],outline[1][1],u),THREE.MathUtils.lerp(outline[3][1],outline[2][1],u),v);
    const fold=.006*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)+foilHeight(x,y,z);
    positions.push(x,y,z+Math.sign(z)*fold);colors.push(1,1,1);
    if(row<segments&&col<segments){const a=row*(segments+1)+col,b=a+segments+1;indices.push(a,a+1,b+1,a,b+1,b);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const patch=mesh(parent,geometry,m.foil,undefined,'overlapping-MLI-blanket');patch.material.side=THREE.DoubleSide;
  for(let edge=0;edge<4;edge++){
    const a=outline[edge],b=outline[(edge+1)%4],points=[];
    for(let j=0;j<=12;j++){const t=j/12,x=THREE.MathUtils.lerp(a[0],b[0],t),y=THREE.MathUtils.lerp(a[1],b[1],t);points.push(V(x,y,z+Math.sign(z)*(foilHeight(x,y,z)+.002)));}
    const trim=mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,.0032,5,false),tape,undefined,'blanket-seam-tape');trim.castShadow=false;
  }
}

function solarWing(parent, side, m) {
  const hinge = new THREE.Group();
  hinge.name = side < 0 ? 'port-solar-paddle-hinge' : 'starboard-solar-paddle-hinge';
  hinge.position.set(side * .6, .06, 0);
  parent.add(hinge);
  const wing = new THREE.Group();
  parent.add(wing);
  rod(wing, [side * .57, .06, 0], [side * .93, .06, 0], .032, m.silver);
  const outerHinge = new THREE.Group();
  outerHinge.name = 'solar-paddle-fold';
  outerHinge.position.set(side * 1.59, .09, 0);
  wing.add(outerHinge);
  const cellGeometry = new THREE.BoxGeometry(.082, .006, .079);
  const cellMaterial = new THREE.MeshPhysicalMaterial({color:0x123b78,metalness:.38,roughness:.33,clearcoat:.8,clearcoatRoughness:.25});
  const transform = new THREE.Object3D(), color = new THREE.Color();
  for (let panelIndex = 0; panelIndex < 2; panelIndex++) {
    const panel = new THREE.Group(), center = side * (1.225 + panelIndex * .73);
    wing.add(panel);
    box(panel, [.73, .035, 1.08], m.dark, [center, .06, 0]);
    for (const z of [-.54, .54]) box(panel, [.74, .048, .015], m.silver, [center, .061, z]);
    for (const x of [-.365, .365]) box(panel, [.018, .05, 1.08], m.silver, [center + x, .061, 0]);
    const cells = new THREE.InstancedMesh(cellGeometry, cellMaterial, 8 * 12);
    cells.name = 'individual-photovoltaic-cells';
    for (let x = 0; x < 8; x++) for (let z = 0; z < 12; z++) {
      transform.position.set(center - .3066 + x * .0876, .081, -.469 + z * .0853);
      transform.updateMatrix();
      cells.setMatrixAt(x * 12 + z, transform.matrix);
      color.setRGB(.9 + .035 * Math.sin(x * 1.3), .93 + .025 * Math.cos(z * 1.9), 1);
      cells.setColorAt(x * 12 + z, color);
    }
    cells.castShadow = true; cells.receiveShadow = true;
    panel.add(cells);
    for (let row = 0; row < 12; row++) box(panel, [.69, .001, .0012], m.silver, [center, .086, -.469 + row * .0853]);
    for (const z of [-.29, .29]) rod(panel, [center - .34, .03, z], [center + .34, .03, -z], .006, m.dark);
    if (panelIndex) { parent.updateMatrixWorld(true); outerHinge.attach(panel); }
  }
  for (const z of [-.29, .29]) {
    rod(wing, [side * .65, .035, z * .4], [side * .94, .035, z], .009, m.dark);
    cylinder(wing, .035, .035, .055, m.gold, [side * .92, .07, z]);
  }
  for (let i = 0; i < 3; i++) box(wing, [.07, .023, .034], m.gold, [side * .95, .109, -.09 + i * .09]);
  parent.updateMatrixWorld(true);
  hinge.attach(wing);
  return hinge;
}

function flatAntenna(parent, radius, position, m) {
  const antenna = new THREE.Group();
  antenna.position.set(...position);
  parent.add(antenna);
  cylinder(antenna, radius * 0.68, radius * 0.45, 0.095, m.gold, [0, -0.02, 0]);
  cylinder(antenna, radius, radius * 0.91, 0.044, m.gold, [0, 0.048, 0]);
  cylinder(antenna, radius * 0.97, radius * 0.97, 0.01, m.white, [0, 0.075, 0]);
  ring(antenna, radius * 0.97, 0.008, m.silver, [0, 0.082, 0]);
  for (let i = 0; i < 6; i += 1) {
    const angle = i * Math.PI / 3;
    cylinder(antenna, 0.006, 0.006, 0.007, m.dark, [Math.cos(angle) * radius * 0.85, 0.084, Math.sin(angle) * radius * 0.85]);
  }
}

/** Standalone display capsule. Maximum diameter 0.35, heat shield faces -Y. */
export function createCapsule(id) {
  if (!['hayabusa2', 'osiris-rex'].includes(id)) throw new Error(`Unknown spacecraft: ${id}`);
  const group = new THREE.Group();
  group.name = `${id}-return-capsule`;
  const m = materials();
  const profile = id === 'hayabusa2'
    ? [[0, -0.068], [0.07, -0.06], [0.145, -0.03], [0.175, 0], [0.17, 0.025], [0.098, 0.073], [0, 0.084]]
    : [[0, -0.078], [0.10, -0.055], [0.175, -0.005], [0.175, 0.013], [0.12, 0.092], [0.07, 0.117], [0, 0.12]];
  mesh(group, new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), 64), m.white);
  const shield = [[0, -0.08], [0.07, -0.072], [0.14, -0.035], [0.175, -0.005]];
  mesh(group, new THREE.LatheGeometry(shield.map(p => new THREE.Vector2(...p)), 64), m.dark);
  ring(group, 0.172, 0.0025, m.silver, [0, 0.009, 0]);
  cylinder(group, 0.039, 0.043, 0.008, m.gold, [0, id === 'hayabusa2' ? 0.082 : 0.117, 0]);
  // Published outer envelopes: JAXA 400 x 200 mm; NASA 810 x 500 mm.
  // Keep the existing -0.08 landing contact and 0.35 display diameter.
  const height = .35 * (id === 'hayabusa2' ? .2 / .4 : .5 / .81);
  const originalHeight = id === 'hayabusa2' ? .166 : .201;
  for (const part of group.children) {
    // Torus geometry was rotated onto the XZ plane; its local Z is capsule Y.
    if (part.geometry.type === 'TorusGeometry') part.scale.z *= height / originalHeight;
    else part.scale.y *= height / originalHeight;
    part.position.y = -.08 + (part.position.y + .08) * height / originalHeight;
  }
  if (id === 'hayabusa2') {
    const heatshields = [...group.children];
    const instrument = new THREE.Group();
    instrument.name = 'recovered-instrument-module';
    group.add(instrument);
    // JAXA recovery photos: the low cylindrical instrument module descends after
    // BOTH heatshields are shed. Internal envelope and fittings are illustrative.
    cylinder(instrument, .12, .13, .065, m.gold, [0, -.0475, 0]);
    cylinder(instrument, .115, .12, .015, m.silver, [0, -.0075, 0]);
    ring(instrument, .121, .003, m.silver, [0, -.015, 0]);
    instrument.visible = false;
    group.userData.setRecovery = amount => {
      const recovered = amount >= .5;
      for (const part of heatshields) part.visible = !recovered;
      instrument.visible = recovered;
    };
  }
  // Unused palette entries do not enter the scene and must be released here.
  m.foil.dispose();
  m.lens.dispose();
  return group;
}

// Illustrative load-bearing attachment, not a recovered flight-interface drawing.
function launchMount(parent, radius, baseY, deckY, m) {
  const mount = new THREE.Group();
  mount.name = 'launch-mount';
  parent.add(mount);
  const rim = mesh(mount, new THREE.TorusGeometry(radius, .009, 8, 48), m.silver, [0, baseY + .009, 0]);
  rim.rotation.x = Math.PI / 2;
  rim.name = 'launch-mount-ring';
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + i * Math.PI / 2;
    const x = Math.cos(angle), z = Math.sin(angle);
    rod(mount, [x * radius, baseY + .018, z * radius], [x * .43, deckY, z * .43], .014, m.silver);
  }
  return V(0, baseY, 0);
}

function createHayabusa2() {
  const group = new THREE.Group();
  group.name = 'hayabusa2-spacecraft';
  const m = materials();
  hayabusaBlanketFinish(m.foil);
  const tape=new THREE.MeshStandardMaterial({color:0xa37b2e,metalness:.58,roughness:.49});
  foilBox(group, [1.12, 0.77, 0.9], m.foil, [0, 0, 0]);
  blanketPatch(group,[[-.548,-.356],[-.09,-.343],[-.13,.353],[-.532,.367]],.462,m,tape);
  blanketPatch(group,[[-.108,-.351],[.32,-.367],[.285,.325],[-.126,.352]],.469,m,tape);
  blanketPatch(group,[[.296,-.358],[.55,-.337],[.536,.363],[.29,.341]],.463,m,tape);
  blanketPatch(group,[[-.54,-.35],[-.04,-.36],[.01,.354],[-.535,.36]],-.463,m,tape);
  blanketPatch(group,[[-.02,-.36],[.54,-.345],[.53,.36],[.008,.347]],-.468,m,tape);
  box(group, [1.15, 0.025, 0.94], m.silver, [0, 0.392, 0]);
  box(group, [1.15, 0.025, 0.94], m.dark, [0, -0.392, 0]);
  for (const x of [-0.558, 0.558]) {
    box(group, [0.018, 0.76, 0.91], m.gold, [x, 0, 0]);
    box(group, [0.021, 0.64, 0.5], m.dark, [x * 1.025, 0, 0.04]);
    for(let row=0;row<4;row++)box(group,[.022,.145,.455],m.white,[x*1.04,-.233+row*.155,.04]);
    for(const y of [-.32,.32])for(const z of [-.21,.29])box(group,[.026,.017,.017],m.silver,[x*1.043,y,z]);
  }
  for(const x of [-.48,.05,.48]){
    box(group,[.06,.031,.016],m.dark,[x,-.346,.478]);
    box(group,[.016,.044,.021],m.silver,[x,-.346,.487]);
  }
  for(const x of [-.49,.49])for(const z of [-.38,.38])cylinder(group,.009,.009,.012,m.dark,[x,.413,z]);
  for(const x of [-.17,.13]){
    box(group,[.20,.034,.135],m.dark,[x,.423,-.33]);
    box(group,[.181,.015,.116],m.white,[x,.446,-.33]);
    for(let i=0;i<5;i++)box(group,[.155,.003,.005],m.silver,[x,.456,-.374+i*.022]);
  }
  for(const sign of [-1,1])rod(group,[sign*.46,.421,-.25],[sign*.29,.443,-.11],.008,m.gold);
  const solarHinges = [solarWing(group, -1, m), solarWing(group, 1, m)];
  flatAntenna(group, 0.33, [-0.23, 0.47, 0.03], m);
  flatAntenna(group, 0.235, [0.36, 0.46, 0.06], m);
  rod(group, [-0.43, 0.42, -0.36], [-0.43, 0.76, -0.36], 0.014, m.silver);
  cylinder(group, 0.055, 0.09, 0.12, m.dark, [-0.43, 0.79, -0.36]);
  // Four microwave ion thrusters on their rear gimbal plate.
  const engines = new THREE.Group();
  engines.name = 'ion-engine-cluster';
  engines.position.set(0, -0.04, -0.52);
  engines.rotation.x = -Math.PI / 2;
  group.add(engines);
  box(engines, [0.47, 0.035, 0.36], m.dark, [0, 0, 0]);
  for (const x of [-0.126, 0.126]) {
    for (const z of [-0.09, 0.09]) {
      const engine = new THREE.Group();
      engine.position.set(x, 0.065, z);
      engines.add(engine);
      cylinder(engine, 0.088, 0.062, 0.10, m.silver);
      cylinder(engine, 0.071, 0.071, 0.003, m.dark, [0, 0.052, 0]);
      ring(engine, 0.071, 0.005, m.gold, [0, 0.057, 0]);
    }
  }
  // Optical navigation and ranging instruments on the nadir deck.
  for (const [x, z, r] of [[-0.36, 0.28, 0.055], [-0.23, 0.31, 0.04], [0.36, 0.25, 0.047]]) {
    box(group, [r * 2.8, 0.14, r * 2.8], m.dark, [x, -0.455, z]);
    cylinder(group, r, r, 0.012, m.lens, [x, -0.53, z]);
  }
  foilBox(group, [0.24, 0.17, 0.19], m.foil, [0.34, -0.46, -0.27]);
  // JAXA's launch photographs show the horn stowed; it deploys after separation.
  // The hinge pose is illustrative. The asteroid-operation contact stays fixed.
  const horn = new THREE.Group();
  horn.name = 'sampler-horn';
  const hornHinge = new THREE.Group();
  hornHinge.position.set(0, -.49, .05);
  group.add(hornHinge); hornHinge.add(horn);
  horn.position.set(0, .49, -.05);
  const hornWall = m.silver.clone(); hornWall.side = THREE.DoubleSide;
  const hornFront = new THREE.Group(), hornBack = new THREE.Group();
  hornFront.name = 'sampler-horn-cutaway'; horn.add(hornFront, hornBack);
  // Two open-ended half shells leave the intake and central bore unobstructed.
  for (const [half, start] of [[hornBack, Math.PI / 2], [hornFront, -Math.PI / 2]]) {
    mesh(half, new THREE.CylinderGeometry(.065, .065, .68, 40, 1, true, start, Math.PI), hornWall, [0, -.75, .05]);
    mesh(half, new THREE.CylinderGeometry(.065, .115, .37, 40, 1, true, start, Math.PI), hornWall, [0, -1.225, .05]);
  }
  for (const [half, angle] of [[hornBack, Math.PI], [hornFront, 0]]) {
    for (let i = 0; i < 17; i++) {
      const fold = mesh(half, new THREE.TorusGeometry(.066, .007, 6, 24, Math.PI), m.dark, [0, -.47 - i * .032, .05]);
      fold.rotation.set(Math.PI / 2, 0, angle);
    }
    const lip = mesh(half, new THREE.TorusGeometry(.106, .009, 8, 32, Math.PI), m.dark, [0, -1.419, .05]);
    lip.rotation.set(Math.PI / 2, 0, angle);
  }
  const samplingHead = new THREE.Object3D(); samplingHead.position.set(0, -1.428, .05); horn.add(samplingHead);
  const setSamplingCutaway = enabled => { hornFront.visible = !enabled; };
  const setHornDeployment = amount => { hornHinge.rotation.x = -(1 - THREE.MathUtils.clamp(amount, 0, 1)) * Math.PI / 2; };
  const mount = launchMount(group, .4 / (6 / 4.658), -.65, -.405, m);
  const capsule = createCapsule('hayabusa2');
  // Solar-paddle outer frame span is 4.658 display units = JAXA's 6 m.
  capsule.scale.setScalar((4.658 / 6) * .4 / .35);
  capsule.position.set(0.34, 0.14, 0.52);
  capsule.rotation.x = Math.PI / 2;
  group.add(capsule);
  group.userData.staticBatch = mergeStaticDetails(group,{excludeRoots:[capsule,hornHinge,group.getObjectByName('launch-mount')],excludeMaterials:[m.foil]});
  group.userData.modelCredit = 'Authored illustrative geometry based on JAXA Hayabusa2 diagrams';
  return {
    group, capsule, samplingHead, launchMount: mount, samplerTip: V(0, -1.428, 0.05),
    setHornDeployment, setSamplingCutaway, setSampling: setSamplingCutaway,
    setSolarDeployment(amount) {
      const fold = (1 - THREE.MathUtils.clamp(amount, 0, 1)) * Math.PI / 2;
      solarHinges[0].rotation.z = -fold;
      solarHinges[1].rotation.z = fold;
      solarHinges[0].getObjectByName('solar-paddle-fold').rotation.z = fold * 2;
      solarHinges[1].getObjectByName('solar-paddle-fold').rotation.z = -fold * 2;
    },
  };
}

function deployedTagsam(m) {
  const arm = new THREE.Group();
  arm.name = 'illustrative-deployed-tagsam';
  const extended = [[0, -0.15, 0.54], [0, -0.78, 0.73], [0, -1.44, 0.57], [0, -1.84, 0.57]].map(p => V(...p));
  const lengths = extended.slice(1).map((point, index) => point.distanceTo(extended[index]));
  const foldedAngles = [.5, -2.85, .4];
  const extendedAngles = extended.slice(1).map((point, index) => Math.atan2(point.z - extended[index].z, point.y - extended[index].y));
  const links = [], cables = [], joints = [];
  for (let i = 0; i < extended.length - 1; i += 1) {
    links.push(cylinder(arm, 0.034, 0.034, 1, m.dark));
    cables.push(cylinder(arm, 0.007, 0.007, 1, m.gold));
    const joint = cylinder(arm, 0.063, 0.063, 0.1, m.silver);
    joint.rotation.z = Math.PI / 2;
    joints.push(joint);
  }
  const head = new THREE.Group();
  head.name = 'tagsam-collector-head';
  arm.add(head);
  const wrist = new THREE.Object3D();
  wrist.name = 'tagsam-wrist';
  arm.add(wrist);
  cylinder(head, 0.068, 0.10, 0.055, m.silver);
  cylinder(head, 0.135, 0.135, 0.055, m.silver, [0, -0.049, 0]);
  cylinder(head, 0.117, 0.117, 0.01, m.dark, [0, -0.08, 0]);
  const points = extended.map(() => new THREE.Vector3());
  const direction = new THREE.Vector3();
  // These poses communicate deployment; they are not TAGSAM joint telemetry.
  function updateLinks() {
    for (let i = 0; i < links.length; i += 1) {
      const link = links[i], cable = cables[i];
      direction.subVectors(points[i + 1], points[i]);
      link.position.copy(points[i]).add(points[i + 1]).multiplyScalar(0.5);
      link.scale.y = direction.length();
      link.quaternion.setFromUnitVectors(UP, direction.normalize());
      cable.position.copy(link.position);
      cable.position.x += 0.034;
      cable.scale.y = link.scale.y;
      cable.quaternion.copy(link.quaternion);
      joints[i].position.copy(points[i]);
    }
    wrist.position.copy(points[3]);
  }
  function setDeployment(amount) {
    if (head.parent !== arm) arm.add(head);
    amount = THREE.MathUtils.clamp(amount, 0, 1);
    points[0].copy(extended[0]);
    for (let i = 0; i < lengths.length; i++) {
      const angle = THREE.MathUtils.lerp(foldedAngles[i], extendedAngles[i], amount);
      points[i + 1].copy(points[i]).add(V(0, Math.cos(angle) * lengths[i], Math.sin(angle) * lengths[i]));
    }
    updateLinks();
    head.position.copy(points[3]);
    head.rotation.set((1 - amount) * Math.PI / 2, 0, 0);
  }
  // Constant link lengths; the elbow stays on the exterior side of the bus.
  const upperLength = extended[0].distanceTo(extended[1]);
  const lowerLength = extended[1].distanceTo(extended[2]);
  const reach = new THREE.Vector3(), outward = new THREE.Vector3();
  function pointWristAt(target) {
    points[0].copy(extended[0]);
    points[3].copy(target);
    points[2].copy(target).add(V(0, .4, 0));
    reach.subVectors(points[2], points[0]);
    const distance = reach.length();
    reach.divideScalar(distance);
    const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
    const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
    outward.set(0, 0, 1).addScaledVector(reach, -reach.z).normalize();
    points[1].copy(points[0]).addScaledVector(reach, along).addScaledVector(outward, height);
    updateLinks();
  }
  setDeployment(0);
  return { arm, head, setDeployment, pointWristAt };
}
// Authored material enhancement, not recovered NASA texture data. NASA's GLB
// contains plain-color blanket and panel-back materials. Visual references:
// https://www.nasa.gov/missions/osiris-rex/osiris-rex-prepared-for-mapping-sampling-mission-to-asteroid-bennu/
// https://www.nasa.gov/image-article/osiris-rex-solar-array-inspected/
// Cell fronts face source -Y; panel backs retain their neutral finish.
function enhanceNasaMaterial(material, type) {
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 missionSurface; varying vec3 missionNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nmissionSurface=position*0.013277281; missionNormal=normal;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 missionSurface; varying vec3 missionNormal;\nfloat missionHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat missionNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(missionHash(i),missionHash(i+vec2(1,0)),f.x),mix(missionHash(i+vec2(0,1)),missionHash(i+vec2(1)),f.x),f.y);}\n');
    if (type === 'solar') {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec2 cellUV=missionSurface.xz/0.72;
        vec2 cellEdge=abs(fract(cellUV)-0.5);
        vec2 cellAA=max(fwidth(cellUV)*1.1,vec2(0.014));
        vec2 cellInterior=1.-smoothstep(vec2(0.47)-cellAA,vec2(0.49),cellEdge);
        float cellMask=cellInterior.x*cellInterior.y;
        float variation=0.88+0.12*sin(dot(floor(cellUV),vec2(2.37,7.13)));
        diffuseColor.rgb*=variation*mix(0.22,1.,cellMask);
        float conductor=1.-smoothstep(0.006,0.006+cellAA.x,abs(fract(cellUV.x*3.)-0.5));
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.10,0.17,0.25),conductor*cellMask*0.28);
      `);
    } else {
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        vec3 faceNormal=abs(normalize(missionNormal));
        float foilArea=${type === 'bus-foil' ? 'step(0.9,faceNormal.z)*step(4.4,abs(missionSurface.z))*(1.-step(4.4,missionSurface.y))' : '1.'};
        ${type === 'bus-foil' ? 'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.533,0.262,0.026),foilArea);' : ''}
        vec2 foilUV=faceNormal.x>0.7?missionSurface.zy:faceNormal.y>0.7?missionSurface.xz:missionSurface.xy;
        vec2 warpedUV=foilUV+vec2(missionNoise(foilUV*1.7),missionNoise(foilUV*2.3+7.))*0.28;\n        float foilWrinkle=missionNoise(warpedUV*vec2(3.6,5.1))*2.-1.;
        float broadFold=missionNoise(warpedUV*.65)*2.-1.;
        vec2 seamEdge=abs(fract(foilUV*0.47)-0.5);
        vec2 seamAA=max(fwidth(foilUV*0.47),vec2(0.008));
        vec2 seam=smoothstep(vec2(0.474)-seamAA,vec2(0.493),seamEdge);
        float seamMask=max(seam.x,seam.y);
        diffuseColor.rgb*=mix(1.,(0.96+foilWrinkle*0.035+broadFold*0.04)*mix(1.,0.82,seamMask),foilArea);
        float missionFoilRelief=(foilWrinkle*0.013+broadFold*0.022)*foilArea;
      `).replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor=mix(metalnessFactor,0.55,foilArea);')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,0.46,foilArea);')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 foilDx=dFdx(-vViewPosition),foilDy=dFdy(-vViewPosition);
        vec3 foilR1=cross(foilDy,normal),foilR2=cross(normal,foilDx);
        float foilDet=dot(foilDx,foilR1);
        vec3 foilGradient=sign(foilDet)*(dFdx(missionFoilRelief)*foilR1+dFdy(missionFoilRelief)*foilR2);
        normal=normalize(abs(foilDet)*normal-foilGradient*0.065);
      `);
    }
  };
  material.customProgramCacheKey = () => `mission-nasa-${type}-v1`;
}
async function createOsirisRex() {
  const decoder = new DRACOLoader();
  decoder.setDecoderPath('/assets/data/missions/draco/');
  const loader = new GLTFLoader().setDRACOLoader(decoder);
  let asset;
  try {
    asset = await loader.loadAsync('/assets/data/missions/osiris-rex-nasa.glb');
  } finally {
    decoder.dispose();
  }
  return assembleOsirisRex(asset.scene);
}

// Separate asset assembly permits geometry tests against the checked-in NASA GLB.
export function assembleOsirisRex(model) {
  const group = new THREE.Group();
  group.name = 'osiris-rex-spacecraft';
  model.name = 'nasa-osiris-rex';
  model.scale.setScalar(0.105);
  model.rotation.y = Math.PI / 2;
  model.position.y = -0.24;
  group.add(model);
  const capsule = new THREE.Group();
  capsule.name = 'osiris-rex-return-capsule';
  group.add(capsule);
  const stowedHead = [];
  group.updateMatrixWorld(true);
  const capsuleParts = [];
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    const material = object.material;
    const name = material.name;
    if (/SRC-/.test(name)) capsuleParts.push(object);
    if (/puck-|Silver-Puck/.test(name)) stowedHead.push(object);
    if (/SolarFaces/.test(name)) {
      material.color.set('#163d72');
      material.metalness = 0.28;
      material.roughness = 0.42;
      material.envMapIntensity = 0.4;
      enhanceNasaMaterial(material, 'solar');
    } else if (/SolarBack/.test(name)) {
      material.color.set('#343944');
      material.metalness = 0.16;
      material.roughness = 0.72;
    } else if (name === 'OsirisRex-mainbody.001') {
      // Decoded bounds put the lateral bus walls at z=+/-5, below y=4.4.
      // Preserve the top deck, X-facing radiator areas and separate accessories.
      material.metalness = 0.12;
      material.roughness = 0.64;
      enhanceNasaMaterial(material, 'bus-foil');
    } else if (/GoldFoil|Bronze|bronze/.test(name)) {
      material.color.set('#c18c2d');
      material.metalness = 0.55;
      material.roughness = 0.46;
      material.envMapIntensity = 0.8;
      if (/GoldFoil/.test(name) && !/nofoil/.test(name)) enhanceNasaMaterial(material, 'foil');
    } else if (/Silver|Grey/.test(name)) {
      material.metalness = 0.5;
      material.roughness = 0.36;
    }
  });
  // Preserve world transforms while moving the source capsule into one hideable group.
  for (const part of capsuleParts) capsule.attach(part);
  // Suppress only the static plate and central detail that obstruct the animated
  // collector. Their precise flight-hardware identity is not inferred from the mesh.
  // Keep every source triangle owned for inspection/disposal; other grey fittings remain.
  const retired = new THREE.Group(); retired.name = 'source-stowed-sampler-hardware'; retired.visible = false; group.add(retired);
  const sourceMeshes = []; model.traverse(object => { if (object.isMesh && object.material.name === 'Grey-nofoil-fl.001') sourceMeshes.push(object); });
  for (const object of sourceMeshes) for (const [obsolete, part] of partitionMesh(object, point => point.y > .35 && point.y < .4 && Math.abs(point.x) < .17 && Math.abs(point.z) < .2)) {
    if (obsolete) retired.attach(part);
  }
  const m = materials();
  const nativeSpan = new THREE.Box3().setFromObject(group).getSize(V()).x;
  const mount = launchMount(group, .5 / (6.2 / nativeSpan), -.8, -.46, m);
  const { arm, head, setDeployment, pointWristAt } = deployedTagsam(m);
  group.add(arm);
  const setSolarDeployment = hingeNasaArrays(model, group);
  const lid = new THREE.Group();
  lid.name = 'src-lid-hinge';
  // Source lid seam: y=417, radius=171.7, before the GLB and display scales.
  lid.position.set(-.239, .34135, 0);
  capsule.add(lid);
  for (const part of capsuleParts) if (/SRC-RTop/.test(part.material.name)) lid.attach(part);
  const captureRing = ring(capsule, .137, .009, m.silver, [0, .29, 0]);
  captureRing.name = 'src-capture-ring';
  for (let i = 0; i < 3; i++) {
    const angle = i * Math.PI * 2 / 3;
    box(capsule, [.025, .03, .025], m.dark, [Math.cos(angle) * .143, .304, Math.sin(angle) * .143], 'src-capture-latch');
  }
  const seat = V(0, .365, 0), waypoint = new THREE.Vector3();
  const smooth = (value, start, end) => THREE.MathUtils.smoothstep(value, start, end);
  // NASA sequence, compressed for the explainer: open, align, capture/check,
  // disconnect, withdraw, close. Poses are illustrative, not flight telemetry.
  function setStowage(progress) {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    setDeployment(1);
    lid.rotation.z = 1.95 * smooth(p, 0, .13) * (1 - smooth(p, .82, 1));
    if (p < .2) waypoint.copy(V(0, -1.84, .57)).lerp(V(.28, -.55, 1.12), smooth(p, .04, .2));
    else if (p < .34) waypoint.copy(V(.28, -.55, 1.12)).lerp(V(.28, .2, 1.12), smooth(p, .2, .34));
    else if (p < .47) waypoint.copy(V(.28, .2, 1.12)).lerp(V(0, .58, 0), smooth(p, .34, .47));
    else waypoint.copy(V(0, .58, 0)).lerp(seat, smooth(p, .47, .57));
    head.position.copy(waypoint);
    head.rotation.set(0, 0, 0);
    if (p >= .64) {
      // The collector now belongs to the return capsule, independently of the arm.
      capsule.add(head);
      head.position.copy(seat);
      waypoint.copy(seat).lerp(V(.1, .6, .72), smooth(p, .64, .79));
    }
    pointWristAt(waypoint);
    group.userData.stowage = p;
  }
  for (const part of stowedHead) part.visible = false;
  m.foil.dispose();
  m.white.dispose();
  m.lens.dispose();
  group.userData.modelCredit = 'NASA / Christopher R. Meaney; authored foil and solar-grid materials; illustrative deployed TAGSAM addition';
  return {
    group,
    capsule,
    samplingHead: head,
    launchMount: mount,
    samplerTip: V(0, -1.925, 0.57),
    setSolarDeployment,
    setStowage,
    setSampling(enabled) {
      const amount = typeof enabled === 'number' ? THREE.MathUtils.clamp(enabled, 0, 1) : Number(Boolean(enabled));
      setDeployment(amount);
      lid.rotation.z = 0;
      group.userData.stowage = 0;
    },
  };
}

/** Body near origin, wings along X, sampling direction -Y. */
export async function createSpacecraft(id) {
  if (id === 'hayabusa2') return createHayabusa2();
  if (id === 'osiris-rex') return createOsirisRex();
  throw new Error(`Unknown spacecraft: ${id}`);
}
