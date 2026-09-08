import * as THREE from 'three';
import {originStage} from './origins-content.js';
import {ImprovedNoise} from 'three/addons/math/ImprovedNoise.js';
import {createOriginSurface} from './origins-surface.js';
import {createOriginVolume} from './origins-volume.js';
import {createImpactEjecta} from './origins-impact.js';

// Deterministic geometry and kinematics are illustrative, not an accretion solver.
export function createOriginsScene(material,light=false,volumeData) {
  let seed=419;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const group=new THREE.Group(),cloud=new THREE.Group(),body=new THREE.Group();group.add(cloud,body);body.name='origin-body';
  const helper=new THREE.Object3D(),endpoint=new THREE.Vector3(),noise=new ImprovedNoise();
  const smooth=value=>{const t=THREE.MathUtils.clamp(value,0,1);return t*t*(3-2*t);};
  const grainGeometry=new THREE.IcosahedronGeometry(1,3),p=grainGeometry.attributes.position;
  for(let i=0;i<p.count;i++) {
    const v=new THREE.Vector3().fromBufferAttribute(p,i);
    const radius=1+.14*noise.noise(v.x*3,v.y*3,v.z*3);
    p.setXYZ(i,v.x*radius,v.y*radius*.8,v.z*radius);
  }
  grainGeometry.computeVertexNormals();
  const grains=new THREE.InstancedMesh(grainGeometry,new THREE.MeshStandardMaterial({...createOriginSurface()}),420);
  const dustGeometry=new THREE.BufferGeometry(),dustPositions=new Float32Array(grains.count*4*3);
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3).setUsage(THREE.DynamicDrawUsage));
  const dust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:light?0x6c797b:0xa6b0b2,size:1.3,sizeAttenuation:false,transparent:true,opacity:.6,depthWrite:false}));
  dust.frustumCulled=false;cloud.add(dust);
  const seeds=[];
  for(let i=0;i<grains.count;i++) {
    const a=random()*Math.PI*2,r=.25+Math.sqrt(random())*2;
    const u=random()*2-1,v=random()*Math.PI*2,w=Math.cbrt(random());
    seeds.push({a,r,y:(random()-.5)*.32,size:.012+random()**1.7*.048,
      end:new THREE.Vector3(w*Math.sqrt(1-u*u)*Math.cos(v),w*u*.91,w*Math.sqrt(1-u*u)*Math.sin(v)),spin:random()*6,
      shape:new THREE.Vector3(.65+random()*.55,.42+random()*.7,.58+random()*.5)});
    grains.setColorAt(i,new THREE.Color(i%5===0?0xb5d1d5:i%11===0?0xc4b793:0xc4c4bd));
  }
  grains.instanceMatrix.setUsage(THREE.DynamicDrawUsage);grains.frustumCulled=false;cloud.add(grains);
  const volume=createOriginVolume(material,random,light,volumeData);body.add(volume.group);
  const impacts=createImpactEjecta(volume.group.children,random,light);body.add(impacts.group);
  const debris=new THREE.InstancedMesh(grainGeometry,new THREE.MeshStandardMaterial({color:0x8b9595,roughness:1}),90);
  debris.name='origin-debris';debris.frustumCulled=false;group.add(debris);
  function update(progress,cutaway) {
    const p=THREE.MathUtils.clamp(progress,0,1),phase=originStage(p),t=Math.min(1,p*4-phase);
    group.userData.phase=phase;group.userData.progress=p;group.userData.cutaway=cutaway;
    cloud.visible=phase<2;body.visible=phase>=1||t>.45;debris.visible=phase===3&&(material!=='orgueil'||t<.72);
    body.scale.setScalar(1.35);
    volume.update(phase,t,cutaway);impacts.update(phase,t);
    for(let i=0;i<grains.count;i++) {
      const s=seeds[i],spin=s.a+(phase===0?t*.55:.55+t*.5),contraction=phase===0?smooth((t-.35)/.65)*.5:.5+.5*smooth(t);
      helper.position.set(Math.cos(spin)*s.r,Math.sin(spin)*s.r*.42+s.y,Math.sin(spin)*s.r*.25);
      const aggregate=volume.group.children[i%volume.group.children.length];
      endpoint.copy(aggregate.position).addScaledVector(s.end,.25*aggregate.scale.x).multiplyScalar(1.35);
      helper.position.lerp(endpoint,contraction);
      for(let j=0;j<4;j++) {
        const at=(i*4+j)*3,scatter=(1-contraction)*.085;
        dustPositions[at]=helper.position.x+Math.sin(s.spin+j*7)*scatter;
        dustPositions[at+1]=helper.position.y+Math.cos(s.a+j*4)*scatter;
        dustPositions[at+2]=helper.position.z+Math.sin(s.a+j*3)*scatter;
      }
      helper.rotation.set(s.spin+p*.3,s.a+p*.4,s.spin*.3);helper.scale.copy(s.shape).multiplyScalar(s.size*(1+contraction*.4)*(1-smooth((contraction-.75)/.25)));helper.updateMatrix();grains.setMatrixAt(i,helper.matrix);
    }
    grains.instanceMatrix.needsUpdate=true;dustGeometry.attributes.position.needsUpdate=true;dust.material.opacity=phase===0?.6-.3*smooth((t-.35)/.65):.3*(1-smooth(t));
    const spread=smooth(t/.5),ending=smooth((t-.48)/.52);
    for(let i=0;i<debris.count;i++) {
      const s=seeds[i];
      helper.position.copy(s.end).normalize().multiplyScalar(1.2+spread*(material==='orgueil'?7:.8));
      if(material!=='orgueil')helper.position.multiplyScalar(1-ending*.42);
      helper.scale.copy(s.shape).multiplyScalar(s.size*.6*spread*(1-ending*.45));helper.rotation.set(s.spin+t,s.a+t*.7,s.y);helper.updateMatrix();debris.setMatrixAt(i,helper.matrix);
    }
    debris.instanceMatrix.needsUpdate=true;
  }
  const emissive=[];group.traverse(node=>{for(const m of [node.material].flat().filter(Boolean))if(m.emissive&&!emissive.some(e=>e[0]===m))emissive.push([m,m.emissiveIntensity]);});
  function setFx(enabled){emissive.forEach(([m,intensity])=>m.emissiveIntensity=enabled?intensity:0);}
  update(.125,.65);
  return {group,update,setFx,inspectionTarget:()=>group.userData.phase===2&&group.userData.cutaway>0&&group.userData.progress>.62?volume.inspectionTarget():null};
}
