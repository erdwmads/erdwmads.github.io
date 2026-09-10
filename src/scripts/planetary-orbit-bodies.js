import * as THREE from 'three';

// Positions are supplied separately by Horizons. These display radii are deliberately
// independent of physical diameter; measured size comparison belongs to Shapes.
const radii = { sun:.07, earth:.05, jupiter:.048, saturn:.039, uranus:.029, neptune:.028, venus:.031, mars:.025, mercury:.021 };
const colors = { mercury:0xaaa39a, venus:0xd7bf91, mars:0xb87655, jupiter:0xc9b39a, saturn:0xd4c69f, uranus:0x91c4cf, neptune:0x5988c2 };
const vertex = `varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`;

function rimMaterial(sun = false) {
  return new THREE.ShaderMaterial({ transparent:true, depthWrite:false, side:THREE.BackSide, blending:THREE.AdditiveBlending,
    uniforms:{ tint:{ value:new THREE.Color(sun ? 0xffb258 : 0x4488cc) }, strength:{ value:sun ? .2 : .36 }, sunlight:{ value:sun ? 0 : 1 } },
    vertexShader:vertex, fragmentShader:`varying vec3 vNormal;varying vec3 vWorld;uniform vec3 tint;uniform float strength;uniform float sunlight;
void main(){vec3 n=normalize(vNormal);vec3 view=normalize(cameraPosition-vWorld);float rim=pow(1.-abs(dot(n,view)),3.);float lit=mix(1.,smoothstep(-.3,.5,dot(n,normalize(-vWorld))),sunlight);gl_FragColor=vec4(tint,rim*lit*strength);
#include <colorspace_fragment>
}` });
}

export function createOrbitBody(id, extent, { shape, day, clouds } = {}) {
  const body = new THREE.Group();
  body.userData.id = id;
  body.userData.labelRadius = extent*(radii[id] || .065);
  const sphere = (radius, material) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius,40,28),material);
    body.add(mesh);
    return mesh;
  };
  if (shape) {
    const object = shape.clone(true);
    object.scale.multiplyScalar(extent*.12);
    // Fixed presentation pose, not a reconstructed spin state.
    object.rotation.set(.48,-.32,.22);
    object.traverse(node => {
      if (!node.isMesh) return;
      node.userData.cached = true;
      node.material = new THREE.MeshStandardMaterial({ color:id==='bennu'?0x898581:0x828788, roughness:.93, metalness:0 });
    });
    body.add(object);
  } else if (id === 'sun') {
    sphere(extent*radii.sun,new THREE.ShaderMaterial({ vertexShader:vertex, fragmentShader:`varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){float limb=pow(max(0.,dot(normalize(vNormal),normalize(cameraPosition-vWorld))),.35);float grain=hash(floor(vUv*640.));vec3 color=mix(vec3(1.,.40,.09),vec3(1.,.92,.64),limb)*(.94+.06*grain);gl_FragColor=vec4(color,1.);
#include <colorspace_fragment>
}` }));
    const corona = sphere(extent*radii.sun*1.14,rimMaterial(true));
    corona.raycast = () => {};
  } else if (id === 'earth') {
    // Existing static maps, credited under assets/img/arrival/ASSET-CREDITS.md.
    const surface = sphere(extent*radii.earth,new THREE.MeshStandardMaterial({ map:day, roughness:.78, metalness:0 }));
    const cloud = sphere(extent*radii.earth*1.012,new THREE.MeshStandardMaterial({ color:0xffffff, alphaMap:clouds, transparent:true, opacity:.83, depthWrite:false, roughness:1 }));
    surface.rotation.set(.22,1.7,.16);
    cloud.rotation.copy(surface.rotation);
    const atmosphere = sphere(extent*radii.earth*1.045,rimMaterial());
    atmosphere.raycast = () => {};
  } else {
    const radius = extent*radii[id];
    const material = new THREE.MeshStandardMaterial({ color:colors[id], roughness:1 });
    if (id === 'jupiter' || id === 'saturn') {
      // Procedural cloud bands suggest morphology, not dated image observations.
      material.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec2 orbitUv;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\norbitUv=uv;');
        shader.fragmentShader = 'varying vec2 orbitUv;\n'+shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float latitude=orbitUv.y+sin(orbitUv.x*24.+orbitUv.y*12.)*.004;
float bands=sin(latitude*93.)*.09+sin(latitude*43.)*.06+sin(latitude*270.)*.025;
diffuseColor.rgb+=vec3(bands,bands*.83,bands*.62);`);
      };
    }
    sphere(radius,material).rotation.z = .22;
    if (id === 'saturn') {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radius*1.35,radius*2.12,72),new THREE.MeshStandardMaterial({ color:0xbcb196, roughness:1, side:THREE.DoubleSide, transparent:true, opacity:.66 }));
      ring.rotation.set(.85,.18,-.32);
      body.add(ring);
      body.userData.labelRadius = radius*2.12;
    }
  }
  body.traverse(node => { if (node.isMesh) node.userData.id = id; });
  return body;
}
