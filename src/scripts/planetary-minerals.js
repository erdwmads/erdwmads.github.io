import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
export { mineralModels } from './mineral-guide.js';

export function createMineralGroup(id, separated) {
  const group = new THREE.Group();
  function mesh(geometry, color, metalness = 0) {
    const item = new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color,metalness,roughness:metalness?0.28:0.3,clearcoat:metalness?.05:.23,clearcoatRoughness:.32,flatShading:true}));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry,25),new THREE.LineBasicMaterial({color:0x425461,transparent:true,opacity:0.12}));
    item.add(edges); group.add(item); return item;
  }
  if (id === 'carbonate') {
    // Equal-length inclined basis vectors give rhombic faces; no unit-cell dimensions are implied.
    const c = 0.27, s = Math.sqrt(1-c*c);
    const basis = [new THREE.Vector3(1,0,0),new THREE.Vector3(c,s,0),new THREE.Vector3(c,(c-c*c)/s,Math.sqrt(1-c*c-((c-c*c)/s)**2))];
    for (let x=0;x<2;x++) for (let y=0;y<2;y++) for (let z=0;z<2;z++) {
      const points = [];
      for (const a of [-0.5,0.5]) for (const b of [-0.5,0.5]) for (const d of [-0.5,0.5]) for(let edge=0;edge<3;edge++) { const v=[a,b,d].map((n,i)=>n*(i===edge?1:.97)); points.push(basis[0].clone().multiplyScalar(v[0]).addScaledVector(basis[1],v[1]).addScaledVector(basis[2],v[2]).multiplyScalar(0.57)); }
      const block = mesh(new ConvexGeometry(points),0xe9c9c9);
      block.position.copy(basis[0]).multiplyScalar(x-0.5).addScaledVector(basis[1],y-0.5).addScaledVector(basis[2],z-0.5).multiplyScalar(separated?0.86:0.574);
    }
    group.rotation.set(0.5,-0.45,0.55);
  } else if (id === 'matrix') {
    for (let i=0;i<6;i++) {
      const plate = mesh(new THREE.CylinderGeometry(0.83,0.83,0.075,6),i%2?0x9abbaa:0x739f92);
      plate.position.y = (i-2.5)*(separated?0.27:0.085);
    }
    group.rotation.set(0.5,0.25,0.2);
  } else {
    const points = [[0,0,0],[0.5,0.15,0.1],[-0.42,0.28,0.04],[0.12,0.52,-0.1],[-0.05,-0.45,0.13],[0.05,0.12,0.48],[-0.28,-0.12,-0.38]];
    points.forEach((p,i)=>{
      const grain = mesh(new THREE.DodecahedronGeometry(0.38+(i%3)*0.035,0),i%2?0xb69a61:0xc0a871,0.55);
      grain.position.set(...p).multiplyScalar(separated?1.8:1);
      grain.rotation.set(i*0.73,i*0.41,i*0.27);
    });
    group.rotation.set(0.15,-0.2,0.1);
  }
  return group;
}
